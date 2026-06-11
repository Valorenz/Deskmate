import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

async def main():
    from app.db.session import AsyncSessionLocal
    from app.models.document import Document
    from sqlalchemy import select

    print("Querying documents table...")
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Document))
            docs = result.scalars().all()
            print(f"Found {len(docs)} documents:")
            for doc in docs:
                print(f"- ID: {doc.id}")
                print(f"  Title: {doc.title}")
                print(f"  Status: {doc.indexing_status}")
                print(f"  Is Active: {doc.is_active}")
                print(f"  File Path: {doc.file_path}")
                print(f"  Collection: {doc.chroma_collection}")
                print("-" * 30)
    except Exception as e:
        print(f"Error querying: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(main())
