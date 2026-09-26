# CI/CD パイプライン

GitHub Actions による自動テスト・デプロイの構成ドキュメント。

---

## ワークフロー一覧

| ファイル | トリガー | 役割 |
|---|---|---|
| `ci.yml` | PR 作成・更新 | テスト・型検査 |
| `cd-staging.yml` | develop へのマージ | ステージング自動デプロイ |
| `cd-mobile-production.yml` | main へのマージ | iOS 本番ビルド + App Store 提出 |
| `cd-production-manual.yml` | 手動実行 | バックエンド・Web 本番デプロイ |

---

## ブランチとデプロイの対応

```
feature/* → develop へ PR
                ↓ マージ
            develop ─────────────→ quickfit-timer-api-dev（Lambda staging）
                                 → Vercel プレビュー
                                 → EAS preview ビルド（iOS）
                ↓ PR
            main ────────────────→ EAS production ビルド → App Store 提出

本番（バックエンド・Web）は GitHub Actions の手動実行のみ
```

---

## 各ワークフローの詳細

### ci.yml — PR バリデーション

PR を作成・更新するたびに、変更されたアプリのテストのみを実行する。

**パスフィルターの挙動:**

| 変更したパス | 実行されるジョブ |
|---|---|
| `apps/backend/**` | Go テスト（`go test ./...`） |
| `apps/web/**` | Vitest + TypeScript 型検査 |
| `apps/mobile/**` | jest-expo + TypeScript 型検査 |
| `packages/**` | Web + モバイル両方 |

テストが1つでも失敗するとマージ不可になる（ブランチ保護ルール要設定）。

---

### cd-staging.yml — ステージング自動デプロイ

develop ブランチへのマージ後に自動実行。変更されたアプリのみデプロイされる。

| 変更したパス | デプロイ先 |
|---|---|
| `apps/backend/**` | `quickfit-timer-api-dev`（AWS Lambda） |
| `apps/web/**` または `packages/**` | Vercel プレビュー環境 |
| `apps/mobile/**` または `packages/**` | EAS preview ビルド（iOS） |

AWS 認証は OIDC（アクセスキー不使用）。develop ブランチからのリクエストのみ許可。

---

### cd-mobile-production.yml — モバイル本番

main ブランチへのマージ後、`apps/mobile/` または `packages/` に変更があった場合のみ実行。

1. EAS production ビルド（iOS）
2. App Store Connect へ自動提出

App Store の審査を通過して初めて公開される。審査中は引き続き開発可能。

---

### cd-production-manual.yml — 手動本番デプロイ

GitHub Actions UI から手動で実行する。バックエンドと Web の本番デプロイはこの方法のみ。

**実行手順:**
```
GitHub リポジトリ
→ Actions タブ
→ 左サイドバーで "CD Production (Manual)" を選択
→ "Run workflow" ボタン
→ デプロイ対象: backend / web / both を選択
→ 確認文字列: deploy と入力
→ "Run workflow" をクリック
```

`deploy` 以外を入力するとジョブが即座に失敗する（誤操作防止）。

---

## 必要なシークレット

GitHub リポジトリの Settings > Environments で管理。

### staging 環境

| シークレット名 | 説明 |
|---|---|
| `AWS_STAGING_ROLE_ARN` | OIDC 用 IAM ロール ARN（staging 専用） |
| `AWS_LAMBDA_STAGING_FUNCTION_NAME` | `quickfit-timer-api-dev` |
| `VERCEL_TOKEN` | Vercel Personal Access Token |
| `VERCEL_ORG_ID` | Vercel Team ID |
| `VERCEL_PROJECT_ID` | Vercel Project ID |
| `EXPO_TOKEN` | Expo Personal Access Token |

### production 環境

| シークレット名 | 説明 |
|---|---|
| `AWS_PRODUCTION_ROLE_ARN` | OIDC 用 IAM ロール ARN（production 専用） |
| `AWS_LAMBDA_PROD_FUNCTION_NAME` | `quickfit-timer-api` |
| `VERCEL_TOKEN` | Vercel Personal Access Token |
| `VERCEL_ORG_ID` | Vercel Team ID |
| `VERCEL_PROJECT_ID` | Vercel Project ID |
| `EXPO_TOKEN` | Expo Personal Access Token |

---

## AWS OIDC 構成

アクセスキーを使用しない OIDC 認証を採用。

| リソース | 値 |
|---|---|
| OIDC プロバイダー | `token.actions.githubusercontent.com` |
| staging IAM ロール | `github-actions-quickfit-staging` |
| production IAM ロール | `github-actions-quickfit-production` |
| staging の権限 | `lambda:UpdateFunctionCode`（`quickfit-timer-api-dev` のみ） |
| production の権限 | `lambda:UpdateFunctionCode`（`quickfit-timer-api` のみ） |

staging ロールは develop ブランチからのリクエストのみ assume 可能。
production ロールはリポジトリ全体から assume 可能（workflow_dispatch はブランチ非依存のため）。

---

## 初期セットアップ手順（新規環境構築時）

1. AWS IAM に GitHub OIDC プロバイダーを登録
2. IAM ロール 2つを作成（`github-actions-quickfit-staging` / `github-actions-quickfit-production`）
3. GitHub の Settings > Environments で `staging`・`production` 環境を作成
4. 各環境に上記シークレットを登録
5. Vercel の Git Integration を無効化（GitHub Actions との二重デプロイ防止）
6. `develop` ブランチのブランチ保護ルールで `test-backend`・`test-web`・`test-mobile` を必須ステータスチェックに設定
