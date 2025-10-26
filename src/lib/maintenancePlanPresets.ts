/**
 * メンテナンス計画のプリセット生成
 */

export interface MaintenancePlan {
  title: string;
  description?: string;
  intervalKm?: number;
  intervalDays?: number;
}

/**
 * 車両登録時に自動生成されるメンテナンス計画のプリセット
 */
export function generateMaintenancePlans(): MaintenancePlan[] {
  return [
    {
      title: 'オイル交換',
      description: 'エンジンオイルとオイルフィルターの交換',
      intervalKm: 5000,
      intervalDays: 180, // 6ヶ月
    },
    {
      title: 'タイヤ交換',
      description: 'タイヤの交換時期をチェック',
      intervalKm: 10000,
    },
    {
      title: 'ブレーキフルード交換',
      description: 'ブレーキフルードの交換',
      intervalDays: 730, // 2年
    },
    {
      title: 'エアフィルター交換',
      description: 'エアクリーナーフィルターの交換',
      intervalKm: 15000,
      intervalDays: 365, // 1年
    },
    {
      title: 'バッテリー点検',
      description: 'バッテリーの状態確認',
      intervalDays: 365, // 1年
    },
  ];
}

/**
 * メンテナンス計画のプレビュー用テキストを生成
 */
export function formatMaintenancePlan(plan: MaintenancePlan): string {
  const parts: string[] = [];
  
  if (plan.intervalKm) {
    parts.push(`${plan.intervalKm.toLocaleString()}kmごと`);
  }
  
  if (plan.intervalDays) {
    const months = Math.floor(plan.intervalDays / 30);
    if (months > 0) {
      parts.push(`${months}ヶ月ごと`);
    } else if (plan.intervalDays) {
      parts.push(`${plan.intervalDays}日ごと`);
    }
  }
  
  return parts.join(' / ');
}
