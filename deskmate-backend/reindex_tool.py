# reindex_tool.py — Tool untuk debug & re-index dokumen DeskMate
# Jalankan dari folder deskmate-backend:
#   python reindex_tool.py
# ---------------------------------------------------------------

import asyncio
import sys
import os
import io
import glob

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.path.insert(0, os.path.dirname(__file__))


async def main():
    print("=" * 60)
    print("  DeskMate - Document Debug & Re-index Tool")
    print("=" * 60)

    from app.core.config import settings
    from app.db.session import AsyncSessionLocal
    # Import SEMUA model agar SQLAlchemy relationship bisa resolve
    from app.models.profile import Profile  # noqa: F401
    from app.models.document import Document, DocumentImage  # noqa: F401
    from app.models.chat import ChatSession, ChatMessage  # noqa: F401
    from app.models.ticket import Ticket, TicketComment  # noqa: F401
    from app.models.attachment import Attachment  # noqa: F401
    from app.models.email_log import EmailLog  # noqa: F401
    from app.services.vector_service import vector_service
    from app.services.rag_service import rag_service
    from sqlalchemy import select
    from datetime import datetime, timezone

    # -- Langkah 1: Cek ChromaDB --
    print("\n[1/4] Mengecek ChromaDB...")
    collections = vector_service.list_all_collections()
    if collections:
        print(f"  [OK] Ditemukan {len(collections)} collection(s):")
        for col in collections:
            print(f"     - {col['name']}: {col['count']} chunks")
    else:
        print("  [!] Tidak ada collection di ChromaDB (kosong)")

    # -- Langkah 2: Cek status dokumen di database --
    print("\n[2/4] Mengecek dokumen di database...")
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Document).where(Document.is_active == True).order_by(Document.created_at.desc())
        )
        docs = result.scalars().all()

        if not docs:
            print("  [ERROR] Tidak ada dokumen aktif di database!")
            return

        print(f"  Ditemukan {len(docs)} dokumen aktif:")
        failed_docs = []
        for doc in docs:
            status_icon = {
                "indexed": "[OK]",
                "processing": "[...]",
                "pending": "[PENDING]",
                "failed": "[FAILED]",
            }.get(doc.indexing_status, "[?]")

            chroma_info = vector_service.get_collection_stats(doc.chroma_collection or "")
            chroma_str = f"(ChromaDB: {chroma_info['count']} chunks)" if chroma_info['exists'] else "(ChromaDB: TIDAK ADA)"

            print(f"     {status_icon:10s} {doc.title}")
            print(f"        ID: {doc.id}")
            print(f"        Collection: {doc.chroma_collection}")
            print(f"        {chroma_str}")
            print(f"        File: {doc.file_name} ({doc.file_type})")
            print()

            if doc.indexing_status in ("failed", "pending"):
                failed_docs.append(doc)

        if not failed_docs:
            print("  [OK] Semua dokumen sudah ter-index dengan benar!")
            return

        # -- Langkah 3: Info --
        print(f"\n[3/4] Ditemukan {len(failed_docs)} dokumen perlu di-reindex:")
        for doc in failed_docs:
            print(f"     - {doc.title} (status: {doc.indexing_status})")

        print("\n  Memulai re-index...")

        # -- Langkah 4: Proses re-index --
        print(f"\n[4/4] Memulai re-index...")

        for doc in failed_docs:
            print(f"\n  --- Re-indexing: {doc.title} ---")

            # Hapus collection lama
            if doc.chroma_collection:
                try:
                    await vector_service.delete_document(doc.chroma_collection)
                    print(f"     [DEL] Collection lama dihapus")
                except Exception:
                    pass

            # Coba baca file dari folder lokal terlebih dahulu
            file_bytes = None
            local_dir = os.path.join(os.path.dirname(__file__), "uploaded_docs", str(doc.id))

            if os.path.isdir(local_dir):
                files = [f for f in os.listdir(local_dir) if not f.startswith('.')]
                if files:
                    local_path = os.path.join(local_dir, files[0])
                    print(f"     [LOCAL] Membaca dari file lokal: {local_path}")
                    with open(local_path, "rb") as f:
                        file_bytes = f.read()
                    print(f"     [OK] File lokal dibaca ({len(file_bytes)} bytes)")

            # Fallback: coba download dari Supabase Storage
            if file_bytes is None:
                print(f"     [DL] File lokal tidak ditemukan, mencoba Supabase Storage...")
                try:
                    from supabase import create_client
                    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
                    file_bytes = supabase.storage.from_("documents").download(doc.file_path)
                    print(f"     [OK] File berhasil didownload ({len(file_bytes)} bytes)")
                except Exception as e:
                    print(f"     [ERROR] Gagal download: {e}")
                    print(f"     [INFO] Tidak ada sumber file. Lewati dokumen ini.")
                    print(f"     [INFO] Silakan upload ulang dokumen via frontend.")
                    continue

            # Parse konten
            print(f"     [PARSE] Parsing konten dokumen...")
            try:
                content = ""
                if doc.file_type == "application/pdf" or doc.file_name.endswith(".pdf"):
                    import pypdf
                    pdf_reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                    pages_text = []
                    for page_num, page in enumerate(pdf_reader.pages, 1):
                        text = page.extract_text() or ""
                        pages_text.append(text)
                        print(f"        Page {page_num}: {len(text)} chars")
                    content = "\n\n".join(pages_text)
                else:
                    content = file_bytes.decode("utf-8", errors="ignore")

                print(f"     [OK] Konten diekstrak ({len(content)} karakter)")

                if not content.strip():
                    print(f"     [ERROR] Dokumen tidak mengandung teks! Lewati.")
                    continue

                preview = content[:200].replace('\n', ' ').replace('\r', '')
                print(f"     [PREVIEW] {preview}...")

            except Exception as e:
                print(f"     [ERROR] Gagal parse: {e}")
                import traceback
                traceback.print_exc()
                continue

            # Indexing ke ChromaDB
            print(f"     [INDEX] Indexing ke ChromaDB...")
            try:
                collection_name = doc.chroma_collection or f"doc_{str(doc.id).replace('-', '_')}"

                chunk_ids = await rag_service.index_document_content(
                    doc_id=str(doc.id),
                    title=doc.title,
                    content=content,
                    collection_name=collection_name,
                    category=doc.category,
                )

                doc.indexing_status = "indexed"
                doc.indexed_at = datetime.now(timezone.utc)
                doc.chroma_collection = collection_name
                await db.commit()

                print(f"     [OK] Berhasil! {len(chunk_ids)} chunks diindeks")

                stats = vector_service.get_collection_stats(collection_name)
                print(f"     [VERIFY] ChromaDB: {stats['count']} chunks tersimpan")

            except Exception as e:
                print(f"     [ERROR] Gagal indexing: {e}")
                import traceback
                traceback.print_exc()

                doc.indexing_status = "failed"
                try:
                    await db.commit()
                except Exception:
                    await db.rollback()
                continue

    print("\n" + "=" * 60)
    print("  Re-index selesai!")
    print("  Jika berhasil, coba chat di frontend.")
    print("  Jika gagal, upload ulang dokumen via frontend lalu")
    print("  jalankan script ini lagi.")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
