# iOS（Capacitor）プロジェクト存在判定結果

## 判定結果

- **ios/ フォルダ**: **ない**
- **capacitor.config.***: **ない**
- **@capacitor/core**: **ある**（package.json に `"@capacitor/core": "^7.4.5"` が含まれています）

## 補足情報

- `mobile-app/` ディレクトリが存在しますが、これは別プロジェクト（React Native/Expo）のようです
- Capacitor の依存関係（`@capacitor/core`, `@capacitor/share`）は既にインストール済みですが、Capacitor プロジェクト自体は初期化されていません

## 次にやること（最短手順）

### ios/ が「ない」場合

**実行コマンド（コピペ用）**:

```bash
# 1. Capacitor プロジェクトを初期化
npx cap init

# 2. iOS プラットフォームを追加
npx cap add ios

# 3. Web アセットを iOS プロジェクトに同期
npx cap sync ios

# 4. Xcode で iOS プロジェクトを開く
npx cap open ios
```

**注意事項**:
- `npx cap init` 実行時に、アプリ名やアプリID（例: `com.example.app`）の入力が求められます
- 既存の Next.js アプリを Capacitor でラップする場合、`webDir` は `out` または `.next` に設定する必要があります（`next.config.ts` の `output: 'export'` 設定に依存）
- iOS 開発には Xcode と CocoaPods が必要です
