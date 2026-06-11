import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from app.db.session import AsyncSessionLocal
from app.models.profile import Profile
from sqlalchemy import update

async def set_all_users_to_admin():
    async with AsyncSessionLocal() as db:
        await db.execute(update(Profile).values(role='admin'))
        await db.commit()
        print("✅ Sukses: Semua user telah diubah rolenya menjadi 'admin' di database.")

if __name__ == "__main__":
    asyncio.run(set_all_users_to_admin())
