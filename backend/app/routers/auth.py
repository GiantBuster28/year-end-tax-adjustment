from fastapi import APIRouter, HTTPException, Request, status

from app.core.deps import CurrentUser, DBSession, RedisClient
from app.schemas.auth import LoginRequest, TokenResponse, UserInfo
from app.services.auth import authenticate_employee, create_session, revoke_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: DBSession, redis: RedisClient):
    employee = await authenticate_employee(db, request.email, request.password)
    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが正しくありません",
        )
    return await create_session(employee)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    current_user: CurrentUser,
    redis: RedisClient,
):
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        await revoke_token(redis, token)


@router.get("/me", response_model=UserInfo)
async def get_me(current_user: CurrentUser):
    return UserInfo.model_validate(current_user)
