# app/models/ticket.py

import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Ticket(Base):
    __tablename__ = "tickets"
    __table_args__ = {"schema": "public"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # ticket_number di-generate oleh trigger database (V3),
    # jadi kita tidak perlu mengisinya dari Python
    ticket_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)

    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("public.profiles.id", ondelete="RESTRICT"), nullable=False
    )
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("public.profiles.id", ondelete="SET NULL"), nullable=True
    )
    chat_session_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("public.chat_sessions.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    priority: Mapped[str] = mapped_column(
        Enum("low", "medium", "high", "critical", name="ticket_priority", schema="public"),
        nullable=False,
        default="medium",
    )
    status: Mapped[str] = mapped_column(
        Enum("open", "in_progress", "resolved", "closed", name="ticket_status", schema="public"),
        nullable=False,
        default="open",
    )
    attachment_ids: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # ── Relationships ─────────────────────────────────────────────
    creator: Mapped["Profile"] = relationship(
        "Profile", foreign_keys=[created_by], back_populates="created_tickets"
    )
    assignee: Mapped["Profile | None"] = relationship(
        "Profile", foreign_keys=[assigned_to], back_populates="assigned_tickets"
    )
    chat_session: Mapped["ChatSession | None"] = relationship(
        "ChatSession", back_populates="ticket"
    )
    comments: Mapped[list["TicketComment"]] = relationship(
        "TicketComment",
        back_populates="ticket",
        cascade="all, delete-orphan",
        order_by="TicketComment.created_at",
        lazy="select",
    )

    def __repr__(self) -> str:
        return f"<Ticket {self.ticket_number} status={self.status} priority={self.priority}>"


class TicketComment(Base):
    __tablename__ = "ticket_comments"
    __table_args__ = {"schema": "public"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("public.tickets.id", ondelete="CASCADE"), nullable=False
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("public.profiles.id", ondelete="RESTRICT"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_internal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ─────────────────────────────────────────────
    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="comments")
    author: Mapped["Profile"] = relationship("Profile")

    def __repr__(self) -> str:
        return f"<TicketComment id={self.id} ticket={self.ticket_id} internal={self.is_internal}>"
