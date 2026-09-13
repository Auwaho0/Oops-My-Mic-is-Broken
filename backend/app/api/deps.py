import uuid
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User
from app.repositories.excuse_repository import ExcuseRepository
from app.repositories.sound_repository import SoundRepository
from app.services.auth_service import AuthService
from app.services.excuse_service import ExcuseService
from app.services.sound_service import SoundService

bearer_scheme = HTTPBearer(auto_error=True)
bearer_scheme_optional = HTTPBearer(auto_error=False)


async def get_auth_service(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> AuthService:
    return AuthService(session)


async def get_excuse_service(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ExcuseService:
    repository = ExcuseRepository(session)
    return ExcuseService(repository)


async def get_sound_service(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> SoundService:
    repository = SoundRepository(session)
    return SoundService(repository)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> User:
    token = credentials.credentials
    try:
        payload = decode_token(token)
        token_type = payload.get("type")
        sub = payload.get("sub")
        if token_type != "access" or not sub:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid access token.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id = uuid.UUID(sub)
    except (jwt.PyJWTError, ValueError) as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from err

    user = await auth_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user.",
        )
    return user


async def get_current_user_optional(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme_optional)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> User | None:
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        token_type = payload.get("type")
        sub = payload.get("sub")
        if token_type != "access" or not sub:
            return None
        user_id = uuid.UUID(sub)
        user = await auth_service.get_user_by_id(user_id)
        if not user or not user.is_active:
            return None
        return user
    except Exception:
        return None
