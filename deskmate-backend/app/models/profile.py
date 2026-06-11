# app/models/profile.py
# -------------------------------------------------------
# Model SQLAlchemy untuk tabel public.profiles
# Cara kerja: Setiap class = satu tabel di database.
# Setiap atribut class = satu kolom di tabel tersebut.
# SQLAlchemy menerjemahkan operasi Python ke SQL secara otomatis.
# -------------------------------------------------------

import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, Enum, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Profile(Base):
    __tablename__ = "profiles"
    __table_args__ = {"schema": "public"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True
        # Tidak pakai default karena ID harus sama dengan auth.users.id
    )
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    employee_id: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    role: Mapped[str] = mapped_column(
        Enum("employee", "supervisor", "admin", name="user_role", schema="public"),
        nullable=False,
        default="employee",
    )
    avatar_url: Mapped[str | None] = mapped_column(nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # ── Relationships ─────────────────────────────────────────────
    # lazy="select" = relasi diload saat pertama kali diakses
    # back_populates = referensi balik dari model lain
    documents: Mapped[list["Document"]] = relationship(
        "Document", back_populates="uploader", lazy="select"
    )
    chat_sessions: Mapped[list["ChatSession"]] = relationship(
        "ChatSession", back_populates="user", lazy="select"
    )
    created_tickets: Mapped[list["Ticket"]] = relationship(
        "Ticket", foreign_keys="Ticket.created_by", back_populates="creator", lazy="select"
    )
    assigned_tickets: Mapped[list["Ticket"]] = relationship(
        "Ticket", foreign_keys="Ticket.assigned_to", back_populates="assignee", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<Profile id={self.id} name={self.full_name} role={self.role}>"
