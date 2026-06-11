import asyncio
from app.db.session import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT prosrc FROM pg_proc WHERE proname = 'generate_ticket_number'"))
        print([dict(row._mapping) for row in res])

if __name__ == "__main__":
    asyncio.run(main())
