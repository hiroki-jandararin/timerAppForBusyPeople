# DB マイグレーション

## ツール
[goose](https://github.com/pressly/goose) を使用。

## ファイルの場所
`apps/backend/migrations/`

## 新しいマイグレーションを作成する

```bash
cd apps/backend
goose -s create ファイル名 sql
# 例: goose -s create add_index_to_routines sql
# → 20260618153045_add_index_to_routines.sql が生成される
```

生成されたファイルに `-- +goose Up` と `-- +goose Down` を記述する。

```sql
-- +goose Up
ALTER TABLE routines ADD COLUMN description TEXT;

-- +goose Down
ALTER TABLE routines DROP COLUMN description;
```

## マイグレーション実行

### 1. ターミナルで `apps/backend` に移動

```bash
cd apps/backend
```

### 2. DATABASE_URL を設定

```bash
# Preview 環境
export DATABASE_URL="postgresql://postgres.<project-id>:<パスワード>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

# 本番環境
export DATABASE_URL="postgresql://postgres.<project-id>:<パスワード>@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
```

実際の接続文字列は `.env` を参照。

### 3. 現在の状態を確認

```bash
goose -dir migrations postgres "$DATABASE_URL" status
```

出力例：
```
Applied At                  Migration
=======================================
2026/06/18 10:00:00  -- 20260618000001_create_routines.sql
2026/06/18 10:00:01  -- 20260618000002_create_workout_histories.sql
Pending                  -- 20260619120000_add_index_to_routines.sql  ← 未適用
```

### 4. 適用（up）

```bash
goose -dir migrations postgres "$DATABASE_URL" up
```

### 5. ロールバック（down）

```bash
# 1つ戻す
goose -dir migrations postgres "$DATABASE_URL" down
```

### 6. Preview → 本番の順で apply する

Preview で動作確認してから本番に apply する。

## 注意事項

- 既存のマイグレーションファイルは編集しない。変更は新しいファイルを追加する。
- `goose_db_version` テーブルは goose が自動で管理するので触らない。
- Preview と本番は別の DB なので、両方に apply する。
