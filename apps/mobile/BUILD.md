# Mobile Build 手順

## 環境構成

| Profile | 用途 | アプリ名 | Bundle ID |
|---------|------|----------|-----------|
| `production` | App Store リリース | QuickFit | `com.tacos.quickfittimer` |
| `development` | 実機開発確認 | QuickFit (Dev) | `com.tacos.quickfittimer.dev` |

環境変数は [expo.dev](https://expo.dev) の **Environment Variables** で管理。
`production` / `development` それぞれに `EXPO_PUBLIC_API_BASE_URL` を設定する。

---

## 本番ビルド（App Store提出）

```bash
eas build --platform ios --profile production --auto-submit
```

---

## 開発ビルド（実機確認）

### 初回のみ: デバイス登録

```bash
eas device:create
```

QRコードが表示されるのでiPhoneのカメラで読み取り → Safariでプロファイルをインストール。

### ビルド & インストール

```bash
eas build --platform ios --profile development
```

ビルド完了後、expo.devに表示されるリンクからデバイスにインストール。

### JSバンドルの配信方法（2択）

**A. ローカルMetroサーバー（コード変更を即反映したい場合）**

```bash
npx expo start --dev-client
```

デバイスと同じWi-Fiに接続していれば自動検出される。

**B. EAS Update（ローカルサーバー不要）**

```bash
eas update --branch development
```

---

## 注意事項

- `--auto-submit` は `production` のみ有効（App Store提出用）
- 開発ビルドはApp Store Connectへの登録不要。EASがApple Developer Portalへ自動登録する
- APIバックエンドはLambdaの開発用URLを使用（expo.devのDevelopment環境変数で設定済み）
