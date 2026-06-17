from fastapi import APIRouter, HTTPException, Request, status

from app.core.deps import CurrentUser, DBSession, RedisClient
from app.schemas.auth import LoginRequest, TokenResponse, UserInfo
from app.services.auth import authenticate_employee, create_session, revoke_token
from app.services import audit

router = APIRouter(prefix="/auth", tags=["auth"])


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    return forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")


@router.post("/login", response_model=TokenResponse)
async def login(request: Request, body: LoginRequest, db: DBSession, redis: RedisClient):
    employee = await authenticate_employee(db, body.email, body.password)
    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが正しくありません",
        )
    await audit.record(
        db,
        action="login",
        actor_id=employee.id,
        target_type="employee",
        target_id=employee.id,
        ip_address=_client_ip(request),
    )
    await db.commit()
    return await create_session(employee)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    current_user: CurrentUser,
    redis: RedisClient,
    db: DBSession,
):
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        await revoke_token(redis, token)
    await audit.record(
        db,
        action="logout",
        actor_id=current_user.id,
        target_type="employee",
        target_id=current_user.id,
        ip_address=_client_ip(request),
    )
    await db.commit()


@router.get("/me", response_model=UserInfo)
async def get_me(current_user: CurrentUser):
    return UserInfo.model_validate(current_user)
