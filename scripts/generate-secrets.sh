#!/usr/bin/env bash
# 本番環境用シークレットを生成して .env.production に書き出すスクリプト
# 使い方: bash scripts/generate-secrets.sh
set -euo pipefail

OUTPUT=".env.production"

if [ -f "$OUTPUT" ]; then
  echo "[警告] $OUTPUT が既に存在します。上書きしますか？ (y/N)"
  read -r answer
  if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
    echo "中止しました。"
    exit 0
  fi
fi

# ── 乱数生成ヘルパー ─────────────────────────────────────────────────────────
gen_secret() {
  python3 -c "import secrets; print(secrets.token_hex(32))"
}

gen_password() {
  python3 -c "import secrets, string; chars=string.ascii_letters+string.digits; print(''.join(secrets.choice(chars) for _ in range(24)))"
}

SECRET_KEY=$(gen_secret)
JWT_SECRET="$SECRET_KEY"   # BFF と Backend は同じ鍵を共有する
DB_PASSWORD=$(gen_password)
MINIO_ACCESS=$(gen_password)
MINIO_SECRET=$(gen_secret)

cat > "$OUTPUT" <<EOF
# ══════════════════════════════════════════════════════════════════════
# 年末調整システム 本番環境設定
# 生成日時: $(date '+%Y-%m-%d %H:%M:%S')
# このファイルは機密情報を含みます。Gitにコミットしないでください。
# ══════════════════════════════════════════════════════════════════════

ENV=production

# ── Database ───────────────────────────────────────────────────────────
POSTGRES_DB=tax_adjustment
POSTGRES_USER=tax_app
POSTGRES_PASSWORD=${DB_PASSWORD}
DATABASE_URL=postgresql+asyncpg://tax_app:${DB_PASSWORD}@db:5432/tax_adjustment

# ── Redis ──────────────────────────────────────────────────────────────
REDIS_URL=redis://redis:6379

# ── JWT (backend と BFF で同一の値を使用) ─────────────────────────────
SECRET_KEY=${SECRET_KEY}
JWT_SECRET=${JWT_SECRET}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# ── MinIO (object storage) ─────────────────────────────────────────────
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=${MINIO_ACCESS}
MINIO_SECRET_KEY=${MINIO_SECRET}
MINIO_BUCKET=tax-attachments

# ── BFF ────────────────────────────────────────────────────────────────
PORT=4000
API_URL=http://api:8000
NODE_ENV=production

# ── Frontend ───────────────────────────────────────────────────────────
# 実際のドメインに変更してください
VITE_API_URL=https://your-domain.example.com

# ── CORS ───────────────────────────────────────────────────────────────
# 実際のフロントエンドURLに変更してください
CORS_ORIGIN=https://your-domain.example.com
EOF

echo ""
echo "✅ $OUTPUT を生成しました。"
echo ""
echo "【次の手順】"
echo "  1. VITE_API_URL と CORS_ORIGIN を実際のドメインに変更してください"
echo "  2. docker compose --env-file .env.production -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d"
echo "  3. docker compose exec api alembic upgrade head"
echo ""
echo "【注意】"
echo "  - .env.production は .gitignore に含まれています（コミット禁止）"
echo "  - 本番サーバーのファイルパーミッションを 600 に設定してください: chmod 600 $OUTPUT"
