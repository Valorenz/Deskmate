import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from app.db.session import AsyncSessionLocal
from app.models.document import Document
from sqlalchemy import select
from app.api.v1.documents import _background_index_document

async def retry_pending():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Document).where(Document.indexing_status == "pending"))
        docs = result.scalars().all()
        print(f"Found {len(docs)} pending docs.")
        for doc in docs:
            print(f"Retrying indexing for: {doc.title} ({doc.id})")
            
            # Kita perlu mendapatkan konten dokumen dari storage, atau untuk testing, string kosong/dummy.
            # Tapi tunggu, konten sebenarnya di-pass dari endpoint.
            # Mari coba fetch konten dari file_path di Supabase Storage
            try:
                from app.api.v1.documents import get_supabase_admin
                supabase = get_supabase_admin()
                res = supabase.storage.from_("documents").download(doc.file_path)
                content = res.decode('utf-8', errors='replace')
                print(f"Downloaded content from storage, size: {len(content)}")
                
                await _background_index_document(
                    doc_id=str(doc.id),
                    title=doc.title,
                    content=content,
                    collection_name=doc.chroma_collection,
                    category=doc.category,
                    db_url="none" # Tidak dipakai karena _background_index_document pakai AsyncSessionLocal import langsung
                )
            except Exception as e:
                import traceback
                print(f"Failed to retry {doc.id}: {e}")
                traceback.print_exc()

if __name__ == "__main__":
    import app.models  # Memastikan registrasi model
    asyncio.run(retry_pending())
