import asyncio
import uuid
from app.db.session import engine, AsyncSessionLocal
from app.models.ticket import Ticket
from app.models.profile import Profile
from sqlalchemy import select
from app.schemas.ticket import TicketResponse
from sqlalchemy.orm import selectinload

async def main():
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(Profile).limit(1))).scalar_one_or_none()
        if not user: return
        
        new_ticket = Ticket(
            ticket_number="",
            created_by=user.id,
            title="Test",
            description="Test description",
            category="IT",
            priority="medium",
            attachment_ids=[]
        )
        db.add(new_ticket)
        await db.flush()
        
        result = await db.execute(
            select(Ticket)
            .options(
                selectinload(Ticket.creator), 
                selectinload(Ticket.assignee),
                selectinload(Ticket.comments)
            )
            .where(Ticket.id == new_ticket.id)
            .execution_options(populate_existing=True)
        )
        ticket = result.scalar_one()
        
        try:
            res = TicketResponse.model_validate(ticket)
            print("Pydantic validation SUCCESS")
        except Exception as e:
            print("Pydantic validation FAILED:", type(e).__name__)
            print(str(e))

if __name__ == "__main__":
    asyncio.run(main())
