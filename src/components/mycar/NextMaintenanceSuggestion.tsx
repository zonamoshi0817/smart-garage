'use client';

import { Car, MaintenanceRecord } from '@/types';
import { toMillis } from './utils';

interface MaintenanceSuggestion {
  id: string;
  title: string;
  icon: string;
  dueInKm?: number;
  dueInDays?: number;
  recommendedParts?: string;
  estimatedCost?: number;
  onClick: () => void;
}

interface NextMaintenanceSuggestionProps {
  car: Car;
  maintenanceRecords: MaintenanceRecord[];
  onCreateFromTemplate: (type: string) => void;
}

export default function NextMaintenanceSuggestion({
  car,
  maintenanceRecords,
  onCreateFromTemplate
}: NextMaintenanceSuggestionProps) {
  
  // メンテナンス提案を生成
  const getSuggestions = (): MaintenanceSuggestion[] => {
    const suggestions: MaintenanceSuggestion[] = [];
    
    // オイル交換の提案
    const lastOilChange = maintenanceRecords
      .filter(r => r.title.toLowerCase().includes('オイル'))
      .sort((a, b) => toMillis(b.date) - toMillis(a.date))[0];
    
    if (lastOilChange && lastOilChange.mileage && car.odoKm) {
      const kmSinceChange = car.odoKm - lastOilChange.mileage;
      const dueInKm = 5000 - kmSinceChange;
      
      if (dueInKm <= 2000) {
        suggestions.push({
          id: 'oil',
          title: 'エンジンオイル交換',
          icon: '🛢️',
          dueInKm: Math.max(0, dueInKm),
          recommendedParts: '5W-30 / 4.0L',
          estimatedCost: 5000,
          onClick: () => onCreateFromTemplate('oil')
        });
      }
    }
    
    // オイルフィルター交換の提案
    const lastOilFilter = maintenanceRecords
      .filter(r => r.title.toLowerCase().includes('オイルフィルター') || r.title.toLowerCase().includes('エレメント'))
      .sort((a, b) => toMillis(b.date) - toMillis(a.date))[0];
    
    if (lastOilFilter && lastOilFilter.mileage && car.odoKm) {
      const kmSinceChange = car.odoKm - lastOilFilter.mileage;
      const dueInKm = 10000 - kmSinceChange;
      
      if (dueInKm <= 2000) {
        suggestions.push({
          id: 'oil-filter',
          title: 'オイルフィルター交換',
          icon: '🔧',
          dueInKm: Math.max(0, dueInKm),
          estimatedCost: 2000,
          onClick: () => onCreateFromTemplate('oil-filter')
        });
      }
    }
    
    // タイヤローテーションの提案
    const lastTireRotation = maintenanceRecords
      .filter(r => r.title.toLowerCase().includes('タイヤ') && r.title.toLowerCase().includes('ローテ'))
      .sort((a, b) => toMillis(b.date) - toMillis(a.date))[0];
    
    if (lastTireRotation && lastTireRotation.mileage && car.odoKm) {
      const kmSinceChange = car.odoKm - lastTireRotation.mileage;
      const dueInKm = 10000 - kmSinceChange;
      
      if (dueInKm <= 2000) {
        suggestions.push({
          id: 'tire-rotation',
          title: 'タイヤローテーション',
          icon: '🔄',
          dueInKm: Math.max(0, dueInKm),
          estimatedCost: 3000,
          onClick: () => onCreateFromTemplate('tire-rotation')
        });
      }
    }
    
    // ブレーキフルード交換の提案
    const lastBrakeFluid = maintenanceRecords
      .filter(r => r.title.toLowerCase().includes('ブレーキフルード') || r.title.toLowerCase().includes('ブレーキオイル'))
      .sort((a, b) => toMillis(b.date) - toMillis(a.date))[0];
    
    if (lastBrakeFluid) {
      const monthsSinceChange = Math.floor((Date.now() - toMillis(lastBrakeFluid.date)) / (1000 * 60 * 60 * 24 * 30));
      const dueInMonths = 24 - monthsSinceChange;
      
      if (dueInMonths <= 6) {
        suggestions.push({
          id: 'brake-fluid',
          title: 'ブレーキフルード交換',
          icon: '🛑',
          dueInDays: Math.max(0, dueInMonths * 30),
          estimatedCost: 4000,
          onClick: () => onCreateFromTemplate('brake-fluid')
        });
      }
    }
    
    // エアフィルター交換の提案
    const lastAirFilter = maintenanceRecords
      .filter(r => r.title.toLowerCase().includes('エアフィルター') || r.title.toLowerCase().includes('エアクリーナー'))
      .sort((a, b) => toMillis(b.date) - toMillis(a.date))[0];
    
    if (lastAirFilter && lastAirFilter.mileage && car.odoKm) {
      const kmSinceChange = car.odoKm - lastAirFilter.mileage;
      const dueInKm = 30000 - kmSinceChange;
      
      if (dueInKm <= 5000) {
        suggestions.push({
          id: 'air-filter',
          title: 'エアフィルター交換',
          icon: '💨',
          dueInKm: Math.max(0, dueInKm),
          estimatedCost: 3000,
          onClick: () => onCreateFromTemplate('air-filter')
        });
      }
    }
    
    // ワイパー交換の提案
    const lastWiper = maintenanceRecords
      .filter(r => r.title.toLowerCase().includes('ワイパー'))
      .sort((a, b) => toMillis(b.date) - toMillis(a.date))[0];
    
    if (lastWiper) {
      const monthsSinceChange = Math.floor((Date.now() - toMillis(lastWiper.date)) / (1000 * 60 * 60 * 24 * 30));
      const dueInMonths = 12 - monthsSinceChange;
      
      if (dueInMonths <= 3) {
        suggestions.push({
          id: 'wiper',
          title: 'ワイパーゴム交換',
          icon: '🌧️',
          dueInDays: Math.max(0, dueInMonths * 30),
          estimatedCost: 2000,
          onClick: () => onCreateFromTemplate('wiper')
        });
      }
    }
    
    return suggestions;
  };
  
  const suggestions = getSuggestions();

  if (suggestions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>💡</span>
          <span>次回メンテナンス提案</span>
        </h2>
        <div className="text-center py-8 text-gray-500">
          <p className="mb-2">✨ すべて良好です！</p>
          <p className="text-sm">近いうちに必要なメンテナンスはありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span>💡</span>
        <span>次回メンテナンス提案</span>
      </h2>
      
      <div className="space-y-3">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="flex items-center gap-4 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border-2 border-amber-200"
          >
            {/* アイコン */}
            <div className="flex-shrink-0 text-3xl">
              {suggestion.icon}
            </div>
            
            {/* 情報 */}
            <div className="flex-1">
              <div className="font-semibold text-gray-900 mb-1">{suggestion.title}</div>
              <div className="text-xs text-gray-600 space-y-0.5">
                {suggestion.dueInKm !== undefined && (
                  <div>あと約 {suggestion.dueInKm.toLocaleString()} km</div>
                )}
                {suggestion.dueInDays !== undefined && (
                  <div>あと約 {Math.floor(suggestion.dueInDays / 30)}ヶ月</div>
                )}
                {suggestion.recommendedParts && (
                  <div className="text-indigo-600 font-medium">{suggestion.recommendedParts}</div>
                )}
                {suggestion.estimatedCost && (
                  <div className="text-gray-700">予算目安: ¥{suggestion.estimatedCost.toLocaleString()}</div>
                )}
              </div>
            </div>
            
            {/* アクションボタン */}
            <button
              onClick={suggestion.onClick}
              className="flex-shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-md"
            >
              📝 テンプレから作成
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

