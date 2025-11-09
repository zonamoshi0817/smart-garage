# 🌐 ドメイン設定ガイド - garagelog.jp

本番ドメイン `https://garagelog.jp` の設定手順

---

## 1. Vercelでのドメイン設定

### 1.1 カスタムドメインの追加

1. Vercel Dashboard を開く
   - https://vercel.com/kobayashis-projects-6366834f/smart-garage

2. Settings → Domains

3. `garagelog.jp` を追加
   - 入力: `garagelog.jp`
   - 「Add」をクリック

4. DNS設定を確認
   - Vercelが提示するDNSレコードをコピー

---

## 2. DNS設定（ドメインレジストラ側）

### 2.1 Aレコード設定

お名前.com / ムームードメイン / その他のレジストラで以下を設定：

| タイプ | ホスト | 値 |
|--------|--------|-----|
| A | @ | `76.76.21.21` |
| CNAME | www | `cname.vercel-dns.com.` |

### 2.2 SSL証明書

Vercelが自動的にLet's Encrypt証明書を発行します（設定不要）

---

## 3. 環境変数の更新

### 3.1 Vercel環境変数

Vercel Dashboard → Settings → Environment Variables で更新：

```bash
NEXT_PUBLIC_APP_URL=https://garagelog.jp
```

### 3.2 Stripe設定の更新

Stripe Dashboard でリダイレクトURLを更新：

**Checkout Session:**
- Success URL: `https://garagelog.jp/billing/success?session_id={CHECKOUT_SESSION_ID}`
- Cancel URL: `https://garagelog.jp/billing/cancel`

**Customer Portal:**
- Return URL: `https://garagelog.jp/settings/billing`

**Webhook Endpoint:**
- URL: `https://garagelog.jp/api/stripe/webhook`
- Events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `customer.updated`

### 3.3 Firebase設定の更新

Firebase Console → Authentication → Settings → Authorized domains

以下を追加：
- `garagelog.jp`
- `www.garagelog.jp`

---

## 4. Google Analytics設定（オプション）

GA4プロパティでドメインを更新：
- https://analytics.google.com

---

## 5. メール設定（将来対応）

### SPF レコード
```
v=spf1 include:_spf.google.com ~all
```

### DKIM レコード
Google Workspace / SendGrid の設定に従う

### DMARC レコード
```
v=DMARC1; p=none; rua=mailto:postmaster@garagelog.jp
```

---

## 6. 動作確認

### 6.1 基本動作
- [ ] https://garagelog.jp/ が表示される
- [ ] HTTPSリダイレクトが動作する（http://→https://）
- [ ] www.garagelog.jp → garagelog.jp にリダイレクト

### 6.2 SSL証明書
- [ ] 証明書が有効（Let's Encrypt）
- [ ] ブラウザに警告が出ない

### 6.3 Stripe連携
- [ ] Checkout成功後に https://garagelog.jp/billing/success へリダイレクト
- [ ] Webhookが https://garagelog.jp/api/stripe/webhook に到達

### 6.4 Firebase認証
- [ ] ログインが動作する
- [ ] リダイレクトエラーが出ない

### 6.5 共有URL
- [ ] https://garagelog.jp/share/[token] が正常に表示
- [ ] OGPメタタグが正しく表示される

---

## 7. トラブルシューティング

### DNS設定が反映されない
- 最大48時間かかる場合があります
- `dig garagelog.jp` で確認

### SSL証明書エラー
- Vercelが自動発行するまで数分待つ
- Settings → Domains で証明書ステータスを確認

### Stripe Webhookが届かない
- Stripe Dashboard → Developers → Webhooks でログを確認
- エンドポイントURLが `https://garagelog.jp/api/stripe/webhook` か確認

### Firebase認証エラー
- Authorized domains に `garagelog.jp` が追加されているか確認
- キャッシュクリア＋ハードリロード

---

## 8. 本番デプロイ後の設定

```bash
# 環境変数を確認
vercel env ls

# 本番環境にデプロイ
vercel --prod

# ドメインが正しく設定されているか確認
curl -I https://garagelog.jp
```

---

**設定完了日**: 2025年11月9日  
**ドメイン**: https://garagelog.jp  
**サポート**: support@garagelog.jp

