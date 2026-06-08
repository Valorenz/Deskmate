# app/api/v1/profiles.py
# -------------------------------------------------------
# Router untuk manajemen profil karyawan.
# Semua endpoint di sini WAJIB login (CurrentUser).
# -------------------------------------------------------

import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request, File, UploadFile
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser
from app.db.session import get_db
from app.models.profile import Profile
from app.models.session import UserSession
from app.schemas.profile import ProfileAdminUpdate, ProfileResponse, ProfileUpdate
from app.schemas.session import UserSessionResponse

logger = logging.getLogger("deskmate.profiles")
router = APIRouter()


@router.get("/me", response_model=ProfileResponse, summary="Lihat profil saya")
async def get_my_profile(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Mengambil data profil lengkap user yang sedang login."""
    result = await db.execute(
        select(Profile).where(Profile.id == current_user.sub)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil tidak ditemukan. Hubungi administrator.",
        )
    profile.email = current_user.email
    return profile


@router.patch("/me", response_model=ProfileResponse, summary="Update profil saya")
async def update_my_profile(
    body: ProfileUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Update data profil sendiri.
    Hanya field yang dikirim yang akan diubah (partial update).
    """
    result = await db.execute(
        select(Profile).where(Profile.id == current_user.sub)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail="Profil tidak ditemukan.")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    await db.flush()
    await db.refresh(profile)
    profile.email = current_user.email
    return profile


@router.get(
    "/{profile_id}",
    response_model=ProfileResponse,
    summary="Lihat profil user lain (Admin/Supervisor)",
)
async def get_profile_by_id(
    profile_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Hanya supervisor dan admin yang bisa mengakses profil orang lain."""
    if current_user.role not in ("supervisor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Anda tidak memiliki izin untuk mengakses profil orang lain.",
        )

    result = await db.execute(select(Profile).where(Profile.id == profile_id))
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail="Profil tidak ditemukan.")
    
    # Query email from auth.users
    email_result = await db.execute(
        text("SELECT email FROM auth.users WHERE id = :id"),
        {"id": profile_id}
    )
    email_row = email_result.first()
    profile.email = email_row[0] if email_row else None
    
    return profile


@router.patch(
    "/{profile_id}/admin",
    response_model=ProfileResponse,
    summary="Update profil user lain (Admin only)",
)
async def admin_update_profile(
    profile_id: uuid.UUID,
    body: ProfileAdminUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Admin bisa mengubah role, status aktif, dan data profil karyawan lain."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya admin yang bisa menggunakan endpoint ini.",
        )

    result = await db.execute(select(Profile).where(Profile.id == profile_id))
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail="Profil tidak ditemukan.")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    await db.flush()
    await db.refresh(profile)
    
    # Query email from auth.users
    email_result = await db.execute(
        text("SELECT email FROM auth.users WHERE id = :id"),
        {"id": profile_id}
    )
    email_row = email_result.first()
    profile.email = email_row[0] if email_row else None
    
    return profile


@router.get(
    "/",
    response_model=list[ProfileResponse],
    summary="Daftar semua profil (Admin/Supervisor)",
)
async def get_all_profiles(
    current_user: CurrentUser,
    role: str | None = None,
    department: str | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Admin dan Supervisor bisa melihat semua profil, melakukan pencarian, dan filter."""
    if current_user.role not in ("admin", "supervisor"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Anda tidak memiliki izin untuk melihat daftar profil.",
        )

    query = select(Profile)
    if role:
        query = query.where(Profile.role == role)
    if department:
        query = query.where(Profile.department == department)
        
    if search:
        email_search_res = await db.execute(
            text("SELECT id FROM auth.users WHERE email ILIKE :search"),
            {"search": f"%{search}%"}
        )
        matching_ids = [row[0] for row in email_search_res.all()]
        
        if matching_ids:
            query = query.where(
                (Profile.full_name.ilike(f"%{search}%")) |
                (Profile.employee_id.ilike(f"%{search}%")) |
                (Profile.id.in_(matching_ids))
            )
        else:
            query = query.where(
                (Profile.full_name.ilike(f"%{search}%")) |
                (Profile.employee_id.ilike(f"%{search}%"))
            )
            
    query = query.order_by(Profile.full_name.asc())
    result = await db.execute(query)
    profiles = result.scalars().all()
    
    # Get all emails in one batch query
    user_ids = [p.id for p in profiles]
    emails = {}
    if user_ids:
        email_result = await db.execute(
            text("SELECT id, email FROM auth.users WHERE id = ANY(:ids)"),
            {"ids": user_ids}
        )
        emails = {row[0]: row[1] for row in email_result.all()}
        
    for p in profiles:
        p.email = emails.get(p.id)
        
    return profiles


@router.get(
    "/me/sessions",
    response_model=list[UserSessionResponse],
    summary="Sesi aktif saya",
)
async def get_my_sessions(
    request: Request,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Mendapatkan daftar sesi aktif milik user yang sedang login, secara otomatis mencatat sesi baru."""
    user_agent = request.headers.get("user-agent", "Unknown Device")
    
    device = "Unknown Device"
    if "Mozilla" in user_agent:
        browser = "Chrome"
        if "Firefox" in user_agent:
            browser = "Firefox"
        elif "Safari" in user_agent and "Chrome" not in user_agent:
            browser = "Safari"
        elif "Edge" in user_agent:
            browser = "Edge"
            
        os_name = "Windows"
        if "Macintosh" in user_agent or "Mac OS X" in user_agent:
            os_name = "macOS"
        elif "Linux" in user_agent:
            os_name = "Linux"
        elif "iPhone" in user_agent:
            os_name = "iPhone"
        elif "Android" in user_agent:
            os_name = "Android"
            
        device = f"{browser} on {os_name}"
    else:
        device = user_agent[:50]
        
    client_ip = request.client.host if request.client else "127.0.0.1"
    location = "Indonesia"
    if client_ip in ("127.0.0.1", "localhost", "::1"):
        location = "Local Network"

    user_uuid = uuid.UUID(current_user.sub)
    result = await db.execute(
        select(UserSession).where(
            UserSession.user_id == user_uuid,
            UserSession.device == device,
            UserSession.is_active == True
        )
    )
    existing_session = result.scalar_one_or_none()

    if not existing_session:
        new_session = UserSession(
            user_id=user_uuid,
            device=device,
            location=location,
            is_active=True
        )
        db.add(new_session)
        await db.flush()

    result = await db.execute(
        select(UserSession).where(
            UserSession.user_id == user_uuid,
            UserSession.is_active == True
        ).order_by(UserSession.updated_at.desc())
    )
    return result.scalars().all()


@router.delete(
    "/me/sessions/{session_id}",
    summary="Cabut sesi login",
)
async def revoke_session(
    session_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Mencabut/menghapus sesi login aktif."""
    user_uuid = uuid.UUID(current_user.sub)
    result = await db.execute(
        select(UserSession).where(
            UserSession.id == session_id,
            UserSession.user_id == user_uuid
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesi tidak ditemukan atau bukan milik Anda.",
        )

    await db.delete(session)
    await db.flush()
    return {"status": "success", "message": "Sesi berhasil dicabut."}


@router.post(
    "/me/avatar",
    response_model=ProfileResponse,
    summary="Upload foto profil",
)
async def upload_my_avatar(
    current_user: CurrentUser,
    file: UploadFile = File(..., description="File gambar JPEG/PNG/WebP"),
    db: AsyncSession = Depends(get_db),
):
    """Upload foto profil baru ke bucket avatars Supabase Storage."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nama file tidak boleh kosong.")

    file_bytes = await file.read()
    MAX_SIZE_BYTES = 2 * 1024 * 1024  # 2MB
    if len(file_bytes) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Ukuran file melebihi batas maksimal (2MB).",
        )

    file_type = file.content_type or ""
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if not file_type.startswith("image/") or file_type not in allowed_types:
        raise HTTPException(
            status_code=415,
            detail="Tipe file tidak didukung. Gunakan JPG, PNG, atau WebP.",
        )

    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    storage_path = f"{current_user.sub}/avatar.{ext}"

    try:
        from app.api.v1.documents import get_supabase
        supabase = get_supabase()
        supabase.storage.from_("avatars").upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": file_type, "x-upsert": "true"},
        )
        
        from app.core.config import settings
        avatar_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/avatars/{storage_path}"
    except Exception as e:
        logger.error(f"Gagal upload avatar ke Supabase Storage: {e}")
        raise HTTPException(
            status_code=500,
            detail="Gagal menyimpan gambar ke storage. Coba lagi.",
        )

    result = await db.execute(
        select(Profile).where(Profile.id == current_user.sub)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profil tidak ditemukan.")

    profile.avatar_url = avatar_url
    await db.flush()
    await db.refresh(profile)
    profile.email = current_user.email
    return profile


from pydantic import BaseModel, Field

class DirectMessageCreate(BaseModel):
    subject: str = Field(..., min_length=3, max_length=255)
    content: str = Field(..., min_length=5)


@router.get(
    "/audit-logs",
    summary="Ambil log audit aktivitas email (Admin only)",
)
async def get_audit_logs(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Akses ditolak.")
        
    from app.models.email_log import EmailLog
    result = await db.execute(
        select(EmailLog).order_by(EmailLog.created_at.desc()).limit(50)
    )
    logs = result.scalars().all()
    
    return [
        {
            "id": str(log.id),
            "recipient_email": log.recipient_email,
            "subject": log.subject,
            "template_name": log.template_name,
            "status": log.status,
            "error_message": log.error_message,
            "created_at": log.created_at.isoformat() if log.created_at else None,
            "sent_at": log.sent_at.isoformat() if log.sent_at else None,
        }
        for log in logs
    ]


@router.get(
    "/{profile_id}/sessions",
    response_model=list[UserSessionResponse],
    summary="Daftar sesi aktif user lain (Admin/Supervisor)",
)
async def get_user_sessions(
    profile_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in ("supervisor", "admin"):
        raise HTTPException(status_code=403, detail="Akses ditolak.")
        
    result = await db.execute(
        select(UserSession).where(
            UserSession.user_id == profile_id,
            UserSession.is_active == True
        ).order_by(UserSession.updated_at.desc())
    )
    return result.scalars().all()


@router.delete(
    "/{profile_id}/sessions/{session_id}",
    summary="Cabut sesi login user lain (Admin/Supervisor)",
)
async def revoke_user_session(
    profile_id: uuid.UUID,
    session_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in ("supervisor", "admin"):
        raise HTTPException(status_code=403, detail="Akses ditolak.")
        
    result = await db.execute(
        select(UserSession).where(
            UserSession.id == session_id,
            UserSession.user_id == profile_id
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Sesi tidak ditemukan.")
        
    await db.delete(session)
    await db.flush()
    return {"status": "success", "message": "Sesi berhasil dicabut."}


@router.post(
    "/{profile_id}/send-message",
    summary="Kirim email kustom langsung ke karyawan (Admin/Supervisor)",
)
async def send_direct_message(
    profile_id: uuid.UUID,
    body: DirectMessageCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db)
):
    if current_user.role not in ("supervisor", "admin"):
        raise HTTPException(status_code=403, detail="Akses ditolak.")
        
    profile = (await db.execute(select(Profile).where(Profile.id == profile_id))).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profil karyawan tidak ditemukan.")
        
    email_result = await db.execute(
        text("SELECT email FROM auth.users WHERE id = :id"),
        {"id": profile_id}
    )
    email_row = email_result.first()
    if not email_row or not email_row[0]:
        raise HTTPException(status_code=400, detail="Karyawan tidak memiliki email terdaftar.")
    to_email = email_row[0]
    
    from app.services.email_service import email_service
    await email_service.send_custom_message(
        db=db,
        to_email=to_email,
        recipient_id=str(profile_id),
        subject=body.subject,
        content=body.content,
        sender_name=current_user.email or "Administrator"
    )
    await db.commit()
    
    return {"status": "success", "message": f"Pesan berhasil dikirim ke {to_email}"}
