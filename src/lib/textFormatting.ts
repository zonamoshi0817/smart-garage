// テキストフォーマッティングユーティリティ

/**
 * 車名のフォーマット（語間スペースの統一）
 */
export function formatCarName(name: string): string {
  return name
    .replace(/([a-zA-Z])([a-zA-Z])/g, '$1 $2') // 英字間にスペース
    .replace(/\s+/g, ' ') // 複数スペースを単一に
    .trim();
}

/**
 * 走行距離のフォーマット（カンマ区切り）
 */
export function formatMileage(km: number): string {
  return km.toLocaleString('ja-JP') + ' km';
}

/**
 * 日付のフォーマット（YYYY/MM/DD形式で統一）
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '/');
}

/**
 * 金額のフォーマット（円記号 + カンマ区切り）
 */
export function formatCurrency(amount: number): string {
  return '¥' + amount.toLocaleString('ja-JP');
}

/**
 * 残り日数のフォーマット（統一表現）
 */
export function formatRemainingDays(days: number): string {
  if (days < 0) {
    return `${Math.abs(days)}日超過`;
  } else if (days === 0) {
    return '今日期限';
  } else if (days === 1) {
    return '残り1日';
  } else {
    return `残り${days}日`;
  }
}

/**
 * 残り距離のフォーマット（統一表現）
 */
export function formatRemainingKm(km: number): string {
  if (km < 0) {
    return `${Math.abs(km).toLocaleString()}km超過`;
  } else if (km === 0) {
    return '距離期限到達';
  } else {
    return `残り${km.toLocaleString()}km`;
  }
}

/**
 * 複合残り表示（日数と距離）
 */
export function formatCombinedRemaining(
  days?: number | null,
  km?: number | null
): string {
  const parts = [];
  
  if (days !== null && days !== undefined) {
    parts.push(formatRemainingDays(days));
  }
  
  if (km !== null && km !== undefined) {
    parts.push(formatRemainingKm(km));
  }
  
  return parts.join(' / ');
}

/**
 * 年月のフォーマット（YYYY年M月）
 */
export function formatYearMonth(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'numeric'
  }).replace(/\//g, '年') + '月';
}

/**
 * 時間のフォーマット（HH:MM）
 */
export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * ファイルサイズのフォーマット
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * パーセンテージのフォーマット
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * 燃費のフォーマット（km/L）
 */
export function formatFuelEfficiency(kmPerL: number): string {
  return `${kmPerL.toFixed(1)} km/L`;
}

/**
 * 期間のフォーマット（○ヶ月、○年）
 */
export function formatPeriod(days: number): string {
  if (days >= 365) {
    const years = Math.floor(days / 365);
    return `${years}年${days % 365 >= 30 ? ` ${Math.floor((days % 365) / 30)}ヶ月` : ''}`;
  } else if (days >= 30) {
    const months = Math.floor(days / 30);
    return `${months}ヶ月${days % 30 > 0 ? ` ${days % 30}日` : ''}`;
  } else {
    return `${days}日`;
  }
}

/**
 * 電話番号のフォーマット
 */
export function formatPhoneNumber(phone: string): string {
  // 数字のみ抽出
  const digits = phone.replace(/\D/g, '');
  
  // 日本の電話番号フォーマット
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  } else if (digits.length === 10) {
    return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  }
  
  return phone; // フォーマットできない場合はそのまま返す
}

/**
 * 住所のフォーマット
 */
export function formatAddress(
  prefecture: string,
  city: string,
  address?: string
): string {
  const parts = [prefecture, city];
  if (address) {
    parts.push(address);
  }
  return parts.join('');
}

/**
 * メンテナンスタイプのアイコン取得
 */
export function getMaintenanceIcon(title: string): string {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('オイル') || lowerTitle.includes('oil')) {
    return '🛢️';
  }
  if (lowerTitle.includes('ブレーキ') || lowerTitle.includes('brake')) {
    return '🛞️';
  }
  if (lowerTitle.includes('タイヤ') || lowerTitle.includes('tire')) {
    return '🛞️';
  }
  if (lowerTitle.includes('バッテリー') || lowerTitle.includes('battery')) {
    return '🔋';
  }
  if (lowerTitle.includes('エアコン') || lowerTitle.includes('air')) {
    return '❄️';
  }
  if (lowerTitle.includes('エンジン') || lowerTitle.includes('engine')) {
    return '🔧';
  }
  if (lowerTitle.includes('トランスミッション') || lowerTitle.includes('transmission')) {
    return '⚙️';
  }
  if (lowerTitle.includes('冷却') || lowerTitle.includes('cooling')) {
    return '🌡️';
  }
  if (lowerTitle.includes('エキゾースト') || lowerTitle.includes('exhaust')) {
    return '💨';
  }
  if (lowerTitle.includes('サスペンション') || lowerTitle.includes('suspension')) {
    return '🚗';
  }
  
  return '🔧'; // デフォルトアイコン
}

/**
 * 優先度の色クラス取得
 */
export function getPriorityColorClass(priority: number): string {
  if (priority >= 3) return 'text-red-600 bg-red-50 border-red-200'; // 超過
  if (priority >= 2) return 'text-amber-600 bg-amber-50 border-amber-200'; // 期限接近
  return 'text-blue-600 bg-blue-50 border-blue-200'; // 余裕
}

/**
 * 進捗バーの色クラス取得
 */
export function getProgressBarColorClass(priority: number): string {
  if (priority >= 3) return 'bg-red-500'; // 超過
  if (priority >= 2) return 'bg-amber-500'; // 期限接近
  return 'bg-blue-500'; // 余裕
}

/**
 * テキストの省略表示
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * 数値の範囲チェックとフォーマット
 */
export function formatNumberWithRange(
  value: number,
  min?: number,
  max?: number,
  suffix: string = ''
): string {
  if (min !== undefined && value < min) {
    return `最小値以下 (${min}${suffix})`;
  }
  if (max !== undefined && value > max) {
    return `最大値超過 (${max}${suffix})`;
  }
  return `${value}${suffix}`;
}

