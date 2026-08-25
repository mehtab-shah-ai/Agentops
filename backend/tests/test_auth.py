import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_and_login(async_client: AsyncClient):
    # 1. Register User
    reg_payload = {
        "email": "developer@agentops.dev",
        "password": "StrongPassword123!",
        "organization_name": "Acme AI Corp",
    }
    reg_res = await async_client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "developer@agentops.dev"
    assert data["user"]["organization_name"] == "Acme AI Corp"

    # 2. Register Duplicate Email (should fail)
    dup_res = await async_client.post("/api/auth/register", json=reg_payload)
    assert dup_res.status_code == 400

    # 3. Login with Correct Password
    login_payload = {
        "email": "developer@agentops.dev",
        "password": "StrongPassword123!",
    }
    login_res = await async_client.post("/api/auth/login", json=login_payload)
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token

    # 4. Login with Wrong Password
    wrong_login = {
        "email": "developer@agentops.dev",
        "password": "WrongPassword!",
    }
    wrong_res = await async_client.post("/api/auth/login", json=wrong_login)
    assert wrong_res.status_code == 401

    # 4b. Login with Non-Existent User (returns 404 with helpful message)
    not_found_login = {
        "email": "nonexistent@agentops.dev",
        "password": "Password123!",
    }
    not_found_res = await async_client.post("/api/auth/login", json=not_found_login)
    assert not_found_res.status_code == 404

    # 5. Access Protected /me Endpoint
    headers = {"Authorization": f"Bearer {token}"}
    me_res = await async_client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "developer@agentops.dev"


@pytest.mark.asyncio
async def test_api_key_management(async_client: AsyncClient):
    # Register and get JWT
    reg_payload = {
        "email": "keyuser@agentops.dev",
        "password": "Password12345!",
        "organization_name": "Key Corp",
    }
    reg_res = await async_client.post("/api/auth/register", json=reg_payload)
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Brand new user has 0 keys
    initial_keys_res = await async_client.get("/api/auth/keys", headers=headers)
    assert initial_keys_res.status_code == 200
    assert len(initial_keys_res.json()) == 0

    # 1. Create a custom API Key
    key_create_res = await async_client.post(
        "/api/auth/keys",
        json={"name": "Production Agent Key"},
        headers=headers,
    )
    assert key_create_res.status_code == 201
    key_data = key_create_res.json()
    assert "api_key" in key_data
    assert key_data["api_key"].startswith("ag_live_")
    assert key_data["name"] == "Production Agent Key"
    key_id = key_data["id"]

    # 2. List API Keys (should now be 1)
    list_res = await async_client.get("/api/auth/keys", headers=headers)
    assert list_res.status_code == 200
    keys = list_res.json()
    assert len(keys) == 1

    # 3. Delete / Revoke API Key
    del_res = await async_client.delete(f"/api/auth/keys/{key_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["key_id"] == key_id

    # 4. Confirm Key was removed
    list_res_after = await async_client.get("/api/auth/keys", headers=headers)
    remaining_ids = [k["id"] for k in list_res_after.json()]
    assert key_id not in remaining_ids
