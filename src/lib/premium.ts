/**
 * プレミアム機能の定義とガード機能
 */

// ===== プレミアム機能の定義 =====

export type PremiumFeature = 
  | 'multiple_cars'           // 複数車両登録（無料: 1台、プレミアム: 無制限）
  | 'pdf_export'             // PDF出力（無料: なし、プレミアム: あり）
  | 'share_links'            // 共有URL（無料: なし、プレミアム: あり）
  | 'advanced_reminders'     // 高度なリマインダー（無料: 基本、プレミアム: 無制限）
  | 'ad_free'                // 広告非表示（無料: あり、プレミアム: なし）
  | 'receipt_auto_save'      // 領収書自動保存（無料: なし、プレミアム: あり）
  | 'unlimited_snooze'       // スヌーズ回数無制限（無料: 制限あり、プレミアム: 無制限）
  | 'auto_next_reminder'     // 自動次回予定登録（無料: なし、プレミアム: あり）
  | 'multiple_recommendations' // 複数候補レコメンド（無料: 1件、プレミアム: 複数）
  | 'filter_display'         // フィルター同時表示（無料: なし、プレミアム: あり）
  | 'data_analytics'         // データ分析（無料: 基本、プレミアム: 詳細）
  | 'priority_support'       // 優先サポート（無料: なし、プレミアム: あり）

// ===== プレミアム機能の制限値 =====

export const PREMIUM_LIMITS = {
  // 無料プランの制限
  FREE: {
    max_cars: 1,
    max_reminders_per_car: 5,
    max_snooze_count: 3,
    pdf_export: false,
    share_links: false,
    receipt_auto_save: false,
    auto_next_reminder: false,
    multiple_recommendations: false,
    filter_display: false,
    data_analytics: false,
    priority_support: false,
    ad_free: false
  },
  // プレミアムプランの制限
  PREMIUM: {
    max_cars: -1, // 無制限
    max_reminders_per_car: -1, // 無制限
    max_snooze_count: -1, // 無制限
    pdf_export: true,
    share_links: true,
    receipt_auto_save: true,
    auto_next_reminder: true,
    multiple_recommendations: true,
    filter_display: true,
    data_analytics: true,
    priority_support: true,
    ad_free: true
  }
} as const;

// ===== ユーザープラン情報 =====

export type UserPlan = 'free' | 'premium';

export interface UserPlanInfo {
  plan: UserPlan;
  expiresAt?: Date;
  features: typeof PREMIUM_LIMITS.FREE | typeof PREMIUM_LIMITS.PREMIUM;
}

// ===== プレミアム機能チェック関数 =====

/**
 * ユーザーがプレミアム機能にアクセスできるかチェック
 */
export function canUseFeature(
  feature: PremiumFeature,
  userPlan: UserPlan,
  currentUsage?: { [key: string]: number }
): { canUse: boolean; reason?: string; upgradeRequired?: boolean } {
  const limits = userPlan === 'premium' ? PREMIUM_LIMITS.PREMIUM : PREMIUM_LIMITS.FREE;
  
  switch (feature) {
    case 'multiple_cars':
      const carCount = currentUsage?.carCount || 0;
      if (limits.max_cars === -1 || carCount < limits.max_cars) {
        return { canUse: true };
      }
      return {
        canUse: false,
        reason: `車両登録数が上限（${limits.max_cars}台）に達しています`,
        upgradeRequired: true
      };
      
    case 'pdf_export':
      if (limits.pdf_export) {
        return { canUse: true };
      }
      return {
        canUse: false,
        reason: 'PDF出力はプレミアム機能です',
        upgradeRequired: true
      };
      
    case 'share_links':
      if (limits.share_links) {
        return { canUse: true };
      }
      return {
        canUse: false,
        reason: '共有URLはプレミアム機能です',
        upgradeRequired: true
      };
      
    case 'advanced_reminders':
      const reminderCount = currentUsage?.reminderCount || 0;
      if (limits.max_reminders_per_car === -1 || reminderCount < limits.max_reminders_per_car) {
        return { canUse: true };
      }
      return {
        canUse: false,
        reason: `リマインダー数が上限（${limits.max_reminders_per_car}件）に達しています`,
        upgradeRequired: true
      };
      
    case 'unlimited_snooze':
      const snoozeCount = currentUsage?.snoozeCount || 0;
      if (limits.max_snooze_count === -1 || snoozeCount < limits.max_snooze_count) {
        return { canUse: true };
      }
      return {
        canUse: false,
        reason: `スヌーズ回数が上限（${limits.max_snooze_count}回）に達しています`,
        upgradeRequired: true
      };
      
    case 'receipt_auto_save':
      if (limits.receipt_auto_save) {
        return { canUse: true };
      }
      return {
        canUse: false,
        reason: '領収書自動保存はプレミアム機能です',
        upgradeRequired: true
      };
      
    case 'auto_next_reminder':
      if (limits.auto_next_reminder) {
        return { canUse: true };
      }
      return {
        canUse: false,
        reason: '自動次回予定登録はプレミアム機能です',
        upgradeRequired: true
      };
      
    case 'multiple_recommendations':
      if (limits.multiple_recommendations) {
        return { canUse: true };
      }
      return {
        canUse: false,
        reason: '複数候補レコメンドはプレミアム機能です',
        upgradeRequired: true
      };
      
    case 'filter_display':
      if (limits.filter_display) {
        return { canUse: true };
      }
      return {
        canUse: false,
        reason: 'フィルター同時表示はプレミアム機能です',
        upgradeRequired: true
      };
      
    case 'data_analytics':
      if (limits.data_analytics) {
        return { canUse: true };
      }
      return {
        canUse: false,
        reason: '詳細データ分析はプレミアム機能です',
        upgradeRequired: true
      };
      
    case 'priority_support':
      if (limits.priority_support) {
        return { canUse: true };
      }
      return {
        canUse: false,
        reason: '優先サポートはプレミアム機能です',
        upgradeRequired: true
      };
      
    case 'ad_free':
      if (limits.ad_free) {
        return { canUse: true };
      }
      return {
        canUse: false,
        reason: '広告非表示はプレミアム機能です',
        upgradeRequired: true
      };
      
    default:
      return { canUse: false, reason: '不明な機能です' };
  }
}

// ===== プレミアム機能ガード =====

/**
 * プレミアム機能の使用をガードする関数
 */
export function guardPremiumFeature(
  feature: PremiumFeature,
  userPlan: UserPlan,
  currentUsage?: { [key: string]: number },
  onUpgradeRequired?: () => void
): boolean {
  const result = canUseFeature(feature, userPlan, currentUsage);
  
  if (!result.canUse) {
    if (result.upgradeRequired && onUpgradeRequired) {
      onUpgradeRequired();
    } else {
      alert(result.reason);
    }
    return false;
  }
  
  return true;
}

// ===== プレミアム機能の説明 =====

export const PREMIUM_FEATURE_DESCRIPTIONS = {
  multiple_cars: {
    title: '複数車両登録',
    description: '無制限の車両を登録・管理できます',
    freeLimit: '1台まで',
    premiumBenefit: '無制限'
  },
  pdf_export: {
    title: 'PDF出力',
    description: 'メンテナンス履歴をPDFで出力できます',
    freeLimit: '利用不可',
    premiumBenefit: '利用可能'
  },
  share_links: {
    title: '共有URL',
    description: 'メンテナンス履歴を共有URLで公開できます',
    freeLimit: '利用不可',
    premiumBenefit: '利用可能'
  },
  advanced_reminders: {
    title: '高度なリマインダー',
    description: '無制限のリマインダーを設定できます',
    freeLimit: '車両あたり5件まで',
    premiumBenefit: '無制限'
  },
  unlimited_snooze: {
    title: 'スヌーズ無制限',
    description: 'リマインダーのスヌーズ回数に制限がありません',
    freeLimit: '3回まで',
    premiumBenefit: '無制限'
  },
  receipt_auto_save: {
    title: '領収書自動保存',
    description: '領収書を自動で保存・管理できます',
    freeLimit: '利用不可',
    premiumBenefit: '利用可能'
  },
  auto_next_reminder: {
    title: '自動次回予定登録',
    description: 'メンテナンス完了時に自動で次回予定を登録します',
    freeLimit: '利用不可',
    premiumBenefit: '利用可能'
  },
  multiple_recommendations: {
    title: '複数候補レコメンド',
    description: 'オイル交換時に複数の商品候補を表示します',
    freeLimit: '1件まで',
    premiumBenefit: '複数件'
  },
  filter_display: {
    title: 'フィルター同時表示',
    description: '複数のフィルターを同時に適用できます',
    freeLimit: '利用不可',
    premiumBenefit: '利用可能'
  },
  data_analytics: {
    title: '詳細データ分析',
    description: '詳細な統計と分析レポートを表示します',
    freeLimit: '基本統計のみ',
    premiumBenefit: '詳細分析'
  },
  priority_support: {
    title: '優先サポート',
    description: '優先的なカスタマーサポートを受けられます',
    freeLimit: '利用不可',
    premiumBenefit: '利用可能'
  },
  ad_free: {
    title: '広告非表示',
    description: 'アプリ内広告を非表示にできます',
    freeLimit: '広告表示',
    premiumBenefit: '広告非表示'
  }
} as const;

// ===== プレミアム料金情報 =====

export const PREMIUM_PRICING = {
  monthly: {
    price: 480,
    currency: 'JPY',
    period: 'month',
    description: '月額480円'
  },
  yearly: {
    price: 4800,
    currency: 'JPY',
    period: 'year',
    description: '年額4,800円（月額400円相当）'
  }
} as const;
