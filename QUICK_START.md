# 🚀 Stripe 決済機能 クイックスタート

## ⚡ 5分で始める

### 1️⃣ Stripe CLI をインストール

```bash
brew install stripe/stripe-cli/stripe
```

### 2️⃣ Stripe にログイン

```bash
stripe login
```

ブラウザが開くので、Stripe アカウントでログインしてください。
アカウントがない場合は [stripe.com](https://stripe.com) で無料登録できます。

### 3️⃣ テスト用の商品と価格を作成

```bash
# 月額プランを作成
stripe products create --name="Smart Garage プレミアム（月額）" --description="すべての機能が使える月額プラン"

# 上記コマンドで prod_xxx が返ってくるので、それを使って価格を作成
stripe prices create --product=prod_xxx --unit-amount=480 --currency=jpy --recurring-interval=month

# 年額プランを作成
stripe products create --name="Smart Garage プレミアム（年額）" --description="16%お得な年額プラン"

# 年額の価格を作成
stripe prices create --product=prod_yyy --unit-amount=4800 --currency=jpy --recurring-interval=year
```

### 4️⃣ .env.local ファイルを作成

プロジェクトルートに `.env.local` ファイルを作成して、以下の内容を貼り付けてください：

```bash
# Stripe 設定
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_TEMPORARY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
NEXT_PUBLIC_PRICE_MONTHLY=price_YOUR_MONTHLY_ID
NEXT_PUBLIC_PRICE_YEARLY=price_YOUR_YEARLY_ID
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_BASE64=YOUR_BASE64_HERE
FIREBASE_PROJECT_ID=your-project-id

# 開発モード（一時的に全員プレミアムにする場合）
NEXT_PUBLIC_DEV_ALL_PREMIUM=true
NEXT_PUBLIC_DEVELOPER_EMAILS=your-email@example.com
```

#### API キーの取得方法

```bash
# Stripe Dashboard の URL を開く
open https://dashboard.stripe.com/test/apikeys

# または以下のコマンドで表示
stripe resources list
```

Stripe Dashboard で以下をコピー：
- **Publishable key**: `pk_test_...` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **Secret key**: `sk_test_...` → `STRIPE_SECRET_KEY`

#### Firebase Service Account の取得

```bash
# Firebase Console を開く
open https://console.firebase.google.com

# または手動で:
# 1. プロジェクトを選択
# 2. ⚙️ → プロジェクトの設定 → サービスアカウント
# 3. 「新しい秘密鍵の生成」→ JSON をダウンロード
# 4. Base64 エンコード:
cat serviceAccountKey.json | base64 | tr -d '\n'
```

### 5️⃣ Webhook リスニングを開始

**新しいターミナルウィンドウ**を開いて以下を実行：

```bash
cd /Users/kentakobayashi/smart-garage
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

表示された `whsec_...` を `.env.local` の `STRIPE_WEBHOOK_SECRET` に設定してください。

### 6️⃣ 開発サーバーを起動

**元のターミナルウィンドウ**で以下を実行：

```bash
npm run dev
```

### 7️⃣ ブラウザで確認

```bash
open http://localhost:3000
```

ログインして、プレミアム機能を試してみてください！

---

## 🧪 テストカード情報

Stripe のテストモードでは以下のカード番号が使えます：

| カード番号 | 結果 |
|----------|------|
| `4242 4242 4242 4242` | ✅ 成功 |
| `4000 0025 0000 3155` | 🔐 3D Secure 認証が必要 |
| `4000 0000 0000 9995` | ❌ カード拒否 |

- **有効期限**: 未来の日付（例: 12/34）
- **CVC**: 任意の3桁（例: 123）
- **郵便番号**: 任意（例: 123-4567）

---

## 🎯 動作確認の流れ

1. ✅ ダッシュボードにログイン
2. ✅ プレミアム機能（OCR、PDF出力など）をクリック
3. ✅ ペイウォールが表示される
4. ✅ 「月額プランで始める」をクリック
5. ✅ Stripe Checkout でテストカード情報を入力
6. ✅ 決済完了後、`/billing/success` にリダイレクト
7. ✅ ダッシュボードに戻り、プレミアム機能が使えることを確認
8. ✅ `/settings/billing` で請求管理ページを確認
9. ✅ カスタマーポータルで解約できることを確認

---

## 🐛 トラブルシューティング

### エラー: "STRIPE_SECRET_KEY is not set"

→ `.env.local` ファイルが正しく作成されているか確認してください。

### エラー: "Webhook signature verification failed"

→ Stripe CLI でリスニングを開始し、表示された `whsec_...` を `.env.local` に設定してください。

### エラー: "FIREBASE_SERVICE_ACCOUNT_BASE64 is not set"

→ Firebase Service Account JSON を Base64 エンコードして設定してください。

### プレミアム機能が使えない

→ `.env.local` で `NEXT_PUBLIC_DEV_ALL_PREMIUM=true` に設定すると、開発時に全員プレミアムになります。

---

## 📚 詳細なドキュメント

- **STRIPE_SETUP_GUIDE.md** - 完全なセットアップガイド
- **STRIPE_IMPLEMENTATION.md** - 実装の詳細
- **Stripe 公式ドキュメント** - https://stripe.com/docs

---

## 🎉 完了したら

本番環境へのデプロイ準備ができたら、**STRIPE_SETUP_GUIDE.md** の「本番デプロイ」セクションを参照してください。

**Happy Coding! 🚗💳✨**


