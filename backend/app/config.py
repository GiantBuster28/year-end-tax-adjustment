import os
from pydantic_settings import BaseSettings, SettingsConfigDict

_WEAK_SECRETS = {
    "your-secret-key-change-in-production",
    "dev-secret-key-change-in-production",
    "change-this-to-a-secure-random-string-in-production",
    "secret",
    "password",
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/tax_adjustment"
    REDIS_URL: str = "redis://redis:6379"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "tax-attachments"

    CORS_ORIGINS: list[str] = ["http://localhost:4000", "http://localhost:3000"]

    def validate_production_secrets(self) -> None:
        """本番環境でデフォルト/脆弱な秘密鍵が使われていないことを確認する"""
        if os.getenv("ENV", "development") != "production":
            return
        errors = []
        if self.SECRET_KEY in _WEAK_SECRETS or len(self.SECRET_KEY) < 32:
            errors.append("SECRET_KEY が安全ではありません（32文字以上のランダム文字列を設定してください）")
        if self.MINIO_ACCESS_KEY == "minioadmin":
            errors.append("MINIO_ACCESS_KEY がデフォルト値のままです")
        if self.MINIO_SECRET_KEY == "minioadmin":
            errors.append("MINIO_SECRET_KEY がデフォルト値のままです")
        if "postgres:postgres" in self.DATABASE_URL:
            errors.append("DATABASE_URL にデフォルトのDBパスワードが含まれています")
        if errors:
            raise RuntimeError(
                "【本番環境エラー】以下のシークレットを安全な値に変更してください:\n"
                + "\n".join(f"  - {e}" for e in errors)
            )


settings = Settings()
settings.validate_production_secrets()
