import asyncio
import sys
import os
import uuid

sys.path.insert(0, os.path.dirname(__file__))
from app.db.session import AsyncSessionLocal
from app.services.rag_service import RAGService
from app.core.config import settings

async def test_rag():
    rag = RAGService()
    dummy_session_id = uuid.uuid4()
    
    async with AsyncSessionLocal() as db:
        try:
            print("Memulai test RAG...")
            result = await rag.answer(
                query="halo",
                session_id=dummy_session_id,
                db=db
            )
            print("Sukses!")
            print(result)
        except Exception as e:
            import traceback
            print("RAG Error:")
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_rag())
