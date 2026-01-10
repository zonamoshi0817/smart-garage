# Stripe接続エラーのトラブルシューティング

## 現在の状況
- **エラー**: `StripeConnectionError` - "An error occurred with our connection to Stripe. Request was retried 3 times."
- **ステータス**: 500 Internal Server Error
- **発生場所**: Vercelサーバーレス関数からStripe APIへの接続

## 確認すべき項目

### 1. Vercelのログを確認
Vercel Dashboard → プロジェクト → Functions → `/api/stripe/create-checkout-session` → ログタブ

以下のログを確認：
- `Initializing Stripe SDK:` - Stripeキーの種類（live/test）を確認
- `Creating checkout session:` - 環境変数の状態を確認
- `Stripe connection error details:` - 詳細なエラー情報を確認

### 2. 環境変数の確認
Vercel Dashboard → プロジェクト → Settings → Environment Variables

以下の環境変数が正しく設定されているか確認：
- `STRIPE_SECRET_KEY` - `sk_live_` で始まる（本番環境）
- `NEXT_PUBLIC_PRICE_MONTHLY` - `price_` で始まる
- `NEXT_PUBLIC_PRICE_YEARLY` - `price_` で始まる
- `FIREBASE_SERVICE_ACCOUNT_BASE64` - Base64エンコードされたJSON
- `FIREBASE_PROJECT_ID` - FirebaseプロジェクトID

### 3. Stripe Dashboardで確認
1. Stripe Dashboard → Developers → API keys
   - Secret keyが有効か確認
   - キーが制限されていないか確認（IP制限など）

2. Stripe Dashboard → Products
   - 価格ID（`NEXT_PUBLIC_PRICE_MONTHLY`、`NEXT_PUBLIC_PRICE_YEARLY`）が存在するか確認
   - 価格がアクティブか確認

3. Stripe Dashboard → Settings → Account
   - アカウントが有効か確認
   - 制限がかかっていないか確認

### 4. Vercelのネットワーク設定を確認
Vercel Dashboard → プロジェクト → Settings → Network

- Egressネットワークブロックがないか確認
- リージョン設定を確認（Stripe APIにアクセスできるリージョンか）

## 考えられる原因

### 1. Vercelのネットワーク接続の問題
- **症状**: すべてのStripe API呼び出しが失敗
- **原因**: Vercelのサーバーレス関数からStripe APIへのネットワーク接続がブロックされている
- **対処**: Vercelサポートに問い合わせ

### 2. Stripe APIキーの問題
- **症状**: 認証エラーまたは接続エラー
- **原因**: APIキーが無効、制限されている、または間違っている
- **対処**: Stripe DashboardでAPIキーを確認・再生成

### 3. DNS解決の問題
- **症状**: `ENOTFOUND` エラー
- **原因**: Vercelのサーバーレス関数から`api.stripe.com`へのDNS解決が失敗
- **対処**: Vercelサポートに問い合わせ

### 4. タイムアウトの問題
- **症状**: 接続がタイムアウト
- **原因**: ネットワークが遅い、またはStripe APIが応答しない
- **対処**: タイムアウト時間を延長（現在30秒）

## 緊急時の代替案

### オプション1: Stripe Payment Linksを使用
サーバー側のAPI呼び出しが不要なため、ネットワーク接続の問題を回避できます。

1. Stripe Dashboard → Products → 価格を選択 → "Payment links" タブ
2. Payment Linkを作成
3. クライアント側で直接リダイレクト

**メリット**:
- サーバー側のAPI呼び出しが不要
- ネットワーク接続の問題を回避
- 簡単に実装できる

**デメリット**:
- カスタマイズ性が低い
- ユーザー情報の紐付けが難しい

### オプション2: クライアント側でStripe.jsを使用
サーバー側のAPI呼び出しを最小限に抑える。

**メリット**:
- サーバー側の負荷を軽減
- ネットワーク接続の問題を部分的に回避

**デメリット**:
- セキュリティ上の懸念（APIキーをクライアント側に公開する必要がある）

## 次のステップ

1. **Vercelのログを確認**
   - エラーの詳細情報を取得
   - DNS解決エラー、タイムアウトエラーなどを確認

2. **Vercelサポートに問い合わせ**
   - エラーログを添付
   - Egressネットワークブロックがないか確認を依頼

3. **Stripeサポートに問い合わせ**
   - APIキーが正しく設定されているか確認
   - アカウントに制限がないか確認

4. **代替案を検討**
   - Stripe Payment Linksを使用
   - クライアント側でStripe.jsを使用

## 参考リンク
- [Stripe API Status](https://status.stripe.com/)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Stripe Payment Links](https://stripe.com/docs/payments/payment-links)
