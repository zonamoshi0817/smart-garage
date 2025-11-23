'use client';

import { Car, MaintenanceRecord } from '@/types';
import { useState } from 'react';
import { toMillis } from './utils';
import { Droplet, Wrench, Battery } from 'lucide-react';

interface HealthIndicatorItem {
  id: string;
  label: string;
  icon: string;
  status: 'good' | 'warning' | 'critical';
  remainingKm?: number;
  remainingDays?: number;
  onClick: () => void;
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
        status: 'warning',
        onClick: () => onQuickAdd('oil')
      };
    }
    
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
        status: 'good',
        onClick: () => onQuickAdd('brake')
      };
    }
    
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
        status: 'warning',
        onClick: () => onQuickAdd('battery')
      };
    }
    
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
      onClick: () => onQuickAdd('battery')
    };
  };
  
  const healthItems = [
    calculateOilRemaining(),
    calculateBrakeAndTireRemaining(),
    calculateBatteryAge()
  ];
  
  const getStatusStyles = (status: 'good' | 'warning' | 'critical') => {
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
              className={`group w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${styles.bg} ${styles.border} ${styles.hover}`}
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
                    {item.status === 'good' ? '良好' : item.status === 'warning' ? '注意' : '要対応'}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  {item.id === 'oil' && item.remainingKm !== undefined && item.remainingDays !== undefined ? (
                    <span>残り約 <span className="font-semibold text-gray-900">{item.remainingKm.toLocaleString()} km</span> / <span className="font-semibold text-gray-900">{item.remainingDays}日</span></span>
                  ) : item.id === 'oil' ? (
                    <span className="text-gray-500">記録を追加して状態を確認</span>
                  ) : null}
                  {item.id === 'brake-tire' && item.remainingKm !== undefined ? (
                    <span>残り約 <span className="font-semibold text-gray-900">{item.remainingKm.toLocaleString()} km</span></span>
                  ) : item.id === 'brake-tire' ? (
                    <span className="text-gray-500">記録を追加して状態を確認</span>
                  ) : null}
                  {item.id === 'battery' && item.remainingDays !== undefined ? (
                    <span>交換後 <span className="font-semibold text-gray-900">{item.remainingDays}ヶ月</span>経過</span>
                  ) : item.id === 'battery' ? (
                    <span className="text-gray-500">記録を追加して状態を確認</span>
                  ) : null}
                </div>
              </div>
              
              {/* 追加アイコン */}
              <div className="flex-shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 text-center">
        クリックして次回メンテナンスを追加
      </div>
    </div>
  );
}

