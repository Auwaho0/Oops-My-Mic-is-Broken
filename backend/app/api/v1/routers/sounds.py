import os
from typing import Annotated
import uuid

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse

from app.api.deps import (
    get_current_user,
    get_current_user_optional,
    get_sound_service,
)
from app.core.rate_limit import rate_limit_upload
from app.models.sound import SoundCategory
from app.models.user import User
from app.schemas.sound import SoundListResponse, SoundRead
from app.services.sound_service import SoundService

router = APIRouter(prefix="/sounds", tags=["sounds"])


@router.get(
    "",
    response_model=SoundListResponse,
    summary="List sounds",
    description="Returns available sounds with optional category filter and current user's uploads.",
)
async def get_sounds(
    sound_service: Annotated[SoundService, Depends(get_sound_service)],
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
    category: SoundCategory | None = Query(
        default=None, description="Filter by sound category"
    ),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
) -> SoundListResponse:
    offset = (page - 1) * page_size
    sounds, total = await sound_service.get_sounds(
        category=category,
        user_id=current_user.id if current_user else None,
        include_all_user_sounds=True,
        offset=offset,
        limit=page_size,
    )
    return SoundListResponse(
        items=[SoundRead.model_validate(s) for s in sounds],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/upload",
    response_model=SoundRead,
    status_code=status.HTTP_201_CREATED,
    summary="Upload custom sound",
    description="Uploads an audio file (mp3, wav, ogg, m4a; max 5MB; max 30s) and assigns it to any category.",
    dependencies=[Depends(rate_limit_upload)],
)
async def upload_sound(
    sound_service: Annotated[SoundService, Depends(get_sound_service)],
    current_user: Annotated[User, Depends(get_current_user)],
    file: UploadFile = File(..., description="Audio file binary"),
    title: str = Form(..., min_length=2, max_length=100, description="Sound label/title"),
    category: SoundCategory = Form(
        default=SoundCategory.OTHER,
        description="Sound category (renovation, family, tech, other)",
    ),
    estimated_duration: float = Form(
        default=10.0,
        ge=1.0,
        le=30.0,
        description="Estimated duration in seconds (max 30s)",
    ),
) -> SoundRead:
    sound = await sound_service.upload_sound(
        file=file,
        title=title,
        category=category,
        user_id=current_user.id,
        estimated_duration=estimated_duration,
    )
    return SoundRead.model_validate(sound)


@router.delete(
    "/{sound_id}",
    response_model=SoundRead,
    summary="Delete custom sound",
    description="Soft-deletes a sound owned by the authenticated user or an admin/moderator.",
)
async def delete_sound(
    sound_id: uuid.UUID,
    sound_service: Annotated[SoundService, Depends(get_sound_service)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> SoundRead:
    deleted_sound = await sound_service.delete_sound(
        sound_id=sound_id,
        user_id=current_user.id,
        user_role=current_user.role,
    )
    return SoundRead.model_validate(deleted_sound)


@router.get(
    "/files/{user_id}/{filename}",
    summary="Stream stored sound file (local fallback)",
    include_in_schema=False,
)
async def get_sound_file(user_id: str, filename: str) -> FileResponse:
    local_path = os.path.join(os.getcwd(), "uploads", "sounds", user_id, filename)
    if not os.path.exists(local_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audio file not found.",
        )
    return FileResponse(local_path)
