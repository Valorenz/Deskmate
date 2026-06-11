# app/models/attachment.py

import uuid
from datetime import datetime
from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Attachment(Base):
    __tablename__ = "attachments"
    __table_args__ = {"schema": "public"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("public.profiles.id", ondelete="RESTRICT"), nullable=False
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    storage_bucket: Mapped[str] = mapped_column(String(100), nullable=False, default="attachments")
    context_type: Mapped[str] = mapped_column(
        Enum("chat_message", "ticket", name="attachment_context", schema="public"),
        nullable=False,
    )
    context_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    gemini_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ─────────────────────────────────────────────
    uploader: Mapped["Profile"] = relationship("Profile")

    def __repr__(self) -> str:
        return f"<Attachment id={self.id} type={self.context_type} context={self.context_id}>"
