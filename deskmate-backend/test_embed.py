import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from app.core.config import settings

async def test_embed():
    try:
        print("Testing models/text-embedding-004...")
        model1 = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004", google_api_key=settings.GEMINI_API_KEY)
        res1 = await model1.aembed_query("test 1")
        print("Success 1, len:", len(res1))
    except Exception as e:
        print("Fail 1:", e)

    try:
        print("Testing text-embedding-004...")
        model2 = GoogleGenerativeAIEmbeddings(model="text-embedding-004", google_api_key=settings.GEMINI_API_KEY)
        res2 = await model2.aembed_query("test 2")
        print("Success 2, len:", len(res2))
    except Exception as e:
        print("Fail 2:", e)

    try:
        print("Testing models/embedding-001...")
        model3 = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=settings.GEMINI_API_KEY)
        res3 = await model3.aembed_query("test 3")
        print("Success 3, len:", len(res3))
    except Exception as e:
        print("Fail 3:", e)

if __name__ == "__main__":
    asyncio.run(test_embed())
