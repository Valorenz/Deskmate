-- =================================================================
-- DeskMate AI Helpdesk — SQL Migration
-- File    : V7__add_image_support.sql
-- Desc    : Menambahkan dukungan upload gambar untuk:
--           1. Lampiran gambar di chat & tiket (tabel attachments)
--           2. Gambar dalam dokumen SOP/FAQ (tabel document_images)
--           3. Modifikasi tabel chat_messages & tickets
--
-- Pastikan V1 s/d V6 sudah dijalankan sebelum file ini!
-- =================================================================


-- -----------------------------------------------------------------
-- SECTION 1: ENUM baru untuk konteks attachment
-- -----------------------------------------------------------------

-- Menentukan attachment ini dilampirkan ke chat atau ke tiket
CREATE TYPE public.attachment_context AS ENUM (
    'chat_message',   -- Gambar dikirim dalam percakapan chat
    'ticket'          -- Gambar dilampirkan sebagai bukti di tiket
);


-- -----------------------------------------------------------------
-- SECTION 2: TABEL BARU — attachments
--
-- Menyimpan semua file gambar yang diupload oleh karyawan,
-- baik saat chat maupun saat membuat/update tiket.
--
-- File fisiknya disimpan di Supabase Storage bucket "attachments".
-- Tabel ini hanya menyimpan metadata + referensi path-nya.
--
-- Pola "polymorphic association":
--   context_type + context_id menentukan gambar ini milik siapa.
--   Contoh: context_type='chat_message', context_id='uuid-pesan-123'
--           berarti gambar ini dilampirkan ke pesan chat tersebut.
-- -----------------------------------------------------------------
CREATE TABLE public.attachments (
    id                  UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by         UUID                        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    file_name           VARCHAR(255)                NOT NULL,       -- Nama file asli dari user
    file_path           TEXT                        NOT NULL,       -- Path lengkap di Supabase Storage
    file_type           VARCHAR(50)                 NOT NULL,       -- 'image/jpeg', 'image/png', 'image/webp'
    file_size_bytes     BIGINT,
    storage_bucket      VARCHAR(100)                NOT NULL DEFAULT 'attachments',

    -- Polymorphic: gambar ini dilampirkan ke entitas mana?
    context_type        public.attachment_context   NOT NULL,
    context_id          UUID                        NOT NULL,       -- ID dari chat_messages atau tickets

    -- Hasil analisis Gemini Vision terhadap gambar ini.
    -- Diisi oleh background job setelah upload selesai.
    -- Berguna untuk: audit trail, pencarian, dan konteks tambahan ke AI.
    gemini_description  TEXT,

    created_at          TIMESTAMPTZ                 NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.attachments IS 'Metadata gambar yang dilampirkan ke pesan chat atau tiket helpdesk.';
COMMENT ON COLUMN public.attachments.file_path IS 'Path file di Supabase Storage, format: attachments/{user_id}/{uuid}.jpg';
COMMENT ON COLUMN public.attachments.context_type IS 'Tipe entitas yang memiliki lampiran ini: chat_message atau ticket.';
COMMENT ON COLUMN public.attachments.context_id IS 'UUID dari chat_messages.id atau tickets.id.';
COMMENT ON COLUMN public.attachments.gemini_description IS 'Deskripsi gambar hasil analisis Gemini Vision. Diisi async setelah upload.';


-- -----------------------------------------------------------------
-- SECTION 3: TABEL BARU — document_images
--
-- Khusus untuk gambar yang diekstrak dari dokumen SOP/FAQ
-- (misalnya diagram, foto komponen, ilustrasi langkah kerja).
--
-- Berbeda dari attachments karena gambar ini perlu:
-- 1. Dianalisis oleh Gemini → menghasilkan deskripsi teks
-- 2. Deskripsi teks tersebut diindeks ke ChromaDB
-- 3. Sehingga bisa ditemukan saat karyawan bertanya tentang
--    sesuatu yang hanya ada dalam bentuk gambar di dokumen
--
-- Contoh: Foto posisi tombol reset pada mesin A3 ada di halaman 12
--         dokumen SOP. Gemini mendeskripsikannya sebagai:
--         "Tombol reset berwarna merah di sisi kiri panel kontrol,
--          di bawah indikator suhu."
--         Deskripsi inilah yang diindeks, sehingga karyawan yang
--         bertanya "di mana tombol reset mesin A3?" bisa menemukan
--         gambar tersebut via RAG.
-- -----------------------------------------------------------------
CREATE TABLE public.document_images (
    id                  UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id         UUID                    NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    page_number         INTEGER,                                -- Halaman asal gambar diekstrak (untuk PDF)
    file_path           TEXT                    NOT NULL,       -- Path gambar di Supabase Storage
    file_type           VARCHAR(50)             NOT NULL DEFAULT 'image/jpeg',
    file_size_bytes     BIGINT,

    -- Deskripsi teks hasil analisis Gemini Vision.
    -- INI yang akan diindeks ke ChromaDB, bukan gambar mentahnya.
    gemini_description  TEXT,

    -- ID chunk di ChromaDB yang menyimpan embedding dari gemini_description.
    -- Dipakai untuk sinkronisasi: jika dokumen diupdate, chunk lama dihapus.
    chroma_chunk_id     TEXT,

    indexing_status     public.indexing_status  NOT NULL DEFAULT 'pending',
    indexed_at          TIMESTAMPTZ,                            -- Diisi saat status jadi 'indexed'

    created_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.document_images IS 'Gambar yang diekstrak dari dokumen SOP/FAQ untuk diindeks ke ChromaDB via Gemini Vision.';
COMMENT ON COLUMN public.document_images.gemini_description IS 'Deskripsi gambar oleh Gemini — inilah yang diubah jadi embedding dan disimpan ke ChromaDB.';
COMMENT ON COLUMN public.document_images.chroma_chunk_id IS 'ID chunk ChromaDB untuk keperluan update/delete embedding saat dokumen berubah.';


-- -----------------------------------------------------------------
-- SECTION 4: MODIFIKASI TABEL LAMA
--
-- Menambah kolom attachment_ids di chat_messages dan tickets.
-- Kolom JSONB berisi array UUID yang mereferensikan attachments.id
--
-- Kenapa JSONB dan bukan tabel junction terpisah?
-- Untuk kasus ini, kita hanya butuh menyimpan daftar ID lampiran
-- tanpa query kompleks di level SQL. JSONB lebih sederhana dan
-- cukup efisien. Jika nanti butuh query seperti
-- "cari semua tiket yang punya lampiran", bisa tambahkan index GIN.
-- -----------------------------------------------------------------

-- Tambah kolom attachment_ids ke chat_messages
ALTER TABLE public.chat_messages
    ADD COLUMN attachment_ids JSONB NOT NULL DEFAULT '[]'::JSONB;

COMMENT ON COLUMN public.chat_messages.attachment_ids IS
    'Array UUID referensi ke attachments.id. Contoh: ["uuid-1", "uuid-2"]';

-- Tambah kolom attachment_ids ke tickets
ALTER TABLE public.tickets
    ADD COLUMN attachment_ids JSONB NOT NULL DEFAULT '[]'::JSONB;

COMMENT ON COLUMN public.tickets.attachment_ids IS
    'Array UUID referensi ke attachments.id yang dilampirkan ke tiket ini.';


-- -----------------------------------------------------------------
-- SECTION 5: INDEX
-- -----------------------------------------------------------------

-- Cari semua attachment berdasarkan konteks (chat atau tiket tertentu)
-- Ini query paling sering: "tampilkan semua gambar di pesan/tiket X"
CREATE INDEX idx_attachments_context
    ON public.attachments(context_type, context_id);

-- Cari semua attachment milik satu user
CREATE INDEX idx_attachments_uploaded_by
    ON public.attachments(uploaded_by);

-- Cari semua gambar dalam satu dokumen (untuk proses indexing)
CREATE INDEX idx_document_images_document_id
    ON public.document_images(document_id);

-- Monitor gambar yang belum/sedang/gagal diindeks (untuk background job)
CREATE INDEX idx_document_images_indexing_status
    ON public.document_images(indexing_status)
    WHERE indexing_status IN ('pending', 'processing', 'failed');

-- GIN index untuk query di dalam JSONB attachment_ids
-- Berguna jika nanti perlu query: "tiket mana saja yang mengandung attachment X?"
CREATE INDEX idx_chat_messages_attachment_ids
    ON public.chat_messages USING GIN (attachment_ids);

CREATE INDEX idx_tickets_attachment_ids
    ON public.tickets USING GIN (attachment_ids);


-- -----------------------------------------------------------------
-- SECTION 6: ROW LEVEL SECURITY
-- -----------------------------------------------------------------

-- ── attachments ──────────────────────────────────────────────────
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- User hanya bisa melihat attachment yang mereka upload sendiri,
-- ATAU attachment yang ada di chat/tiket yang bisa mereka akses.
-- Untuk simplisitas di tahap awal: user bisa lihat milik sendiri,
-- supervisor/admin bisa lihat semua.
CREATE POLICY "attachments: pemilik dan supervisor bisa membaca"
    ON public.attachments FOR SELECT
    USING (
        auth.uid() = uploaded_by
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('supervisor', 'admin')
        )
    );

-- User hanya bisa upload attachment untuk dirinya sendiri
CREATE POLICY "attachments: user bisa insert milik sendiri"
    ON public.attachments FOR INSERT
    WITH CHECK (auth.uid() = uploaded_by);

-- User hanya bisa hapus attachment miliknya sendiri
-- Admin bisa hapus semua (untuk moderasi)
CREATE POLICY "attachments: pemilik dan admin bisa delete"
    ON public.attachments FOR DELETE
    USING (
        auth.uid() = uploaded_by
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- ── document_images ───────────────────────────────────────────────
ALTER TABLE public.document_images ENABLE ROW LEVEL SECURITY;

-- Semua user yang login bisa melihat gambar dari dokumen aktif
CREATE POLICY "document_images: semua user bisa membaca"
    ON public.document_images FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.documents
            WHERE id = document_images.document_id
            AND is_active = TRUE
        )
    );

-- Hanya admin yang bisa insert/update (proses indexing dilakukan
-- oleh backend menggunakan service_role key, bukan user biasa)
CREATE POLICY "document_images: hanya admin yang bisa insert"
    ON public.document_images FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "document_images: hanya admin yang bisa update"
    ON public.document_images FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- -----------------------------------------------------------------
-- SECTION 7: STORAGE BUCKETS
--
-- Ini adalah perintah SQL untuk membuat bucket di Supabase Storage.
-- Supabase menyimpan konfigurasi bucket di schema `storage`.
--
-- Alternatif: buat bucket manual di
-- Supabase Dashboard → Storage → New Bucket
-- -----------------------------------------------------------------

-- Bucket untuk lampiran chat & tiket (gambar dari karyawan)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'attachments',
    'attachments',
    FALSE,                          -- Private: tidak bisa diakses tanpa auth
    5242880,                        -- Maksimal 5MB per file
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif'
    ]
)
ON CONFLICT (id) DO NOTHING;       -- Abaikan jika bucket sudah ada

-- Bucket untuk gambar yang diekstrak dari dokumen SOP/FAQ
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'document-images',
    'document-images',
    FALSE,                          -- Private
    10485760,                       -- Maksimal 10MB per file (gambar dokumen bisa lebih besar)
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp'
    ]
)
ON CONFLICT (id) DO NOTHING;


-- -----------------------------------------------------------------
-- SECTION 8: STORAGE POLICIES (RLS untuk Supabase Storage)
--
-- Sama seperti RLS untuk tabel, Supabase Storage juga punya RLS
-- untuk mengontrol siapa yang bisa upload/download file.
-- -----------------------------------------------------------------

-- ── Bucket: attachments ──────────────────────────────────────────

-- User yang sudah login bisa upload ke folder miliknya sendiri
-- Format path: attachments/{user_id}/{filename}
CREATE POLICY "storage attachments: user bisa upload"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'attachments'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

-- User bisa melihat/download file miliknya sendiri
-- Supervisor/admin bisa akses semua
CREATE POLICY "storage attachments: pemilik dan supervisor bisa download"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'attachments'
        AND (
            (storage.foldername(name))[1] = auth.uid()::TEXT
            OR EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role IN ('supervisor', 'admin')
            )
        )
    );

-- User bisa hapus file miliknya sendiri
CREATE POLICY "storage attachments: pemilik bisa delete"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'attachments'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );


-- ── Bucket: document-images ───────────────────────────────────────

-- Hanya admin yang bisa upload ke bucket document-images
-- (proses ekstraksi gambar dari PDF dilakukan oleh backend/admin)
CREATE POLICY "storage document-images: hanya admin bisa upload"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'document-images'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Semua user yang login bisa melihat gambar dokumen
CREATE POLICY "storage document-images: semua user bisa download"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'document-images'
        AND auth.role() = 'authenticated'
    );
