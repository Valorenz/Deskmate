# app/models/chat.py

import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class ChatSession(Base):
    __tablename__ = "chat_sessions"
    __table_args__ = {"schema": "public"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("public.profiles.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # ── Relationships ─────────────────────────────────────────────
    user: Mapped["Profile"] = relationship("Profile", back_populates="chat_sessions")
    messages: Mapped[list["ChatMessage"]] = relationship(
        "ChatMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",  # Pesan selalu urut dari lama ke baru
        lazy="select",
    )
    ticket: Mapped["Ticket | None"] = relationship(
        "Ticket", back_populates="chat_session", uselist=False
    )

    def __repr__(self) -> str:
        return f"<ChatSession id={self.id} user={self.user_id}>"


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    __table_args__ = {"schema": "public"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("public.chat_sessions.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(
        Enum("user", "assistant", name="message_role", schema="public"),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # JSONB: list dokumen referensi RAG
    # Contoh: [{"doc_id": "uuid", "title": "SOP A3", "page": 4, "score": 0.91}]
    source_documents: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    # JSONB: list UUID attachment
    # Contoh: ["uuid-attachment-1", "uuid-attachment-2"]
    attachment_ids: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    tokens_used: Mapped[int | None] = mapped_column(Integer, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ─────────────────────────────────────────────
    session: Mapped["ChatSession"] = relationship("ChatSession", back_populates="messages")

    def __repr__(self) -> str:
        return f"<ChatMessage id={self.id} role={self.role} session={self.session_id}>"
