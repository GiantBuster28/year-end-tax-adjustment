"""申告書エンドポイントの統合テスト"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_declaration(client: AsyncClient, auth_headers: dict):
    res = await client.post(
        "/api/v1/declarations",
        json={"fiscal_year": 2026},
        headers=auth_headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["fiscal_year"] == 2026
    assert data["status"] == "draft"


@pytest.mark.asyncio
async def test_create_declaration_duplicate(client: AsyncClient, auth_headers: dict):
    await client.post(
        "/api/v1/declarations",
        json={"fiscal_year": 2026},
        headers=auth_headers,
    )
    res = await client.post(
        "/api/v1/declarations",
        json={"fiscal_year": 2026},
        headers=auth_headers,
    )
    assert res.status_code == 409


@pytest.mark.asyncio
async def test_list_declarations(client: AsyncClient, auth_headers: dict):
    await client.post(
        "/api/v1/declarations", json={"fiscal_year": 2026}, headers=auth_headers
    )
    res = await client.get("/api/v1/declarations", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()) >= 1


@pytest.mark.asyncio
async def test_get_declaration(client: AsyncClient, auth_headers: dict):
    create_res = await client.post(
        "/api/v1/declarations", json={"fiscal_year": 2026}, headers=auth_headers
    )
    decl_id = create_res.json()["id"]

    res = await client.get(f"/api/v1/declarations/{decl_id}", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["id"] == decl_id


@pytest.mark.asyncio
async def test_get_declaration_forbidden(client: AsyncClient, auth_headers: dict, admin_headers: dict):
    """他ユーザーの申告書は取得できない"""
    create_res = await client.post(
        "/api/v1/declarations", json={"fiscal_year": 2026}, headers=auth_headers
    )
    decl_id = create_res.json()["id"]

    res = await client.get(f"/api/v1/declarations/{decl_id}", headers=admin_headers)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_submit_declaration(client: AsyncClient, auth_headers: dict):
    create_res = await client.post(
        "/api/v1/declarations", json={"fiscal_year": 2026}, headers=auth_headers
    )
    decl_id = create_res.json()["id"]

    res = await client.post(
        f"/api/v1/declarations/{decl_id}/submit", headers=auth_headers
    )
    assert res.status_code == 200
    assert res.json()["status"] == "submitted"


@pytest.mark.asyncio
async def test_submit_already_submitted(client: AsyncClient, auth_headers: dict):
    """提出済みの申告書は再提出できない"""
    create_res = await client.post(
        "/api/v1/declarations", json={"fiscal_year": 2026}, headers=auth_headers
    )
    decl_id = create_res.json()["id"]
    await client.post(f"/api/v1/declarations/{decl_id}/submit", headers=auth_headers)

    res = await client.post(
        f"/api/v1/declarations/{decl_id}/submit", headers=auth_headers
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_declarations_require_auth(client: AsyncClient):
    res = await client.get("/api/v1/declarations")
    assert res.status_code == 401
