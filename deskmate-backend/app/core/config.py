# app/core/config.py
# -------------------------------------------------------
# Cara kerja: Menggunakan pydantic-settings untuk membaca
# semua konfigurasi dari file .env secara otomatis & aman.
# Cukup akses `settings.SUPABASE_URL` di mana saja.
# -------------------------------------------------------

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # --- Identitas Aplikasi ---
    APP_NAME: str = "DeskMate AI Helpdesk"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # --- CORS: Daftar origin frontend yang diizinkan ---
    # Di .env: ALLOWED_ORIGINS=["http://localhost:5173","https://deskmate.epson.internal"]
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # --- Supabase ---
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_JWT_SECRET: str  # Diambil dari: Supabase Dashboard > Settings > API > JWT Secret

    # --- Database PostgreSQL (via Supabase atau direct) ---
    DATABASE_URL: str

    # --- Google Gemini ---
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # --- Vector Database ---
    CHROMA_PERSIST_DIRECTORY: str = "./chroma_db"

    # --- Email (SMTP) ---
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "deskmate@epson.internal"

    # Baca dari file .env secara otomatis
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


# lru_cache memastikan Settings hanya dibuat SEKALI selama aplikasi berjalan
# (tidak membaca .env berulang kali setiap request)
@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
