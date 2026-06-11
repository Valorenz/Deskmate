-- =================================================================
-- DeskMate AI Helpdesk — SQL Migration
-- File    : V3__functions_and_triggers.sql
-- Desc    : Fungsi-fungsi otomatis (trigger) yang berjalan di
--           database level tanpa perlu kode di backend Python.
-- =================================================================


-- -----------------------------------------------------------------
-- FUNCTION 1: update_updated_at_column()
-- Tujuan: Otomatis mengisi kolom `updated_at` dengan waktu sekarang
--         setiap kali ada UPDATE pada baris di tabel tertentu.
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- NEW adalah referensi ke baris yang sedang di-update
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Pasang trigger ke tabel yang punya kolom updated_at
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_chat_sessions_updated_at
    BEFORE UPDATE ON public.chat_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_tickets_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- -----------------------------------------------------------------
-- FUNCTION 2: handle_new_user()
-- Tujuan: Otomatis membuat baris di public.profiles setiap kali
--         ada user baru yang register melalui Supabase Auth.
--
-- Cara kerja: Supabase Auth menyimpan user di schema `auth`.
--             Trigger ini "mendengarkan" INSERT di auth.users,
--             lalu otomatis membuat profil kosong di public.profiles.
--             Frontend bisa melengkapi data (nama, NIK, dll) setelahnya.
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER                    -- Berjalan dengan hak akses pemilik function
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        -- Ambil nama dari metadata jika tersedia, fallback ke email
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'employee'                  -- Semua user baru default sebagai employee
    );
    RETURN NEW;
END;
$$;

-- Pasang trigger ke auth.users (tabel milik Supabase)
CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- -----------------------------------------------------------------
-- FUNCTION 3: generate_ticket_number()
-- Tujuan: Otomatis membuat nomor tiket yang unik & human-readable
--         saat tiket baru dibuat.
--
-- Format: TKT-YYYYMMDD-NNN
-- Contoh: TKT-20240815-001, TKT-20240815-002
--         Nomor urut reset setiap hari.
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_date      TEXT;
    v_count     INTEGER;
    v_number    TEXT;
BEGIN
    -- Format tanggal: YYYYMMDD
    v_date := TO_CHAR(NOW(), 'YYYYMMDD');

    -- Hitung berapa tiket yang sudah ada HARI INI
    SELECT COUNT(*) + 1
    INTO v_count
    FROM public.tickets
    WHERE ticket_number LIKE 'TKT-' || v_date || '-%';

    -- Gabungkan: TKT-20240815-001
    v_number := 'TKT-' || v_date || '-' || LPAD(v_count::TEXT, 3, '0');

    NEW.ticket_number := v_number;
    RETURN NEW;
END;
$$;

-- Pasang trigger: berjalan SEBELUM INSERT agar ticket_number terisi
CREATE TRIGGER trg_generate_ticket_number
    BEFORE INSERT ON public.tickets
    FOR EACH ROW
    WHEN (NEW.ticket_number IS NULL OR NEW.ticket_number = '')
    EXECUTE FUNCTION public.generate_ticket_number();


-- -----------------------------------------------------------------
-- FUNCTION 4: set_ticket_resolved_at()
-- Tujuan: Otomatis mengisi kolom `resolved_at` saat status tiket
--         berubah menjadi 'resolved' atau 'closed'.
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_ticket_resolved_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Jika status baru adalah resolved/closed DAN sebelumnya belum resolved
    IF NEW.status IN ('resolved', 'closed') AND OLD.status NOT IN ('resolved', 'closed') THEN
        NEW.resolved_at = NOW();
    END IF;

    -- Jika status di-reopen (kembali ke open/in_progress), clear resolved_at
    IF NEW.status IN ('open', 'in_progress') AND OLD.status IN ('resolved', 'closed') THEN
        NEW.resolved_at = NULL;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ticket_resolved_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.set_ticket_resolved_at();
