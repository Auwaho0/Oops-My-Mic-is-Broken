import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.seeds import seed_system_excuses


@pytest.fixture(autouse=True)
async def setup_excuses(db_session: AsyncSession) -> None:
    await seed_system_excuses(db_session)


@pytest.mark.asyncio
async def test_get_random_excuse_system(client: AsyncClient) -> None:
    response = await client.get("/api/v1/excuses/random?category=rude")
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == "rude"
    assert data["is_system"] is True
    assert len(data["text"]) > 0


@pytest.mark.asyncio
async def test_get_random_excuse_invalid_category(client: AsyncClient) -> None:
    response = await client.get("/api/v1/excuses/random?category=non_existent")
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_get_random_custom_unauthenticated(client: AsyncClient) -> None:
    response = await client.get("/api/v1/excuses/random?category=custom")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_system_excuses_paginated(client: AsyncClient) -> None:
    response = await client.get("/api/v1/excuses?category=rude&page=1&page_size=5")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["page"] == 1
    assert data["page_size"] == 5
    assert len(data["items"]) <= 5
    assert all(item["category"] == "rude" for item in data["items"])


@pytest.mark.asyncio
async def test_create_and_fetch_custom_excuse(client: AsyncClient) -> None:
    # 1. Register user
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "custom_agent@callsaver.app", "password": "SecretPassword123!"},
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create custom excuse
    custom_text = "Мой кот перегрыз провод микрофона и требует рыбу."
    create_res = await client.post(
        "/api/v1/excuses",
        json={"text": custom_text},
        headers=headers,
    )
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["text"] == custom_text
    assert created_data["category"] == "custom"
    assert created_data["is_system"] is False
    excuse_id = created_data["id"]

    # 3. Fetch random custom excuse with auth
    random_res = await client.get(
        "/api/v1/excuses/random?category=custom",
        headers=headers,
    )
    assert random_res.status_code == 200
    assert random_res.json()["id"] == excuse_id

    # 4. List user's custom excuses
    list_res = await client.get(
        "/api/v1/excuses?category=custom",
        headers=headers,
    )
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] == 1
    assert list_data["items"][0]["id"] == excuse_id

    # 5. Another user cannot delete this excuse
    reg2 = await client.post(
        "/api/v1/auth/register",
        json={"email": "other_agent@callsaver.app", "password": "SecretPassword123!"},
    )
    token2 = reg2.json()["access_token"]
    del_forbidden = await client.delete(
        f"/api/v1/excuses/{excuse_id}",
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert del_forbidden.status_code == 403

    # 6. Owner deletes custom excuse (soft delete)
    del_res = await client.delete(
        f"/api/v1/excuses/{excuse_id}",
        headers=headers,
    )
    assert del_res.status_code == 200

    # 7. Check that it is no longer listed or returned
    list_after = await client.get(
        "/api/v1/excuses?category=custom",
        headers=headers,
    )
    assert list_after.json()["total"] == 0
