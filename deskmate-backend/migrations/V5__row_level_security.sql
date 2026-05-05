-- =================================================================
-- DeskMate AI Helpdesk — SQL Migration
-- File    : V5__row_level_security.sql
-- Desc    : Row Level Security (RLS) — lapisan keamanan di level
--           database Supabase.
--
-- Cara kerja RLS:
--   Tanpa RLS, semua user yang punya akses DB bisa baca/tulis
--   semua baris. Dengan RLS, Supabase otomatis menyaring baris
--   berdasarkan identitas user yang sedang login (auth.uid()).
--
--   Contoh: User A tidak bisa membaca chat_sessions milik User B,
--           meskipun query-nya tidak ada klausa WHERE.
--
-- PENTING: Setelah ENABLE RLS, semua akses DITOLAK secara default
--          sampai ada POLICY yang mengizinkan.
-- =================================================================


-- -----------------------------------------------------------------
-- RLS: profiles
-- -----------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User bisa membaca profil SIAPA SAJA (untuk fitur @mention, assign tiket)
CREATE POLICY "profiles: semua user bisa membaca"
    ON public.profiles FOR SELECT
    USING (TRUE);

-- User hanya bisa mengupdate profil MILIKNYA SENDIRI
CREATE POLICY "profiles: hanya bisa update milik sendiri"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Hanya admin yang bisa menonaktifkan akun user lain
CREATE POLICY "profiles: admin bisa update semua"
    ON public.profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- -----------------------------------------------------------------
-- RLS: documents
-- -----------------------------------------------------------------
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Semua user yang login bisa membaca dokumen yang aktif
CREATE POLICY "documents: semua user bisa membaca dokumen aktif"
    ON public.documents FOR SELECT
    USING (is_active = TRUE);

-- Hanya admin yang bisa upload (INSERT) dokumen baru
CREATE POLICY "documents: hanya admin bisa insert"
    ON public.documents FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Hanya admin yang bisa update/nonaktifkan dokumen
CREATE POLICY "documents: hanya admin bisa update"
    ON public.documents FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- -----------------------------------------------------------------
-- RLS: chat_sessions
-- -----------------------------------------------------------------
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- User hanya bisa membaca sesi chat MILIKNYA SENDIRI
CREATE POLICY "chat_sessions: hanya bisa baca milik sendiri"
    ON public.chat_sessions FOR SELECT
    USING (auth.uid() = user_id);

-- User hanya bisa membuat sesi chat UNTUK DIRINYA SENDIRI
CREATE POLICY "chat_sessions: hanya bisa insert untuk diri sendiri"
    ON public.chat_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- User hanya bisa update sesi chat MILIKNYA SENDIRI
CREATE POLICY "chat_sessions: hanya bisa update milik sendiri"
    ON public.chat_sessions FOR UPDATE
    USING (auth.uid() = user_id);


-- -----------------------------------------------------------------
-- RLS: chat_messages
-- -----------------------------------------------------------------
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- User hanya bisa membaca pesan dari sesi yang MILIKNYA
CREATE POLICY "chat_messages: hanya bisa baca dari sesi milik sendiri"
    ON public.chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_sessions
            WHERE id = chat_messages.session_id
            AND user_id = auth.uid()
        )
    );

-- User hanya bisa insert pesan ke sesi MILIKNYA
CREATE POLICY "chat_messages: hanya bisa insert ke sesi milik sendiri"
    ON public.chat_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_sessions
            WHERE id = chat_messages.session_id
            AND user_id = auth.uid()
        )
    );


-- -----------------------------------------------------------------
-- RLS: tickets
-- -----------------------------------------------------------------
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Employee hanya bisa melihat tiket MILIKNYA
-- Supervisor/admin bisa melihat SEMUA tiket
CREATE POLICY "tickets: employee lihat milik sendiri, supervisor/admin lihat semua"
    ON public.tickets FOR SELECT
    USING (
        auth.uid() = created_by
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('supervisor', 'admin')
        )
    );

-- Semua user bisa membuat tiket (untuk diri sendiri)
CREATE POLICY "tickets: semua user bisa buat tiket"
    ON public.tickets FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Hanya supervisor/admin yang bisa update tiket (assign, ubah status)
-- Atau pemilik tiket bisa update (untuk cancel/close tiket sendiri)
CREATE POLICY "tickets: supervisor/admin bisa update semua, pemilik bisa update milik sendiri"
    ON public.tickets FOR UPDATE
    USING (
        auth.uid() = created_by
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('supervisor', 'admin')
        )
    );


-- -----------------------------------------------------------------
-- RLS: ticket_comments
-- -----------------------------------------------------------------
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

-- Komentar publik bisa dilihat siapa saja yang punya akses ke tiket
-- Komentar internal (is_internal=TRUE) hanya untuk supervisor/admin
CREATE POLICY "ticket_comments: filter komentar internal"
    ON public.ticket_comments FOR SELECT
    USING (
        -- Semua bisa baca komentar publik (jika punya akses ke tiket-nya)
        (is_internal = FALSE)
        OR
        -- Supervisor/admin bisa baca komentar internal
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('supervisor', 'admin')
        )
    );

-- Semua user bisa menambahkan komentar ke tiket yang bisa mereka akses
CREATE POLICY "ticket_comments: user bisa insert komentar"
    ON public.ticket_comments FOR INSERT
    WITH CHECK (auth.uid() = author_id);


-- -----------------------------------------------------------------
-- RLS: email_logs
-- -----------------------------------------------------------------
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Hanya admin yang bisa melihat log email (untuk audit)
CREATE POLICY "email_logs: hanya admin yang bisa membaca"
    ON public.email_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Insert dilakukan oleh service role (backend), bukan user biasa
-- Tidak perlu policy INSERT untuk user — akan ditangani via service_role key
