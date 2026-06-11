-- =================================================================
-- DeskMate AI Helpdesk — SQL Migration
-- File    : V9__add_ticket_rating.sql
-- Desc    : Menambahkan kolom rating CSAT pada tiket helpdesk.
-- =================================================================

ALTER TABLE public.tickets ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5);
COMMENT ON COLUMN public.tickets.rating IS 'CSAT Rating (1-5) yang diisi oleh karyawan setelah tiket diselesaikan.';
