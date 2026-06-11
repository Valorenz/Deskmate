import asyncio
from app.db.session import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_sessions'"))
        for r in res.fetchall():
            print(f"{r[0]}: {r[1]}")

asyncio.run(main())
