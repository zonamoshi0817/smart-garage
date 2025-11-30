# Stripe 本番環境セットアップガイド

## 概要

本番環境（Vercel）でのStripe Checkoutの設定手順です。

## 重要な注意事項

⚠️ **本番環境のシークレットキー（`sk_live_...`）は開発環境では使用しないでください**

- 開発環境では必ずテストキー（`sk_test_...`）を使用
- 本番環境のキーはVercelの環境変数でのみ設定
- シークレットキーをGitにコミットしないでください

## 本番環境の設定手順

### 1. Vercel環境変数の設定

1. [Vercelダッシュボード](https://vercel.com/dashboard) にログイン
2. プロジェクトを選択
3. **Settings** > **Environment Variables** に移動
4. 以下の環境変数を追加：

#### 必須環境変数

```bash
# Stripe（本番環境）
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Stripe 価格ID（本番環境用）
NEXT_PUBLIC_PRICE_MONTHLY=price_1SYSM387dnl6b7lwZW208B8K
NEXT_PUBLIC_PRICE_YEARLY=price_1SYSNR87dnl6b7lwAqHkCBdh

# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_BASE64=eyJ0eXBlIjoi...（Base64エンコードされたService Account JSON）
FIREBASE_PROJECT_ID=your-project-id

# Stripe Webhook Secret（本番環境用）
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

#### 環境変数の設定方法

1. **Key** に変数名を入力（例: `STRIPE_SECRET_KEY`）
2. **Value** に値を入力（例: `sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）
3. **Environment** で適用環境を選択：
   - **Production**: 本番環境のみ
   - **Preview**: プレビュー環境
   - **Development**: 開発環境（通常は選択しない）
4. **Save** をクリック

### 2. 本番環境用の価格IDの確認

本番環境（Live mode）で価格IDが正しく設定されているか確認：

1. Stripeダッシュボードで **Live mode** に切り替え
2. **Products** で価格IDを確認
3. 必要に応じて、本番環境用の価格IDを作成

**注意**: テスト環境と本番環境で価格IDが異なる場合があります。

### 3. 本番環境用のWebhook設定

1. Stripeダッシュボードで **Live mode** に切り替え
2. **Developers** > **Webhooks** > **Add endpoint**
3. Endpoint URL: `https://your-domain.com/api/stripe/webhook`
4. イベントを選択：
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `customer.updated`
5. **Signing secret** をコピーしてVercelの環境変数に設定

### 4. デプロイと動作確認

1. 環境変数を設定後、Vercelで再デプロイ：
   ```bash
   vercel --prod
   ```
2. 本番環境で決済フローをテスト
3. Stripeダッシュボードで決済が正常に処理されているか確認

## セキュリティチェックリスト

- [ ] 本番環境のシークレットキーが `.env.local` に含まれていない
- [ ] Vercelの環境変数で本番環境のみに設定されている
- [ ] Gitリポジトリにシークレットキーがコミットされていない
- [ ] StripeダッシュボードでLive modeのアクセス制限が設定されている
- [ ] Webhookの署名検証が有効になっている

## トラブルシューティング

### 本番環境で決済が失敗する

- Stripeダッシュボードで **Live mode** になっているか確認
- 本番環境用の価格IDが正しく設定されているか確認
- Vercelの環境変数が正しく設定されているか確認

### Webhookが動作しない

- 本番環境用のWebhookエンドポイントが正しく設定されているか確認
- WebhookシークレットがVercelの環境変数に設定されているか確認
- StripeダッシュボードのWebhookログでエラーを確認

---

**最終更新日**: 2024年12月

