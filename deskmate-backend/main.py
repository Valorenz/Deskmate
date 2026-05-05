# main.py — FINAL dengan Auth Router

from contextlib import asynccontextmanager
import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse

from app.core.config import settings
from app.core.dependencies import CurrentUser
from app.api.v1 import profiles, tickets, chat, documents, auth

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("deskmate")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 DeskMate Backend starting up...")
    logger.info(f"   Mode   : {'DEBUG' if settings.DEBUG else 'PRODUCTION'}")
    logger.info(f"   Version: {settings.APP_VERSION}")
    os.makedirs(settings.CHROMA_PERSIST_DIRECTORY, exist_ok=True)
    logger.info(f"   ChromaDB: {settings.CHROMA_PERSIST_DIRECTORY}")
    yield
    logger.info("🛑 DeskMate Backend shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI Helpdesk Assistant — PT. Indonesia Epson Industry",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────
if settings.DEBUG:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )

# ── Router Registration ────────────────────────────────────────────
app.include_router(auth.router,      prefix="/api/v1/auth",      tags=["Auth"])
app.include_router(profiles.router,  prefix="/api/v1/profiles",  tags=["Profiles"])
app.include_router(tickets.router,   prefix="/api/v1/tickets",   tags=["Tickets"])
app.include_router(chat.router,      prefix="/api/v1/chat",      tags=["Chat"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])


# ── Serve dev_ui.html ──────────────────────────────────────────────
@app.get("/ui", include_in_schema=False)
async def serve_dev_ui():
    ui_path = os.path.join(os.path.dirname(__file__), "dev_ui.html")
    if os.path.exists(ui_path):
        return FileResponse(ui_path, media_type="text/html")
    return JSONResponse({"error": "dev_ui.html tidak ditemukan"}, status_code=404)


# ── System Endpoints ───────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}


@app.get("/api/v1/me", tags=["Auth"])
async def get_me(current_user: CurrentUser):
    return {
        "user_id": current_user.sub,
        "email": current_user.email,
        "role": current_user.role,
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "detail": str(exc) if settings.DEBUG else "Internal server error",
        },
    )