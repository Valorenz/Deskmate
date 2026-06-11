-- =================================================================
-- DeskMate AI Helpdesk — SQL Migration
-- File    : V2__create_tables.sql
-- Desc    : Membuat semua tabel utama.
--           Pastikan V1__create_enums.sql sudah dijalankan dulu!
-- =================================================================


-- -----------------------------------------------------------------
-- TABEL 1: profiles
-- Ekstensi data user dari Supabase Auth.
-- Dibuat otomatis via trigger saat user baru register (lihat V4).
-- -----------------------------------------------------------------
CREATE TABLE public.profiles (
    id              UUID            PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name       VARCHAR(150)    NOT NULL,
    employee_id     VARCHAR(50)     UNIQUE,                      -- NIK karyawan
    department      VARCHAR(100),
    role            public.user_role NOT NULL DEFAULT 'employee',
    avatar_url      TEXT,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.profiles IS 'Data profil karyawan, ekstensi dari auth.users Supabase.';
COMMENT ON COLUMN public.profiles.id IS 'Sama dengan auth.users.id — relasi 1:1.';
COMMENT ON COLUMN public.profiles.role IS 'Menentukan hak akses: employee, supervisor, atau admin.';


-- -----------------------------------------------------------------
-- TABEL 2: documents
-- Metadata dokumen FAQ/SOP yang diupload admin.
-- File aslinya disimpan di Supabase Storage, embeddings di ChromaDB.
-- -----------------------------------------------------------------
CREATE TABLE public.documents (
    id                  UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by         UUID                    NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    title               VARCHAR(255)            NOT NULL,
    description         TEXT,
    file_name           VARCHAR(255)            NOT NULL,        -- Nama file asli
    file_path           TEXT                    NOT NULL,        -- Path di Supabase Storage
    file_type           VARCHAR(50)             NOT NULL,        -- 'pdf', 'docx', 'txt'
    file_size_bytes     BIGINT,
    category            VARCHAR(100),                           -- 'SOP', 'FAQ', 'Manual', 'Safety'
    chroma_collection   VARCHAR(100),                           -- Nama collection di ChromaDB
    indexing_status     public.indexing_status  NOT NULL DEFAULT 'pending',
    indexed_at          TIMESTAMPTZ,                            -- Diisi saat status jadi 'indexed'
    is_active           BOOLEAN                 NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.documents IS 'Metadata dokumen FAQ/SOP. File di Supabase Storage, embeddings di ChromaDB.';
COMMENT ON COLUMN public.documents.chroma_collection IS 'Nama collection ChromaDB tempat embeddings dokumen ini disimpan.';
COMMENT ON COLUMN public.documents.indexing_status IS 'Status proses pengindeksan ke vector database.';


-- -----------------------------------------------------------------
-- TABEL 3: chat_sessions
-- Satu baris = satu sesi percakapan user dengan AI.
-- -----------------------------------------------------------------
CREATE TABLE public.chat_sessions (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title       VARCHAR(255),                                   -- Auto-generate dari pesan pertama
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.chat_sessions IS 'Satu sesi percakapan antara satu user dengan AI chatbot.';
COMMENT ON COLUMN public.chat_sessions.title IS 'Judul sesi, di-generate otomatis dari konten pesan pertama.';


-- -----------------------------------------------------------------
-- TABEL 4: chat_messages
-- Setiap pesan dalam sebuah sesi — dari user maupun dari AI.
-- -----------------------------------------------------------------
CREATE TABLE public.chat_messages (
    id                  UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID                    NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role                public.message_role     NOT NULL,
    content             TEXT                    NOT NULL,
    -- JSONB: dokumen RAG yang dijadikan referensi untuk jawaban ini
    -- Contoh: [{"doc_id": "uuid", "title": "SOP Mesin", "page": 4, "score": 0.91}]
    source_documents    JSONB                   DEFAULT '[]'::JSONB,
    tokens_used         INTEGER,                                -- Untuk monitoring biaya API Gemini
    latency_ms          INTEGER,                                -- Latensi respons AI (milidetik)
    created_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.chat_messages IS 'Setiap pesan dalam satu sesi chat, baik dari user maupun AI.';
COMMENT ON COLUMN public.chat_messages.source_documents IS 'Array JSON dokumen yang dipakai RAG sebagai konteks jawaban.';
COMMENT ON COLUMN public.chat_messages.tokens_used IS 'Jumlah token Gemini API yang dikonsumsi, untuk tracking biaya.';


-- -----------------------------------------------------------------
-- TABEL 5: tickets
-- Tiket helpdesk yang dibuat user saat AI tidak bisa membantu.
-- -----------------------------------------------------------------
CREATE TABLE public.tickets (
    id                  UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    -- ticket_number di-generate via function (lihat V3)
    ticket_number       VARCHAR(20)             UNIQUE NOT NULL,
    created_by          UUID                    NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    assigned_to         UUID                    REFERENCES public.profiles(id) ON DELETE SET NULL,
    chat_session_id     UUID                    REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
    title               VARCHAR(255)            NOT NULL,
    description         TEXT                    NOT NULL,
    category            VARCHAR(100),                           -- 'Mesin', 'Software', 'Prosedur', 'Keselamatan'
    priority            public.ticket_priority  NOT NULL DEFAULT 'medium',
    status              public.ticket_status    NOT NULL DEFAULT 'open',
    resolved_at         TIMESTAMPTZ,                            -- Diisi otomatis saat status → 'resolved'
    created_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.tickets IS 'Tiket helpdesk untuk eskalasi ke supervisor/admin saat AI tidak memadai.';
COMMENT ON COLUMN public.tickets.ticket_number IS 'Nomor tiket human-readable, format: TKT-YYYYMMDD-NNN.';
COMMENT ON COLUMN public.tickets.assigned_to IS 'Supervisor/admin yang menangani tiket ini. NULL = belum di-assign.';
COMMENT ON COLUMN public.tickets.chat_session_id IS 'Sesi chat asal jika tiket dibuat dari eskalasi chatbot.';


-- -----------------------------------------------------------------
-- TABEL 6: ticket_comments
-- Komentar dan update yang ditambahkan ke tiket selama penanganan.
-- -----------------------------------------------------------------
CREATE TABLE public.ticket_comments (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   UUID        NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    author_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    content     TEXT        NOT NULL,
    is_internal BOOLEAN     NOT NULL DEFAULT FALSE,             -- TRUE = hanya terlihat admin/supervisor
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.ticket_comments IS 'Komentar dan update progress pada tiket helpdesk.';
COMMENT ON COLUMN public.ticket_comments.is_internal IS 'Jika TRUE, komentar hanya terlihat oleh admin dan supervisor.';


-- -----------------------------------------------------------------
-- TABEL 7: email_logs
-- Audit trail semua email notifikasi yang dikirim sistem.
-- -----------------------------------------------------------------
CREATE TABLE public.email_logs (
    id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id    UUID                REFERENCES public.profiles(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255)        NOT NULL,
    subject         VARCHAR(255)        NOT NULL,
    -- Nama template: 'ticket_created', 'ticket_assigned', 'ticket_resolved', dll
    template_name   VARCHAR(100)        NOT NULL,
    status          public.email_status NOT NULL DEFAULT 'pending',
    error_message   TEXT,                                       -- Diisi jika status = 'failed'
    sent_at         TIMESTAMPTZ,                                -- Diisi saat berhasil terkirim
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.email_logs IS 'Audit trail semua email notifikasi otomatis dari sistem.';
COMMENT ON COLUMN public.email_logs.template_name IS 'Nama template email: ticket_created, ticket_assigned, ticket_resolved, dll.';
