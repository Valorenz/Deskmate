import asyncio
import sys
import os
import uuid

sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.document import Document
from app.services.vector_service import vector_service
from app.services.rag_service import rag_service
from sqlalchemy import select

async def test():
    doc_id = uuid.UUID("f03bc0b5-9d7b-4542-9370-da000646feb4")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Document).where(Document.id == doc_id))
        doc = result.scalar_one_or_none()
        if not doc:
            print("Doc not found")
            return
        
        print(f"Testing reindex for: {doc.title}")
        print(f"File Path: {doc.file_path}")
        
        # Download from Supabase
        try:
            from supabase import create_client
            key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
            supabase = create_client(settings.SUPABASE_URL, key)
            print("Downloading from Supabase...")
            file_bytes = supabase.storage.from_("documents").download(doc.file_path)
            print(f"Downloaded {len(file_bytes)} bytes")
        except Exception as e:
            print(f"Failed to download: {e}")
            return

        # Parse content
        try:
            from app.api.v1.documents import _parse_document_content
            print("Parsing content...")
            content = await _parse_document_content(file_bytes, doc.file_type)
            print(f"Parsed content: {len(content)} chars")
        except Exception as e:
            print(f"Failed to parse: {e}")
            return
        
        # Index
        try:
            print("Indexing content...")
            chunk_ids = await rag_service.index_document_content(
                doc_id=str(doc.id),
                title=doc.title,
                content=content,
                collection_name=doc.chroma_collection or f"doc_{str(doc.id).replace('-', '_')}",
                category=doc.category,
            )
            print(f"Successfully indexed {len(chunk_ids)} chunks")
        except Exception as e:
            print(f"Failed to index: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test())
