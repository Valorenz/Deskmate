import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from langchain_google_genai import ChatGoogleGenerativeAI
from app.core.config import settings

async def main():
    print("Initializing ChatGoogleGenerativeAI...")
    key = settings.GEMINI_API_KEY or ""
    print(f"API Key: {key[:8]}... (length={len(key)})")
    print(f"Model: {settings.GEMINI_MODEL}")
    try:
        llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.2,
        )
        print("Invoking Gemini...")
        res = await asyncio.wait_for(llm.ainvoke("Say hello!"), timeout=15)
        print("Response received:")
        print(res.content)
    except asyncio.TimeoutError:
        print("Timeout calling Gemini!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    asyncio.run(main())
