# app/api/v1/tickets.py — UPDATED dengan integrasi email

import uuid
import math
import logging
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import CurrentUser
from app.db.session import get_db
from app.models.ticket import Ticket, TicketComment
from app.models.profile import Profile
from app.schemas.ticket import (
    PaginatedTickets, TicketCommentCreate, TicketCommentResponse,
    TicketCreate, TicketListResponse, TicketResponse, TicketUpdate,
)
from app.services.email_service import email_service

logger = logging.getLogger("deskmate.tickets")
router = APIRouter()


async def _bg_notify_created(ticket_number, title, priority, creator_email, creator_id):
    from app.db.session import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        await email_service.notify_ticket_created(
            db=db, to_email=creator_email, recipient_id=creator_id,
            ticket_number=ticket_number, title=title, priority=priority,
        )
        await db.commit()


async def _bg_notify_supervisor(ticket_number, title, creator_name, department, priority, supervisor_email):
    from app.db.session import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        await email_service.notify_supervisor_new_ticket(
            db=db, supervisor_email=supervisor_email, ticket_number=ticket_number,
            title=title, creator_name=creator_name, department=department or "Tidak diketahui", priority=priority,
        )
        await db.commit()


async def _bg_notify_assigned(ticket_number, title, creator_email, creator_id, assignee_name):
    from app.db.session import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        await email_service.notify_ticket_assigned(
            db=db, to_email=creator_email, recipient_id=creator_id,
            ticket_number=ticket_number, title=title, assignee_name=assignee_name,
        )
        await db.commit()


async def _bg_notify_resolved(ticket_number, title, creator_email, creator_id, resolved_by_name):
    from app.db.session import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        await email_service.notify_ticket_resolved(
            db=db, to_email=creator_email, recipient_id=creator_id,
            ticket_number=ticket_number, title=title, resolved_by=resolved_by_name,
        )
        await db.commit()


async def _find_supervisor(department, db):
    if department:
        r = await db.execute(
            select(Profile).where(Profile.role == "supervisor", Profile.department == department, Profile.is_active == True).limit(1)
        )
        s = r.scalar_one_or_none()
        if s:
            return s
    r = await db.execute(select(Profile).where(Profile.role.in_(["supervisor","admin"]), Profile.is_active == True).limit(1))
    return r.scalar_one_or_none()


@router.post("/", response_model=TicketResponse, status_code=status.HTTP_201_CREATED, summary="Buat tiket baru")
async def create_ticket(body: TicketCreate, background_tasks: BackgroundTasks, current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    creator_result = await db.execute(select(Profile).where(Profile.id == uuid.UUID(current_user.sub)))
    creator = creator_result.scalar_one_or_none()
    if not creator:
        raise HTTPException(status_code=404, detail="Profil tidak ditemukan.")

    new_ticket = Ticket(
        ticket_number="", created_by=uuid.UUID(current_user.sub),
        title=body.title, description=body.description, category=body.category,
        priority=body.priority, chat_session_id=body.chat_session_id,
        attachment_ids=[str(a) for a in body.attachment_ids],
    )
    db.add(new_ticket)
    await db.flush()

    result = await db.execute(
        select(Ticket).options(selectinload(Ticket.creator), selectinload(Ticket.assignee)).where(Ticket.id == new_ticket.id)
    )
    ticket = result.scalar_one()

    if current_user.email:
        background_tasks.add_task(_bg_notify_created, ticket.ticket_number, ticket.title, ticket.priority, current_user.email, current_user.sub)

    supervisor = await _find_supervisor(creator.department, db)
    if supervisor and current_user.email:
        background_tasks.add_task(_bg_notify_supervisor, ticket.ticket_number, ticket.title, creator.full_name, creator.department, ticket.priority, current_user.email)

    logger.info(f"Tiket {ticket.ticket_number} dibuat oleh {current_user.sub}")
    return ticket


@router.get("/", response_model=PaginatedTickets, summary="List tiket")
async def list_tickets(
    current_user: CurrentUser, db: AsyncSession = Depends(get_db),
    status_filter: str | None = Query(None, alias="status"),
    priority: str | None = Query(None),
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
):
    query = select(Ticket).options(selectinload(Ticket.creator), selectinload(Ticket.assignee))
    if current_user.role == "employee":
        query = query.where(Ticket.created_by == uuid.UUID(current_user.sub))
    if status_filter:
        query = query.where(Ticket.status == status_filter)
    if priority:
        query = query.where(Ticket.priority == priority)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    query = query.order_by(Ticket.created_at.desc()).offset((page - 1) * size).limit(size)
    tickets = (await db.execute(query)).scalars().all()

    return PaginatedTickets(items=tickets, total=total, page=page, size=size, pages=math.ceil(total / size) if total > 0 else 0)


@router.get("/{ticket_id}", response_model=TicketResponse, summary="Detail tiket")
async def get_ticket(ticket_id: uuid.UUID, current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Ticket).options(selectinload(Ticket.creator), selectinload(Ticket.assignee)).where(Ticket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Tiket tidak ditemukan.")
    if current_user.role == "employee" and str(ticket.created_by) != current_user.sub:
        raise HTTPException(status_code=403, detail="Akses ditolak.")
    return ticket


@router.patch("/{ticket_id}", response_model=TicketResponse, summary="Update tiket")
async def update_ticket(
    ticket_id: uuid.UUID, body: TicketUpdate, background_tasks: BackgroundTasks,
    current_user: CurrentUser, db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Ticket).options(selectinload(Ticket.creator), selectinload(Ticket.assignee)).where(Ticket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Tiket tidak ditemukan.")

    is_owner = str(ticket.created_by) == current_user.sub
    is_privileged = current_user.role in ("supervisor", "admin")
    if not is_owner and not is_privileged:
        raise HTTPException(status_code=403, detail="Akses ditolak.")

    old_status = ticket.status
    old_assigned = ticket.assigned_to
    update_data = body.model_dump(exclude_unset=True)
    if current_user.role == "employee":
        update_data = {k: v for k, v in update_data.items() if k in {"status"}}

    for field, value in update_data.items():
        setattr(ticket, field, value)
    await db.flush()

    result2 = await db.execute(
        select(Ticket).options(selectinload(Ticket.creator), selectinload(Ticket.assignee)).where(Ticket.id == ticket_id)
    )
    ticket = result2.scalar_one()

    creator_email = current_user.email or ""

    if body.assigned_to and ticket.assigned_to != old_assigned and ticket.assignee and creator_email:
        background_tasks.add_task(_bg_notify_assigned, ticket.ticket_number, ticket.title, creator_email, str(ticket.created_by), ticket.assignee.full_name)

    if body.status in ("resolved", "closed") and old_status not in ("resolved", "closed") and creator_email:
        resolver = ticket.assignee.full_name if ticket.assignee else "Tim Helpdesk"
        background_tasks.add_task(_bg_notify_resolved, ticket.ticket_number, ticket.title, creator_email, str(ticket.created_by), resolver)

    logger.info(f"Tiket {ticket.ticket_number} diupdate oleh {current_user.sub}")
    return ticket


@router.post("/{ticket_id}/comments", response_model=TicketCommentResponse, status_code=status.HTTP_201_CREATED, summary="Tambah komentar")
async def add_comment(ticket_id: uuid.UUID, body: TicketCommentCreate, current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    if not (await db.execute(select(Ticket).where(Ticket.id == ticket_id))).scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Tiket tidak ditemukan.")
    if body.is_internal and current_user.role == "employee":
        raise HTTPException(status_code=403, detail="Hanya supervisor/admin yang bisa membuat komentar internal.")

    comment = TicketComment(ticket_id=ticket_id, author_id=uuid.UUID(current_user.sub), content=body.content, is_internal=body.is_internal)
    db.add(comment)
    await db.flush()

    result = await db.execute(select(TicketComment).options(selectinload(TicketComment.author)).where(TicketComment.id == comment.id))
    return result.scalar_one()
