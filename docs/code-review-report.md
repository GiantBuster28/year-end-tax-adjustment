# コードレビュー記録

**対象リポジトリ**: GiantBuster28/year-end-tax-adjustment  
**対象ブランチ**: claude/create-system-specification-zSz7a  
**レビュー日**: 2026-06-03  
**レビュー方式**: 自動レビューエージェント（Angle A–G 並列実行 → 検証 → 修正）  

---

## 1. レビュー概要

7つの独立したファインダーエージェントを並列実行し、差分全体をスキャン。  
検出された候補を重複排除・検証フェーズで絞り込み、以下の計 **10件** を修正対象として確定した。

| 重要度 | 分類 | 件数 |
|--------|------|------|
| Critical | セキュリティ | 3 |
| High | 計算ロジック | 4 |
| Medium | インフラ/可用性 | 1 |
| Low | コード品質 | 2 |

---

## 2. 指摘事項と修正内容

### 🔴 Critical — セキュリティ

#### [SEC-01] Redisキープレフィックス不一致によるトークン失効の無効化

| 項目 | 内容 |
|------|------|
| ファイル | `bff/src/middleware/auth.ts`, `bff/src/routes/auth.ts` |
| 発見角度 | Angle B（削除行の振る舞い監査） |
| 検証結果 | CONFIRMED |

**問題**  
ログアウト時に `blacklist:${token}` キーでRedisに書き込むが、認証ミドルウェアは `revoked:${token}` キーを参照していた。キープレフィックスが異なるため、ログアウト済みトークンが常に有効と判定されていた。

**修正前**
```typescript
// auth.ts logout
await redis.setex(`blacklist:${token}`, ttl, '1');

// middleware/auth.ts
const blacklisted = await redis.get(`blacklist:${token}`);
```

**修正後**
```typescript
// 両ファイルを revoked: に統一
await redis.setex(`revoked:${token}`, ttl, '1');
const blacklisted = await redis.get(`revoked:${token}`);
```

---

#### [SEC-02] ログアウト処理で署名未検証トークンをRedisに保存

| 項目 | 内容 |
|------|------|
| ファイル | `bff/src/routes/auth.ts` |
| 発見角度 | Angle A（行ごとのdiffスキャン） |
| 検証結果 | CONFIRMED |

**問題**  
`jwt.decode()` は署名を検証しないため、攻撃者が任意のJWTを細工して `/logout` を叩くとRedisに偽トークンが蓄積される（Redis汚染攻撃）。

**修正前**
```typescript
const decoded = jwt.decode(token) as jwt.JwtPayload | null;
```

**修正後**
```typescript
const decoded = jwt.verify(token, config.jwt.secret) as jwt.JwtPayload;
```

---

#### [SEC-03] Redisダウン時に認証をフェイルオープン

| 項目 | 内容 |
|------|------|
| ファイル | `bff/src/middleware/auth.ts` |
| 発見角度 | Angle B（削除行の振る舞い監査） |
| 検証結果 | CONFIRMED |

**問題**  
Redis接続エラー時に `next()` を呼び出してリクエストを通過させていた。Redisが落ちると失効済みトークンが有効と見なされる。

**修正前**
```typescript
} catch (err) {
  console.error('[auth] Redis error:', err);
  return next(); // ← フェイルオープン
}
```

**修正後**
```typescript
} catch (err) {
  console.error('[auth] Redis error:', err);
  return res.status(503).json({ detail: 'Service temporarily unavailable' }); // フェイルクローズド
}
```

---

#### [SEC-04] ファイルアップロードのパストラバーサル

| 項目 | 内容 |
|------|------|
| ファイル | `backend/app/routers/attachments.py` |
| 発見角度 | Angle A（行ごとのdiffスキャン） |
| 検証結果 | CONFIRMED |

**問題**  
`file.filename` をそのままS3キーに埋め込んでいたため、`../../etc/passwd` のようなパスを含むファイル名でオブジェクトキーが汚染される。

**修正前**
```python
object_key = f"declarations/{declaration_id}/{uuid.uuid4()}_{file.filename}"
```

**修正後**
```python
raw_name = os.path.basename(file.filename or "upload")
safe_name = re.sub(r"[^\w.\-]", "_", raw_name)[:200]
object_key = f"declarations/{declaration_id}/{uuid.uuid4()}_{safe_name}"
```

---

### 🟠 High — 計算ロジック

#### [CALC-01] 新旧両契約ある場合の保険料控除上限誤り

| 項目 | 内容 |
|------|------|
| ファイル | `backend/app/services/calculation/insurance.py` |
| 発見角度 | Angle A（行ごとのdiffスキャン） |
| 検証結果 | CONFIRMED |

**問題**  
生命保険・年金保険で新旧両契約が存在する場合、各区分の合計上限は **40,000円** だが、新契約上限(40,000)＋旧契約上限(50,000)を素直に合算すると最大90,000円になる計算になっていた。

**修正前**
```python
life_new_ded = min(calculate_life_insurance_deduction_new(life_new_total), 40_000)
life_old_ded = min(calculate_life_insurance_deduction_old(life_old_total), 50_000)
life_pension_total = min(life_new_ded + pension_new_ded + life_old_ded + pension_old_ded, 120_000)
```

**修正後**
```python
if life_new_total > 0 and life_old_total > 0:
    life_ded = min(
        calculate_life_insurance_deduction_new(life_new_total)
        + calculate_life_insurance_deduction_old(life_old_total),
        40_000,  # 新旧合算の場合は40,000上限
    )
elif life_old_total > 0:
    life_ded = min(calculate_life_insurance_deduction_old(life_old_total), 50_000)
else:
    life_ded = min(calculate_life_insurance_deduction_new(life_new_total), 40_000)
# pension_ded も同様
```

---

#### [CALC-02] 配偶者控除：従業員所得10,000,000円超での控除漏れ

| 項目 | 内容 |
|------|------|
| ファイル | `backend/app/services/calculation/dependent.py` |
| 発見角度 | Angle A（行ごとのdiffスキャン） |
| 検証結果 | CONFIRMED |

**問題**  
配偶者控除（配偶者所得 ≤ 480,000円）の分岐で従業員の給与所得チェックがなかった。従業員所得が10,000,000円を超えると配偶者控除は適用不可（所得税法第83条）。

**修正前**
```python
if spouse_inc <= 480_000:
    if spouse_birth_date:
        age = get_age_at_year_end(spouse_birth_date, fiscal_year)
        if age >= 70:
            return Decimal(480_000)
    return Decimal(380_000)
```

**修正後**
```python
if int(employee_salary_income) > 10_000_000:
    return Decimal(0)  # 従業員所得超過により配偶者控除・特別控除ともに0

if spouse_inc <= 480_000:
    ...
```

---

#### [CALC-03] 同居老親等（¥580,000）の適用範囲が広すぎる

| 項目 | 内容 |
|------|------|
| ファイル | `backend/app/services/calculation/dependent.py` |
| 発見角度 | Angle A（行ごとのdiffスキャン） |
| 検証結果 | CONFIRMED |

**問題**  
同居老親等控除（¥580,000）は **直系尊属（父母・祖父母）** のみに適用される（所得税法第84条）。兄弟姉妹など同居の70歳以上には適用されず、一般の老人扶養親族控除（¥480,000）となる。

**修正前**
```python
elif age >= 70 and dependent.is_living_together:
    return "elderly_cohabiting"
```

**修正後**
```python
elif age >= 70 and dependent.is_living_together and dependent.relation_type in ("parent", "grandparent"):
    return "elderly_cohabiting"
```

---

#### [CALC-04] 計算確定処理でステータスが誤設定

| 項目 | 内容 |
|------|------|
| ファイル | `backend/app/routers/admin.py` |
| 発見角度 | Angle B（削除行の振る舞い監査） |
| 検証結果 | CONFIRMED |

**問題**  
`POST /calculations/{year}/confirm` が申告書ステータスを `"approved"` にセットしていた。これは審査承認状態と同じ値で、再計算処理の対象フィルター（`status == "approved"`）に再度ヒットしてしまう。

**修正前**
```python
decl.status = "approved"  # 最終確定
```

**修正後**
```python
decl.status = "confirmed"  # 最終確定
```

---

### 🟡 Medium — インフラ/可用性

#### [INFRA-01] docker-composeにヘルスチェックなし

| 項目 | 内容 |
|------|------|
| ファイル | `infra/docker-compose.yml` |
| 発見角度 | Angle C（クロスファイルトレース） |
| 検証結果 | CONFIRMED |

**問題**  
`depends_on` のみでは依存サービスの起動完了を保証できない。PostgreSQL/Redisの初期化が完了する前にAPIが起動し、接続エラーで落ちることがあった。

**修正**  
全サービスに `healthcheck` を追加し、`depends_on: condition: service_healthy` に変更。

```yaml
db:
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres -d tax_adjustment"]
    interval: 5s
    retries: 10

api:
  depends_on:
    db:
      condition: service_healthy
    redis:
      condition: service_healthy
```

---

### 🟢 Low — コード品質

#### [QUAL-01] 給与データのハードコーディング

| 項目 | 内容 |
|------|------|
| ファイル | `backend/app/routers/admin.py` |
| 発見角度 | Angle A（行ごとのdiffスキャン） |
| 検証結果 | CONFIRMED |

**問題**  
年税額計算のバックグラウンドタスクが `total_salary = Decimal("5000000")` と `withheld_tax = Decimal("180000")` をハードコードしていた。

**修正**  
`tax_adjustment_declarations` テーブルに `total_salary`, `social_insurance_deduction`, `withheld_tax_ytd` カラムを追加。計算時は `decl.total_salary` を参照し、未設定の場合はスキップ。管理者は `POST /admin/declarations/{id}/salary` で給与データを事前登録する。

---

#### [QUAL-02] 未使用変数 `session_key`

| 項目 | 内容 |
|------|------|
| ファイル | `backend/app/core/deps.py` |
| 発見角度 | Angle D/E/F（シンプリフィケーション） |
| 検証結果 | CONFIRMED |

**問題**  
`session_key = f"session:{token}"` が定義されているが参照されていない。

**修正**  
該当行を削除。

---

## 3. 修正サマリー

| ID | ファイル | 修正種別 | コミット |
|----|---------|---------|---------|
| SEC-01 | bff/src/middleware/auth.ts, bff/src/routes/auth.ts | セキュリティ | `7be532c` |
| SEC-02 | bff/src/routes/auth.ts | セキュリティ | `7be532c` |
| SEC-03 | bff/src/middleware/auth.ts | セキュリティ | `7be532c` |
| SEC-04 | backend/app/routers/attachments.py | セキュリティ | `7be532c` |
| CALC-01 | backend/app/services/calculation/insurance.py | 計算ロジック | `7be532c` |
| CALC-02 | backend/app/services/calculation/dependent.py | 計算ロジック | `7be532c` |
| CALC-03 | backend/app/services/calculation/dependent.py | 計算ロジック | `7be532c` |
| CALC-04 | backend/app/routers/admin.py | 計算ロジック | `7be532c` |
| INFRA-01 | infra/docker-compose.yml | インフラ | `7be532c` |
| QUAL-01 | backend/app/routers/admin.py, models/declaration.py | 品質 | `7be532c` |
| QUAL-02 | backend/app/core/deps.py | 品質 | `7be532c` |

---

## 4. 未検出・対象外事項

- フロントエンドのXSS/CSRF: BFFがHttpOnly Cookieを発行しており、直接のXSS経路は限定的。詳細なUI側レビューは範囲外。
- SQLインジェクション: SQLAlchemy ORMのパラメータバインディングを使用しており問題なし。
- レート制限: 現時点で未実装。本番前に追加を推奨。
- アクセスログ/監査ログ: 現時点で未実装。コンプライアンス要件に応じて追加を推奨。
