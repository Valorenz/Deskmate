# app/api/v1/tickets.py — UPDATED dengan integrasi email

import uuid
import math
import logging
from datetime import datetime, date, timedelta
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status, File, UploadFile
from sqlalchemy import func, select, Date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import CurrentUser
from app.db.session import get_db
from app.models.ticket import Ticket, TicketComment
from app.models.profile import Profile
from app.models.attachment import Attachment
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


@router.get("/stats/employee", summary="Statistik tiket saya (Karyawan)")
async def get_employee_stats(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db)
):
    """Menghitung statistik tiket open, awaiting (in_progress), dan resolved/closed milik karyawan sendiri."""
    user_uuid = uuid.UUID(current_user.sub)
    
    open_count = await db.scalar(
        select(func.count(Ticket.id)).where(Ticket.created_by == user_uuid, Ticket.status == "open")
    )
    awaiting_count = await db.scalar(
        select(func.count(Ticket.id)).where(Ticket.created_by == user_uuid, Ticket.status == "in_progress")
    )
    resolved_count = await db.scalar(
        select(func.count(Ticket.id)).where(Ticket.created_by == user_uuid, Ticket.status.in_(["resolved", "closed"]))
    )
    
    return {
        "open": open_count or 0,
        "awaiting": awaiting_count or 0,
        "resolved": resolved_count or 0
    }


@router.get("/stats/supervisor", summary="Statistik agregat dashboard (Supervisor)")
async def get_supervisor_dashboard_stats(
    current_user: CurrentUser,
    department: str | None = Query(None, description="Filter berdasarkan departemen pembuat tiket"),
    db: AsyncSession = Depends(get_db)
):
    """Mengambil semua data metrik dashboard supervisor dengan filter department."""
    if current_user.role not in ("supervisor", "admin"):
        raise HTTPException(status_code=403, detail="Akses ditolak.")
        
    from app.services.scheduler import get_aggregate_stats
    # Convert frontend 'All Departments' or 'All' to None
    dept_val = None if department in ("All Departments", "All", "") else department
    stats = await get_aggregate_stats(db, department=dept_val)
    
    # Kelompokkan tren volume tiket per hari selama 7 hari terakhir dengan filter department
    today = date.today()
    trends_labels = []
    trends_data = []
    
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        trends_labels.append(day.strftime("%a"))
        
        trends_q = select(func.count(Ticket.id)).where(
            func.cast(Ticket.created_at, Date) == day
        )
        if dept_val:
            trends_q = trends_q.join(Profile, Ticket.created_by == Profile.id).where(Profile.department == dept_val)
            
        count_res = await db.execute(trends_q)
        trends_data.append(count_res.scalar() or 0)
        
    stats["trends"] = {
        "labels": trends_labels,
        "data": trends_data
    }
    
    return stats


@router.post("/send-report", summary="Kirim email laporan instan")
async def trigger_manual_report(
    current_user: CurrentUser,
    report_type: str = Query("daily", description="Tipe laporan: daily atau weekly"),
    db: AsyncSession = Depends(get_db)
):
    """Mengirim laporan harian/mingguan ke seluruh email supervisor/admin aktif."""
    if current_user.role not in ("supervisor", "admin"):
        raise HTTPException(status_code=403, detail="Akses ditolak.")
        
    from app.services.scheduler import get_aggregate_stats, send_reports_to_all_supervisors
    stats = await get_aggregate_stats(db)
    
    is_weekly = (report_type == "weekly")
    await send_reports_to_all_supervisors(db, is_weekly=is_weekly, stats=stats)
        
    await db.commit()
    return {"status": "success", "message": f"Laporan {report_type} berhasil disiarkan ke seluruh supervisor/admin aktif."}


@router.post("/{ticket_id}/attachments", summary="Unggah lampiran baru untuk tiket")
async def upload_ticket_attachment(
    ticket_id: uuid.UUID,
    current_user: CurrentUser,
    file: UploadFile = File(..., description="File lampiran (maks 5MB)"),
    db: AsyncSession = Depends(get_db)
):
    """Mengunggah berkas lampiran baru untuk tiket helpdesk."""
    ticket = (await db.execute(select(Ticket).where(Ticket.id == ticket_id))).scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Tiket tidak ditemukan.")
    
    if str(ticket.created_by) != current_user.sub and current_user.role not in ("supervisor", "admin"):
        raise HTTPException(status_code=403, detail="Akses ditolak.")
        
    file_bytes = await file.read()
    MAX_SIZE = 5 * 1024 * 1024
    if len(file_bytes) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="Ukuran berkas melebihi 5MB.")
        
    from app.api.v1.documents import get_supabase
    supabase_client = get_supabase()
    
    file_uuid = uuid.uuid4()
    storage_path = f"attachments/{current_user.sub}/{file_uuid}/{file.filename}"
    
    try:
        supabase_client.storage.from_("attachments").upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": file.content_type}
        )
    except Exception as e:
        logger.error(f"Gagal upload ke Supabase Storage: {e}")
        raise HTTPException(status_code=400, detail="Gagal mengunggah berkas ke storage.")
        
    attachment = Attachment(
        id=file_uuid,
        uploaded_by=uuid.UUID(current_user.sub),
        file_name=file.filename or f"file_{file_uuid}",
        file_path=storage_path,
        file_type=file.content_type or "application/octet-stream",
        file_size_bytes=len(file_bytes),
        context_type="ticket",
        context_id=ticket_id,
        storage_bucket="attachments"
    )
    db.add(attachment)
    
    # Append ke attachment_ids JSONB list
    current_attachments = list(ticket.attachment_ids or [])
    current_attachments.append(str(file_uuid))
    ticket.attachment_ids = current_attachments
    
    await db.flush()
    await db.commit()
    
    return {
        "status": "success",
        "attachment": {
            "id": str(file_uuid),
            "file_name": attachment.file_name,
            "file_type": attachment.file_type,
            "file_size_bytes": attachment.file_size_bytes
        }
    }
