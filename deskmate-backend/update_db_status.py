import asyncio
import sys
import os
from datetime import datetime, timezone
import uuid

sys.path.insert(0, os.path.dirname(__file__))
from app.db.session import AsyncSessionLocal
from app.models.document import Document
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        # Update TesSopDummy
        doc_id = uuid.UUID("f03bc0b5-9d7b-4542-9370-da000646feb4")
        result = await db.execute(select(Document).where(Document.id == doc_id))
        doc = result.scalar_one_or_none()
        if doc:
            doc.indexing_status = "indexed"
            doc.indexed_at = datetime.now(timezone.utc)
            await db.commit()
            print("Updated TesSopDummy status to indexed!")

if __name__ == '__main__':
    asyncio.run(main())
