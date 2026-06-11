import asyncio
import json
import httpx

async def main():
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        # First login
        login_data = {
            "username": "dossy@epson.com", # Assuming this user exists from previous context
            "password": "password123"      # Or we can just bypass and get a token directly from DB?
        }
        # It's better to just get a token by querying DB and generating it.
        # But let's just write a test script that hits the backend using requests.

if __name__ == "__main__":
    asyncio.run(main())
