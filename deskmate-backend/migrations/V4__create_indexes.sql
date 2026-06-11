-- =================================================================
-- DeskMate AI Helpdesk — SQL Migration
-- File    : V4__create_indexes.sql
-- Desc    : Index untuk mempercepat query yang sering dijalankan.
--
-- Kapan index diperlukan?
-- Index mempercepat pencarian (SELECT/WHERE/JOIN) tapi sedikit
-- memperlambat INSERT/UPDATE. Buat index hanya pada kolom yang
-- sering jadi kondisi filter atau JOIN.
-- =================================================================


-- -----------------------------------------------------------------
-- Index: profiles
-- -----------------------------------------------------------------

-- Pencarian karyawan berdasarkan departemen (untuk fitur admin)
CREATE INDEX idx_profiles_department
    ON public.profiles(department);

-- Filter karyawan aktif/nonaktif
CREATE INDEX idx_profiles_is_active
    ON public.profiles(is_active);

-- Filter berdasarkan role (mencari semua admin/supervisor)
CREATE INDEX idx_profiles_role
    ON public.profiles(role);


-- -----------------------------------------------------------------
-- Index: documents
-- -----------------------------------------------------------------

-- Filter dokumen berdasarkan status indexing (background job polling)
CREATE INDEX idx_documents_indexing_status
    ON public.documents(indexing_status);

-- Filter dokumen aktif per kategori (paling sering diquery RAG)
CREATE INDEX idx_documents_category_active
    ON public.documents(category, is_active);

-- Siapa yang mengupload (untuk halaman "dokumen saya")
CREATE INDEX idx_documents_uploaded_by
    ON public.documents(uploaded_by);


-- -----------------------------------------------------------------
-- Index: chat_sessions
-- -----------------------------------------------------------------

-- Ambil semua sesi chat milik satu user (query paling sering)
CREATE INDEX idx_chat_sessions_user_id
    ON public.chat_sessions(user_id);

-- Urutkan sesi berdasarkan waktu terbaru
CREATE INDEX idx_chat_sessions_updated_at
    ON public.chat_sessions(updated_at DESC);


-- -----------------------------------------------------------------
-- Index: chat_messages
-- -----------------------------------------------------------------

-- Ambil semua pesan dalam satu sesi (query utama chat)
-- Diurutkan ascending agar urutan chat benar (pesan lama → baru)
CREATE INDEX idx_chat_messages_session_id_created
    ON public.chat_messages(session_id, created_at ASC);


-- -----------------------------------------------------------------
-- Index: tickets
-- -----------------------------------------------------------------

-- Filter tiket berdasarkan status (tampilan dashboard)
CREATE INDEX idx_tickets_status
    ON public.tickets(status);

-- Tiket yang dibuat oleh user tertentu
CREATE INDEX idx_tickets_created_by
    ON public.tickets(created_by);

-- Tiket yang di-assign ke supervisor tertentu
CREATE INDEX idx_tickets_assigned_to
    ON public.tickets(assigned_to)
    WHERE assigned_to IS NOT NULL;  -- Partial index: abaikan tiket yang belum di-assign

-- Filter tiket berdasarkan prioritas + status (untuk dashboard supervisor)
CREATE INDEX idx_tickets_priority_status
    ON public.tickets(priority, status);

-- Urutkan tiket berdasarkan waktu terbaru
CREATE INDEX idx_tickets_created_at
    ON public.tickets(created_at DESC);


-- -----------------------------------------------------------------
-- Index: ticket_comments
-- -----------------------------------------------------------------

-- Ambil semua komentar untuk satu tiket
CREATE INDEX idx_ticket_comments_ticket_id
    ON public.ticket_comments(ticket_id, created_at ASC);


-- -----------------------------------------------------------------
-- Index: email_logs
-- -----------------------------------------------------------------

-- Monitor email yang belum/gagal terkirim (untuk retry job)
CREATE INDEX idx_email_logs_status
    ON public.email_logs(status)
    WHERE status IN ('pending', 'failed');  -- Partial index: abaikan yang sudah 'sent'

-- Log email per user (untuk audit)
CREATE INDEX idx_email_logs_recipient_id
    ON public.email_logs(recipient_id)
    WHERE recipient_id IS NOT NULL;
