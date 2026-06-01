from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.deps import _redis_client
from app.routers import auth, declarations, dependents, insurance, housing, attachments, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    import app.core.deps as deps_module
    deps_module._redis_client = aioredis.from_url(
        settings.REDIS_URL, decode_responses=True
    )
    print("Redis connection established")

    yield

    # Shutdown
    if deps_module._redis_client:
        await deps_module._redis_client.aclose()
        print("Redis connection closed")


app = FastAPI(
    title="年末調整システム API",
    description="年末調整申告・計算管理システムのバックエンドAPI",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター登録
API_PREFIX = "/api/v1"

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(declarations.router, prefix=API_PREFIX)
app.include_router(dependents.router, prefix=API_PREFIX)
app.include_router(insurance.router, prefix=API_PREFIX)
app.include_router(housing.router, prefix=API_PREFIX)
app.include_router(attachments.router, prefix=API_PREFIX)
app.include_router(admin.router, prefix=API_PREFIX)


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
