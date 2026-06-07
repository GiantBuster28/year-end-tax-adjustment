from datetime import timedelta

import redis.asyncio as aioredis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import create_access_token, verify_password
from app.models.employee import Employee
from app.schemas.auth import TokenResponse, UserInfo


async def authenticate_employee(
    db: AsyncSession, email: str, password: str
) -> Employee | None:
    result = await db.execute(select(Employee).where(Employee.email == email))
    employee = result.scalar_one_or_none()
    if employee is None:
        return None
    if not verify_password(password, employee.password_hash):
        return None
    if not employee.is_active:
        return None
    return employee


async def create_session(employee: Employee) -> TokenResponse:
    access_token = create_access_token(
        data={"sub": str(employee.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserInfo.model_validate(employee),
    )


async def revoke_token(redis: aioredis.Redis, token: str) -> None:
    """トークンを無効化（ブラックリスト追加）"""
    await redis.set(
        f"revoked:{token}",
        "1",
        ex=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
