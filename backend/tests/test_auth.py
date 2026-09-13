import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "test@example.com", "password": "SecretPassword123!"},
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "refresh_token" in response.cookies


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient) -> None:
    # First registration
    res1 = await client.post(
        "/api/v1/auth/register",
        json={"email": "duplicate@example.com", "password": "SecretPassword123!"},
    )
    assert res1.status_code == 201

    # Second registration with duplicate email
    res2 = await client.post(
        "/api/v1/auth/register",
        json={"email": "duplicate@example.com", "password": "AnotherPassword456!"},
    )
    assert res2.status_code == 409
    data = res2.json()
    assert "already exists" in data.get("detail", "").lower()


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={"email": "loginuser@example.com", "password": "MyStrongPassword1!"},
    )

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "loginuser@example.com", "password": "MyStrongPassword1!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in response.cookies


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={"email": "badpass@example.com", "password": "MyStrongPassword1!"},
    )

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "badpass@example.com", "password": "WrongPassword!"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_profile(client: AsyncClient) -> None:
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "me@example.com", "password": "MyStrongPassword1!"},
    )
    access_token = reg.json()["access_token"]

    # Without token
    unauth = await client.get("/api/v1/auth/me")
    assert unauth.status_code == 403 or unauth.status_code == 401

    # With Bearer token
    res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "me@example.com"
    assert data["role"] == "user"
    assert data["is_active"] is True
    assert "id" in data


@pytest.mark.asyncio
async def test_refresh_token_rotation(client: AsyncClient) -> None:
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "refresh@example.com", "password": "MyStrongPassword1!"},
    )
    refresh_token = reg.cookies.get("refresh_token")
    assert refresh_token is not None

    # Call refresh
    client.cookies.set("refresh_token", refresh_token)
    ref_res = await client.post("/api/v1/auth/refresh")
    assert ref_res.status_code == 200
    new_data = ref_res.json()
    assert "access_token" in new_data
    new_refresh_cookie = ref_res.cookies.get("refresh_token")
    assert new_refresh_cookie is not None


@pytest.mark.asyncio
async def test_logout(client: AsyncClient) -> None:
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "logout@example.com", "password": "MyStrongPassword1!"},
    )
    refresh_cookie = reg.cookies.get("refresh_token")
    assert refresh_cookie is not None

    client.cookies.set("refresh_token", refresh_cookie)
    logout_res = await client.post("/api/v1/auth/logout")
    assert logout_res.status_code == 200
    assert logout_res.json() == {"message": "Successfully logged out"}
