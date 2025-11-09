# Stripe 決済機能セットアップガイド

Smart Garage に Stripe サブスクリプション決済を統合するための完全ガイド。

## 📋 目次

1. [Stripe アカウントのセットアップ](#1-stripe-アカウントのセットアップ)
2. [商品と価格の作成](#2-商品と価格の作成)
3. [環境変数の設定](#3-環境変数の設定)
4. [Firebase Admin SDK の設定](#4-firebase-admin-sdk-の設定)
5. [Webhook の設定](#5-webhook-の設定)
6. [ローカルテスト](#6-ローカルテスト)
7. [本番デプロイ](#7-本番デプロイ)

---

## 1. Stripe アカウントのセットアップ

### 1.1 Stripe アカウント作成

1. [Stripe](https://stripe.com/jp) にアクセス
2. 「今すぐ始める」をクリックして無料アカウントを作成
3. メールアドレスとパスワードを設定

### 1.2 API キーの取得

1. [Stripe Dashboard](https://dashboard.stripe.com/) にログイン
2. 左メニューから「開発者」→「API キー」を選択
3. 以下のキーをコピー：
   - **公開可能キー** (Publishable key): `pk_test_...`
   - **シークレットキー** (Secret key): `sk_test_...`

⚠️ **注意**: シークレットキーは絶対に公開しないでください。

---

## 2. 商品と価格の作成

### 2.1 月額プランの作成

1. [Stripe Dashboard](https://dashboard.stripe.com/) → 「商品」→「商品を追加」
2. 商品情報を入力：
   - 名前: `Smart Garage プレミアム（月額）`
   - 説明: `すべての機能が使える月額プラン`
3. 価格情報を入力：
   - 料金モデル: **定額料金**
   - 価格: `¥480`
   - 請求期間: **月次**
4. 「商品を保存」をクリック
5. **Price ID** (`price_XXXXXXXX`) をコピー

### 2.2 年額プランの作成

1. 同じ商品に新しい価格を追加、または新規商品を作成
2. 商品情報を入力：
   - 名前: `Smart Garage プレミアム（年額）`
   - 説明: `16%お得な年額プラン`
3. 価格情報を入力：
   - 料金モデル: **定額料金**
   - 価格: `¥4,800`
   - 請求期間: **年次**
4. 「価格を保存」をクリック
5. **Price ID** (`price_YYYYYYYY`) をコピー

### 2.3 カスタマーポータルの有効化

1. [Stripe Dashboard](https://dashboard.stripe.com/) → 「設定」→「請求」→「カスタマーポータル」
2. 「有効にする」をクリック
3. 設定を確認：
   - ✅ サブスクリプションのキャンセル
   - ✅ 支払い方法の更新
   - ✅ 請求履歴の表示

---

## 3. 環境変数の設定

### 3.1 .env.local ファイルを作成

プロジェクトルートに `.env.local` ファイルを作成：

```bash
# Stripe 設定
STRIPE_SECRET_KEY=sk_test_... # Stripe Secret Key
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook Secret（後で設定）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Stripe Publishable Key

# Stripe 価格ID
NEXT_PUBLIC_PRICE_MONTHLY=price_XXXXXXXX # 月額プランの Price ID
NEXT_PUBLIC_PRICE_YEARLY=price_YYYYYYYY # 年額プランの Price ID

# アプリURL
NEXT_PUBLIC_APP_URL=http://localhost:3000 # 開発環境

# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_BASE64=ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsIC4uLn0= # Base64エンコードされた Service Account JSON
FIREBASE_PROJECT_ID=your-project-id # Firebase Project ID

# 開発モード設定
NEXT_PUBLIC_DEV_ALL_PREMIUM=false # 開発時に全員プレミアムにする場合は true
NEXT_PUBLIC_DEVELOPER_EMAILS=your-email@example.com # 自動的にプレミアムになるメール
```

---

## 4. Firebase Admin SDK の設定

### 4.1 Service Account JSON の取得

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクトを選択
3. ⚙️ 設定 → 「プロジェクトの設定」
4. 「サービスアカウント」タブを選択
5. 「新しい秘密鍵の生成」をクリック
6. JSON ファイルがダウンロードされます

### 4.2 JSON を Base64 エンコード

#### macOS / Linux:
```bash
cat serviceAccountKey.json | base64 | tr -d '\n'
```

#### Windows (PowerShell):
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("serviceAccountKey.json"))
```

出力された Base64 文字列を `FIREBASE_SERVICE_ACCOUNT_BASE64` に設定します。

### 4.3 Firestore セキュリティルールの更新

`firestore.rules` に以下を追加（既に設定済みの場合はスキップ）：

```
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

---

## 5. Webhook の設定

Stripe の Webhook を使用して、サブスクリプションの状態を Firestore に同期します。

### 5.1 ローカル開発環境

#### Stripe CLI のインストール

**macOS (Homebrew):**
```bash
brew install stripe/stripe-cli/stripe
```

**Windows / Linux:**
[Stripe CLI ダウンロードページ](https://stripe.com/docs/stripe-cli)

#### Stripe CLI でログイン

```bash
stripe login
```

#### Webhook リスニングを開始

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

出力された `whsec_...` を `.env.local` の `STRIPE_WEBHOOK_SECRET` に設定します。

### 5.2 本番環境

1. [Stripe Dashboard](https://dashboard.stripe.com/) → 「開発者」→「Webhook」
2. 「エンドポイントを追加」をクリック
3. エンドポイント URL を入力:
   ```
   https://your-domain.com/api/stripe/webhook
   ```
4. 以下のイベントを選択：
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_failed`
   - ✅ `customer.updated`
5. 「エンドポイントを追加」をクリック
6. **署名シークレット** (`whsec_...`) をコピーして、Vercel の環境変数に設定

---

## 6. ローカルテスト

### 6.1 開発サーバーを起動

```bash
npm run dev
```

### 6.2 Webhook リスニングを開始（別のターミナル）

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### 6.3 テストカード情報

Stripe のテストモードでは、以下のカード情報を使用できます：

| カード番号 | 用途 |
|----------|------|
| `4242 4242 4242 4242` | 成功（3D Secure なし） |
| `4000 0025 0000 3155` | 3D Secure 認証が必要 |
| `4000 0000 0000 9995` | カード拒否 |

- 有効期限: 未来の日付（例: 12/34）
- CVC: 任意の3桁（例: 123）
- 郵便番号: 任意（例: 123-4567）

### 6.4 テストフロー

1. http://localhost:3000 にアクセス
2. ログイン
3. プレミアム機能を試す（ペイウォールが表示される）
4. 「月額プランで始める」をクリック
5. Stripe Checkout でテストカード情報を入力
6. 決済完了後、`/billing/success` にリダイレクト
7. ダッシュボードに戻り、プレミアム機能が使えることを確認

### 6.5 Webhook イベントの確認

```bash
stripe trigger checkout.session.completed
```

ターミナルに Webhook イベントが表示されます。

---

## 7. 本番デプロイ

### 7.1 Vercel 環境変数の設定

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. プロジェクトを選択
3. 「Settings」→「Environment Variables」
4. 以下の環境変数を追加：

```
STRIPE_SECRET_KEY=sk_live_... # 本番環境の Secret Key
STRIPE_WEBHOOK_SECRET=whsec_... # 本番環境の Webhook Secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... # 本番環境の Publishable Key
NEXT_PUBLIC_PRICE_MONTHLY=price_XXXXXXXX # 本番環境の月額 Price ID
NEXT_PUBLIC_PRICE_YEARLY=price_YYYYYYYY # 本番環境の年額 Price ID
NEXT_PUBLIC_APP_URL=https://garagelog.jp # 本番ドメイン
FIREBASE_SERVICE_ACCOUNT_BASE64=... # Firebase Service Account (Base64)
FIREBASE_PROJECT_ID=your-project-id # Firebase Project ID
```

### 7.2 Stripe を本番モードに切り替え

1. [Stripe Dashboard](https://dashboard.stripe.com/) の右上のトグルを「本番モード」に切り替え
2. 本番環境用の API キーと商品を作成（テスト環境と同じ手順）
3. Webhook エンドポイントを本番ドメインで設定

### 7.3 デプロイ

```bash
git add .
git commit -m "Add Stripe subscription payment"
git push origin main
```

Vercel が自動的にデプロイします。

### 7.4 本番環境での動作確認

1. 本番ドメインにアクセス
2. 実際のクレジットカードで少額テスト（すぐにキャンセル可能）
3. カスタマーポータルでキャンセルできることを確認

---

## 🎉 完了！

これで Stripe 決済機能の統合が完了しました。

## 📚 関連ドキュメント

- [Stripe 公式ドキュメント](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Billing](https://stripe.com/docs/billing)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)

## 🆘 トラブルシューティング

### Webhook が動作しない

- Webhook Secret が正しく設定されているか確認
- Stripe CLI でローカルリスニングが起動しているか確認
- `runtime = 'nodejs'` が設定されているか確認（Edge では動作しない）

### プラン情報が同期されない

- Firestore のセキュリティルールを確認
- ブラウザの開発者ツールでネットワークエラーを確認
- Webhook イベントが正しく受信されているか Stripe Dashboard で確認

### テストカードが拒否される

- Stripe が**テストモード**になっているか確認
- カード番号が正しいか確認（`4242 4242 4242 4242`）

---

**質問がありますか？** 
[GitHub Issues](https://github.com/your-repo/smart-garage/issues) で質問してください。


