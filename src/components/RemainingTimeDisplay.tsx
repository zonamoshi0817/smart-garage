import React from 'react';

interface RemainingTimeDisplayProps {
  targetDate: string;
  showDate?: boolean;
  prefix?: string;
  suffix?: string;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
}

export default function RemainingTimeDisplay({
  targetDate,
  showDate = false,
  prefix = '',
  suffix = '',
  className = '',
  variant = 'default'
}: RemainingTimeDisplayProps) {
  const today = new Date();
  const target = new Date(targetDate);
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const getStatusColor = (days: number) => {
    if (days < 0) return 'text-red-600'; // 超過
    if (days <= 30) return 'text-amber-600'; // 期限接近（1ヶ月以内）
    return 'text-blue-600'; // 余裕
  };

  const formatRemaining = (days: number) => {
    if (days < 0) {
      return `${Math.abs(days)}日超過`;
    } else if (days === 0) {
      return '今日期限';
    } else if (days === 1) {
      return '残り1日';
    } else {
      return `残り${days}日`;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const statusColor = getStatusColor(diffDays);
  const remainingText = formatRemaining(diffDays);

  if (variant === 'compact') {
    return (
      <span className={`text-sm font-medium ${statusColor} ${className}`}>
        {prefix}{remainingText}{suffix}
      </span>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`${className}`}>
        <div className={`text-sm font-medium ${statusColor}`}>
          {prefix}{remainingText}{suffix}
        </div>
        {showDate && (
          <div className="text-xs text-gray-500 mt-1">
            {formatDate(targetDate)}
          </div>
        )}
      </div>
    );
  }

  // default variant
  return (
    <div className={`${className}`}>
      <span className={`text-sm font-medium ${statusColor}`}>
        {prefix}{remainingText}{suffix}
      </span>
      {showDate && (
        <span className="text-xs text-gray-500 ml-2">
          ({formatDate(targetDate)})
        </span>
      )}
    </div>
  );
}

// 残り距離表示用のコンポーネント
interface RemainingKmDisplayProps {
  currentKm: number;
  targetKm: number;
  className?: string;
  variant?: 'default' | 'compact';
}

export function RemainingKmDisplay({
  currentKm,
  targetKm,
  className = '',
  variant = 'default'
}: RemainingKmDisplayProps) {
  const remainingKm = targetKm - currentKm;

  const getStatusColor = (km: number) => {
    if (km < 0) return 'text-red-600'; // 超過
    if (km <= 1000) return 'text-amber-600'; // 期限接近（1000km以内）
    return 'text-blue-600'; // 余裕
  };

  const formatRemaining = (km: number) => {
    if (km < 0) {
      return `${Math.abs(km).toLocaleString()}km超過`;
    } else if (km === 0) {
      return '期限到達';
    } else {
      return `残り${km.toLocaleString()}km`;
    }
  };

  const statusColor = getStatusColor(remainingKm);
  const remainingText = formatRemaining(remainingKm);

  if (variant === 'compact') {
    return (
      <span className={`text-sm font-medium ${statusColor} ${className}`}>
        {remainingText}
      </span>
    );
  }

  return (
    <div className={`${className}`}>
      <span className={`text-sm font-medium ${statusColor}`}>
        {remainingText}
      </span>
    </div>
  );
}

// 複合表示（日数と距離の両方）
interface CombinedRemainingDisplayProps {
  targetDate?: string;
  currentKm?: number;
  targetKm?: number;
  className?: string;
}

export function CombinedRemainingDisplay({
  targetDate,
  currentKm,
  targetKm,
  className = ''
}: CombinedRemainingDisplayProps) {
  const parts: string[] = [];

  if (targetDate) {
    const today = new Date();
    const target = new Date(targetDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      parts.push(`${Math.abs(diffDays)}日超過`);
    } else if (diffDays === 0) {
      parts.push('今日期限');
    } else {
      parts.push(`残り${diffDays}日`);
    }
  }

  if (currentKm !== undefined && targetKm !== undefined) {
    const remainingKm = targetKm - currentKm;
    
    if (remainingKm < 0) {
      parts.push(`${Math.abs(remainingKm).toLocaleString()}km超過`);
    } else if (remainingKm === 0) {
      parts.push('距離期限到達');
    } else {
      parts.push(`残り${remainingKm.toLocaleString()}km`);
    }
  }

  const getCombinedStatusColor = () => {
    const hasOverdue = parts.some(part => part.includes('超過') || part.includes('今日期限'));
    const hasClose = parts.some(part => part.includes('残り') && (
      part.includes('1日') || part.includes('2日') || part.includes('3日') ||
      part.includes('4日') || part.includes('5日') || part.includes('6日') ||
      part.includes('7日') || part.includes('1,000km') || part.includes('500km')
    ));

    if (hasOverdue) return 'text-red-600';
    if (hasClose) return 'text-amber-600';
    return 'text-blue-600';
  };

  return (
    <span className={`text-sm font-medium ${getCombinedStatusColor()} ${className}`}>
      {parts.join(' / ')}
    </span>
  );
}
