# DeskMate Backend

> AI Helpdesk Assistant berbasis RAG (Retrieval-Augmented Generation) untuk operasional manufaktur PT. Indonesia Epson Industry.

## Status Proyek

| Komponen | Status |
|---|---|
| FastAPI Server | ✅ Selesai & Berjalan |
| Autentikasi JWT (Supabase) | ✅ Selesai & Berjalan |
| Database PostgreSQL | ✅ Selesai & Terhubung |
| Chat RAG (Gemini 2.5 Flash) | ✅ Selesai & Berjalan |
| Vector Database (ChromaDB) | ✅ Selesai & Siap |
| Upload Dokumen SOP/FAQ | ✅ Selesai |
| Tiket Helpdesk | ✅ Selesai |
| Notifikasi Email (SMTP) | ✅ Selesai (konfigurasi opsional) |
| Row Level Security (RLS) | ✅ Selesai |
| Dev UI (Testing) | ✅ Selesai |

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | FastAPI (Python 3.11+) |
| Auth & Database | Supabase (PostgreSQL + JWT) |
| AI & RAG | LangChain + Gemini 2.5 Flash |
| Vector Database | ChromaDB (lokal) |
| Notifikasi | SMTP (aiosmtplib) |
| Driver DB | asyncpg + SQLAlchemy async |

---

## Struktur Folder

```
deskmate-backend/
│
├── main.py                         ← Entry point FastAPI
├── requirements.txt                ← Semua dependencies Python
├── .env.example                    ← Template konfigurasi (salin ke .env)
├── .gitignore                      ← File yang dikecualikan dari Git
├── dev_ui.html                     ← Dev console UI untuk testing API
├── README.md                       ← Dokumentasi ini
│
├── migrations/                     ← SQL migration untuk Supabase
│   ├── V1__create_enums.sql        ← Custom ENUM types
│   ├── V2__create_tables.sql       ← Semua tabel utama
│   ├── V3__functions_and_triggers.sql ← Trigger otomatis DB
│   ├── V4__create_indexes.sql      ← Index untuk performa
│   ├── V5__row_level_security.sql  ← RLS policies
│   ├── V6__seed_data.sql           ← Data awal (dev only)
│   └── V7__add_image_support.sql   ← Tabel attachment & gambar
│
└── app/
    ├── __init__.py
    │
    ├── api/v1/                     ← Semua endpoint API
    │   ├── auth.py                 ← Login, register, refresh token
    │   ├── chat.py                 ← Chat RAG + session management
    │   ├── documents.py            ← Upload & indexing dokumen SOP/FAQ
    │   ├── profiles.py             ← Manajemen profil karyawan
    │   └── tickets.py              ← Helpdesk tiket + komentar
    │
    ├── core/                       ← Konfigurasi & keamanan
    │   ├── config.py               ← Baca konfigurasi dari .env
    │   ├── dependencies.py         ← JWT guard (get_current_user)
    │   └── security.py             ← Verifikasi token (HS256/RS256/ES256)
    │
    ├── db/
    │   └── session.py              ← Async engine + session pool
    │
    ├── models/                     ← SQLAlchemy ORM models
    │   ├── attachment.py
    │   ├── chat.py
    │   ├── document.py
    │   ├── email_log.py
    │   ├── profile.py
    │   └── ticket.py
    │
    ├── schemas/                    ← Pydantic request/response schemas
    │   ├── chat.py
    │   ├── profile.py
    │   └── ticket.py
    │
    └── services/                   ← Business logic layer
        ├── email_service.py        ← Notifikasi SMTP (4 template HTML)
        ├── llm_service.py          ← Wrapper Gemini API (teks + vision)
        ├── rag_service.py          ← Orkestrasi pipeline RAG
        └── vector_service.py       ← ChromaDB (indexing & pencarian)
```

---

## Endpoint API

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| GET | `/health` | Publik | Health check server |
| GET | `/ui` | Publik | Dev console UI |
| GET | `/docs` | Publik | Swagger UI |
| POST | `/api/v1/auth/login` | Publik | Login, dapat JWT token |
| POST | `/api/v1/auth/register` | Publik | Buat akun baru |
| POST | `/api/v1/auth/refresh` | Publik | Refresh JWT token |
| GET | `/api/v1/me` | Auth | Info user dari token |
| GET | `/api/v1/profiles/me` | Auth | Profil lengkap user |
| PATCH | `/api/v1/profiles/me` | Auth | Update profil sendiri |
| GET | `/api/v1/profiles/{id}` | Supervisor/Admin | Profil user lain |
| POST | `/api/v1/chat/sessions` | Auth | Buat sesi chat baru |
| GET | `/api/v1/chat/sessions` | Auth | List sesi chat saya |
| GET | `/api/v1/chat/sessions/{id}/messages` | Auth | Riwayat pesan |
| POST | `/api/v1/chat/sessions/{id}/messages` | Auth | Kirim pesan ke AI (RAG) |
| POST | `/api/v1/chat/sessions/{id}/messages/with-image` | Auth | Chat dengan gambar |
| DELETE | `/api/v1/chat/sessions/{id}` | Auth | Tutup sesi chat |
| POST | `/api/v1/documents/upload` | Admin | Upload dokumen SOP/FAQ |
| GET | `/api/v1/documents/` | Auth | List dokumen tersedia |
| DELETE | `/api/v1/documents/{id}` | Admin | Hapus dokumen |
| POST | `/api/v1/tickets/` | Auth | Buat tiket helpdesk |
| GET | `/api/v1/tickets/` | Auth | List tiket |
| GET | `/api/v1/tickets/{id}` | Auth | Detail tiket |
| PATCH | `/api/v1/tickets/{id}` | Auth | Update tiket |
| POST | `/api/v1/tickets/{id}/comments` | Auth | Tambah komentar |

---

## Cara Menjalankan (Windows)

### Prasyarat
- Python 3.11 atau 3.12 (direkomendasikan)
- Akun Supabase (supabase.com)
- Google Gemini API Key (aistudio.google.com)

### Step 1 — Setup Supabase

1. Buat project baru di supabase.com
2. Buka **SQL Editor**, jalankan migration berurutan: `V1` → `V2` → `V3` → `V4` → `V5` → `V6` → `V7`
3. Matikan **"Confirm email"** di Authentication → Providers → Email (untuk development)
4. Catat nilai berikut dari **Settings → API**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_JWT_SECRET`
5. Catat `DATABASE_URL` dari **Settings → Database → Connection string → URI**

### Step 2 — Setup Environment

```powershell
# Salin template .env
copy .env.example .env
```

Edit file `.env` dan isi semua nilai yang diperlukan (lihat bagian Konfigurasi di bawah).

### Step 3 — Install & Jalankan

```powershell
# Masuk ke folder project
cd E:\path\ke\deskmate-backend

# Buat virtual environment
python -m venv venv

# Aktifkan virtual environment
venv\Scripts\Activate.ps1

# Install semua dependencies
pip install -r requirements.txt
pip install asyncpg langchain-core langchain-text-splitters

# Jalankan server development
uvicorn main:app --reload --port 8000
```

### Step 4 — Verifikasi

| URL | Yang Diharapkan |
|---|---|
| `http://localhost:8000/health` | `{"status": "ok"}` |
| `http://localhost:8000/docs` | Swagger UI muncul |
| `http://localhost:8000/ui` | Dev console UI muncul |

### Step 5 — Login & Test

1. Buka `http://localhost:8000/ui`
2. Pergi ke menu **Login & Token**
3. Masukkan email & password, klik **Login**
4. Token otomatis tersimpan
5. Test fitur chat, upload dokumen, dan tiket

---

## Konfigurasi `.env`

```env
# Aplikasi
DEBUG=True
ALLOWED_ORIGINS=["http://localhost:5173","http://localhost:3000","http://localhost:8000"]

# Supabase Auth & API
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_JWT_SECRET=sb_secret_...

# Database PostgreSQL (gunakan +asyncpg, WAJIB)
DATABASE_URL=postgresql+asyncpg://postgres:PASSWORD@db.xxxx.supabase.co:5432/postgres

# Google Gemini AI
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash

# ChromaDB (dibuat otomatis, tidak perlu diubah)
CHROMA_PERSIST_DIRECTORY=./chroma_db

# Email SMTP (opsional, bisa dikosongkan untuk development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=deskmate@epson.internal
```

> ⚠️ **Penting:** `DATABASE_URL` harus menggunakan prefix `postgresql+asyncpg://` bukan `postgresql://`. Tanpa `+asyncpg` server tidak bisa start.

---

## Troubleshooting

| Error | Penyebab | Solusi |
|---|---|---|
| `ModuleNotFoundError: app` | Uvicorn dijalankan dari folder yang salah | Pastikan jalankan dari folder `deskmate-backend/` |
| `No module named 'psycopg2'` | Driver DB salah | Jalankan `pip install asyncpg` |
| `asyncio extension requires async driver` | Prefix DATABASE_URL salah | Tambahkan `+asyncpg` setelah `postgresql` di .env |
| `getaddrinfo failed` | Project Supabase pause atau koneksi gagal | Buka Supabase Dashboard, klik Restore project |
| `The specified alg value is not allowed` | Algoritma JWT tidak didukung | Update `security.py` ke versi terbaru |
| `401 Unauthorized` | Token tidak ada atau expired | Login ulang via `/api/v1/auth/login` |
| `indexing_status` tetap `pending` | Background indexing gagal | Cek log terminal, pastikan GEMINI_API_KEY valid |
| `SMTP authentication failed` | Password email salah | Gunakan App Password Gmail 16 karakter |
| `Failed to fetch` di dev_ui | Buka file HTML langsung, bukan via server | Akses via `http://localhost:8000/ui` |

---

## Catatan Pengembangan

### Dependensi Tambahan yang Perlu Diinstall Manual
Beberapa package perlu diinstall terpisah karena kompatibilitas Python 3.13:

```powershell
pip install asyncpg
pip install langchain-core
pip install langchain-text-splitters
pip install psycopg2-binary
```

### Algoritma JWT Supabase
Project ini mendukung tiga algoritma JWT yang digunakan Supabase:
- **HS256** — verifikasi penuh dengan `SUPABASE_JWT_SECRET`
- **RS256** — verifikasi expiry + issuer
- **ES256** — verifikasi expiry + issuer (default Supabase terbaru)

### Cara Update ke GitHub
```powershell
git add .
git commit -m "deskripsi perubahan"
git push
```

---

## Lisensi

Project Capstone — PT. Indonesia Epson Industry × [Nama Institusi Kamu]  
Dibuat untuk keperluan akademik. Tidak untuk distribusi komersial.
