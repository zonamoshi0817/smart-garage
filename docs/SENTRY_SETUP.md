# Sentry セットアップガイド

## 1. Sentryアカウントの作成

1. [Sentry.io](https://sentry.io/) にアクセス
2. 「Start Free」をクリック
3. アカウントを作成（GitHub/Google連携可能）

## 2. プロジェクトの作成

1. ダッシュボードで「Create Project」をクリック
2. プラットフォームを選択: **Next.js**
3. プロジェクト名を入力: `smart-garage`
4. チームを選択（デフォルトでOK）
5. 「Create Project」をクリック

## 3. DSN（Data Source Name）の取得

プロジェクト作成後、自動的にセットアップガイドが表示されます。

```javascript
Sentry.init({
  dsn: "https://xxxxxxxxxxxxx@xxxxx.ingest.sentry.io/xxxxxxx",
  // ...
});
```

この `dsn` の値をコピーします。

または、以下の手順で取得できます：

1. Sentryダッシュボード → プロジェクトを選択
2. **Settings** → **Projects** → プロジェクト名
3. **Client Keys (DSN)** をクリック
4. **DSN** の値をコピー

## 4. 環境変数への設定

### ローカル開発環境

`.env.local` ファイルを作成（または編集）：

```bash
# Sentry DSN
NEXT_PUBLIC_SENTRY_DSN=https://xxxxxxxxxxxxx@xxxxx.ingest.sentry.io/xxxxxxx
SENTRY_DSN=https://xxxxxxxxxxxxx@xxxxx.ingest.sentry.io/xxxxxxx

# 環境名
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
SENTRY_ENVIRONMENT=development
```

### 本番環境（Vercel）

1. Vercelダッシュボード → プロジェクトを選択
2. **Settings** → **Environment Variables**
3. 以下の変数を追加：

| 変数名 | 値 | 環境 |
|--------|-----|------|
| `NEXT_PUBLIC_SENTRY_DSN` | `https://...` | Production |
| `SENTRY_DSN` | `https://...` | Production |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | `production` | Production |
| `SENTRY_ENVIRONMENT` | `production` | Production |

## 5. 動作確認

### テストエラーの送信

開発環境で以下のコードを実行：

```typescript
import * as Sentry from "@sentry/nextjs";

// テストエラーを送信
Sentry.captureMessage("Test message from Smart Garage", "info");
Sentry.captureException(new Error("Test error"));
```

### Sentryダッシュボードで確認

1. Sentry → **Issues**
2. テストエラーが表示されることを確認

## 6. 開発モード設定（オプショナル）

開発環境でSentryを無効化したい場合：

```bash
# .env.local
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
```

または、`sentry.client.config.ts` で以下を確認：

```typescript
Sentry.init({
  dsn: SENTRY_DSN || "",
  enabled: process.env.NODE_ENV === "production" && !!SENTRY_DSN,
  // ...
});
```

これにより、DSNが空の場合や開発環境ではSentryが無効になります。

## 7. Sentryの料金プラン

- **Developer（無料）**: 
  - 5,000 エラー/月
  - 1人のメンバー
  - 30日のデータ保持
  
- **Team（$26/月）**:
  - 50,000 エラー/月
  - 無制限メンバー
  - 90日のデータ保持

個人開発では無料プランで十分です。

## 8. トラブルシューティング

### エラーが送信されない

1. DSNが正しく設定されているか確認
2. 本番ビルドでテスト（`npm run build && npm start`）
3. ブラウザのコンソールでエラーを確認
4. `debug: true` を設定して詳細ログを確認

### 本番環境でのみ有効化

開発環境ではコンソールに出力のみ、本番環境でSentryに送信する設定になっています。

```typescript
beforeSend(event, hint) {
  if (process.env.NODE_ENV === "development") {
    console.log("Sentry Event (Dev):", event);
    return null; // 送信しない
  }
  return event;
}
```

---

**参考リンク:**
- [Sentry Next.js ドキュメント](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry料金プラン](https://sentry.io/pricing/)

