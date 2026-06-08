"""管理者エンドポイントの統合テスト"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.declaration import TaxAdjustmentDeclaration


async def _create_submitted_declaration(
    client: AsyncClient, auth_headers: dict, fiscal_year: int = 2026
) -> int:
    create_res = await client.post(
        "/api/v1/declarations",
        json={"fiscal_year": fiscal_year},
        headers=auth_headers,
    )
    decl_id = create_res.json()["id"]
    await client.post(f"/api/v1/declarations/{decl_id}/submit", headers=auth_headers)
    return decl_id


@pytest.mark.asyncio
async def test_admin_list_declarations(
    client: AsyncClient, auth_headers: dict, admin_headers: dict
):
    await _create_submitted_declaration(client, auth_headers)
    res = await client.get("/api/v1/admin/declarations", headers=admin_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)


@pytest.mark.asyncio
async def test_admin_list_declarations_requires_admin(
    client: AsyncClient, auth_headers: dict
):
    res = await client.get("/api/v1/admin/declarations", headers=auth_headers)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_approve_declaration(
    client: AsyncClient, auth_headers: dict, admin_headers: dict
):
    decl_id = await _create_submitted_declaration(client, auth_headers)

    res = await client.put(
        f"/api/v1/admin/declarations/{decl_id}/approve",
        headers=admin_headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "approved"


@pytest.mark.asyncio
async def test_reject_declaration(
    client: AsyncClient, auth_headers: dict, admin_headers: dict
):
    decl_id = await _create_submitted_declaration(client, auth_headers)

    res = await client.put(
        f"/api/v1/admin/declarations/{decl_id}/reject",
        headers=admin_headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "rejected"


@pytest.mark.asyncio
async def test_approve_requires_submitted_status(
    client: AsyncClient, auth_headers: dict, admin_headers: dict
):
    """draft状態の申告書は承認できない"""
    create_res = await client.post(
        "/api/v1/declarations",
        json={"fiscal_year": 2026},
        headers=auth_headers,
    )
    decl_id = create_res.json()["id"]

    res = await client.put(
        f"/api/v1/admin/declarations/{decl_id}/approve",
        headers=admin_headers,
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_dashboard_stats(client: AsyncClient, admin_headers: dict):
    res = await client.get(
        "/api/v1/admin/dashboard", params={"fiscal_year": 2026}, headers=admin_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "approved_count" in data or "approved" in data


@pytest.mark.asyncio
async def test_salary_data_endpoint(
    client: AsyncClient,
    auth_headers: dict,
    admin_headers: dict,
    db_session: AsyncSession,
):
    """管理者が給与データをセットできる"""
    decl_id = await _create_submitted_declaration(client, auth_headers)
    await client.put(
        f"/api/v1/admin/declarations/{decl_id}/approve", headers=admin_headers
    )

    res = await client.post(
        f"/api/v1/admin/declarations/{decl_id}/salary",
        json={
            "total_salary": 5000000,
            "social_insurance_deduction": 720000,
            "withheld_tax_ytd": 180000,
        },
        headers=admin_headers,
    )
    assert res.status_code == 200

    # DBに反映されているか確認
    decl = await db_session.get(TaxAdjustmentDeclaration, decl_id)
    assert decl is not None
    assert int(decl.total_salary) == 5_000_000
