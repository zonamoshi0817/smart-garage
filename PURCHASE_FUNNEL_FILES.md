# 購入導線ファイル一覧（重複排除）

## 購入導線ファイル一覧（重複排除）

### A) 購入/アップグレードCTA（最優先）

- `src/components/modals/PaywallModal.tsx`
  - 抜粋: `const response = await fetch('/api/stripe/create-checkout-session', { method: 'POST', ... }); window.location.replace(url);`
  - 文言: 「年額プランで始める」「月額プランで始める」「プレミアムプランにアップグレードすると...」
  - 挙動: `fetch('/api/stripe/create-checkout-session')` → Stripe Checkout URL取得 → `window.location.replace()` でリダイレクト
  - companionで無効化: **Yes**（メインの購入モーダル）

- `src/app/(app)/settings/billing/page.tsx`
  - 抜粋: `<button onClick={() => setShowPaywall(true)}>プレミアムにする</button>` / `<button onClick={() => setShowPaywall(true)}>月額で始める</button>` / `fetch('/api/stripe/create-portal-session')`
  - 文言: 「プレミアムにする」「月額で始める」「年額で始める」「請求情報を管理」
  - 挙動: PaywallModal表示 または Customer Portal URL取得 → `window.location.href` でリダイレクト
  - companionで無効化: **Yes**（請求管理ページの購入ボタン）

- `src/components/common/CollapsibleSidebar.tsx`
  - 抜粋: `<button onClick={() => setShowPaywall(true)}>アップグレード</button>` / `{showPaywall && <PaywallModal ... />}`
  - 文言: 「アップグレード」
  - 挙動: PaywallModal表示
  - companionで無効化: **Yes**（サイドバーのアップグレードボタン）

- `src/components/modals/AddCarModal.tsx`
  - 抜粋: `const { checkFeature, showPaywall, ... } = usePremiumGuard();` / `if (!checkFeature('multiple_cars', { carCount })) return;`
  - 文言: PaywallModal経由（「複数車両登録」機能制限時）
  - 挙動: 2台目以降の車両追加時に `checkFeature('multiple_cars')` で制限チェック → PaywallModal表示
  - companionで無効化: **Yes**（車両追加時のプレミアムガード）

- `src/components/modals/MaintenanceModal.tsx`
  - 抜粋: `setShowPaywall(true);` / `{showPaywall && <PaywallModal feature="evidence_upload" ... />}`
  - 文言: PaywallModal経由（「証憑アップロード無制限」機能制限時）
  - 挙動: 証憑アップロード上限到達時に `setShowPaywall(true)` → PaywallModal表示
  - companionで無効化: **Yes**（証憑アップロード制限時のガード）

- `src/components/modals/CustomizationModal.tsx`
  - 抜粋: `setShowPaywall(true);` / `{showPaywall && <PaywallModal feature="evidence_upload" ... />}`
  - 文言: PaywallModal経由（「証憑アップロード無制限」機能制限時）
  - 挙動: 証憑アップロード上限到達時に `setShowPaywall(true)` → PaywallModal表示
  - companionで無効化: **Yes**（証憑アップロード制限時のガード）

- `src/components/modals/FuelLogModal.tsx`
  - 抜粋: `const { checkFeature, showPaywall, ... } = usePremiumGuard();` / `if (!checkFeature('ocr_scan')) return;`
  - 文言: PaywallModal経由（「OCRスキャン」機能制限時）
  - 挙動: OCR機能使用時に `checkFeature('ocr_scan')` で制限チェック → PaywallModal表示
  - companionで無効化: **Yes**（OCR機能制限時のガード）

- `src/app/(marketing)/page.tsx`
  - 抜粋: `<PricingCTAButtons planType="premium" />` / `router.push("/signup")`
  - 文言: 「プレミアムを始める」（PricingCTAButtons経由）
  - 挙動: `/signup` へリダイレクト（直接購入ではなくサインアップ導線）
  - companionで無効化: **No**（ランディングページのCTA、サインアップ導線のみ）

- `src/components/marketing/CTAButtons.client.tsx`
  - 抜粋: `router.push("/signup")` / `router.push("/login")`
  - 文言: 「新規登録」「無料ではじめる」「ログイン」
  - 挙動: `/signup` または `/login` へリダイレクト（直接購入ではない）
  - companionで無効化: **No**（マーケティングCTA、サインアップ導線のみ）

- `src/components/marketing/HeroCTAButtons.client.tsx`
  - 抜粋: `router.push("/signup")`
  - 文言: 「無料ではじめる」
  - 挙動: `/signup` へリダイレクト（直接購入ではない）
  - companionで無効化: **No**（ヒーローCTA、サインアップ導線のみ）

### B) 課金状態参照（UI出し分け）

- `src/hooks/usePremium.ts`
  - 抜粋: `const plan = data.plan || 'free';` / `const status = data.subscriptionStatus;` / `isPremium: isPremiumPlan(userPlan)`
  - 分類根拠: Firestoreから `plan` / `subscriptionStatus` / `currentPeriodEnd` / `cancelAtPeriodEnd` を取得して状態管理

- `src/lib/premium.ts`
  - 抜粋: `export function canUseFeature(feature: PremiumFeature, userPlan: UserPlan, ...)` / `const limits = isPremium(userPlan) ? PREMIUM_LIMITS.PREMIUM : PREMIUM_LIMITS.FREE;`
  - 分類根拠: `userPlan` に基づいて機能制限を判定

- `src/lib/plan.ts`
  - 抜粋: `export function isPremiumPlan(plan: Plan | string): boolean` / `export function planFromPriceId(priceId: string): Plan`
  - 分類根拠: プラン判定・表示名・ステータス色のユーティリティ

- `src/app/(app)/home/page.tsx`
  - 抜粋: `const { userPlan, checkFeature, showPaywall, ... } = usePremiumGuard();` / `{showPaywall && <PaywallModal ... />}`
  - 分類根拠: `usePremiumGuard` でプラン状態を参照してUI出し分け

- `src/app/(app)/mycar/page.tsx`
  - 抜粋: `import { isPremiumPlan } from '@/lib/plan';`
  - 分類根拠: プラン状態を参照（具体的な購入ボタンは未確認）

- `src/lib/evidenceUsage.ts`
  - 抜粋: `const limits = isPremium(userPlan) ? PREMIUM_LIMITS.PREMIUM : PREMIUM_LIMITS.FREE;` / `reason: '...プレミアムプランにアップグレードすると...'`
  - 分類根拠: 証憑アップロード制限チェック時にプラン状態を参照

- `src/lib/storage.ts`
  - 抜粋: `EvidenceLimitExceededError` の処理（プラン状態に基づく制限エラー）
  - 分類根拠: アップロード制限時にプラン状態を参照

- `src/app/(app)/settings/account/page.tsx`
  - 抜粋: `href="/settings/billing"`（請求管理ページへのリンク）
  - 分類根拠: 請求管理ページへの導線（購入ボタンではない）

- `src/app/(marketing)/support/page.tsx`
  - 抜粋: `<a href="/settings/billing">`（請求管理ページへのリンク）
  - 分類根拠: 請求管理ページへの導線（購入ボタンではない）

### C) Stripe API（Route Handlers / Webhook）

- `src/app/api/stripe/create-checkout-session/route.ts`
  - 抜粋: `import { createCheckoutSession } from '@/lib/stripe';` / `const session = await createCheckoutSession({ priceId, ... });`
  - 分類根拠: Stripe Checkout Session作成API（POST）

- `src/app/api/stripe/create-portal-session/route.ts`
  - 抜粋: `import { createPortalSession } from '@/lib/stripe';` / `const session = await createPortalSession({ customerId, ... });`
  - 分類根拠: Stripe Customer Portal Session作成API（POST）

- `src/app/api/stripe/webhook/route.ts`
  - 抜粋: `const signature = (await headers()).get('stripe-signature');` / `event = constructWebhookEvent(body, signature, secret);` / `handleCheckoutComplete` / `handleSubscriptionUpdate`
  - 分類根拠: Stripe Webhook受信・処理（POST）

- `src/app/api/stripe/test-connection/route.ts`
  - 抜粋: `stripe.accounts.retrieve()` / `stripe.balance.retrieve()` / `stripe.prices.list()`
  - 分類根拠: Stripe接続テストAPI（デバッグ用）

- `src/lib/stripe.ts`
  - 抜粋: `export const stripe = new Stripe(stripeSecretKey, ...)` / `export async function createCheckoutSession(...)` / `export async function createPortalSession(...)`
  - 分類根拠: Stripe SDK初期化・ユーティリティ関数（サーバーサイド専用）

- `src/app/api/account/downgrade/route.ts`
  - 抜粋: `await stripe.subscriptions.cancel(subscriptionId);` / `await stripe.subscriptions.list({ customer: stripeCustomerId })`
  - 分類根拠: プランダウングレード時のStripeサブスクリプション解約API

- `src/app/api/account/delete/route.ts`
  - 抜粋: `import { stripe } from '@/lib/stripe';`（Stripe顧客削除の可能性あり）
  - 分類根拠: アカウント削除時のStripe処理（実装確認要）

### D) プラン定義・価格ID・定数

- `src/lib/premium.ts`
  - 抜粋: `export const PREMIUM_PRICING = { monthly: { price: 350 }, yearly: { price: 3500 } }` / `export const PREMIUM_FEATURE_DESCRIPTIONS = { ... }`
  - 分類根拠: プレミアム機能定義・価格情報・機能説明

- `src/lib/plan.ts`
  - 抜粋: `export function getPriceId(plan: 'monthly' | 'yearly'): string` / `const monthlyPriceId = process.env.NEXT_PUBLIC_PRICE_MONTHLY` / `const yearlyPriceId = process.env.NEXT_PUBLIC_PRICE_YEARLY`
  - 分類根拠: Price ID取得関数・プラン判定ユーティリティ

- `src/types/index.ts`
  - 抜粋: `stripeCustomerId?: string;` / `subscriptionId?: string;` / `priceId?: string;` / `plan?: Plan;` / `subscriptionStatus?: SubscriptionStatus;`
  - 分類根拠: 型定義（Stripe関連フィールド）

---

## 補足

### companionで無効化すべき対象の判断基準

- **Yes**: アプリ内で直接購入ボタン/モーダルを表示する箇所（PaywallModal、billingページの購入ボタン、サイドバーのアップグレードボタン、各種モーダルのプレミアムガード）
- **No**: サインアップ導線のみ（マーケティングページのCTA、ヒーローCTA）→ サインアップ後にアプリ内で購入導線が表示されるため、companionモードでも問題なし

### 注意事項

- APIキー・環境変数の値は一切記載していません
- 抜粋は最大5行に制限しています
- 購入導線の実体は主に `PaywallModal` と `billing/page.tsx` に集約されています
