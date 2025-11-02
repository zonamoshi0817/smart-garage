'use client';

import { Car, MaintenanceRecord } from '@/types';
import { useState } from 'react';
import { toMillis } from './utils';

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
        icon: '🛢️',
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
      icon: '🛢️',
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
        icon: '🔧',
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
      icon: '🔧',
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
        icon: '🔋',
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
      icon: '🔋',
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
  
  const getStatusColor = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-300';
    }
  };
  
  const getStatusDot = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span>🏥</span>
        <span>車両ヘルスインジケータ</span>
      </h2>
      
      <div className="space-y-3">
        {healthItems.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${getStatusColor(item.status)}`}
          >
            {/* アイコンとステータスドット */}
            <div className="relative flex-shrink-0">
              <span className="text-3xl">{item.icon}</span>
              <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getStatusDot(item.status)} ring-2 ring-white`} />
            </div>
            
            {/* 情報 */}
            <div className="flex-1 text-left">
              <div className="font-semibold text-sm mb-1">{item.label}</div>
              <div className="text-xs">
                {item.id === 'oil' && item.remainingKm !== undefined && (
                  <span>残り約 {item.remainingKm.toLocaleString()} km / {item.remainingDays}日</span>
                )}
                {item.id === 'brake-tire' && item.remainingKm !== undefined && (
                  <span>残り約 {item.remainingKm.toLocaleString()} km</span>
                )}
                {item.id === 'battery' && item.remainingDays !== undefined && (
                  <span>交換後 {item.remainingDays}ヶ月経過</span>
                )}
              </div>
            </div>
            
            {/* 追加アイコン */}
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </button>
        ))}
      </div>
      
      <div className="mt-4 text-xs text-gray-500 text-center">
        クリックして次回予定を1タップ追加
      </div>
    </div>
  );
}

