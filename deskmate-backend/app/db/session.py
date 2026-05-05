# app/db/session.py
# -------------------------------------------------------
# Cara kerja:
# SQLAlchemy async engine mengelola "pool" koneksi ke
# PostgreSQL. Daripada buka-tutup koneksi setiap request
# (lambat), pool mempertahankan sejumlah koneksi yang siap
# pakai dan mendaur ulangnya.
#
# AsyncSession = koneksi per-request yang bersifat
# non-blocking, cocok untuk FastAPI yang async.
# -------------------------------------------------------

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# Engine: representasi koneksi ke database
# pool_size      = jumlah koneksi yang dipertahankan di pool
# max_overflow   = koneksi tambahan saat pool penuh (sementara)
# pool_pre_ping  = cek koneksi masih hidup sebelum dipakai (hindari stale connection)
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=settings.DEBUG,  # Print SQL query ke console saat DEBUG=True
)

# Session factory: blueprint untuk membuat sesi database
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Objek tetap bisa diakses setelah commit
    autocommit=False,
    autoflush=False,
)


# Base class untuk semua model SQLAlchemy
class Base(DeclarativeBase):
    pass


# ── Dependency: get_db ────────────────────────────────────────────
# Generator async yang menyediakan sesi database per-request.
# FastAPI akan otomatis memanggil ini via Depends(get_db).
#
# Pola "yield" memastikan sesi SELALU ditutup setelah request
# selesai, bahkan jika terjadi error di tengah jalan.
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()  # Commit jika tidak ada error
        except Exception:
            await session.rollback()  # Rollback jika ada error
            raise
        finally:
            await session.close()  # Selalu tutup sesi
