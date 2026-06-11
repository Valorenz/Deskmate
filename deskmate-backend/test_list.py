import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from google import genai
from app.core.config import settings

def test_list():
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    for m in client.models.list():
        print(m.name, m.supported_actions)

if __name__ == "__main__":
    test_list()
