# 年末調整システム

従業員の年末調整業務を電子化・自動化するWebシステムです。申告書の収集・審査から年末調整計算、源泉徴収票発行、法定調書提出まで一貫して対応します。

## ドキュメント

| ドキュメント | 説明 |
|------------|------|
| [システム仕様書](docs/system-specification.md) | 機能仕様・データ仕様・計算仕様・非機能要件 |
| [アーキテクチャ設計書](docs/architecture.md) | 技術スタック・システム構成・API設計・DB設計 |
| [画面モックアップ](docs/mockup/index.html) | 全15画面のインタラクティブモックアップ |

## システム概要

### 対象業務（2026年度）

- 扶養控除等申告書 / 保険料控除申告書 / 住宅借入金等特別控除申告書の収集・管理
- 年末調整計算（所得税・復興特別所得税）
- 源泉徴収票の発行
- 法定調書・給与支払報告書の作成・提出支援（e-Tax / eLTAX）

### 主なユーザー

| ロール | 主な操作 |
|--------|---------|
| 従業員 | 申告書入力・提出、源泉徴収票閲覧 |
| 管理者（給与担当） | 申告書審査・承認、年末調整計算実行、帳票出力 |

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React 18 / TypeScript 5 / Vite |
| BFF | Node.js 20 / Express |
| APIサーバー | Python 3.12 / FastAPI |
| データベース | PostgreSQL 15 |
| キャッシュ | Redis 7 |
| ファイルストレージ | MinIO（本番: S3互換） |
| コンテナ | Docker / Docker Compose |
| CI/CD | GitHub Actions |

## フォルダ構成

```
year-end-tax-adjustment/
├── frontend/          # React / TypeScript フロントエンド
├── backend/           # Python / FastAPI バックエンド
├── docs/              # 仕様書・設計書・モックアップ
├── infra/             # Docker・Nginx 設定
├── .github/workflows/ # CI/CD パイプライン
└── index.html         # GitHub Pages 公開用トップページ
```

詳細なフォルダ構成は[システム仕様書 § 10](docs/system-specification.md#10-プロジェクトフォルダ構成)を参照してください。

## 年末調整スケジュール

| 時期 | 内容 |
|------|------|
| 10月上旬 | システム設定（税率テーブル更新） |
| 11月1日〜30日 | 従業員による申告書入力・提出 |
| 12月1日〜10日 | 給与担当者による審査・承認 |
| 12月中旬 | 年末調整計算実行・確定 |
| 1月中旬 | 源泉徴収票発行 |
| 1月末日 | 法定調書・給与支払報告書提出 |

## セットアップ手順

### 前提条件

- Docker 24+ / Docker Compose v2
- Git

### 1. リポジトリのクローン

```bash
git clone https://github.com/GiantBuster28/year-end-tax-adjustment.git
cd year-end-tax-adjustment
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

本番運用時は以下を必ず変更してください：

| 変数 | 説明 |
|------|------|
| `SECRET_KEY` | JWTの署名鍵（ランダムな長い文字列） |
| `JWT_SECRET` | BFF側のJWT検証鍵（`SECRET_KEY`と同じ値） |
| `POSTGRES_PASSWORD` | PostgreSQLパスワード |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | MinIO認証情報 |

```bash
# 安全なランダム鍵の生成例
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 3. 起動

```bash
cd infra
docker compose up -d
```

初回起動時はイメージのビルドに数分かかります。各サービスのヘルスチェックが通るまで自動的に起動順序が制御されます。

### 4. DBマイグレーション

```bash
docker compose exec api alembic upgrade head
```

### 5. アクセス

| サービス | URL |
|---------|-----|
| フロントエンド | http://localhost:3000 |
| BFF（APIゲートウェイ） | http://localhost:4000 |
| バックエンドAPI | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |
| MinIOコンソール | http://localhost:9001 |
| MailHog（開発用メール） | http://localhost:8025 |

### 6. 初期アカウント

| ロール | メールアドレス | パスワード |
|--------|--------------|-----------|
| 管理者 | admin@example.com | password123 |
| 従業員 | yamada.hanako@example.com | password123 |

> **注意**: 初期パスワードは本番環境で必ず変更してください。

### 停止

```bash
docker compose down        # コンテナ停止
docker compose down -v     # コンテナ＋データ完全削除
```

---

## テストの実行

```bash
cd backend
pip install -r requirements-dev.txt
pytest tests/ -v
```

- ユニットテスト（58件）：DB・Redisなしで即時実行
- 統合テスト（22件）：インメモリSQLite + AsyncMock Redis で実行

---

## ライセンス

社内利用限定
