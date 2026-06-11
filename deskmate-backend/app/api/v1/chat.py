# app/api/v1/chat.py
# -------------------------------------------------------
# Router untuk fitur chat dengan AI DeskMate.
# Ini adalah endpoint utama yang menggunakan pipeline RAG.
# -------------------------------------------------------

import uuid
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import CurrentUser
from app.db.session import get_db
from app.models.chat import ChatMessage, ChatSession
from app.models.attachment import Attachment
from app.schemas.chat import (
    AttachmentResponse,
    ChatMessageResponse,
    ChatResponse,
    ChatSessionCreate,
    ChatSessionResponse,
    SourceDocument,
)
from app.services.rag_service import RAGResult, rag_service
from app.services.llm_service import llm_service

logger = logging.getLogger("deskmate.chat")
router = APIRouter()


# ── Session Endpoints ─────────────────────────────────────────────

@router.post(
    "/sessions",
    response_model=ChatSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Buat sesi chat baru",
)
async def create_session(
    body: ChatSessionCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Membuat sesi chat baru untuk user yang sedang login."""
    session = ChatSession(
        user_id=uuid.UUID(current_user.sub),
        title=body.title,
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


@router.get(
    "/sessions",
    response_model=list[ChatSessionResponse],
    summary="Daftar sesi chat saya",
)
async def list_my_sessions(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    limit: int = 20,
):
    """Mengambil daftar sesi chat milik user yang login, terbaru di atas."""
    result = await db.execute(
        select(ChatSession)
        .where(
            ChatSession.user_id == uuid.UUID(current_user.sub),
            ChatSession.is_active == True,
        )
        .order_by(ChatSession.updated_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.get(
    "/sessions/{session_id}/messages",
    response_model=list[ChatMessageResponse],
    summary="Riwayat pesan dalam satu sesi",
)
async def get_session_messages(
    session_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Mengambil semua pesan dalam satu sesi chat (urutan lama → baru)."""
    # Verifikasi sesi milik user ini
    session_result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == uuid.UUID(current_user.sub),
        )
    )
    if not session_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Sesi chat tidak ditemukan.")

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = result.scalars().all()
    
    # Query all attachments for these messages
    msg_ids = [m.id for m in messages]
    attachments_map = {}
    if msg_ids:
        from app.core.config import settings
        
        att_res = await db.execute(
            select(Attachment).where(
                Attachment.context_type == "chat_message",
                Attachment.context_id.in_(msg_ids)
            )
        )
        for att in att_res.scalars().all():
            att.url = f"{settings.SUPABASE_URL}/storage/v1/object/public/attachments/{att.file_path}"
            msg_id = att.context_id
            if msg_id not in attachments_map:
                attachments_map[msg_id] = []
            attachments_map[msg_id].append(att)
            
    for msg in messages:
        msg.attachments = attachments_map.get(msg.id, [])
        
    return messages



# ── Chat / Message Endpoints ───────────────────────────────────────

@router.post(
    "/sessions/{session_id}/messages",
    response_model=ChatResponse,
    summary="Kirim pesan ke AI DeskMate",
)
async def send_message(
    session_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    content: str = Form(..., min_length=1, max_length=4000, description="Pertanyaan kamu"),
    attachment_ids: str = Form("[]", description="JSON array UUID attachment (opsional)"),
):
    """
    Endpoint utama chat. Menerima pertanyaan teks dari user,
    menjalankan pipeline RAG, dan mengembalikan jawaban AI.

    Alur:
    1. Validasi sesi chat milik user
    2. Simpan pesan user ke database
    3. Jalankan RAG pipeline (retrieve → generate)
    4. Simpan jawaban AI ke database
    5. Update judul sesi jika ini pesan pertama
    6. Kembalikan kedua pesan (user + AI) ke frontend
    """
    import json

    # ── Validasi sesi ──────────────────────────────────────────────
    session_result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == uuid.UUID(current_user.sub),
            ChatSession.is_active == True,
        )
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Sesi chat tidak ditemukan atau sudah ditutup.")

    # Parse attachment_ids dari form string
    try:
        parsed_attachment_ids = json.loads(attachment_ids)
    except json.JSONDecodeError:
        parsed_attachment_ids = []

    # ── Simpan pesan user ──────────────────────────────────────────
    user_message = ChatMessage(
        session_id=session_id,
        role="user",
        content=content,
        attachment_ids=parsed_attachment_ids,
    )
    db.add(user_message)
    await db.flush()
    await db.refresh(user_message)

    # ── Jalankan RAG Pipeline ──────────────────────────────────────
    try:
        rag_result: RAGResult = await rag_service.answer(
            query=content,
            session_id=session_id,
            db=db,
        )
    except Exception as e:
        logger.error(f"RAG pipeline gagal: {e}", exc_info=True)
        # Fallback: berikan pesan error yang ramah jika RAG gagal
        rag_result = RAGResult(
            answer=(
                "Maaf, saya mengalami kesulitan teknis saat memproses pertanyaan Anda. "
                "Silakan coba beberapa saat lagi atau buat tiket helpdesk untuk bantuan lebih lanjut."
            ),
            source_chunks=[],
            tokens_used=0,
            latency_ms=0,
            was_retrieved=False,
        )

    # ── Format source_documents untuk disimpan ────────────────────
    source_docs_json = [
        {
            "doc_id": str(chunk.doc_id),
            "title": chunk.title,
            "page": chunk.page,
            "score": chunk.score,
        }
        for chunk in rag_result.source_chunks
    ]

    # ── Simpan jawaban AI ──────────────────────────────────────────
    ai_message = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=rag_result.answer,
        source_documents=source_docs_json,
        tokens_used=rag_result.tokens_used,
        latency_ms=rag_result.latency_ms,
    )
    db.add(ai_message)
    await db.flush()
    await db.refresh(ai_message)

    # ── Auto-generate judul sesi dari pesan pertama ────────────────
    if session.title is None:
        try:
            generated_title = await llm_service.generate_session_title(content)
            session.title = generated_title
        except Exception:
            session.title = content[:50] + ("..." if len(content) > 50 else "")

    # Update timestamp sesi
    await db.flush()

    logger.info(
        f"Chat | session={session_id} | retrieved={rag_result.was_retrieved} "
        f"| tokens={rag_result.tokens_used} | latency={rag_result.latency_ms}ms"
    )

    # ── Format response ────────────────────────────────────────────
    source_document_models = [
        SourceDocument(
            doc_id=uuid.UUID(chunk.doc_id),
            title=chunk.title,
            page=chunk.page,
            score=chunk.score,
        )
        for chunk in rag_result.source_chunks
    ]

    return ChatResponse(
        user_message=ChatMessageResponse(
            id=user_message.id,
            session_id=session_id,
            role="user",
            content=content,
            source_documents=[],
            attachment_ids=[uuid.UUID(a) for a in parsed_attachment_ids if a],
            attachments=[],
            tokens_used=None,
            latency_ms=None,
            created_at=user_message.created_at,
        ),
        ai_message=ChatMessageResponse(
            id=ai_message.id,
            session_id=session_id,
            role="assistant",
            content=rag_result.answer,
            source_documents=source_document_models,
            attachment_ids=[],
            attachments=[],
            tokens_used=rag_result.tokens_used,
            latency_ms=rag_result.latency_ms,
            created_at=ai_message.created_at,
        ),

    )


@router.post(
    "/sessions/{session_id}/messages/with-image",
    response_model=ChatResponse,
    summary="Kirim pesan dengan lampiran gambar ke AI DeskMate",
)
async def send_message_with_image(
    session_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    content: str = Form("", max_length=4000),
    image: UploadFile = File(..., description="Gambar mesin/error (JPG, PNG, WebP, maks 5MB)"),
):

    """
    Varian chat yang menerima lampiran gambar.
    Gambar dianalisis oleh Gemini Vision, kemudian hasilnya
    digabungkan dengan pertanyaan teks untuk pencarian RAG yang lebih akurat.

    Contoh penggunaan:
    - Foto layar error mesin + "Ini error apa dan cara mengatasinya?"
    - Foto komponen mesin + "Komponen ini masih bagus atau perlu diganti?"
    """
    # ── Validasi sesi ──────────────────────────────────────────────
    session_result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == uuid.UUID(current_user.sub),
            ChatSession.is_active == True,
        )
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Sesi chat tidak ditemukan.")

    # ── Validasi gambar ────────────────────────────────────────────
    allowed_image_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if image.content_type not in allowed_image_types:
        raise HTTPException(
            status_code=415,
            detail=f"Tipe gambar tidak didukung. Gunakan JPEG, PNG, atau WebP.",
        )

    image_bytes = await image.read()
    MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="Ukuran gambar melebihi 5MB.")

    # ── Upload ke Supabase Storage ─────────────────────────────────
    from app.api.v1.documents import get_supabase_admin
    supabase_client = get_supabase_admin()
    
    file_uuid = uuid.uuid4()
    storage_path = f"attachments/{current_user.sub}/{file_uuid}/{image.filename}"
    
    try:
        supabase_client.storage.from_("attachments").upload(
            path=storage_path,
            file=image_bytes,
            file_options={"content-type": image.content_type}
        )
        logger.info(f"Image chat attachment uploaded to storage: {storage_path}")
    except Exception as e:
        logger.error(f"Gagal upload chat attachment ke Supabase Storage: {e}")
        raise HTTPException(status_code=400, detail="Gagal mengunggah gambar ke storage.")

    # ── Simpan attachment ke database ──────────────────────────────
    # Attachment disimpan dulu dengan context_id kosong sementara,
    # akan diupdate setelah user_message dibuat
    attachment = Attachment(
        id=file_uuid,
        uploaded_by=uuid.UUID(current_user.sub),
        file_name=image.filename or f"image_{file_uuid}.jpg",
        file_path=storage_path,
        file_type=image.content_type,
        file_size_bytes=len(image_bytes),
        context_type="chat_message",
        context_id=session_id,  # Sementara pakai session_id, update setelah pesan dibuat
        storage_bucket="attachments",
    )
    db.add(attachment)
    await db.flush()
    await db.refresh(attachment)


    # ── Simpan pesan user ──────────────────────────────────────────
    user_message = ChatMessage(
        session_id=session_id,
        role="user",
        content=content,
        attachment_ids=[str(attachment.id)],
    )
    db.add(user_message)
    await db.flush()
    await db.refresh(user_message)

    # Update context_id attachment ke ID pesan yang baru dibuat
    attachment.context_id = user_message.id
    await db.flush()

    # ── Jalankan RAG dengan gambar ─────────────────────────────────
    try:
        rag_result: RAGResult = await rag_service.answer_with_image(
            query=content,
            session_id=session_id,
            image_data=image_bytes,
            media_type=image.content_type,
            db=db,
        )
    except Exception as e:
        logger.error(f"RAG with image gagal: {e}", exc_info=True)
        rag_result = RAGResult(
            answer="Maaf, terjadi kesalahan saat memproses gambar Anda. Silakan coba lagi.",
            source_chunks=[],
            tokens_used=0,
            latency_ms=0,
            was_retrieved=False,
        )

    # ── Simpan jawaban AI ──────────────────────────────────────────
    source_docs_json = [
        {"doc_id": str(c.doc_id), "title": c.title, "page": c.page, "score": c.score}
        for c in rag_result.source_chunks
    ]

    ai_message = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=rag_result.answer,
        source_documents=source_docs_json,
        tokens_used=rag_result.tokens_used,
        latency_ms=rag_result.latency_ms,
    )
    db.add(ai_message)
    await db.flush()
    await db.refresh(ai_message)

    if session.title is None:
        try:
            session.title = await llm_service.generate_session_title(content)
        except Exception:
            session.title = content[:50]
    await db.flush()

    source_document_models = [
        SourceDocument(doc_id=uuid.UUID(c.doc_id), title=c.title, page=c.page, score=c.score)
        for c in rag_result.source_chunks
    ]

    from app.core.config import settings
    user_attachment_resp = [
        AttachmentResponse(
            id=attachment.id,
            file_name=attachment.file_name,
            file_type=attachment.file_type,
            file_size_bytes=attachment.file_size_bytes,
            url=f"{settings.SUPABASE_URL}/storage/v1/object/public/attachments/{attachment.file_path}"
        )
    ]

    return ChatResponse(
        user_message=ChatMessageResponse(
            id=user_message.id,
            session_id=session_id,
            role="user",
            content=content,
            source_documents=[],
            attachment_ids=[attachment.id],
            attachments=user_attachment_resp,
            tokens_used=None,
            latency_ms=None,
            created_at=user_message.created_at,
        ),
        ai_message=ChatMessageResponse(
            id=ai_message.id,
            session_id=session_id,
            role="assistant",
            content=rag_result.answer,
            source_documents=source_document_models,
            attachment_ids=[],
            attachments=[],
            tokens_used=rag_result.tokens_used,
            latency_ms=rag_result.latency_ms,
            created_at=ai_message.created_at,
        ),
    )



@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Tutup / arsipkan sesi chat",
)
async def close_session(
    session_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Menonaktifkan sesi chat (soft delete). Data tetap tersimpan."""
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == uuid.UUID(current_user.sub),
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Sesi chat tidak ditemukan.")

    session.is_active = False
    await db.flush()
