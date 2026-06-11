import sys
import os
import chromadb

sys.path.insert(0, os.path.dirname(__file__))
from app.core.config import settings

def main():
    print(f"Connecting to ChromaDB at: {settings.CHROMA_PERSIST_DIRECTORY}")
    try:
        client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIRECTORY)
        collections = client.list_collections()
        print(f"Found {len(collections)} collections:")
        for col in collections:
            print(f"- {col.name}: {col.count()} chunks")
    except Exception as e:
        print(f"Error checking ChromaDB: {e}")

if __name__ == '__main__':
    main()
