# app/core/dependencies.py
# -------------------------------------------------------
# Cara kerja: Ini adalah "PENJAGA PINTU" untuk endpoint
# yang butuh login.
#
# FastAPI Dependency Injection bekerja seperti ini:
# Saat request masuk ke endpoint yang dilindungi,
# FastAPI OTOMATIS menjalankan fungsi `get_current_user`
# SEBELUM handler utama dieksekusi.
#
# Jika token tidak ada / tidak valid → langsung tolak (401/403)
# Jika valid → inject data user ke dalam handler
#
# Cara pakai di router:
#   @router.get("/secret")
#   async def secret(user: CurrentUser):
#       return {"message": f"Halo, {user.email}"}
# -------------------------------------------------------

from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWTError

from app.core.security import TokenPayload, verify_supabase_token

# HTTPBearer: Mengekstrak token dari header "Authorization: Bearer <token>"
# auto_error=False agar kita bisa beri pesan error yang lebih informatif
_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
) -> TokenPayload:
    """
    Dependency utama untuk memproteksi endpoint.

    Mengekstrak JWT dari header Authorization, memverifikasinya,
    dan mengembalikan data payload user jika valid.
    """
    # --- Cek 1: Apakah header Authorization ada? ---
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token autentikasi tidak ditemukan. Harap login terlebih dahulu.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # --- Cek 2: Apakah token valid & belum kedaluwarsa? ---
    try:
        token_payload = verify_supabase_token(credentials.credentials)
    except PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token tidak valid atau telah kedaluwarsa: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return token_payload


# Type alias untuk kemudahan penulisan di router
# Cukup ketik `user: CurrentUser` sebagai parameter
CurrentUser = Annotated[TokenPayload, Depends(get_current_user)]
