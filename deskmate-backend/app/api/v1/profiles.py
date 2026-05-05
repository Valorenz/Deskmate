# app/api/v1/profiles.py
# -------------------------------------------------------
# Router untuk manajemen profil karyawan.
# Semua endpoint di sini WAJIB login (CurrentUser).
# -------------------------------------------------------

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser
from app.db.session import get_db
from app.models.profile import Profile
from app.schemas.profile import ProfileAdminUpdate, ProfileResponse, ProfileUpdate

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

    # Hanya update field yang dikirim (exclude_unset=True)
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    await db.flush()  # Kirim perubahan ke DB tapi belum commit
    await db.refresh(profile)  # Ambil data terbaru dari DB
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
    return profile
