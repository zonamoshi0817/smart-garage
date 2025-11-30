# Stripe Checkout セットアップガイド

## 概要

GarageLogでは、Stripe Checkoutを使用してプレミアムプランのサブスクリプション決済を実装しています。このドキュメントでは、Stripe Checkoutのセットアップ手順を説明します。

## 実装済みの機能

✅ **実装済み**:
- Stripe Checkoutセッション作成（`/api/stripe/create-checkout-session`）
- 決済成功ページ（`/billing/success`）
- 決済キャンセルページ（`/billing/cancel`）
- Stripe Webhookハンドラー（`/api/stripe/webhook`）
- PaywallModalからの決済開始
- 3Dセキュアの有効化
- 7日間の無料トライアル

## セットアップ手順

### 1. Stripeアカウントの作成とAPIキーの取得

1. [Stripe](https://stripe.com) にアクセスしてアカウントを作成
2. ダッシュボードにログイン
3. **Developers** > **API keys** に移動
4. **Test mode** が有効になっていることを確認（開発環境ではテストモードを使用）
5. **Secret key** をコピー（`sk_test_xxxxx` で始まる）
6. このキーを `.env.local` に設定：
   ```bash
   STRIPE_SECRET_KEY=sk_test_xxxxx
   ```

**重要**: 
- 開発環境では **Test mode** のシークレットキー（`sk_test_` で始まる）を使用
- 本番環境では **Live mode** のシークレットキー（`sk_live_` で始まる）を使用
- シークレットキーは絶対に公開しないでください
- **Live mode のキーは本番環境（Vercel）でのみ使用してください**

**⚠️ 注意**: 提供されたキー（`sk_live_...`）は本番環境用です。開発環境では使用しないでください。

### 2. 商品と価格の作成

Stripeダッシュボードで手動で作成するか、自動化スクリプトを使用できます。

#### 方法1: 自動化スクリプト（推奨）

1. `.env.local` に `STRIPE_SECRET_KEY=sk_test_xxxxx` を設定
2. 依存パッケージをインストール（初回のみ）：
   ```bash
   npm install
   ```
3. スクリプトを実行：
   ```bash
   npm run stripe:create-products
   ```
   または
   ```bash
   node scripts/create-stripe-products.js
   ```
4. 表示された価格IDを `.env.local` に追加

#### 方法2: Stripeダッシュボードで手動作成

##### 月額プラン
1. **Products** > **Add product** をクリック
2. 商品名: `GarageLog Premium (Monthly)`
3. 価格: `¥350` / 月
4. 価格IDをコピー（例: `price_xxxxx`）

##### 年額プラン
1. **Products** > **Add product** をクリック
2. 商品名: `GarageLog Premium (Yearly)`
3. 価格: `¥3,500` / 年
4. 価格IDをコピー（例: `price_xxxxx`）

### 3. Firebase Service Account の取得

Stripe CheckoutでID Tokenを検証するために、Firebase Admin SDKが必要です。

1. Firebase Console > **Project Settings** > **Service accounts** に移動
2. **Generate new private key** をクリック
3. JSONファイルをダウンロード
4. JSONファイルの内容をBase64エンコード：
   ```bash
   # macOS/Linux
   base64 -i path/to/serviceAccountKey.json | tr -d '\n' > serviceAccountBase64.txt
   
   # または Node.js スクリプト
   node -e "console.log(require('fs').readFileSync('path/to/serviceAccountKey.json').toString('base64'))"
   ```
5. エンコードされた文字列をコピー

**または、セットアップスクリプトを使用**:
```bash
# スクリプトに実行権限を付与（初回のみ）
chmod +x scripts/setup-firebase-admin.sh

# Service Account JSONファイルをBase64エンコード
./scripts/setup-firebase-admin.sh path/to/serviceAccountKey.json
```

スクリプトが自動的にBase64エンコードされた文字列とプロジェクトIDを表示します。

### 4. 環境変数の設定

以下の環境変数を設定します：

#### 開発環境（`.env.local`）

**重要**: `.env.local` ファイルが存在しない場合は、プロジェクトルートに作成してください。

```bash
# .env.local ファイルを作成（存在しない場合）
touch .env.local
```

テンプレートファイル（`.env.local.example`）を参考に設定してください。

```bash
# Firebase Admin SDK（必須）
FIREBASE_SERVICE_ACCOUNT_BASE64=eyJ0eXBlIjoi...（Base64エンコードされたService Account JSON）
FIREBASE_PROJECT_ID=your-project-id

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_PRICE_MONTHLY=price_1SYSM387dnl6b7lwZW208B8K  # 月額プランの価格ID
NEXT_PUBLIC_PRICE_YEARLY=price_1SYSNR87dnl6b7lwAqHkCBdh  # 年額プランの価格ID
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

**注意**: 上記の価格IDは既に作成済みです。環境変数に設定してください。

**重要**: `FIREBASE_SERVICE_ACCOUNT_BASE64`は、Service Account JSONファイル全体をBase64エンコードした文字列です。

#### 本番環境（Vercel）

1. Vercelダッシュボード > プロジェクト > Settings > Environment Variables
2. 以下の環境変数を追加：
   - `FIREBASE_SERVICE_ACCOUNT_BASE64`: Firebase Service Account JSON（Base64エンコード）
   - `FIREBASE_PROJECT_ID`: FirebaseプロジェクトID
   - `STRIPE_SECRET_KEY`: Stripeのシークレットキー（本番用）
   - `NEXT_PUBLIC_PRICE_MONTHLY`: 月額プランの価格ID（`price_1SYSM387dnl6b7lwZW208B8K`）
   - `NEXT_PUBLIC_PRICE_YEARLY`: 年額プランの価格ID（`price_1SYSNR87dnl6b7lwAqHkCBdh`）
   - `STRIPE_WEBHOOK_SECRET`: Webhookシークレット（後述）

### 5. Webhookの設定

#### 開発環境（Stripe CLI）

1. [Stripe CLI](https://stripe.com/docs/stripe-cli) をインストール
2. Stripe CLIでログイン：
   ```bash
   stripe login
   ```
3. Webhookをローカルに転送：
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
4. 表示されたWebhookシークレット（`whsec_xxxxx`）を `.env.local` に設定

#### 本番環境

1. Stripeダッシュボード > **Developers** > **Webhooks** > **Add endpoint**
2. Endpoint URL: `https://your-domain.com/api/stripe/webhook`
3. イベントを選択：
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `customer.updated`
4. **Signing secret** をコピーしてVercelの環境変数に設定

### 6. セットアップの確認

セットアップが正しく完了しているか確認するには：

```bash
# セットアップ確認スクリプトを実行
npm run stripe:setup:check
```

または

```bash
./scripts/check-stripe-setup.sh
```

このスクリプトは以下を確認します：
- 必須環境変数が設定されているか
- 環境変数の形式が正しいか
- Firebase Service Accountが有効か

#### 価格IDの検証

作成した価格IDが正しく動作するか確認するには：

```bash
# すべての価格IDを一括検証（推奨）
npm run stripe:verify-all

# 個別に検証する場合
npm run stripe:verify-price price_1SYSM387dnl6b7lwZW208B8K  # 月額プラン
npm run stripe:verify-price price_1SYSNR87dnl6b7lwAqHkCBdh  # 年額プラン

# 環境変数から自動的に読み込む（月額プラン）
npm run stripe:verify-price
```

このスクリプトは以下を確認します：
- 価格IDが存在するか
- 価格の詳細情報（金額、課金間隔など）
- 商品情報

### 7. 動作確認

#### テストモードでの確認

1. Stripeダッシュボードで**Test mode**に切り替え
2. テスト用のカード番号を使用：
   - 成功: `4242 4242 4242 4242`
   - 3Dセキュア: `4000 0025 0000 3155`
   - 失敗: `4000 0000 0000 0002`
3. 有効期限: 任意の未来の日付
4. CVC: 任意の3桁の数字

#### 確認項目

- [ ] PaywallModalから「始める」ボタンをクリックしてStripe Checkoutに遷移できる
- [ ] テストカードで決済が完了する
- [ ] 決済成功後に `/billing/success` にリダイレクトされる
- [ ] Webhookが正常に動作し、Firestoreのユーザードキュメントが更新される
- [ ] プレミアム機能が利用可能になる

## 実装の詳細

### Checkoutセッション作成

`src/app/api/stripe/create-checkout-session/route.ts` で、以下の設定でCheckoutセッションを作成しています：

- **モード**: `subscription`（サブスクリプション）
- **トライアル期間**: 7日間
- **3Dセキュア**: 自動的に有効化
- **プロモーションコード**: 許可
- **住所情報**: 自動収集

### Webhook処理

`src/app/api/stripe/webhook/route.ts` で、以下のイベントを処理しています：

- `checkout.session.completed`: Checkout完了時にユーザー情報を更新
- `customer.subscription.created`: サブスクリプション作成時にプランを更新
- `customer.subscription.updated`: サブスクリプション更新時にプランを更新
- `customer.subscription.deleted`: サブスクリプション削除時に無料プランに戻す
- `invoice.payment_failed`: 支払い失敗時にステータスを更新
- `customer.updated`: 顧客情報更新時に同期

### セキュリティ対策

- ✅ カード情報の非保持化（Stripe Checkout使用）
- ✅ 3Dセキュアの有効化
- ✅ Webhook署名の検証
- ✅ イベントの重複処理防止（Idempotency）
- ✅ エラーメッセージの非表示

## トラブルシューティング

### Checkoutセッションが作成されない

- 環境変数 `FIREBASE_SERVICE_ACCOUNT_BASE64` が正しく設定されているか確認（**必須**）
- 環境変数 `FIREBASE_PROJECT_ID` が正しく設定されているか確認（**必須**）
- 環境変数 `STRIPE_SECRET_KEY` が正しく設定されているか確認
- 環境変数 `NEXT_PUBLIC_PRICE_MONTHLY` と `NEXT_PUBLIC_PRICE_YEARLY` が正しく設定されているか確認
- `.env.local` ファイルがプロジェクトルートに存在するか確認
- 開発サーバーを再起動して環境変数を読み込む

### Webhookが動作しない

- Webhookシークレットが正しく設定されているか確認
- WebhookエンドポイントのURLが正しいか確認
- StripeダッシュボードのWebhookログでエラーを確認

### プランが更新されない

- Webhookが正常に受信されているか確認
- Firestoreのセキュリティルールで書き込みが許可されているか確認
- ブラウザのコンソールでエラーを確認

## 参考資料

- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)

---

**最終更新日**: 2024年12月

