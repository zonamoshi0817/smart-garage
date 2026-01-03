'use client';

import { Car } from '@/types';
import { MaintenanceRecord } from '@/types';
import { useState } from 'react';
import { daysFromNow, toDate } from './utils';

interface VehicleHeaderProps {
  car: Car;
  latestMaintenance?: MaintenanceRecord;
  onImageChange: () => void;
}

export default function VehicleHeader({ 
  car, 
  latestMaintenance, 
  onImageChange 
}: VehicleHeaderProps) {
  const [imageError, setImageError] = useState(false);
  
  // 車検期限までの日数
  const inspectionDaysLeft = daysFromNow(car.inspectionExpiry);
  
  // バッジの色を決定（期限が遠いときはニュートラル、近づいたら注意色）
  const getBadgeColor = (daysLeft: number | null) => {
    if (daysLeft === null) return 'bg-gray-100 text-gray-600 border-gray-300';
    if (daysLeft < 0) return 'bg-red-100 text-red-700 border-red-300';
    if (daysLeft < 30) return 'bg-orange-100 text-orange-700 border-orange-300';
    if (daysLeft < 90) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    // 期限が遠いときはニュートラル（グレー）
    return 'bg-gray-100 text-gray-600 border-gray-300';
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

  // Specコンポーネント（ホームページと同じ）
  const Spec = ({ label, value }: { label: string; value: string }) => {
    return (
      <div className="rounded-xl border border-gray-200 px-3 py-2">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    );
  };

  // 車検期限のフォーマット
  const formatInspectionDate = () => {
    if (!car.inspectionExpiry) return "未設定";
    const date = car.inspectionExpiry.toDate ? car.inspectionExpiry.toDate() : new Date(car.inspectionExpiry as any);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
      {/* 左側：車両画像 */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100 relative group">
        {!imageError && car.imagePath ? (
          <img
            src={car.imagePath}
            alt={car.name}
            className="w-full h-44 md:h-full object-cover rounded-xl"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-44 md:h-full flex items-center justify-center bg-gray-100">
            <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        {/* 画像変更CTA（ホバー時に表示） */}
        <button
          onClick={onImageChange}
          className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-xl"
        >
          <span className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium text-sm shadow-xl flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            画像を変更
          </span>
        </button>
      </div>

      {/* 右側：車両情報 */}
      <div className="flex flex-col justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">
            {car.name}
            {car.modelCode ? `（${car.modelCode}）` : ""}
          </h2>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {car.modelCode && (
              <Spec label="グレード" value={car.modelCode} />
            )}
            {car.year && (
              <Spec label="年式" value={`${car.year}年`} />
            )}
            {car.odoKm !== undefined && (
              <Spec label="走行距離" value={`${car.odoKm.toLocaleString()} km`} />
            )}
            <Spec label="車検期限" value={formatInspectionDate()} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {inspectionDaysLeft !== null && (
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 ${getBadgeColor(inspectionDaysLeft)}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-semibold">
                車検: 
                {inspectionDaysLeft < 0 
                  ? ` 期限切れ (${Math.abs(inspectionDaysLeft)}日超過)` 
                  : ` あと${inspectionDaysLeft}日`
                }
              </span>
            </div>
          )}
          {latestMaintenance && (
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700">
              <span className="text-xs font-semibold">
                直近整備: {formatMaintenanceDate(latestMaintenance)}
                {latestMaintenance.title && `（${latestMaintenance.title}）`}
              </span>
            </div>
          )}
        </div>
      </div>
      </div>
    </section>
  );
}

