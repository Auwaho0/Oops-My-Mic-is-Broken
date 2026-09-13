import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import (
    get_current_user,
    get_current_user_optional,
    get_excuse_service,
)
from app.core.rate_limit import rate_limit_create_excuse
from app.models.user import User
from app.schemas.excuse import ExcuseCreate, ExcuseListResponse, ExcuseRead
from app.services.excuse_service import ExcuseService

router = APIRouter(prefix="/excuses", tags=["excuses"])


@router.get(
    "/random",
    response_model=ExcuseRead,
    summary="Получить случайную отговорку",
    description="Возвращает случайную системную или пользовательскую отговорку по категории.",
)
async def get_random_excuse(
    excuse_service: Annotated[ExcuseService, Depends(get_excuse_service)],
    current_user: Annotated[User | None, Depends(get_current_user_optional)],
    category: Annotated[
        str | None,
        Query(
            description="Категория: rude, polite, technical, absurd, custom",
        ),
    ] = None,
) -> ExcuseRead:
    user_id = current_user.id if current_user else None
    excuse = await excuse_service.get_random_excuse(
        category=category,
        user_id=user_id,
    )
    return ExcuseRead.model_validate(excuse)


@router.get(
    "",
    response_model=ExcuseListResponse,
    summary="Получить список отговорок",
    description="Возвращает постраничный список отговорок с фильтрацией по категории.",
)
async def list_excuses(
    excuse_service: Annotated[ExcuseService, Depends(get_excuse_service)],
    current_user: Annotated[User | None, Depends(get_current_user_optional)],
    category: Annotated[
        str | None,
        Query(
            description="Категория: rude, polite, technical, absurd, custom",
        ),
    ] = None,
    page: Annotated[int, Query(ge=1, description="Номер страницы")] = 1,
    page_size: Annotated[
        int, Query(ge=1, le=100, description="Количество элементов на странице")
    ] = 20,
) -> ExcuseListResponse:
    user_id = current_user.id if current_user else None
    items, total = await excuse_service.list_excuses(
        category=category,
        user_id=user_id,
        page=page,
        page_size=page_size,
    )
    return ExcuseListResponse(
        items=[ExcuseRead.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post(
    "",
    response_model=ExcuseRead,
    status_code=status.HTTP_201_CREATED,
    summary="Создать пользовательскую отговорку",
    description="Добавляет новую отговорку в категорию 'custom' текущего пользователя.",
    dependencies=[Depends(rate_limit_create_excuse)],
)
async def create_custom_excuse(
    payload: ExcuseCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    excuse_service: Annotated[ExcuseService, Depends(get_excuse_service)],
) -> ExcuseRead:
    excuse = await excuse_service.create_custom_excuse(
        text=payload.text,
        user_id=current_user.id,
    )
    return ExcuseRead.model_validate(excuse)


@router.delete(
    "/{excuse_id}",
    status_code=status.HTTP_200_OK,
    summary="Удалить отговорку",
    description="Выполняет soft delete пользовательской отговорки.",
)
async def delete_excuse(
    excuse_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    excuse_service: Annotated[ExcuseService, Depends(get_excuse_service)],
) -> dict[str, str]:
    await excuse_service.delete_excuse(
        excuse_id=excuse_id,
        user_id=current_user.id,
        user_role=current_user.role,
    )
    return {"message": "Отговорка успешно удалена"}
