# app/schemas/profile.py
# -------------------------------------------------------
# Cara kerja Pydantic Schemas:
# - Schema "Request"  → validasi data MASUK dari frontend
# - Schema "Response" → bentuk data yang KELUAR ke frontend
#
# Memisahkan schema dari model database adalah praktik
# terbaik karena kita bisa kontrol data mana yang boleh
# diterima / dikirim tanpa mengubah model database.
# -------------------------------------------------------

import uuid
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, EmailStr, Field


# ── Base ──────────────────────────────────────────────────────────
class ProfileBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    employee_id: str | None = Field(None, max_length=50)
    department: str | None = Field(None, max_length=100)
    phone: str | None = Field(None, max_length=50)
    avatar_url: str | None = None


# ── Request: Update profil ────────────────────────────────────────
class ProfileUpdate(BaseModel):
    """Data yang boleh diubah oleh user sendiri."""
    full_name: str | None = Field(None, min_length=2, max_length=150)
    department: str | None = Field(None, max_length=100)
    phone: str | None = Field(None, max_length=50)
    avatar_url: str | None = None


# ── Request: Update oleh Admin ────────────────────────────────────
class ProfileAdminUpdate(ProfileUpdate):
    """Admin bisa ubah role dan status aktif user."""
    role: Literal["employee", "supervisor", "admin"] | None = None
    is_active: bool | None = None
    employee_id: str | None = Field(None, max_length=50)


# ── Response ──────────────────────────────────────────────────────
class ProfileResponse(ProfileBase):
    """Data profil yang dikirim ke frontend."""
    id: uuid.UUID
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    email: str | None = None

    model_config = {"from_attributes": True}  # Baca dari SQLAlchemy model


class ProfilePublicResponse(BaseModel):
    """Versi ringkas untuk ditampilkan di tiket/komentar (tanpa data sensitif)."""
    id: uuid.UUID
    full_name: str
    employee_id: str | None
    department: str | None
    role: str
    avatar_url: str | None

    model_config = {"from_attributes": True}
