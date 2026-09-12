from typing import Any, Optional
from pydantic import BaseModel, Field


class ProblemDetail(BaseModel):
    type: str = Field(
        default="about:blank",
        description="URI reference that identifies the problem type",
    )
    title: str = Field(..., description="Short, human-readable summary of problem")
    status: int = Field(..., description="HTTP status code")
    detail: Optional[str] = Field(
        default=None, description="Human-readable explanation specific to this occurrence"
    )
    instance: Optional[str] = Field(
        default=None,
        description="URI reference that identifies the specific occurrence of the problem",
    )
    invalid_params: Optional[list[dict[str, Any]]] = Field(
        default=None, description="Detailed validation error list if applicable"
    )
