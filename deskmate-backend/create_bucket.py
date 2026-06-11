# create_bucket.py — Buat bucket 'documents' di Supabase Storage
# Jalankan: python create_bucket.py
# ---------------------------------------------------------------
# Memerlukan SUPABASE_SERVICE_ROLE_KEY karena anon key
# tidak punya izin membuat bucket (RLS policy).
#
# Ambil service_role key dari:
# Supabase Dashboard > Settings > API > service_role (secret)
# ---------------------------------------------------------------

import sys
import os

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from supabase import create_client

print("=" * 60)
print("  DeskMate - Create Storage Bucket Tool")
print("=" * 60)

# Coba baca service role key dari env atau input manual
service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not service_role_key:
    print("\n  Anon key tidak punya izin membuat bucket (RLS).")
    print("  Diperlukan SERVICE_ROLE_KEY dari Supabase Dashboard:")
    print("  Settings > API > service_role (secret)\n")
    service_role_key = input("  Masukkan SUPABASE_SERVICE_ROLE_KEY: ").strip()

if not service_role_key:
    print("  [ERROR] Service role key tidak boleh kosong!")
    sys.exit(1)

# Gunakan service role key (bypass RLS)
supabase = create_client(settings.SUPABASE_URL, service_role_key)

# List existing buckets
print("\n[1] Mengecek bucket yang sudah ada...")
try:
    buckets = supabase.storage.list_buckets()
    if buckets:
        print(f"  Ditemukan {len(buckets)} bucket:")
        for b in buckets:
            print(f"     - {b.name} (public={b.public})")
    else:
        print("  Belum ada bucket.")
except Exception as e:
    print(f"  Error list buckets: {e}")

# Create 'documents' bucket
print("\n[2] Membuat bucket 'documents'...")
try:
    supabase.storage.create_bucket(
        "documents",
        options={"public": False, "file_size_limit": 20 * 1024 * 1024},
    )
    print("  [OK] Bucket 'documents' berhasil dibuat!")
except Exception as e:
    err_str = str(e)
    if "already exists" in err_str.lower() or "Duplicate" in err_str:
        print("  [OK] Bucket 'documents' sudah ada.")
    else:
        print(f"  [ERROR] Gagal membuat bucket: {e}")

# Verify
print("\n[3] Verifikasi...")
try:
    bucket = supabase.storage.get_bucket("documents")
    print(f"  [OK] Bucket 'documents' tersedia (public={bucket.public})")
    print("\n  [INFO] Sekarang buat RLS policy agar upload/download bisa berjalan.")
    print("  Jalankan SQL berikut di Supabase SQL Editor:\n")
    print("  -- Izinkan authenticated users upload & download")
    print("  CREATE POLICY \"Allow authenticated uploads\"")
    print("    ON storage.objects FOR INSERT")
    print("    TO authenticated")
    print("    WITH CHECK (bucket_id = 'documents');")
    print()
    print("  CREATE POLICY \"Allow authenticated downloads\"")
    print("    ON storage.objects FOR SELECT")
    print("    TO authenticated")
    print("    USING (bucket_id = 'documents');")
    print()
    print("  CREATE POLICY \"Allow authenticated deletes\"")
    print("    ON storage.objects FOR DELETE")
    print("    TO authenticated")
    print("    USING (bucket_id = 'documents');")

except Exception as e:
    print(f"  [ERROR] Bucket 'documents' masih tidak ditemukan: {e}")

print("\n" + "=" * 60)
print("  Selesai! Sekarang upload ulang dokumen via frontend,")
print("  lalu jalankan: python reindex_tool.py")
print("=" * 60)
