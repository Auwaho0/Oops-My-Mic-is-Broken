import uuid

from fastapi import HTTPException, status

from app.models.excuse import Excuse, ExcuseCategory
from app.repositories.excuse_repository import ExcuseRepository


class ExcuseService:
    def __init__(self, repository: ExcuseRepository) -> None:
        self.repository = repository

    async def get_random_excuse(
        self,
        category: str | None = None,
        user_id: uuid.UUID | None = None,
    ) -> Excuse:
        if category:
            valid_categories = [c.value for c in ExcuseCategory]
            if category not in valid_categories:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Недопустимая категория. Доступные: {', '.join(valid_categories)}",
                )

        if category == ExcuseCategory.CUSTOM.value and user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Требуется авторизация для получения пользовательских отговорок",
            )

        excuse = await self.repository.get_random(
            category=category,
            user_id=user_id,
        )
        if not excuse:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Отговорки в данной категории не найдены",
            )
        return excuse

    async def list_excuses(
        self,
        category: str | None = None,
        user_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Excuse], int]:
        if category:
            valid_categories = [c.value for c in ExcuseCategory]
            if category not in valid_categories:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Недопустимая категория. Доступные: {', '.join(valid_categories)}",
                )

        if category == ExcuseCategory.CUSTOM.value and user_id is None:
            return [], 0

        return await self.repository.list_excuses(
            category=category,
            user_id=user_id,
            page=page,
            page_size=page_size,
        )

    async def create_custom_excuse(
        self,
        text: str,
        user_id: uuid.UUID,
    ) -> Excuse:
        cleaned_text = text.strip()
        if len(cleaned_text) < 3:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Текст отговорки должен содержать не менее 3 символов",
            )

        excuse = Excuse(
            text=cleaned_text,
            category=ExcuseCategory.CUSTOM.value,
            is_system=False,
            user_id=user_id,
        )
        return await self.repository.create(excuse)

    async def delete_excuse(
        self,
        excuse_id: uuid.UUID,
        user_id: uuid.UUID,
        user_role: str,
    ) -> None:
        excuse = await self.repository.get_by_id(excuse_id)
        if not excuse:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Отговорка не найдена",
            )

        is_owner = excuse.user_id == user_id
        is_privileged = user_role in ("admin", "moderator")

        if excuse.is_system and not is_privileged:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав для удаления системных отговорок",
            )

        if not is_owner and not is_privileged:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Вы можете удалять только собственные отговорки",
            )

        await self.repository.soft_delete(excuse)
