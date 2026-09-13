from collections.abc import Sequence
from datetime import datetime, timezone
import uuid

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sound import Sound, SoundCategory


class SoundRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, sound_id: uuid.UUID) -> Sound | None:
        query = select(Sound).where(
            and_(Sound.id == sound_id, Sound.deleted_at.is_(None))
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_all(
        self,
        category: SoundCategory | None = None,
        user_id: uuid.UUID | None = None,
        include_all_user_sounds: bool = False,
        offset: int = 0,
        limit: int = 50,
    ) -> tuple[Sequence[Sound], int]:
        filters = [Sound.deleted_at.is_(None)]

        if category:
            filters.append(Sound.category == category.value)

        if user_id and include_all_user_sounds:
            # All system sounds + this user's sounds
            filters.append((Sound.is_system.is_(True)) | (Sound.user_id == user_id))
        elif user_id:
            # Strictly this user's sounds
            filters.append(Sound.user_id == user_id)
        else:
            # Public/system sounds only
            filters.append(Sound.is_system.is_(True))

        # Total count
        count_query = select(func.count(Sound.id)).where(and_(*filters))
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        # Data query
        data_query = (
            select(Sound)
            .where(and_(*filters))
            .order_by(Sound.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        data_result = await self.session.execute(data_query)
        return data_result.scalars().all(), total

    async def create(self, sound: Sound) -> Sound:
        self.session.add(sound)
        await self.session.commit()
        await self.session.refresh(sound)
        return sound

    async def soft_delete(self, sound: Sound) -> Sound:
        sound.deleted_at = datetime.now(timezone.utc)
        await self.session.commit()
        await self.session.refresh(sound)
        return sound
