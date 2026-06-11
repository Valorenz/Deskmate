import asyncio
import uuid
from app.db.session import engine, AsyncSessionLocal
from app.models.ticket import Ticket
from app.models.profile import Profile
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        # Find any user
        user = (await db.execute(select(Profile).limit(1))).scalar_one_or_none()
        if not user:
            print("No user found")
            return

        print(f"Creating ticket for user {user.id}")
        new_ticket = Ticket(
            ticket_number="",
            created_by=user.id,
            title="Test Ticket 123",
            description="Test Description 12345",
            category="IT & Network",
            priority="medium",
            chat_session_id=None,
            attachment_ids=[]
        )
        db.add(new_ticket)
        try:
            await db.flush()
            print("Flush successful")
            await db.commit()
            print("Commit successful")
            print("Ticket ID:", new_ticket.id)
            print("Ticket Number:", new_ticket.ticket_number)
        except Exception as e:
            print("Error:", type(e).__name__)
            print(str(e))

if __name__ == "__main__":
    asyncio.run(main())
