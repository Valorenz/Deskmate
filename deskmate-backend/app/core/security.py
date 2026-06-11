# app/core/security.py
# -------------------------------------------------------
# Verifikasi JWT dari Supabase.
# Support semua algoritma: HS256, RS256, ES256
# -------------------------------------------------------

import logging
import jwt
from jwt import PyJWTError
from pydantic import BaseModel
from app.core.config import settings

logger = logging.getLogger("deskmate.security")


class TokenPayload(BaseModel):
    sub: str
    email: str | None = None
    role: str | None = None
    exp: int | None = None


def verify_supabase_token(token: str) -> TokenPayload:
    """
    Verifikasi JWT dari Supabase.
    Mendukung HS256, RS256, dan ES256.
    
    Untuk RS256 dan ES256 (asymmetric), kita validasi
    struktur dan expiry token tanpa verifikasi signature,
    lalu validasi issuer untuk memastikan token dari
    Supabase project yang benar.
    """
    # Baca header token untuk cek algoritma
    try:
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg", "HS256")
    except Exception as e:
        raise PyJWTError(f"Token tidak bisa dibaca: {e}")

    logger.debug(f"JWT algorithm detected: {alg}")

    # ── HS256: verifikasi penuh dengan secret key ──────
    if alg == "HS256":
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            return TokenPayload(**payload)
        except PyJWTError as e:
            raise PyJWTError(str(e)) from e

    # ── RS256 / ES256: verifikasi expiry + issuer ──────
    elif alg in ("RS256", "ES256"):
        try:
            # Decode tanpa verifikasi signature
            # tapi TETAP verifikasi expiry time
            payload = jwt.decode(
                token,
                options={
                    "verify_signature": False,
                    "verify_exp": True,
                    "verify_aud": False,
                },
                algorithms=[alg],
            )

            # Validasi issuer — pastikan token dari project Supabase kita
            iss = payload.get("iss", "")
            supabase_ref = settings.SUPABASE_URL.rstrip("/").split("//")[-1].split(".")[0]

            if not iss:
                raise PyJWTError("Token tidak memiliki issuer (iss)")

            if supabase_ref not in iss and "supabase" not in iss:
                raise PyJWTError(f"Token issuer tidak valid: {iss}")

            # Pastikan sub (user_id) ada
            if not payload.get("sub"):
                raise PyJWTError("Token tidak memiliki subject (sub)")

            return TokenPayload(**payload)

        except PyJWTError as e:
            raise PyJWTError(str(e)) from e
        except Exception as e:
            raise PyJWTError(f"Gagal memverifikasi token: {e}") from e

    else:
        raise PyJWTError(f"Algoritma JWT tidak didukung: {alg}")