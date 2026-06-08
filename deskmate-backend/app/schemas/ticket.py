# app/schemas/ticket.py

import uuid
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field

from app.schemas.profile import ProfilePublicResponse


# ── Ticket ────────────────────────────────────────────────────────

class TicketCreate(BaseModel):
    """Request: Buat tiket baru."""
    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=10)
    category: str | None = Field(None, max_length=100)
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    chat_session_id: uuid.UUID | None = None
    attachment_ids: list[uuid.UUID] = Field(default_factory=list)


class TicketUpdate(BaseModel):
    """Request: Update tiket — hanya field yang dikirim yang diubah."""
    title: str | None = Field(None, min_length=5, max_length=255)
    description: str | None = None
    category: str | None = None
    priority: Literal["low", "medium", "high", "critical"] | None = None
    status: Literal["open", "in_progress", "resolved", "closed"] | None = None
    assigned_to: uuid.UUID | None = None
    rating: int | None = Field(None, ge=1, le=5)


class TicketResponse(BaseModel):
    id: uuid.UUID
    ticket_number: str
    creator: ProfilePublicResponse
    assignee: ProfilePublicResponse | None
    chat_session_id: uuid.UUID | None
    title: str
    description: str
    category: str | None
    priority: str
    status: str
    attachment_ids: list[uuid.UUID]
    rating: int | None = None
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TicketListResponse(BaseModel):
    """Versi ringkas untuk ditampilkan di list/dashboard."""
    id: uuid.UUID
    ticket_number: str
    title: str
    priority: str
    status: str
    category: str | None
    created_at: datetime
    creator: ProfilePublicResponse
    assignee: ProfilePublicResponse | None

    model_config = {"from_attributes": True}


# ── Ticket Comment ────────────────────────────────────────────────

class TicketCommentCreate(BaseModel):
    """Request: Tambah komentar ke tiket."""
    content: str = Field(..., min_length=1)
    is_internal: bool = False  # Default: komentar publik


class TicketCommentResponse(BaseModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    author: ProfilePublicResponse
    content: str
    is_internal: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Pagination wrapper ────────────────────────────────────────────
class PaginatedTickets(BaseModel):
    """Response dengan pagination untuk list tiket."""
    items: list[TicketListResponse]
    total: int
    page: int
    size: int
    pages: int
