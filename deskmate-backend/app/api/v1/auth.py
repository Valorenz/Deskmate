# app/api/v1/auth.py
# -------------------------------------------------------
# Router untuk autentikasi — login & register via Supabase Auth.
# Endpoint ini tidak memerlukan JWT token (publik).
# -------------------------------------------------------

import logging
import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.core.config import settings

logger = logging.getLogger("deskmate.auth")
router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    refresh_token: str
    user_id: str
    email: str


# ── Endpoints ─────────────────────────────────────────────────────

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login dengan email & password",
    description="Mengembalikan JWT access_token yang dipakai untuk semua endpoint terproteksi.",
)
async def login(body: LoginRequest):
    """
    Login via Supabase Auth.
    Gunakan access_token dari response ini di tombol Authorize 🔒 di Swagger UI.
    """
    supabase_auth_url = f"{settings.SUPABASE_URL.rstrip(chr(47))}/auth/v1/token?grant_type=password"

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                supabase_auth_url,
                headers={
                    "apikey": settings.SUPABASE_ANON_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "email": body.email,
                    "password": body.password,
                },
                timeout=10.0,
            )
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Koneksi ke Supabase timeout. Coba lagi.",
            )

    if response.status_code != 200:
        error_data = response.json()
        error_msg = error_data.get("error_description") or error_data.get("msg") or error_data.get("error") or str(error_data)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_msg,
        )

    data = response.json()
    user = data.get("user", {})

    logger.info(f"User login berhasil: {body.email}")

    return TokenResponse(
        access_token=data["access_token"],
        token_type=data.get("token_type", "bearer"),
        expires_in=data.get("expires_in", 3600),
        refresh_token=data.get("refresh_token", ""),
        user_id=user.get("id", ""),
        email=user.get("email", body.email),
    )


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    summary="Register akun baru",
    description="Membuat akun baru via Supabase Auth. Profil akan dibuat otomatis oleh trigger database.",
)
async def register(body: RegisterRequest):
    """
    Register user baru.
    Setelah register, trigger database otomatis membuat baris di tabel profiles.
    """
    supabase_signup_url = f"{settings.SUPABASE_URL.rstrip(chr(47))}/auth/v1/signup"

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                supabase_signup_url,
                headers={
                    "apikey": settings.SUPABASE_ANON_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "email": body.email,
                    "password": body.password,
                    "data": {
                        "full_name": body.full_name,
                    },
                },
                timeout=10.0,
            )
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Koneksi ke Supabase timeout.")

    if response.status_code not in (200, 201):
        error_data = response.json()
        error_msg = error_data.get("msg") or error_data.get("error_description") or "Registrasi gagal"
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)

    data = response.json()
    user = data.get("user") or data

    logger.info(f"User baru terdaftar: {body.email}")

    return {
        "message": "Registrasi berhasil! Silakan login dengan akun Anda.",
        "user_id": user.get("id", ""),
        "email": body.email,
        "note": "Jika email konfirmasi diperlukan, cek inbox email kamu terlebih dahulu.",
    }


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh JWT token",
    description="Memperbarui access_token menggunakan refresh_token.",
)
async def refresh_token(refresh_token: str):
    """Memperbarui token yang sudah expired menggunakan refresh_token."""
    supabase_refresh_url = f"{settings.SUPABASE_URL.rstrip(chr(47))}/auth/v1/token?grant_type=refresh_token"

    async with httpx.AsyncClient() as client:
        response = await client.post(
            supabase_refresh_url,
            headers={
                "apikey": settings.SUPABASE_ANON_KEY,
                "Content-Type": "application/json",
            },
            json={"refresh_token": refresh_token},
            timeout=10.0,
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token tidak valid atau sudah expired. Silakan login ulang.",
        )

    data = response.json()
    user = data.get("user", {})

    return TokenResponse(
        access_token=data["access_token"],
        token_type=data.get("token_type", "bearer"),
        expires_in=data.get("expires_in", 3600),
        refresh_token=data.get("refresh_token", ""),
        user_id=user.get("id", ""),
        email=user.get("email", ""),
    )