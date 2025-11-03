# Stripe 決済機能実装ドキュメント

## 🎯 実装概要

Smart Garage に Stripe を使ったサブスクリプション決済機能を実装しました。

### ✨ 主な機能

- ✅ **7日間無料トライアル** - すべてのユーザーが気軽に試せる
- ✅ **月額・年額プラン** - 年額は16%お得（月額¥480、年額¥4,800）
- ✅ **シームレスな決済体験** - Stripe Checkout で安全な決済
- ✅ **カスタマーポータル** - ユーザー自身で解約・プラン変更が可能
- ✅ **リアルタイム同期** - Webhook で Firestore に即座に反映
- ✅ **UX 最適化** - 行動後発火のペイウォール

---

## 📁 実装ファイル一覧

### 🔧 コアライブラリ

| ファイル | 説明 |
|---------|------|
| `src/lib/stripe.ts` | Stripe SDK の初期化とユーティリティ関数 |
| `src/lib/plan.ts` | プラン管理とユーティリティ |
| `src/lib/firebaseAdmin.ts` | Firebase Admin SDK の初期化 |
| `src/lib/premium.ts` | プレミアム機能の定義とガード（更新） |

### 🌐 API ルート

| ファイル | エンドポイント | 説明 |
|---------|--------------|------|
| `src/app/api/stripe/create-checkout-session/route.ts` | `POST /api/stripe/create-checkout-session` | Checkout セッション作成 |
| `src/app/api/stripe/create-portal-session/route.ts` | `POST /api/stripe/create-portal-session` | カスタマーポータルセッション作成 |
| `src/app/api/stripe/webhook/route.ts` | `POST /api/stripe/webhook` | Stripe Webhook ハンドラー |

### 🎨 UI コンポーネント

| ファイル | 説明 |
|---------|------|
| `src/hooks/usePremium.ts` | プレミアムプラン状態管理フック（更新） |
| `src/components/modals/PaywallModal.tsx` | ペイウォールモーダル（Stripe 統合） |
| `src/app/settings/billing/page.tsx` | 請求管理ページ |
| `src/app/billing/success/page.tsx` | 決済成功ページ |
| `src/app/billing/cancel/page.tsx` | 決済キャンセルページ |

### 📝 型定義

| ファイル | 説明 |
|---------|------|
| `src/types/index.ts` | UserDocument, UserPlan, SubscriptionStatus を追加 |

---

## 🔄 決済フロー

### 1. ユーザーがプレミアム機能にアクセス

```
ユーザー → プレミアム機能クリック → usePremiumGuard() → ペイウォール表示
```

### 2. Checkout フロー

```
ペイウォール
  ↓
「月額/年額プランで始める」クリック
  ↓
POST /api/stripe/create-checkout-session
  ↓ (Firebase ID Token 検証)
  ↓ (Stripe Checkout Session 作成)
  ↓
Stripe Checkout ページへリダイレクト
  ↓ (クレジットカード情報入力)
  ↓
決済完了
  ↓
/billing/success にリダイレクト
```

### 3. Webhook による同期

```
Stripe イベント発生
  ↓
POST /api/stripe/webhook
  ↓ (署名検証)
  ↓
イベント処理:
  - checkout.session.completed → Customer ID/Subscription ID を保存
  - customer.subscription.updated → プラン・ステータスを更新
  - customer.subscription.deleted → 無料プランに戻す
  - invoice.payment_failed → ステータスを past_due に更新
  ↓
Firestore users/{uid} 更新
  ↓
usePremium() がリアルタイム取得 (onSnapshot)
  ↓
UI に即座に反映
```

### 4. カスタマーポータル

```
請求管理ページ
  ↓
「請求情報を管理」クリック
  ↓
POST /api/stripe/create-portal-session
  ↓ (Firebase ID Token 検証)
  ↓ (Customer ID を取得)
  ↓ (Stripe Portal Session 作成)
  ↓
Stripe カスタマーポータルへリダイレクト
  ↓
ユーザーが自分で管理:
  - 支払い方法の変更
  - 請求履歴の確認
  - サブスクリプションのキャンセル
  - プランの変更
```

---

## 📊 Firestore データ構造

### users/{uid} ドキュメント

```typescript
{
  // 基本情報
  uid: string;
  email?: string;
  displayName?: string;
  
  // プレミアムプラン情報
  plan: 'free' | 'premium_monthly' | 'premium_yearly';
  subscriptionStatus?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';
  currentPeriodEnd?: Timestamp; // 次回請求日
  cancelAtPeriodEnd?: boolean; // キャンセル予約中
  
  // Stripe 情報
  stripeCustomerId?: string; // cus_xxx
  subscriptionId?: string; // sub_xxx
  priceId?: string; // price_xxx
  
  // タイムスタンプ
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 🔐 セキュリティ

### 1. 認証

すべての API ルートで Firebase ID Token を検証：

```typescript
const auth = getAdminAuth();
const decodedToken = await auth.verifyIdToken(idToken);
const userUid = decodedToken.uid;
```

### 2. Webhook 署名検証

Stripe Webhook の署名を検証して、正規のリクエストのみ処理：

```typescript
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

### 3. Firestore セキュリティルール

ユーザーは自分のドキュメントのみ読み書き可能：

```
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
}
```

---

## 🎨 UX の工夫

### 1. 行動後発火のペイウォール

ユーザーが実際に機能を試した後にペイウォールを表示：

```typescript
// OCR 成功後にペイウォールを表示
if (!isPremium) {
  setShowPaywall(true);
}
```

### 2. 3種類のペイウォール

- **default**: 機能一覧を詳しく表示
- **minimal**: シンプルに1機能を訴求
- **hero**: 大きなヒーローイメージで訴求

```typescript
<PaywallModal 
  onClose={() => setShowPaywall(false)} 
  feature="ocr_scan" 
  variant="minimal" 
/>
```

### 3. 7日間無料トライアル

すべてのユーザーが気軽に試せるように：

```typescript
subscription_data: {
  trial_period_days: 7,
}
```

### 4. 年額プランに16%割引

長期利用を促進：

- 月額: ¥480/月
- 年額: ¥4,800/年（月額換算 ¥400）

---

## 📈 今後の拡張ポイント

### 1. プロモーションコード

既に `allow_promotion_codes: true` を設定済み。Stripe Dashboard でコードを作成するだけ。

### 2. メール通知

Webhook で以下のタイミングで通知を送信：

- サブスクリプション開始
- 支払い失敗
- トライアル終了前
- サブスクリプションキャンセル

### 3. 使用量ベースの課金

将来的に従量課金を追加する場合：

```typescript
await stripe.subscriptionItems.createUsageRecord(
  'si_xxx',
  { quantity: 1000, timestamp: 'now' }
);
```

### 4. 複数プラン

- スターター: ¥300/月（2台まで）
- プレミアム: ¥480/月（5台まで）
- プロフェッショナル: ¥980/月（無制限）

### 5. 税の自動計算

EU などでの展開時に：

```typescript
automatic_tax: {
  enabled: true,
}
```

---

## 🧪 テスト

### テストカード

| カード番号 | 用途 |
|----------|------|
| `4242 4242 4242 4242` | 成功 |
| `4000 0025 0000 3155` | 3D Secure 必須 |
| `4000 0000 0000 9995` | カード拒否 |

### Webhook テスト

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

---

## 📚 参考資料

- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Billing](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

## 🎉 まとめ

- ✅ フル機能のサブスクリプション決済を実装
- ✅ 7日間無料トライアルで転換率を最大化
- ✅ カスタマーポータルでサポート負荷を削減
- ✅ Webhook でリアルタイム同期
- ✅ 行動後発火で UX を最適化
- ✅ 型安全な実装でバグを防止

**Smart Garage のプレミアム体験をお楽しみください！** 🚗✨

