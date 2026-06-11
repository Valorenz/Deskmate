# app/schemas/chat.py

import uuid
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


# ── Chat Session ──────────────────────────────────────────────────

class ChatSessionCreate(BaseModel):
    """Request: Buat sesi chat baru."""
    title: str | None = Field(None, max_length=255)


class ChatSessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Chat Message ──────────────────────────────────────────────────

class SourceDocument(BaseModel):
    """Dokumen referensi yang dipakai RAG untuk menjawab."""
    doc_id: uuid.UUID
    title: str
    page: int | None = None
    score: float  # Similarity score dari ChromaDB (0.0 - 1.0)


class AttachmentResponse(BaseModel):
    id: uuid.UUID
    file_name: str
    file_type: str
    file_size_bytes: int | None
    url: str

    model_config = {"from_attributes": True}


class ChatMessageSend(BaseModel):
    """Request: Kirim pesan ke chatbot."""
    session_id: uuid.UUID
    content: str = Field(..., min_length=1, max_length=4000)
    attachment_ids: list[uuid.UUID] = Field(default_factory=list)


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    role: Literal["user", "assistant"]
    content: str
    source_documents: list[SourceDocument] = []
    attachment_ids: list[uuid.UUID] = []
    attachments: list[AttachmentResponse] = []
    tokens_used: int | None
    latency_ms: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatResponse(BaseModel):
    """Response lengkap setelah user kirim pesan: pesan user + balasan AI."""
    user_message: ChatMessageResponse
    ai_message: ChatMessageResponse

