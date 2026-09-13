from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status

from app.api.deps import get_auth_service, get_current_user
from app.core.config import get_settings
from app.core.rate_limit import rate_limit_auth
from app.models.user import User
from app.schemas.token import TokenResponse
from app.schemas.user import (
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

COOKIE_KEY = "refresh_token"
COOKIE_PATH = f"{settings.API_V1_PREFIX}/auth"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    response.set_cookie(
        key=COOKIE_KEY,
        value=refresh_token,
        httponly=True,
        max_age=max_age,
        expires=max_age,
        samesite="lax",
        secure=settings.APP_ENV == "production",
        path=COOKIE_PATH,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=COOKIE_KEY,
        path=COOKIE_PATH,
        httponly=True,
        samesite="lax",
        secure=settings.APP_ENV == "production",
    )


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
    dependencies=[Depends(rate_limit_auth)],
)
async def register(
    payload: UserRegisterRequest,
    response: Response,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> TokenResponse:
    _, access_token, refresh_token = await auth_service.register(payload)
    _set_refresh_cookie(response, refresh_token)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and obtain access token",
    dependencies=[Depends(rate_limit_auth)],
)
async def login(
    payload: UserLoginRequest,
    response: Response,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> TokenResponse:
    _, access_token, refresh_token = await auth_service.authenticate(
        payload.email, payload.password
    )
    _set_refresh_cookie(response, refresh_token)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token using httpOnly cookie",
    dependencies=[Depends(rate_limit_auth)],
)
async def refresh_token(
    response: Response,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    refresh_token_cookie: Annotated[str | None, Cookie(alias=COOKIE_KEY)] = None,
) -> TokenResponse:
    if not refresh_token_cookie:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token cookie missing.",
        )
    _, access_token, new_refresh_token = await auth_service.refresh_tokens(
        refresh_token_cookie
    )
    _set_refresh_cookie(response, new_refresh_token)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post(
    "/logout",
    summary="Log out and clear refresh cookie",
)
async def logout(response: Response) -> dict[str, str]:
    _clear_refresh_cookie(response)
    return {"message": "Successfully logged out"}


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile",
)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    return UserResponse.model_validate(current_user)
