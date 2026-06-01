import json
from typing import Annotated

import redis.asyncio as aioredis
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import decode_token
from app.database import get_db
from app.models.employee import Employee

bearer_scheme = HTTPBearer(auto_error=False)

_redis_client: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[aioredis.Redis, Depends(get_redis)],
) -> Employee:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="認証情報が無効です",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise credentials_exception

    token = credentials.credentials
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception

    # Check Redis session (blocklist for logged-out tokens)
    session_key = f"session:{token}"
    is_revoked = await redis.get(f"revoked:{token}")
    if is_revoked:
        raise credentials_exception

    employee_id: int | None = payload.get("sub")
    if employee_id is None:
        raise credentials_exception

    result = await db.execute(select(Employee).where(Employee.id == int(employee_id)))
    employee = result.scalar_one_or_none()

    if employee is None or not employee.is_active:
        raise credentials_exception

    return employee


async def get_current_admin(
    current_user: Annotated[Employee, Depends(get_current_user)],
) -> Employee:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="管理者権限が必要です",
        )
    return current_user


CurrentUser = Annotated[Employee, Depends(get_current_user)]
CurrentAdmin = Annotated[Employee, Depends(get_current_admin)]
DBSession = Annotated[AsyncSession, Depends(get_db)]
RedisClient = Annotated[aioredis.Redis, Depends(get_redis)]
