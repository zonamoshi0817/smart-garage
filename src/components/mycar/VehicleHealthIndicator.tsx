'use client';

import { Car, MaintenanceRecord } from '@/types';
import { useState } from 'react';
import { toMillis, toDate } from './utils';
import { Droplet, Wrench, Battery } from 'lucide-react';

interface HealthIndicatorItem {
  id: string;
  label: string;
  icon: string;
  status: 'good' | 'warning' | 'critical' | 'unknown'; // 'unknown'を追加：記録がない場合
  remainingKm?: number;
  remainingDays?: number;
  lastChangeDate?: Date | null;
  lastChangeMileage?: number;
  recommendedInterval?: number;
  kmSinceChange?: number;
  daysSinceChange?: number;
  recommendedMonths?: number;
  monthsSinceChange?: number;
  onClick: () => void;
  hasRecord: boolean; // 記録の有無
}

interface VehicleHealthIndicatorProps {
  car: Car;
  maintenanceRecords: MaintenanceRecord[];
  onQuickAdd: (type: 'oil' | 'brake' | 'tire' | 'battery') => void;
}

export default function VehicleHealthIndicator({ 
  car, 
  maintenanceRecords,
  onQuickAdd 
}: VehicleHealthIndicatorProps) {
  
  // オイル交換の推定残量を計算
  const calculateOilRemaining = (): HealthIndicatorItem => {
    const lastOilChange = maintenanceRecords
      .filter(r => r.title.toLowerCase().includes('オイル'))
      .sort((a, b) => toMillis(b.date) - toMillis(a.date))[0];
    
    if (!lastOilChange || !lastOilChange.mileage || !car.odoKm) {
      return {
        id: 'oil',
        label: 'オイル交換',
        icon: '',
        status: 'unknown', // 記録がない場合は 'unknown'
        recommendedInterval: 5000,
        hasRecord: false,
        onClick: () => onQuickAdd('oil')
      };
    }
    
    const lastChangeDate = toDate(lastOilChange.date);
    const kmSinceChange = car.odoKm - lastOilChange.mileage;
    const recommendedInterval = 5000; // 推奨交換距離
    const remainingKm = recommendedInterval - kmSinceChange;
    
    // 経過日数も考慮
    const daysSinceChange = Math.floor((Date.now() - toMillis(lastOilChange.date)) / (1000 * 60 * 60 * 24));
    const avgKmPerDay = car.avgKmPerMonth ? car.avgKmPerMonth / 30 : 30;
    const estimatedKmUntilDays = Math.floor((180 - daysSinceChange) * avgKmPerDay); // 6ヶ月基準
    
    const effectiveRemaining = Math.min(remainingKm, estimatedKmUntilDays);
    
    let status: 'good' | 'warning' | 'critical' = 'good';
    if (effectiveRemaining < 0) status = 'critical';
    else if (effectiveRemaining < 1000) status = 'warning';
    
    return {
      id: 'oil',
      label: 'オイル交換',
      icon: '',
      status,
      remainingKm: Math.max(0, remainingKm),
      remainingDays: Math.max(0, 180 - daysSinceChange),
      lastChangeDate,
      lastChangeMileage: lastOilChange.mileage,
      recommendedInterval,
      kmSinceChange,
      daysSinceChange,
      hasRecord: true,
      onClick: () => onQuickAdd('oil')
    };
  };
  
  // ブレーキ&タイヤの推定残量を計算
  const calculateBrakeAndTireRemaining = (): HealthIndicatorItem => {
    const lastBrakeTire = maintenanceRecords
      .filter(r => 
        r.title.toLowerCase().includes('ブレーキ') || 
        r.title.toLowerCase().includes('タイヤ')
      )
      .sort((a, b) => toMillis(b.date) - toMillis(a.date))[0];
    
    if (!lastBrakeTire || !lastBrakeTire.mileage || !car.odoKm) {
      return {
        id: 'brake-tire',
        label: 'ブレーキ&タイヤ',
        icon: '',
        status: 'unknown', // 記録がない場合は 'unknown'
        recommendedInterval: 30000,
        hasRecord: false,
        onClick: () => onQuickAdd('brake')
      };
    }
    
    const lastChangeDate = toDate(lastBrakeTire.date);
    const kmSinceChange = car.odoKm - lastBrakeTire.mileage;
    const recommendedInterval = lastBrakeTire.title.toLowerCase().includes('タイヤ') ? 40000 : 30000;
    const remainingKm = recommendedInterval - kmSinceChange;
    
    let status: 'good' | 'warning' | 'critical' = 'good';
    if (remainingKm < 0) status = 'critical';
    else if (remainingKm < 5000) status = 'warning';
    
    return {
      id: 'brake-tire',
      label: 'ブレーキ&タイヤ',
      icon: '',
      status,
      remainingKm: Math.max(0, remainingKm),
      lastChangeDate,
      lastChangeMileage: lastBrakeTire.mileage,
      recommendedInterval,
      kmSinceChange,
      hasRecord: true,
      onClick: () => onQuickAdd('brake')
    };
  };
  
  // バッテリーの経過月を計算
  const calculateBatteryAge = (): HealthIndicatorItem => {
    const lastBattery = maintenanceRecords
      .filter(r => r.title.toLowerCase().includes('バッテリー'))
      .sort((a, b) => toMillis(b.date) - toMillis(a.date))[0];
    
    if (!lastBattery) {
      return {
        id: 'battery',
        label: 'バッテリー',
        icon: '',
        status: 'unknown', // 記録がない場合は 'unknown'
        recommendedMonths: 36,
        hasRecord: false,
        onClick: () => onQuickAdd('battery')
      };
    }
    
    const lastChangeDate = toDate(lastBattery.date);
    const monthsSinceChange = Math.floor((Date.now() - toMillis(lastBattery.date)) / (1000 * 60 * 60 * 24 * 30));
    const recommendedMonths = 36; // 3年
    
    let status: 'good' | 'warning' | 'critical' = 'good';
    if (monthsSinceChange >= recommendedMonths) status = 'critical';
    else if (monthsSinceChange >= 24) status = 'warning';
    
    return {
      id: 'battery',
      label: 'バッテリー',
      icon: '',
      status,
      remainingDays: monthsSinceChange,
      lastChangeDate,
      recommendedMonths,
      monthsSinceChange,
      hasRecord: true,
      onClick: () => onQuickAdd('battery')
    };
  };
  
  const healthItems = [
    calculateOilRemaining(),
    calculateBrakeAndTireRemaining(),
    calculateBatteryAge()
  ];
  
  const getStatusStyles = (status: 'good' | 'warning' | 'critical' | 'unknown') => {
    switch (status) {
      case 'good':
        return {
          bg: 'bg-white',
          border: 'border-gray-200',
          iconBg: 'bg-emerald-50',
          iconColor: 'text-emerald-600',
          dot: 'bg-emerald-500',
          badgeBg: 'bg-emerald-50',
          badgeText: 'text-emerald-700',
          badgeBorder: 'border-emerald-200',
          hover: 'hover:bg-gray-50 hover:border-gray-300 hover:shadow-md'
        };
      case 'warning':
        return {
          bg: 'bg-white',
          border: 'border-gray-200',
          iconBg: 'bg-amber-50',
          iconColor: 'text-amber-600',
          dot: 'bg-amber-500',
          badgeBg: 'bg-amber-50',
          badgeText: 'text-amber-700',
          badgeBorder: 'border-amber-200',
          hover: 'hover:bg-gray-50 hover:border-gray-300 hover:shadow-md'
        };
      case 'critical':
        return {
          bg: 'bg-white',
          border: 'border-gray-200',
          iconBg: 'bg-red-50',
          iconColor: 'text-red-600',
          dot: 'bg-red-500',
          badgeBg: 'bg-red-50',
          badgeText: 'text-red-700',
          badgeBorder: 'border-red-200',
          hover: 'hover:bg-gray-50 hover:border-gray-300 hover:shadow-md'
        };
      case 'unknown':
        return {
          bg: 'bg-white',
          border: 'border-gray-200',
          iconBg: 'bg-gray-50',
          iconColor: 'text-gray-500',
          dot: 'bg-gray-400',
          badgeBg: 'bg-gray-50',
          badgeText: 'text-gray-600',
          badgeBorder: 'border-gray-200',
          hover: 'hover:bg-gray-50 hover:border-gray-300 hover:shadow-md'
        };
    }
  };

  const getIcon = (id: string) => {
    switch (id) {
      case 'oil':
        return <Droplet className="h-5 w-5" />;
      case 'brake-tire':
        return <Wrench className="h-5 w-5" />;
      case 'battery':
        return <Battery className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 lg:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">車両ヘルスインジケータ</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">オイル・ブレーキ・バッテリーの状態</p>
        </div>
      </div>
      
      <div className="space-y-2.5">
        {healthItems.map((item) => {
          const styles = getStatusStyles(item.status);
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`group w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer ${styles.bg} ${styles.border} ${styles.hover}`}
            >
              {/* アイコン */}
              <div className="relative flex-shrink-0">
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-105 ${styles.iconBg}`}>
                  <div className={styles.iconColor}>
                    {getIcon(item.id)}
                  </div>
                </div>
                {/* ステータスインジケータ */}
                <div className={`absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full ${styles.dot} ring-2 ring-white`} />
              </div>
              
              {/* 情報 */}
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="font-semibold text-sm text-gray-900">{item.label}</div>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${styles.badgeBg} ${styles.badgeText} border ${styles.badgeBorder}`}>
                    {item.status === 'good' ? '良好' : item.status === 'warning' ? '注意' : item.status === 'critical' ? '超過' : '未登録'}
                  </span>
                </div>
                <div className="space-y-1">
                  {/* オイル交換 */}
                  {item.id === 'oil' && item.lastChangeDate && item.lastChangeMileage !== undefined && item.kmSinceChange !== undefined && item.remainingKm !== undefined && item.remainingDays !== undefined ? (
                    <>
                      {/* 次の交換目安を1行で固定表示 */}
                      <div className="text-sm font-semibold text-gray-900 mb-1">
                        次回目安: <span className={item.remainingKm < 1000 || item.remainingDays < 30 ? 'text-amber-600' : 'text-gray-900'}>{item.remainingKm.toLocaleString()}km</span> / <span className={item.remainingDays < 30 ? 'text-amber-600' : 'text-gray-900'}>{item.remainingDays}日</span>
                      </div>
                      {/* 補足情報を小さく表示 */}
                      <div className="text-xs text-gray-600">
                        前回: {item.lastChangeDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })} ({item.lastChangeMileage.toLocaleString()}km) • 経過: {item.kmSinceChange.toLocaleString()}km / {item.daysSinceChange}日
                      </div>
                      <div className="text-[10px] text-gray-500">
                        目安: {item.recommendedInterval?.toLocaleString()}km または 6ヶ月ごと（推奨値）
                      </div>
                      {/* 注意の理由を具体化 */}
                      {item.status !== 'good' && (
                        <div className="text-xs text-amber-600 mt-1">
                          {item.daysSinceChange >= 180 ? '前回記録が6ヶ月以上前です' : item.remainingKm < 1000 ? '交換目安の距離が近づいています' : item.remainingDays < 30 ? '交換目安の日数が近づいています' : ''}
                        </div>
                      )}
                    </>
                  ) : item.id === 'oil' ? (
                    <>
                      <div className="text-sm font-semibold text-gray-900 mb-1">交換日を登録すると次回目安を自動計算します</div>
                      <div className="text-xs text-gray-500">目安: 5,000km または 6ヶ月ごと（推奨値）</div>
                    </>
                  ) : null}
                  
                  {/* ブレーキ&タイヤ */}
                  {item.id === 'brake-tire' && item.lastChangeDate && item.lastChangeMileage !== undefined && item.kmSinceChange !== undefined && item.remainingKm !== undefined ? (
                    <>
                      {/* 次の交換目安を1行で固定表示 */}
                      <div className="text-sm font-semibold text-gray-900 mb-1">
                        次回目安: <span className={item.remainingKm < 5000 ? 'text-amber-600' : 'text-gray-900'}>{item.remainingKm.toLocaleString()}km</span>
                      </div>
                      {/* 補足情報を小さく表示 */}
                      <div className="text-xs text-gray-600">
                        前回: {item.lastChangeDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })} ({item.lastChangeMileage.toLocaleString()}km) • 経過: {item.kmSinceChange.toLocaleString()}km
                      </div>
                      <div className="text-[10px] text-gray-500">
                        目安: {item.recommendedInterval?.toLocaleString()}kmごと（推奨値）
                      </div>
                      {/* 注意の理由を具体化 */}
                      {item.status !== 'good' && (
                        <div className="text-xs text-amber-600 mt-1">
                          {item.remainingKm < 0 ? '交換時期を過ぎています' : '交換目安の距離が近づいています'}
                        </div>
                      )}
                    </>
                  ) : item.id === 'brake-tire' ? (
                    <>
                      <div className="text-sm font-semibold text-gray-900 mb-1">交換日を登録すると次回目安を自動計算します</div>
                      <div className="text-xs text-gray-500">目安: ブレーキ30,000km / タイヤ40,000kmごと（推奨値）</div>
                    </>
                  ) : null}
                  
                  {/* バッテリー */}
                  {item.id === 'battery' && item.lastChangeDate && item.monthsSinceChange !== undefined ? (
                    <>
                      {/* 次の交換目安を1行で固定表示 */}
                      <div className="text-sm font-semibold text-gray-900 mb-1">
                        次回目安: <span className={item.monthsSinceChange >= 24 ? 'text-amber-600' : item.monthsSinceChange >= 36 ? 'text-red-600' : 'text-gray-900'}>{Math.max(0, (item.recommendedMonths || 36) - item.monthsSinceChange)}ヶ月</span>
                      </div>
                      {/* 補足情報を小さく表示 */}
                      <div className="text-xs text-gray-600">
                        前回交換: {item.lastChangeDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })} • 経過: {item.monthsSinceChange}ヶ月
                      </div>
                      <div className="text-[10px] text-gray-500">
                        目安: {item.recommendedMonths}ヶ月（3年）ごと（推奨値）
                      </div>
                      {/* 注意の理由を具体化 */}
                      {item.status !== 'good' && (
                        <div className="text-xs text-amber-600 mt-1">
                          {item.monthsSinceChange >= 36 ? '交換時期を過ぎています' : item.monthsSinceChange >= 24 ? '交換目安の時期が近づいています' : ''}
                        </div>
                      )}
                    </>
                  ) : item.id === 'battery' ? (
                    <>
                      <div className="text-sm font-semibold text-gray-900 mb-1">交換日を登録すると次回目安を自動計算します</div>
                      <div className="text-xs text-gray-500">目安: 36ヶ月ごと（推奨値）</div>
                    </>
                  ) : null}
                </div>
              </div>
              
              {/* 追加ボタン（具体化） */}
              <div className="flex-shrink-0">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    item.onClick();
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      item.onClick();
                    }
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                  <span className="hidden sm:inline">
                    {item.id === 'oil' ? '交換を記録' : item.id === 'brake-tire' ? '交換を記録' : item.id === 'battery' ? '交換を記録' : '追加'}
                  </span>
                  <span className="sm:hidden">追加</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      
    </div>
  );
}

