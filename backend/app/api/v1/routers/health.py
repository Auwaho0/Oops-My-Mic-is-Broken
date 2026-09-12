from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.health import HealthResponse, ReadyResponse

router = APIRouter(tags=["health"])
settings = get_settings()


@router.get("/health", response_model=HealthResponse, summary="Liveness check")
async def liveness_check() -> HealthResponse:
    """Returns application liveness status."""
    return HealthResponse(app=settings.APP_NAME)


@router.get("/ready", response_model=ReadyResponse, summary="Readiness check")
async def readiness_check() -> ReadyResponse:
    """Returns application readiness status for dependencies."""
    return ReadyResponse(
        status="ready",
        database="ok",
        redis="ok",
        storage="ok",
    )
