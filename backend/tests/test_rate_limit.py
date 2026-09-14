import pytest
from httpx import AsyncClient

from app.core.rate_limit import _in_memory_cache


@pytest.mark.asyncio
async def test_rate_limit_auth_endpoints(client: AsyncClient) -> None:
    # Clear in-memory cache before testing
    _in_memory_cache.clear()

    # First 5 login attempts should pass rate limiter (even if credentials fail with 401)
    for i in range(5):
        res = await client.post(
            "/api/v1/auth/login",
            json={"email": f"ratelimit{i}@example.com", "password": "wrongpassword123"},
            headers={"X-Forwarded-For": "203.0.113.42"},
        )
        assert res.status_code == 401  # Rejected by auth, not rate limiter
        assert "X-Request-ID" in res.headers

    # 6th request from the same IP must be rate limited with HTTP 429 (§6)
    res_limited = await client.post(
        "/api/v1/auth/login",
        json={"email": "ratelimit_blocked@example.com", "password": "wrongpassword123"},
        headers={"X-Forwarded-For": "203.0.113.42"},
    )
    assert res_limited.status_code == 429
    assert "Retry-After" in res_limited.headers
    assert res_limited.headers["Content-Type"].startswith("application/problem+json")
    data = res_limited.json()
    assert data["status"] == 429
    assert "Слишком много запросов" in data["detail"] or "Rate limit exceeded" in data["detail"]


@pytest.mark.asyncio
async def test_request_id_header_propagation(client: AsyncClient) -> None:
    custom_id = "test-custom-request-id-12345"
    res = await client.get("/health", headers={"X-Request-ID": custom_id})
    assert res.status_code == 200
    assert res.headers.get("X-Request-ID") == custom_id
