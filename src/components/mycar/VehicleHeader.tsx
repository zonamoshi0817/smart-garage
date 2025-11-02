'use client';

import { Car } from '@/types';
import { MaintenanceRecord } from '@/types';
import { InsurancePolicy, getDaysUntilExpiry, getExpiryStatus } from '@/lib/insurance';
import { useState } from 'react';
import Image from 'next/image';
import { daysFromNow, toDate } from './utils';

interface VehicleHeaderProps {
  car: Car;
  latestMaintenance?: MaintenanceRecord;
  activeInsurance?: InsurancePolicy;
  isPremium: boolean;
  onImageChange: () => void;
}

export default function VehicleHeader({ 
  car, 
  latestMaintenance, 
  activeInsurance,
  isPremium,
  onImageChange 
}: VehicleHeaderProps) {
  const [imageError, setImageError] = useState(false);
  
  // 車検期限までの日数
  const inspectionDaysLeft = daysFromNow(car.inspectionExpiry);
  
  // 保険期限までの日数
  const insuranceDaysLeft = activeInsurance 
    ? getDaysUntilExpiry(toDate(activeInsurance.endDate) || new Date())
    : null;
  
  // バッジの色を決定
  const getBadgeColor = (daysLeft: number | null) => {
    if (daysLeft === null) return 'bg-gray-100 text-gray-600';
    if (daysLeft < 0) return 'bg-red-100 text-red-700 border-red-300';
    if (daysLeft < 30) return 'bg-orange-100 text-orange-700 border-orange-300';
    if (daysLeft < 90) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-green-100 text-green-700 border-green-300';
  };
  
  // 直近メンテ日のフォーマット
  const formatMaintenanceDate = (record?: MaintenanceRecord) => {
    if (!record) return '記録なし';
    const date = toDate(record.date);
    if (!date) return '記録なし';
    const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysAgo === 0) return '今日';
    if (daysAgo === 1) return '昨日';
    return `${daysAgo}日前`;
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-md overflow-hidden border border-blue-100">
      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 左側：車両画像 */}
          <div className="flex-shrink-0">
            <div className="relative w-full lg:w-64 h-48 bg-gray-200 rounded-xl overflow-hidden group">
              {!imageError && car.imagePath ? (
                <Image
                  src={car.imagePath}
                  alt={car.name}
                  fill
                  className="object-contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                  <svg className="w-24 h-24 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h8m0 0v8m0-8l-8 8" />
                  </svg>
                </div>
              )}
              
              {/* 画像変更CTA（ホバー時に表示） */}
              <button
                onClick={onImageChange}
                className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100"
              >
                <span className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium text-sm shadow-lg">
                  📷 画像を変更
                </span>
              </button>
            </div>
          </div>

          {/* 右側：車両情報 */}
          <div className="flex-1 min-w-0">
            {/* 車名と基本情報 */}
            <div className="mb-4">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{car.name}</h1>
              <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                {car.year && (
                  <span className="flex items-center gap-1">
                    <span className="font-medium">年式:</span>
                    <span>{car.year}年</span>
                  </span>
                )}
                {car.modelCode && (
                  <span className="flex items-center gap-1">
                    <span className="font-medium">型式:</span>
                    <span>{car.modelCode}</span>
                  </span>
                )}
                {car.odoKm !== undefined && (
                  <span className="flex items-center gap-1">
                    <span className="font-medium">現在ODO:</span>
                    <span className="text-lg font-bold text-indigo-600">{car.odoKm.toLocaleString()} km</span>
                  </span>
                )}
                {latestMaintenance && (
                  <span className="flex items-center gap-1">
                    <span className="font-medium">直近メンテ:</span>
                    <span>{formatMaintenanceDate(latestMaintenance)}</span>
                  </span>
                )}
              </div>
            </div>

            {/* バッジエリア */}
            <div className="flex flex-wrap gap-2">
              {/* 車検期限バッジ */}
              {inspectionDaysLeft !== null && (
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getBadgeColor(inspectionDaysLeft)}`}>
                  🔧 車検: 
                  {inspectionDaysLeft < 0 
                    ? ` 期限切れ (${Math.abs(inspectionDaysLeft)}日超過)` 
                    : ` あと${inspectionDaysLeft}日`
                  }
                </span>
              )}

              {/* 保険期限バッジ */}
              {insuranceDaysLeft !== null && (
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getBadgeColor(insuranceDaysLeft)}`}>
                  🛡️ 保険: 
                  {insuranceDaysLeft < 0 
                    ? ` 期限切れ (${Math.abs(insuranceDaysLeft)}日超過)` 
                    : ` あと${insuranceDaysLeft}日`
                  }
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

