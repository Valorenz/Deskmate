import asyncio
from app.db.session import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT event_object_table, trigger_name, action_statement FROM information_schema.triggers WHERE event_object_table = 'tickets'"))
        print([dict(row._mapping) for row in res])

if __name__ == "__main__":
    asyncio.run(main())
