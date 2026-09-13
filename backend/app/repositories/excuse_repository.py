import uuid
from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.excuse import Excuse, ExcuseCategory


class ExcuseRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_random(
        self,
        category: str | None = None,
        user_id: uuid.UUID | None = None,
    ) -> Excuse | None:
        stmt = select(Excuse).where(Excuse.deleted_at.is_(None))

        if category == ExcuseCategory.CUSTOM.value:
            if user_id is None:
                return None
            stmt = stmt.where(
                Excuse.category == ExcuseCategory.CUSTOM.value,
                Excuse.user_id == user_id,
            )
        elif category:
            stmt = stmt.where(
                Excuse.category == category,
                Excuse.is_system.is_(True),
            )
        else:
            # All available: system excuses + user's custom excuses
            if user_id:
                stmt = stmt.where(
                    or_(
                        Excuse.is_system.is_(True),
                        Excuse.user_id == user_id,
                    )
                )
            else:
                stmt = stmt.where(Excuse.is_system.is_(True))

        stmt = stmt.order_by(func.random()).limit(1)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id(self, excuse_id: uuid.UUID) -> Excuse | None:
        stmt = select(Excuse).where(
            Excuse.id == excuse_id,
            Excuse.deleted_at.is_(None),
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_excuses(
        self,
        category: str | None = None,
        user_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Excuse], int]:
        base_stmt = select(Excuse).where(Excuse.deleted_at.is_(None))

        if category == ExcuseCategory.CUSTOM.value:
            if user_id is None:
                return [], 0
            base_stmt = base_stmt.where(
                Excuse.category == ExcuseCategory.CUSTOM.value,
                Excuse.user_id == user_id,
            )
        elif category:
            base_stmt = base_stmt.where(
                Excuse.category == category,
                Excuse.is_system.is_(True),
            )
        else:
            if user_id:
                base_stmt = base_stmt.where(
                    or_(
                        Excuse.is_system.is_(True),
                        Excuse.user_id == user_id,
                    )
                )
            else:
                base_stmt = base_stmt.where(Excuse.is_system.is_(True))

        # Count total
        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total = (await self.session.execute(count_stmt)).scalar_one() or 0

        # Paginate
        offset = (page - 1) * page_size
        items_stmt = (
            base_stmt.order_by(Excuse.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        result = await self.session.execute(items_stmt)
        items = list(result.scalars().all())

        return items, total

    async def create(self, excuse: Excuse) -> Excuse:
        self.session.add(excuse)
        await self.session.commit()
        await self.session.refresh(excuse)
        return excuse

    async def soft_delete(self, excuse: Excuse) -> None:
        excuse.deleted_at = datetime.now(timezone.utc)
        await self.session.commit()
