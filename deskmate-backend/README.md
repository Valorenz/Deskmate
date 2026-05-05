# DeskMate Backend — Panduan Startup Lengkap

## Struktur Folder Final

```
deskmate-backend/
│
├── main.py                         ← Entry point FastAPI
├── requirements.txt                ← Semua dependencies
├── .env.example                    ← Template konfigurasi
├── dev_ui.html                     ← UI sementara untuk testing
│
├── migrations/
│   ├── V1__create_enums.sql
│   ├── V2__create_tables.sql
│   ├── V3__functions_and_triggers.sql
│   ├── V4__create_indexes.sql
│   ├── V5__row_level_security.sql
│   ├── V6__seed_data.sql
│   └── V7__add_image_support.sql
│
└── app/
    ├── __init__.py
    │
    ├── api/
    │   ├── __init__.py
    │   └── v1/
    │       ├── __init__.py
    │       ├── chat.py             ← Router chat + RAG
    │       ├── documents.py        ← Router upload dokumen
    │       ├── profiles.py         ← Router profil user
    │       └── tickets.py          ← Router tiket + email
    │
    ├── core/
    │   ├── __init__.py
    │   ├── config.py               ← Konfigurasi dari .env
    │   ├── dependencies.py         ← get_current_user (JWT guard)
    │   └── security.py             ← verify_supabase_token
    │
    ├── db/
    │   ├── __init__.py
    │   └── session.py              ← Engine + AsyncSession + get_db
    │
    ├── models/
    │   ├── __init__.py
    │   ├── attachment.py
    │   ├── chat.py
    │   ├── document.py
    │   ├── email_log.py
    │   ├── profile.py
    │   └── ticket.py
    │
    ├── schemas/
    │   ├── __init__.py
    │   ├── chat.py
    │   ├── profile.py
    │   └── ticket.py
    │
    └── services/
        ├── __init__.py
        ├── email_service.py        ← Notifikasi SMTP
        ├── llm_service.py          ← Wrapper Gemini API
        ├── rag_service.py          ← Orkestrasi RAG
        └── vector_service.py       ← ChromaDB operations
```

---

## Checklist Sebelum Menjalankan

### Step 1 — Setup Supabase
- [ ] Buat project baru di supabase.com
- [ ] Jalankan migration SQL di Supabase SQL Editor (V1 → V7, berurutan)
- [ ] Buat bucket Storage: `documents` dan `attachments` (jika V7 gagal buat otomatis)
- [ ] Catat: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET

### Step 2 — Setup Google Gemini API
- [ ] Buka aistudio.google.com
- [ ] Buat API Key baru
- [ ] Pastikan model `gemini-2.5-flash` tersedia di akun kamu

### Step 3 — Setup Environment
```powershell
# Salin template
copy .env.example .env

# Edit .env, isi minimal:
# SUPABASE_URL=...
# SUPABASE_ANON_KEY=...
# SUPABASE_JWT_SECRET=...
# DATABASE_URL=postgresql+asyncpg://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres
# GEMINI_API_KEY=...
```

### Step 4 — Install & Jalankan
```powershell
# Buat virtual environment
python -m venv venv
venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Jalankan server
uvicorn main:app --reload --port 8000
```

### Step 5 — Verifikasi
- [ ] Buka http://localhost:8000/health → harus balas {"status": "ok"}
- [ ] Buka http://localhost:8000/docs → Swagger UI muncul
- [ ] Buka dev_ui.html di browser → klik Health Check → dot hijau muncul

### Step 6 — Test Flow Lengkap
1. Login di Supabase Dashboard → Authentication → Users → Add user
2. Copy JWT dari: Supabase Dashboard → Authentication → Users → klik user → copy JWT
3. Buka dev_ui.html → Auth → paste JWT → Simpan Token
4. Test profil → klik "My Profile"
5. Upload dokumen SOP (PDF) → tunggu status indexed
6. Buat sesi chat → kirim pertanyaan tentang isi dokumen
7. Buat tiket → cek email notifikasi

---

## Variabel .env Lengkap

```env
# Aplikasi
DEBUG=True
ALLOWED_ORIGINS=["http://localhost:5173","http://localhost:3000"]

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_JWT_SECRET=your-jwt-secret

# Database
DATABASE_URL=postgresql+asyncpg://postgres:PASSWORD@db.xxxx.supabase.co:5432/postgres

# Gemini
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash

# ChromaDB
CHROMA_PERSIST_DIRECTORY=./chroma_db

# Email SMTP (opsional untuk testing awal, bisa dikosongkan)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASSWORD=app-password-16-karakter
EMAIL_FROM=deskmate@epson.internal
```

### Cara dapat SMTP Password Gmail:
1. Google Account → Security → 2-Step Verification (aktifkan dulu)
2. Google Account → Security → App Passwords
3. Pilih "Mail" → Generate → Salin 16 karakter yang muncul

---

## Troubleshooting Umum

| Error | Solusi |
|---|---|
| `ModuleNotFoundError: app` | Pastikan jalankan uvicorn dari folder `deskmate-backend/`, bukan dari dalam `app/` |
| `Connection refused` di DATABASE_URL | Cek DATABASE_URL di .env, pastikan password benar |
| `401 Unauthorized` di semua endpoint | JWT token expired atau salah. Ambil token baru dari Supabase |
| `ChromaDB error` | Folder `chroma_db/` akan dibuat otomatis. Jika error, hapus folder tersebut dan restart |
| `SMTP authentication failed` | Gunakan App Password Gmail, bukan password akun biasa |
| `indexing_status` tetap `pending` | Background task gagal. Cek log terminal untuk error detail |
