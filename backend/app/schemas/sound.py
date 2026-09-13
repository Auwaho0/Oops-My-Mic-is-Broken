import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.sound import SoundCategory


class SoundBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=100)
    category: SoundCategory = Field(default=SoundCategory.OTHER)


class SoundCreate(SoundBase):
    pass


class SoundRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    category: SoundCategory
    file_url: str
    mime_type: str
    file_size: int
    duration_sec: float
    is_system: bool
    is_nsfw: bool
    user_id: uuid.UUID | None = None
    created_at: datetime


class SoundListResponse(BaseModel):
    items: list[SoundRead]
    total: int
    page: int
    page_size: int
