-- =================================================================
-- DeskMate AI Helpdesk — SQL Migration
-- File    : V8__add_phone_and_sessions.sql
-- Desc    : Menambahkan kolom phone, tabel user_sessions, dan
--           bucket avatar baru dengan policy storage yang sesuai.
-- =================================================================

-- 1. Tambah kolom phone ke profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- 2. Buat tabel user_sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device          VARCHAR(255)    NOT NULL,
    location        VARCHAR(255)    NOT NULL,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- 3. RLS untuk user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- 4. Policies untuk user_sessions
DROP POLICY IF EXISTS "user_sessions: select" ON public.user_sessions;
CREATE POLICY "user_sessions: select" ON public.user_sessions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_sessions: insert" ON public.user_sessions;
CREATE POLICY "user_sessions: insert" ON public.user_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_sessions: update" ON public.user_sessions;
CREATE POLICY "user_sessions: update" ON public.user_sessions
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_sessions: delete" ON public.user_sessions;
CREATE POLICY "user_sessions: delete" ON public.user_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- 5. Hak akses tabel ke role storage/anon/auth
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sessions TO anon, authenticated, service_role;

-- 6. Bucket untuk avatar profil
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    TRUE,                           -- Public agar gambar profil bisa langsung di-embed via URL
    2097152,                        -- Maksimal 2MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 7. Storage Policy untuk bucket avatars
DROP POLICY IF EXISTS "storage avatars: publik bisa melihat" ON storage.objects;
CREATE POLICY "storage avatars: publik bisa melihat"
    ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "storage avatars: user bisa upload avatar sendiri" ON storage.objects;
CREATE POLICY "storage avatars: user bisa upload avatar sendiri"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

DROP POLICY IF EXISTS "storage avatars: user bisa update/delete avatar sendiri" ON storage.objects;
CREATE POLICY "storage avatars: user bisa update/delete avatar sendiri"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

DROP POLICY IF EXISTS "storage avatars: user bisa delete avatar sendiri" ON storage.objects;
CREATE POLICY "storage avatars: user bisa delete avatar sendiri"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );
