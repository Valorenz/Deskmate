-- =================================================================
-- DeskMate AI Helpdesk — SQL Migration
-- File    : V6__seed_data.sql
-- Desc    : Data awal untuk keperluan DEVELOPMENT & TESTING saja.
--
-- ⚠️  JANGAN jalankan di production!
--     File ini hanya untuk mempermudah development lokal.
--
-- Catatan: Karena profiles.id harus sama dengan auth.users.id,
-- kamu perlu membuat user dulu di Supabase Auth Dashboard atau
-- via API, lalu ganti UUID di bawah dengan UUID yang asli.
-- =================================================================

-- Contoh insert profil setelah user dibuat di Supabase Auth:
-- Ganti UUID berikut dengan UUID dari auth.users yang sebenarnya.

/*
-- Contoh Admin
INSERT INTO public.profiles (id, full_name, employee_id, department, role)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'Budi Santoso',    'EPS-001', 'IT',         'admin'),
    ('00000000-0000-0000-0000-000000000002', 'Sari Dewi',       'EPS-002', 'Maintenance', 'supervisor'),
    ('00000000-0000-0000-0000-000000000003', 'Ahmad Fauzi',     'EPS-003', 'Produksi',    'employee'),
    ('00000000-0000-0000-0000-000000000004', 'Rina Wulandari',  'EPS-004', 'QC',          'employee');

-- Contoh dokumen (setelah file diupload ke Supabase Storage)
INSERT INTO public.documents (uploaded_by, title, description, file_name, file_path, file_type, category, indexing_status)
VALUES
    (
        '00000000-0000-0000-0000-000000000001',
        'SOP Pengoperasian Mesin Printer A3',
        'Prosedur standar untuk mengoperasikan dan melakukan maintenance rutin mesin printer A3.',
        'SOP-Mesin-A3-v2.pdf',
        'documents/sop/SOP-Mesin-A3-v2.pdf',
        'pdf',
        'SOP',
        'pending'
    ),
    (
        '00000000-0000-0000-0000-000000000001',
        'FAQ Troubleshooting Umum',
        'Kumpulan pertanyaan dan jawaban untuk masalah yang sering ditemui di lantai produksi.',
        'FAQ-Troubleshooting-2024.pdf',
        'documents/faq/FAQ-Troubleshooting-2024.pdf',
        'pdf',
        'FAQ',
        'pending'
    );
*/

-- Query verifikasi: cek semua tabel sudah terbuat dengan benar
SELECT
    table_name,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) AS size
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
