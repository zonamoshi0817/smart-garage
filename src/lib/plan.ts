/**
 * プラン管理とユーティリティ
 */

// プランの型定義（既存の premium.ts と統合）
export type Plan = 'free' | 'premium_monthly' | 'premium_yearly';

// Stripe のステータス
export type SubscriptionStatus =
  | 'active'        // アクティブ（支払い済み）
  | 'trialing'      // トライアル期間中
  | 'past_due'      // 支払い遅延
  | 'canceled'      // キャンセル済み
  | 'unpaid'        // 未払い
  | 'incomplete'    // 不完全（初回支払い失敗）
  | 'incomplete_expired'; // 不完全（期限切れ）

/**
 * Price ID からプランを判定
 */
export function planFromPriceId(priceId: string): Plan {
  const monthlyPriceId = process.env.NEXT_PUBLIC_PRICE_MONTHLY;
  const yearlyPriceId = process.env.NEXT_PUBLIC_PRICE_YEARLY;

  if (priceId === monthlyPriceId) return 'premium_monthly';
  if (priceId === yearlyPriceId) return 'premium_yearly';

  return 'free';
}

/**
 * プランがプレミアムかどうか判定
 */
export function isPremiumPlan(plan: Plan | string): boolean {
  return plan === 'premium' || plan === 'premium_monthly' || plan === 'premium_yearly';
}

/**
 * サブスクリプションがアクティブかどうか判定
 */
export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === 'active' || status === 'trialing';
}

/**
 * プランの表示名を取得
 */
export function getPlanDisplayName(plan: Plan | 'premium'): string {
  switch (plan) {
    case 'premium_monthly':
      return 'プレミアム（月額）';
    case 'premium_yearly':
      return 'プレミアム（年額）';
    case 'premium':
      // 後方互換性のため、'premium' は 'premium_monthly' として扱う
      return 'プレミアム（月額）';
    case 'free':
    default:
      return '無料プラン';
  }
}

/**
 * サブスクリプションステータスの表示名を取得
 */
export function getSubscriptionStatusDisplayName(status: SubscriptionStatus): string {
  switch (status) {
    case 'active':
      return 'アクティブ';
    case 'trialing':
      return 'トライアル中';
    case 'past_due':
      return '支払い遅延';
    case 'canceled':
      return 'キャンセル済み';
    case 'unpaid':
      return '未払い';
    case 'incomplete':
      return '支払い処理中';
    case 'incomplete_expired':
      return '期限切れ';
    default:
      return '不明';
  }
}

/**
 * サブスクリプションステータスの色を取得（Tailwind CSS クラス用）
 */
export function getSubscriptionStatusColor(status: SubscriptionStatus): string {
  switch (status) {
    case 'active':
      return 'text-green-600 bg-green-50';
    case 'trialing':
      return 'text-blue-600 bg-blue-50';
    case 'past_due':
      return 'text-yellow-600 bg-yellow-50';
    case 'canceled':
      return 'text-gray-600 bg-gray-50';
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

/**
 * Price ID を取得
 */
export function getPriceId(plan: 'monthly' | 'yearly'): string {
  const priceId = plan === 'monthly' 
    ? process.env.NEXT_PUBLIC_PRICE_MONTHLY 
    : process.env.NEXT_PUBLIC_PRICE_YEARLY;

  if (!priceId) {
    throw new Error(`Price ID for ${plan} plan is not set`);
  }

  return priceId;
}

/**
 * プランの価格を取得
 */
export function getPlanPrice(plan: Plan): number {
  switch (plan) {
    case 'premium_monthly':
      return 350;
    case 'premium_yearly':
      return 3500;
    case 'free':
    default:
      return 0;
  }
}

/**
 * 次回請求日を日本語フォーマットで取得
 */
export function formatNextBillingDate(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

