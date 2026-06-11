# app/api/v1/documents.py
# -------------------------------------------------------
# Router untuk upload dan manajemen dokumen SOP/FAQ.
# Hanya Admin yang bisa upload & kelola dokumen.
# -------------------------------------------------------

import io
import os
import uuid
import logging
import traceback
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import CurrentUser
from app.db.session import get_db
from app.models.document import Document, DocumentImage
from app.services.rag_service import rag_service
from app.services.vector_service import vector_service
from supabase import create_client, Client

logger = logging.getLogger("deskmate.documents")
router = APIRouter()


# ── Supabase Storage Client ────────────────────────────────────────
def get_supabase() -> Client:
    """Client dengan anon key (untuk auth, dll)."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


def get_supabase_admin() -> Client:
    """Client dengan service_role key (bypass RLS, untuk Storage operations)."""
    key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
    return create_client(settings.SUPABASE_URL, key)


# ── Schemas ───────────────────────────────────────────────────────
class DocumentResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    file_name: str
    file_type: str
    category: str | None
    indexing_status: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentUpdate(BaseModel):
    title: str | None = None
    category: str | None = None
    description: str | None = None


# ── Helpers ───────────────────────────────────────────────────────
async def _parse_document_content(file_bytes: bytes, file_type: str) -> str:
    """
    Mengekstrak teks dari file yang diupload.
    Mendukung PDF dan teks biasa.
    Untuk file Word (DOCX) bisa ditambahkan dengan library python-docx.
    """
    content = ""

    if file_type == "application/pdf" or file_type.endswith("pdf"):
        # Ekstrak teks dari PDF menggunakan pypdf
        try:
            import pypdf
            pdf_reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            pages_text = []
            for page in pdf_reader.pages:
                pages_text.append(page.extract_text() or "")
            content = "\n\n".join(pages_text)
        except Exception as e:
            logger.error(f"Gagal parse PDF: {e}")
            raise HTTPException(status_code=422, detail=f"Gagal membaca file PDF: {str(e)}")

    elif file_type in ("text/plain", "text/markdown") or file_type.endswith((".txt", ".md")):
        content = file_bytes.decode("utf-8", errors="ignore")

    else:
        raise HTTPException(
            status_code=415,
            detail=f"Tipe file '{file_type}' belum didukung. Gunakan PDF atau TXT.",
        )

    if not content.strip():
        raise HTTPException(
            status_code=422,
            detail="Dokumen tidak mengandung teks yang bisa diekstrak.",
        )

    return content


async def _background_index_document(
    doc_id: str,
    title: str,
    content: str,
    collection_name: str,
    category: str | None,
    db_url: str,  # Kita pass URL karena background task punya session sendiri
):
    """
    Task background untuk mengindeks dokumen ke ChromaDB.
    Berjalan SETELAH response API dikirim ke client,
    sehingga user tidak perlu menunggu proses indexing selesai.
    """
    from app.db.session import AsyncSessionLocal

    logger.info(f"[BG] Mulai indexing dokumen: {title} (id={doc_id})")
    logger.info(f"[BG] Konten dokumen: {len(content)} karakter")
    logger.info(f"[BG] Collection target: {collection_name}")

    async with AsyncSessionLocal() as db:
        try:
            # Update status → processing
            result = await db.execute(select(Document).where(Document.id == uuid.UUID(doc_id)))
            doc = result.scalar_one_or_none()
            if not doc:
                logger.error(f"[BG] Dokumen {doc_id} tidak ditemukan di database!")
                return

            doc.indexing_status = "processing"
            await db.commit()
            logger.info(f"[BG] Status diupdate ke 'processing'")

            # Jalankan indexing ke ChromaDB
            logger.info(f"[BG] Memulai indexing ke ChromaDB...")
            chunk_ids = await rag_service.index_document_content(
                doc_id=doc_id,
                title=title,
                content=content,
                collection_name=collection_name,
                category=category,
            )

            # Update status → indexed
            doc.indexing_status = "indexed"
            doc.indexed_at = datetime.now(timezone.utc)
            await db.commit()

            logger.info(f"[BG] ✅ Dokumen '{title}' berhasil diindeks ({len(chunk_ids)} chunks)")

        except Exception as e:
            logger.error(f"[BG] ❌ Gagal mengindeks dokumen {doc_id}: {e}")
            logger.error(f"[BG] Full traceback:\n{traceback.format_exc()}")
            # Update status → failed
            try:
                await db.rollback()
                result = await db.execute(select(Document).where(Document.id == uuid.UUID(doc_id)))
                doc = result.scalar_one_or_none()
                if doc:
                    doc.indexing_status = "failed"
                    await db.commit()
            except Exception as inner_e:
                logger.error(f"[BG] Gagal update status ke 'failed': {inner_e}")


# ── Endpoints ─────────────────────────────────────────────────────

@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload dokumen SOP/FAQ (Admin only)",
)
async def upload_document(
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    file: UploadFile = File(..., description="File PDF atau TXT"),
    title: str = Form(..., min_length=3, max_length=255),
    description: str = Form(None),
    category: str = Form(None, description="SOP, FAQ, Manual, Safety"),
):
    """
    Upload dokumen SOP/FAQ baru.

    Alur:
    1. Validasi file (tipe & ukuran)
    2. Upload file ke Supabase Storage
    3. Simpan metadata ke database (status: pending)
    4. Kirim response ke client (tidak perlu menunggu indexing)
    5. Background task: parse teks → index ke ChromaDB → update status
    """
    # ── Guard: Hanya admin ─────────────────────────────────────────
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya admin yang bisa mengupload dokumen.",
        )

    # ── Validasi file ──────────────────────────────────────────────
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nama file tidak boleh kosong.")

    MAX_SIZE_BYTES = 20 * 1024 * 1024  # 20MB
    file_bytes = await file.read()

    if len(file_bytes) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Ukuran file melebihi batas maksimal (20MB). Ukuran file: {len(file_bytes) / 1024 / 1024:.1f}MB",
        )

    file_type = file.content_type or ""
    allowed_types = ["application/pdf", "text/plain", "text/markdown"]
    if not any(file_type.startswith(t) or file.filename.endswith(ext)
               for t in allowed_types
               for ext in [".pdf", ".txt", ".md"]):
        raise HTTPException(
            status_code=415,
            detail="Tipe file tidak didukung. Gunakan PDF (.pdf) atau teks (.txt, .md).",
        )

    # ── Parse teks untuk validasi awal ────────────────────────────
    # Ini juga memvalidasi file tidak corrupt sebelum upload ke Storage
    content = await _parse_document_content(file_bytes, file_type)

    # ── Upload ke Supabase Storage ─────────────────────────────────
    doc_id = uuid.uuid4()
    collection_name = f"doc_{str(doc_id).replace('-', '_')}"
    storage_path = f"documents/{current_user.sub}/{doc_id}/{file.filename}"

    storage_uploaded = False
    try:
        supabase = get_supabase_admin()
        supabase.storage.from_("documents").upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": file_type},
        )
        storage_uploaded = True
        logger.info(f"File berhasil diupload ke Supabase Storage: {storage_path}")
    except Exception as e:
        logger.warning(f"Gagal upload ke Supabase Storage: {e}")
        logger.warning("Indexing tetap dilanjutkan karena konten sudah diparsing.")

    # ── Simpan metadata ke database ────────────────────────────────
    new_doc = Document(
        id=doc_id,
        uploaded_by=uuid.UUID(current_user.sub),
        title=title,
        description=description,
        file_name=file.filename,
        file_path=storage_path,
        file_type=file_type,
        file_size_bytes=len(file_bytes),
        category=category,
        chroma_collection=collection_name,
        indexing_status="pending",
    )
    db.add(new_doc)
    await db.commit()
    await db.refresh(new_doc)

    # ── Jadwalkan indexing sebagai background task ─────────────────
    # User mendapat response segera, indexing berjalan di belakang layar
    background_tasks.add_task(
        _background_index_document,
        doc_id=str(doc_id),
        title=title,
        content=content,
        collection_name=collection_name,
        category=category,
        db_url=settings.DATABASE_URL,
    )

    logger.info(f"Dokumen '{title}' berhasil diupload. Indexing dijadwalkan.")
    return new_doc


@router.get("/", response_model=list[DocumentResponse], summary="Daftar semua dokumen")
async def list_documents(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    category: str | None = None,
    only_indexed: bool = True,
):
    """Mengambil daftar dokumen. Default hanya dokumen yang sudah terindeks."""
    query = select(Document).where(Document.is_active == True)

    if only_indexed:
        query = query.where(Document.indexing_status == "indexed")
    if category:
        query = query.where(Document.category == category)

    query = query.order_by(Document.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Hapus dokumen (Admin only)")
async def delete_document(
    doc_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Menonaktifkan dokumen dan menghapus embeddings dari ChromaDB.
    File di Supabase Storage tidak dihapus (untuk keperluan audit).
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang bisa menghapus dokumen.")

    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan.")

    # Hapus embeddings dari ChromaDB
    if doc.chroma_collection:
        await vector_service.delete_document(doc.chroma_collection)

    # Soft delete: nonaktifkan dokumen, tidak benar-benar dihapus dari DB
    doc.is_active = False
    doc.indexing_status = "failed"
    await db.flush()

    logger.info(f"Dokumen '{doc.title}' dinonaktifkan oleh {current_user.sub}")


# ── Debug & Re-index Endpoints ─────────────────────────────────────

@router.get("/debug/status", summary="[Debug] Cek status ChromaDB & dokumen")
async def debug_document_status(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint debug untuk memeriksa apakah dokumen benar-benar
    ter-index di ChromaDB. Menampilkan status dari DB dan ChromaDB.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang bisa mengakses debug.")

    # Ambil semua dokumen dari database
    result = await db.execute(select(Document).order_by(Document.created_at.desc()))
    docs = result.scalars().all()

    # Ambil semua collections dari ChromaDB
    chroma_collections = vector_service.list_all_collections()
    chroma_map = {c["name"]: c["count"] for c in chroma_collections}

    doc_statuses = []
    for doc in docs:
        chroma_count = chroma_map.get(doc.chroma_collection, None)
        doc_statuses.append({
            "id": str(doc.id),
            "title": doc.title,
            "is_active": doc.is_active,
            "indexing_status": doc.indexing_status,
            "chroma_collection": doc.chroma_collection,
            "chroma_chunk_count": chroma_count,
            "chroma_exists": chroma_count is not None,
            "indexed_at": str(doc.indexed_at) if doc.indexed_at else None,
        })

    return {
        "total_documents_in_db": len(docs),
        "total_collections_in_chroma": len(chroma_collections),
        "chroma_collections": chroma_collections,
        "documents": doc_statuses,
    }


@router.post("/{doc_id}/reindex", summary="Re-index dokumen yang gagal (Admin only)")
async def reindex_document(
    doc_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Re-index dokumen yang statusnya 'failed' atau 'pending'.
    Mengambil ulang file dari Supabase Storage, parse ulang, dan index ulang.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang bisa re-index.")

    # Cari dokumen di database
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan.")

    if not doc.is_active:
        raise HTTPException(status_code=400, detail="Dokumen sudah dinonaktifkan/dihapus.")

    logger.info(f"Re-index diminta untuk dokumen '{doc.title}' (status: {doc.indexing_status})")

    # Hapus collection lama di ChromaDB jika ada
    if doc.chroma_collection:
        try:
            await vector_service.delete_document(doc.chroma_collection)
            logger.info(f"Collection lama '{doc.chroma_collection}' dihapus.")
        except Exception:
            pass

    # Download file dari Supabase Storage
    try:
        supabase = get_supabase_admin()
        file_bytes = supabase.storage.from_("documents").download(doc.file_path)
    except Exception as e:
        logger.error(f"Gagal download file dari Supabase Storage: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Gagal mengambil file dari storage: {str(e)}",
        )

    # Parse konten
    try:
        content = await _parse_document_content(file_bytes, doc.file_type)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Gagal parse konten: {str(e)}")

    # Generate collection name baru jika belum ada
    if not doc.chroma_collection:
        doc.chroma_collection = f"doc_{str(doc.id).replace('-', '_')}"

    # Reset status
    doc.indexing_status = "pending"
    doc.indexed_at = None
    await db.flush()

    # Jadwalkan re-indexing sebagai background task
    background_tasks.add_task(
        _background_index_document,
        doc_id=str(doc.id),
        title=doc.title,
        content=content,
        collection_name=doc.chroma_collection,
        category=doc.category,
        db_url=settings.DATABASE_URL,
    )

    logger.info(f"Re-indexing dijadwalkan untuk dokumen '{doc.title}'")
    return {
        "status": "reindex_scheduled",
        "doc_id": str(doc.id),
        "title": doc.title,
        "message": f"Re-indexing dijadwalkan. Cek status via GET /api/v1/documents/debug/status",
    }


@router.put("/{doc_id}", response_model=DocumentResponse, summary="Edit metadata dokumen (Admin only)")
async def update_document_metadata(
    doc_id: uuid.UUID,
    body: DocumentUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Mengubah metadata dokumen seperti judul, kategori, atau deskripsi."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang bisa mengubah metadata.")

    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan.")

    if not doc.is_active:
        raise HTTPException(status_code=400, detail="Dokumen sudah dinonaktifkan/dihapus.")

    # Update field
    if body.title is not None:
        doc.title = body.title
    if body.category is not None:
        doc.category = body.category
    if body.description is not None:
        doc.description = body.description

    await db.flush()
    await db.commit()
    await db.refresh(doc)

    # Sinkronisasi metadata ke ChromaDB jika title atau category diubah
    if doc.chroma_collection and (body.title is not None or body.category is not None):
        try:
            collection = vector_service._client.get_collection(doc.chroma_collection)
            existing = collection.get()
            if existing and existing["ids"]:
                new_metadatas = []
                for meta in existing["metadatas"]:
                    if body.title is not None:
                        meta["title"] = body.title
                    if body.category is not None:
                        meta["category"] = body.category
                    new_metadatas.append(meta)
                collection.update(ids=existing["ids"], metadatas=new_metadatas)
                logger.info(f"Metadata ChromaDB untuk dokumen '{doc.title}' berhasil diselaraskan.")
        except Exception as e:
            logger.error(f"Gagal menyelaraskan metadata ChromaDB: {e}")

    return doc
