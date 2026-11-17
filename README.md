# QuickFit — 忙しい人のための時間管理アプリ

事前に作成したワークアウトルーティンをタイマーで自動再生し、スマートフォンを操作せずにトレーニングを進められるアプリです。音声読み上げ・バックグラウンド再生に対応しています。

## 主な機能

- **ルーティン管理**: workout / interval の2種類のアイテムで構成するルーティンの作成・編集・削除（ドラッグ&ドロップ並べ替え対応）
- **タイマー実行**: ルーティンを順番に自動再生。音声読み上げ、効果音、バックグラウンド継続、セッション復元に対応
- **ワークアウト履歴**: 完了したセッションの記録と閲覧
- **AI 生成**: プロンプトからルーティンを自動生成（バックエンドが Anthropic Messages API を呼び出し）
- **Web 管理画面**: ブラウザからルーティンを作成・編集

## 技術スタック

| 領域 | 技術 |
|---|---|
| モバイル | React Native 0.81 / Expo 54 / expo-router 6 / TypeScript |
| Web | React 19 / Vite 7 / Tailwind CSS 4 / react-router-dom 7 / TypeScript |
| バックエンド | Go 1.25 / net/http / PostgreSQL (pgx v5) / goose |
| 認証・DB | Supabase（Auth + PostgreSQL） |
| インフラ | AWS Lambda (arm64) / Vercel (Web) / EAS (モバイルビルド・App Store 提出) |
| CI/CD | GitHub Actions |

## リポジトリ構成

npm workspaces によるモノレポです。

```
.
├── apps/
│   ├── mobile/       # React Native (Expo) — iOS / Android アプリ
│   ├── web/          # React + Vite — ルーティン管理 Web ダッシュボード
│   └── backend/      # Go — REST API（AWS Lambda にデプロイ）
├── packages/
│   ├── core/         # 共有ドメイン型・純粋ロジック（timerReducer 等）・ポート定義
│   └── api-client/   # バックエンド HTTP クライアント
├── supabase/         # Supabase マイグレーション
├── .kiro/            # 仕様駆動開発（steering / specs）
└── CICD.md           # CI/CD の詳細
```

### アーキテクチャ方針

- **モバイル**: フィーチャーファースト（`features/` にロジック、`app/` は expo-router のルーティングのみ）
- **バックエンド**: レイヤード構成 `handler → repository → domain`（依存方向は一方向）
- **Web**: フィーチャー + ページ分離
- **ポート&アダプター**: `core` が `VoiceService` などのインターフェースを定義し、モバイル・Web が各自で実装
- **タイマー状態遷移**: `core` の純粋な reducer に集約し、アプリ側は副作用（音声・スリープ防止・永続化）のみを担当

## セットアップ

### 必要なツール

- Node.js (LTS) / npm
- Go 1.25+
- [goose](https://github.com/pressly/goose)（DB マイグレーション）
- AWS CLI / EAS CLI（デプロイ時のみ）

### インストール

```bash
npm install
```

### Web

```bash
npm run dev      # 開発サーバー起動
npm run build    # ビルド
npm run test     # テスト（Vitest）
```

必要な環境変数: `VITE_API_BASE_URL` / `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`

### モバイル

```bash
cd apps/mobile
npm start        # Expo 開発サーバー
npm run ios      # iOS 実機/シミュレータ
npm run android  # Android
npm run test     # テスト（jest-expo）
```

必要な環境変数: `EXPO_PUBLIC_API_BASE_URL`（ビルド手順は [apps/mobile/BUILD.md](apps/mobile/BUILD.md)）

### バックエンド

```bash
cd apps/backend
go run .          # ローカル起動
go test ./...     # テスト
make build        # Lambda 用ビルド (linux/arm64)
make migrate-up   # DB マイグレーション適用
```

`apps/backend/.env` に以下を設定します。

| 変数 | 用途 |
|---|---|
| `DATABASE_URL` | PostgreSQL 接続文字列 |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase 連携 |
| `ANTHROPIC_API_KEY` | AI ルーティン生成 |
| `CORS_ALLOW_ORIGIN` | CORS 許可オリジン |

マイグレーションの詳細は [apps/backend/MIGRATIONS.md](apps/backend/MIGRATIONS.md) を参照してください。

## AI の活用

ルーティンの自動生成に Anthropic の Claude を使っています（モデル: `claude-haiku-4-5-20251001`）。

### 処理の流れ

```
モバイル / Web ──▶ POST /ai/generate-routine ──▶ Go バックエンド ──▶ Anthropic Messages API
  (prompt, targetSec)      （JWT 認証）            （ClaudeGenerator）
```

1. ユーザーが「胸と肩を20分で」のような要望（`prompt`）と目標時間（`targetSec`）を入力する
2. クライアントはバックエンドの `/ai/generate-routine` を呼ぶ。Anthropic API は直接呼ばず、`ANTHROPIC_API_KEY` はバックエンドだけが保持する
3. バックエンドが Claude にシステムプロンプトとユーザーの要望を送り、JSON 形式のルーティン（`name` と `items`）を受け取る
4. 生成されたルーティンは通常のルーティンと同じ形式で、そのまま保存・再生できる

### プロンプト設計

システムプロンプト（[ai_handler.go](apps/backend/handler/ai_handler.go)）で、次のルールを Claude に守らせています。

- 出力は用意した種目リストの範囲に限定し、ユーザーが指定した部位以外の種目は使わない
- 種目ごとに workout / interval の秒数、セット数（3〜5）、アイテムの並びを決める
- 合計時間を目標時間に近づけるため、種目の追加・セット数・秒数を調整する
- 説明文を付けず、JSON のみを返す

### 目標時間のリトライ

Claude の出力は合計時間が目標とずれることがあるため、バックエンドで合計時間を検証しています。目標との差が180秒を超えた場合は、前回の結果と合計時間を添えて1回だけ再生成します。再生成が失敗したときは1回目の結果を返します。

### 補足

- 生成部分は `RoutineGenerator` インターフェースの背後にあり、テストでは Anthropic API を呼ばずにモックで検証します
- 生成リクエストと結果は `slog` でログ出力します

## API エンドポイント

認証が必要なエンドポイントは Supabase 発行の JWT（`Authorization: Bearer`）を検証します。

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| POST | `/auth/login` | 不要 | ログイン |
| POST | `/auth/register` | 不要 | ユーザー登録 |
| GET | `/auth/me` | 必要 | ログインユーザー取得 |
| DELETE | `/users/me` | 必要 | アカウント削除 |
| GET / POST | `/routines` | 必要 | ルーティン一覧取得 / 作成 |
| GET / PUT / DELETE | `/routines/{id}` | 必要 | ルーティン取得 / 更新 / 削除 |
| GET / POST | `/workout-histories` | 必要 | ワークアウト履歴の取得 / 記録 |
| POST | `/ai/generate-routine` | 必要 | AI によるルーティン生成 |

## 開発ガイドライン

- **Go バックエンドは TDD**: テストを先に書いて Red を確認 → Green 実装 → Refactor の順で進めます
- Go の `fmt.Errorf` / `slog.Error` などの自作メッセージは日本語で記述します
- テスト配置: Web / core は対象と同階層に `*.test.ts(x)`、モバイルは `apps/mobile/__tests__/`
- 機能仕様は `.kiro/specs/`、プロジェクト規約は `.kiro/steering/` で管理します（Kiro 方式の仕様駆動開発）

## CI/CD

GitHub Actions で自動化しています。詳細は [CICD.md](CICD.md) を参照してください。

| トリガー | 内容 |
|---|---|
| PR 作成・更新 | 変更のあったアプリのみテスト・型検査 |
| `develop` へのマージ | ステージング自動デプロイ |
| `main` へのマージ | iOS 本番ビルド + App Store 提出 |
| 手動実行 | バックエンド・Web の本番デプロイ |

## ライセンス

リポジトリ全体のライセンスは未設定です（`apps/mobile/LICENSE` は Expo テンプレート由来の MIT ライセンスです）。
