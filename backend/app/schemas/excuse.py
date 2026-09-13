import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ExcuseBase(BaseModel):
    text: str = Field(..., min_length=3, max_length=500, description="Текст отговорки")


class ExcuseCreate(ExcuseBase):
    category: Literal["custom"] = Field(
        default="custom",
        description="Категория отговорки (пользовательские всегда 'custom')",
    )


class ExcuseRead(ExcuseBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    category: str
    is_system: bool
    user_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime


class ExcuseListResponse(BaseModel):
    items: list[ExcuseRead]
    total: int
    page: int
    page_size: int
