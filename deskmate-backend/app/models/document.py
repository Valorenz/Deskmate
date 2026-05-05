# app/models/document.py

import uuid
from datetime import datetime
from sqlalchemy import BigInteger, Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = {"schema": "public"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("public.profiles.id", ondelete="SET NULL"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    chroma_collection: Mapped[str | None] = mapped_column(String(100), nullable=True)
    indexing_status: Mapped[str] = mapped_column(
        Enum("pending", "processing", "indexed", "failed", name="indexing_status", schema="public"),
        nullable=False,
        default="pending",
    )
    indexed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ─────────────────────────────────────────────
    uploader: Mapped["Profile"] = relationship("Profile", back_populates="documents")
    images: Mapped[list["DocumentImage"]] = relationship(
        "DocumentImage", back_populates="document", cascade="all, delete-orphan", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<Document id={self.id} title={self.title} status={self.indexing_status}>"


class DocumentImage(Base):
    __tablename__ = "document_images"
    __table_args__ = {"schema": "public"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("public.documents.id", ondelete="CASCADE"), nullable=False
    )
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False, default="image/jpeg")
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    gemini_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    chroma_chunk_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    indexing_status: Mapped[str] = mapped_column(
        Enum("pending", "processing", "indexed", "failed", name="indexing_status", schema="public"),
        nullable=False,
        default="pending",
    )
    indexed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ─────────────────────────────────────────────
    document: Mapped["Document"] = relationship("Document", back_populates="images")

    def __repr__(self) -> str:
        return f"<DocumentImage id={self.id} doc={self.document_id} page={self.page_number}>"
