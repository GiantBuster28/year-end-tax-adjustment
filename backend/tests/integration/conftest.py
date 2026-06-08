"""
統合テスト用フィクスチャ。
インメモリSQLiteで動作するため、Postgresは不要。
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from unittest.mock import AsyncMock

from app.main import app
from app.database import Base, get_db
from app.core.deps import get_redis
from app.core.security import get_password_hash
from app.models.employee import Employee
from app.models.department import Department


TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="function")
async def db_engine():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine):
    factory = async_sessionmaker(db_engine, expire_on_commit=False, autoflush=False)
    async with factory() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def seed_users(db_session: AsyncSession):
    """管理者1名＋従業員1名を登録"""
    dept = Department(name="開発部", code="DEV")
    db_session.add(dept)
    await db_session.flush()

    admin = Employee(
        employee_code="ADM001",
        last_name="管理",
        first_name="太郎",
        email="admin@test.com",
        password_hash=get_password_hash("adminpass"),
        is_active=True,
        is_admin=True,
        department_id=dept.id,
        disability_type="none",
    )
    emp = Employee(
        employee_code="EMP001",
        last_name="山田",
        first_name="花子",
        email="yamada@test.com",
        password_hash=get_password_hash("emppass"),
        is_active=True,
        is_admin=False,
        department_id=dept.id,
        disability_type="none",
    )
    db_session.add_all([admin, emp])
    await db_session.commit()
    return {"admin": admin, "employee": emp}


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession, seed_users):
    """DB・Redisをオーバーライドしたテストクライアント"""
    mock_redis = AsyncMock()
    mock_redis.get = AsyncMock(return_value=None)   # トークン未失効
    mock_redis.setex = AsyncMock(return_value=True)

    async def override_db():
        yield db_session

    async def override_redis():
        return mock_redis

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_redis] = override_redis

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def auth_headers(client: AsyncClient):
    """従業員のJWTヘッダーを返す"""
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "yamada@test.com", "password": "emppass"},
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture(scope="function")
async def admin_headers(client: AsyncClient):
    """管理者のJWTヘッダーを返す"""
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
