-- =================================================================
-- DeskMate AI Helpdesk — SQL Migration
-- File    : V1__create_enums.sql
-- Desc    : Membuat semua custom ENUM type sebelum tabel dibuat.
--           Harus dijalankan PERTAMA sebelum file V2 ke atas.
-- Run at  : Supabase Dashboard → SQL Editor → Paste & Run
-- =================================================================

-- ENUM: Role pengguna dalam sistem
CREATE TYPE public.user_role AS ENUM (
    'employee',     -- Karyawan biasa, hanya bisa chat & buat tiket
    'supervisor',   -- Bisa assign & resolve tiket
    'admin'         -- Akses penuh: upload dokumen, kelola user
);

-- ENUM: Status pengindeksan dokumen ke ChromaDB
CREATE TYPE public.indexing_status AS ENUM (
    'pending',      -- Baru diupload, belum diproses
    'processing',   -- Sedang diindeks ke vector DB
    'indexed',      -- Selesai, siap dipakai RAG
    'failed'        -- Gagal diindeks, perlu dicoba ulang
);

-- ENUM: Peran dalam percakapan chat
CREATE TYPE public.message_role AS ENUM (
    'user',         -- Pesan dari karyawan
    'assistant'     -- Pesan balasan dari AI
);

-- ENUM: Prioritas tiket helpdesk
CREATE TYPE public.ticket_priority AS ENUM (
    'low',
    'medium',
    'high',
    'critical'      -- Butuh penanganan segera (misal: mesin berhenti total)
);

-- ENUM: Status tiket helpdesk
CREATE TYPE public.ticket_status AS ENUM (
    'open',         -- Baru dibuat, belum ada yang menangani
    'in_progress',  -- Sudah di-assign & sedang dikerjakan
    'resolved',     -- Masalah sudah diselesaikan
    'closed'        -- Ditutup (resolved + dikonfirmasi user)
);

-- ENUM: Status pengiriman email notifikasi
CREATE TYPE public.email_status AS ENUM (
    'pending',      -- Antri untuk dikirim
    'sent',         -- Berhasil dikirim
    'failed'        -- Gagal dikirim (lihat kolom error_message)
);
