from pydantic import BaseModel, Field


class TokenResponse(BaseModel):
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token lifetime in seconds")


class TokenPayload(BaseModel):
    sub: str = Field(..., description="Subject identifier (user UUID)")
    role: str = Field(default="user", description="User role")
    type: str = Field(..., description="Token type: access or refresh")
    exp: int = Field(..., description="Expiration timestamp in seconds")
