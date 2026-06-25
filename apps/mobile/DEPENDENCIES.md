# モバイルアプリ 依存関係メモ

## モノレポ構成

```
timeAppForBusyPeople/          ← npm workspaces ルート
├── node_modules/              ← ホイスト（巻き上げ）された共通パッケージ
├── package.json               ← overrides・共通依存を管理
├── apps/
│   └── mobile/
│       ├── node_modules/      ← mobile 専用のネストされたパッケージ
│       └── package.json       ← mobile 固有の依存を管理
```

npm workspaces では依存パッケージは基本的にルートの `node_modules` にホイストされる。
ただし、バージョンが競合する場合は `apps/mobile/node_modules` にネストされる。

---

## 過去に発生したエラーと対処

### 1. `expo/config-plugins` が見つからない

**エラー:**
```
PluginError: Unable to resolve a valid config plugin for expo-router.
Cannot find module 'expo/config-plugins'
```

**原因:**
- `expo-router` がルートの `node_modules` にホイストされていた
- `expo` 本体は `apps/mobile/node_modules/expo` にしかなかった
- `expo-router` のプラグインが `require('expo/config-plugins')` を解決しようとすると、
  ルートから `expo` が見つからずエラーになった

**対処:**
ルートの `package.json` に `expo` を追加してホイストさせた。

```json
// ルート package.json
{
  "dependencies": {
    "expo": "54.0.2"
  }
}
```

> **注意:** ルートの `overrides` に `"expo": "54.0.2"` があるため、
> `dependencies` も同じバージョンを指定しないと `EOVERRIDE` エラーになる。
> `apps/mobile` は `~54.0.35` だが、ルートの overrides が `54.0.2` に固定している。

---

### 2. `react-native-worklets` のバージョン不一致

**エラー:**
```
WorkletsError: [Worklets] Mismatch between JavaScript code version and
Worklets Babel plugin version (0.5.1 vs. 0.8.3).
```

**原因（依存関係の構造）:**

```
ルート node_modules/
└── react-native-worklets@0.8.3    ← Babel プラグインがこれを使う
    (react-native-reanimated/plugin が require('react-native-worklets/plugin') する)

apps/mobile/node_modules/
└── react-native-worklets@0.5.1    ← JS ランタイムがこれを使う
```

なぜ `apps/mobile` に 0.5.1 がネストされるかというと、
`apps/mobile/node_modules/expo/bundledNativeModules.json` が
`"react-native-worklets": "0.5.1"` を指定しているため。
expo 54.0.35 はこのバージョンで動作保証されており、npm が必ずネストしてインストールする。

Babel プラグイン（ビルド時）はルートの 0.8.3 を参照し、
JS ランタイム（実行時）は mobile の 0.5.1 を参照するため、バージョン不一致が発生。

**対処:**
ルートの `overrides` と `apps/mobile/package.json` を両方 `0.5.1` に統一した。

```json
// ルート package.json
{
  "overrides": {
    "react-native-worklets": "0.5.1"
  }
}

// apps/mobile/package.json
{
  "dependencies": {
    "react-native-worklets": "0.5.1"
  }
}
```

`react-native-reanimated` 4.1.x は worklets `0.5.0 〜 0.8.x` に対応しているため、
0.5.1 に統一しても問題ない（`scripts/worklets-version.json`: `{ "min": "0.5.0", "max": "0.8" }`）。

---

## 現在のバージョン構成（2026-06-26 時点）

| パッケージ | apps/mobile | ルート overrides |
|---|---|---|
| expo | ~54.0.35 | 54.0.2 |
| react-native | 0.81.5 | 0.81.5 |
| expo-router | ~6.0.24 | — |
| react-native-reanimated | ~4.1.1 | — |
| react-native-worklets | 0.5.1 | 0.5.1 |
| react-native-gesture-handler | ~2.28.0 | — |
| react-native-draggable-flatlist | ^4.0.3 | — |

## バージョンを変更するときの注意

1. `react-native-worklets` はルートの `overrides` と `apps/mobile/package.json` を**必ず同じバージョンに揃える**
2. `expo` のバージョンを上げるときは `bundledNativeModules.json` を確認し、worklets の推奨バージョンが変わっていないかチェックする
   - 確認場所: `apps/mobile/node_modules/expo/bundledNativeModules.json`
3. ルートの `overrides.expo` は `apps/mobile` の expo バージョンと異なる（`54.0.2` vs `~54.0.35`）。
   これは `expo-router` がルートにホイストされるため、その依存解決用に置いているもの。
