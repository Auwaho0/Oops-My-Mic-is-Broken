from datetime import datetime, timezone

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(default="ok", description="Liveness indicator")
    app: str = Field(..., description="Application name")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp in UTC",
    )


class ReadyResponse(BaseModel):
    status: str = Field(default="ready", description="Overall readiness status")
    database: str = Field(default="ok", description="Database connection status")
    redis: str = Field(default="ok", description="Redis connection status")
    storage: str = Field(default="ok", description="S3/MinIO connection status")
