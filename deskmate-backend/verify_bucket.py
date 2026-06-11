# verify_bucket.py — Verifikasi bucket 'documents' dengan service_role key
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from supabase import create_client

print("=" * 50)
print("  Verifikasi Supabase Storage")
print("=" * 50)

# Cek apakah service_role key ada
key = settings.SUPABASE_SERVICE_ROLE_KEY
if key:
    print(f"\n[OK] Service role key ditemukan (***{key[-8:]})")
else:
    print("\n[!] Service role key KOSONG, pakai anon key")
    key = settings.SUPABASE_ANON_KEY

supabase = create_client(settings.SUPABASE_URL, key)

# List buckets
print("\n[1] List buckets...")
try:
    buckets = supabase.storage.list_buckets()
    for b in buckets:
        print(f"    - {b.name} (public={b.public})")
except Exception as e:
    print(f"    Error: {e}")

# Test upload
print("\n[2] Test upload...")
try:
    test_content = b"DeskMate bucket verification test"
    supabase.storage.from_("documents").upload(
        path="__test__/verify.txt",
        file=test_content,
        file_options={"content-type": "text/plain"},
    )
    print("    [OK] Upload berhasil!")
except Exception as e:
    print(f"    [ERROR] Upload gagal: {e}")
    sys.exit(1)

# Test download
print("\n[3] Test download...")
try:
    downloaded = supabase.storage.from_("documents").download("__test__/verify.txt")
    print(f"    [OK] Download berhasil! ({len(downloaded)} bytes)")
except Exception as e:
    print(f"    [ERROR] Download gagal: {e}")

# Cleanup
print("\n[4] Cleanup...")
try:
    supabase.storage.from_("documents").remove(["__test__/verify.txt"])
    print("    [OK] Test file dihapus")
except Exception as e:
    print(f"    [WARN] Cleanup: {e}")

print("\n" + "=" * 50)
print("  Supabase Storage SIAP digunakan!")
print("=" * 50)
