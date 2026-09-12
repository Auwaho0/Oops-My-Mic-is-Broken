from typing import Any

from pydantic import BaseModel, Field


class ProblemDetail(BaseModel):
    type: str = Field(
        default="about:blank",
        description="URI reference that identifies the problem type",
    )
    title: str = Field(..., description="Short, human-readable summary of problem")
    status: int = Field(..., description="HTTP status code")
    detail: str | None = Field(
        default=None,
        description="Human-readable explanation specific to this occurrence",
    )
    instance: str | None = Field(
        default=None,
        description="URI reference that identifies the specific occurrence of the problem",
    )
    invalid_params: list[dict[str, Any]] | None = Field(
        default=None, description="Detailed validation error list if applicable"
    )
