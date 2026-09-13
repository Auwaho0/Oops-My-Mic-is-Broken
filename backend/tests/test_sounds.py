import io

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_sounds_empty_initially(client: AsyncClient) -> None:
    response = await client.get("/api/v1/sounds")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_upload_sound_unauthorized(client: AsyncClient) -> None:
    fake_wav = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
    files = {"file": ("test.wav", io.BytesIO(fake_wav), "audio/wav")}
    data = {"title": "Собака лает на соседа", "category": "family"}

    response = await client.post("/api/v1/sounds/upload", data=data, files=files)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_upload_and_delete_sound_flow(client: AsyncClient) -> None:
    # 1. Register & login user
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "soundmaker@callsaver.app", "password": "Password123!"},
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload valid WAV file
    fake_wav = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
    files = {"file": ("drill_sound.wav", io.BytesIO(fake_wav), "audio/wav")}
    data = {
        "title": "Штробление стены в 9 утра",
        "category": "renovation",
        "estimated_duration": 15.0,
    }

    upload_res = await client.post(
        "/api/v1/sounds/upload",
        data=data,
        files=files,
        headers=headers,
    )
    assert upload_res.status_code == 201
    sound_data = upload_res.json()
    assert sound_data["title"] == "Штробление стены в 9 утра"
    assert sound_data["category"] == "renovation"
    assert sound_data["duration_sec"] == 15.0
    sound_id = sound_data["id"]

    # 3. Verify in sounds list
    list_res = await client.get("/api/v1/sounds", headers=headers)
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(s["id"] == sound_id for s in list_data["items"])

    # 4. Soft delete sound
    del_res = await client.delete(f"/api/v1/sounds/{sound_id}", headers=headers)
    assert del_res.status_code == 200

    # 5. Verify no longer returned in list
    list_after_res = await client.get("/api/v1/sounds", headers=headers)
    assert list_after_res.status_code == 200
    assert not any(s["id"] == sound_id for s in list_after_res.json()["items"])
