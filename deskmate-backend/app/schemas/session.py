# app/schemas/session.py
import uuid
from datetime import datetime
from pydantic import BaseModel

class UserSessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    device: str
    location: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
