'use client';

import { Car, MaintenanceRecord } from '@/types';
import { toMillis } from './utils';

interface MaintenanceSuggestion {
  id: string;
  title: string;
  icon: string;
  dueInKm?: number;
  dueInDays?: number;
  onClick: () => void;
}

interface NextMaintenanceSuggestionProps {
  car: Car;
  maintenanceRecords: MaintenanceRecord[];
  onCreateFromTemplate: (type: string) => void;
}

// ベースラインメンテナンススケジュール
const BASELINE_SCHEDULE = {
  oil: { kmInterval: 5000, monthsInterval: 6, warningKm: 2000, warningMonths: 1 },
  oilFilter: { kmInterval: 10000, monthsInterval: 12, warningKm: 2000, warningMonths: 2 },
  airFilter: { kmInterval: 30000, monthsInterval: 24, warningKm: 5000, warningMonths: 3 },
  tireRotation: { kmInterval: 10000, monthsInterval: 12, warningKm: 2000, warningMonths: 2 },
  brakeFluid: { monthsInterval: 24, warningMonths: 6 },
  wiper: { monthsInterval: 12, warningMonths: 3 },
};

export default function NextMaintenanceSuggestion({
  car,
  maintenanceRecords,
  onCreateFromTemplate
}: NextMaintenanceSuggestionProps) {
  
  // 車の初回登録日を取得（year or createdAt）
  const getCarStartDate = (): Date => {
    // 年式がある場合、その年の1月1日を基準にする
    if (car.year) {
      return new Date(car.year, 0, 1);
    }
    // createdAtから取得
    if (car.createdAt) {
      return toMillis(car.createdAt) ? new Date(toMillis(car.createdAt)) : new Date();
    }
    return new Date();
  };
  
  // 経過月数を計算
  const getMonthsSince = (date: Date): number => {
    return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30));
  };
  
  // メンテナンス提案を生成
  const getSuggestions = (): MaintenanceSuggestion[] => {
    const suggestions: MaintenanceSuggestion[] = [];
    const carStartDate = getCarStartDate();
    const monthsSinceStart = getMonthsSince(carStartDate);
    
    // オイル交換の提案
    const lastOilChange = maintenanceRecords
      .filter(r => r.title.toLowerCase().includes('オイル'))
      .sort((a, b) => toMillis(b.date) - toMillis(a.date))[0];
    
    if (lastOilChange) {
      // 履歴ベース（既存ロジック）
      if (lastOilChange.mileage && car.odoKm) {
        const kmSinceChange = car.odoKm - lastOilChange.mileage;
        const dueInKm = BASELINE_SCHEDULE.oil.kmInterval - kmSinceChange;
        
        if (dueInKm <= BASELINE_SCHEDULE.oil.warningKm) {
          suggestions.push({
            id: 'oil',
            title: 'エンジンオイル交換',
            icon: '🛢️',
            dueInKm: Math.max(0, dueInKm),
            onClick: () => onCreateFromTemplate('oil')
          });
        }
      } else {
        // ODOがない場合は時間ベース
        const monthsSinceChange = getMonthsSince(new Date(toMillis(lastOilChange.date)));
        const dueInMonths = BASELINE_SCHEDULE.oil.monthsInterval - monthsSinceChange;
        
        if (dueInMonths <= BASELINE_SCHEDULE.oil.warningMonths) {
          suggestions.push({
            id: 'oil',
            title: 'エンジンオイル交換',
            icon: '🛢️',
            dueInDays: Math.max(0, dueInMonths * 30),
            onClick: () => onCreateFromTemplate('oil')
          });
        }
      }
    } else {
      // 履歴なし - ベースラインスケジュール
      if (car.odoKm) {
        // 走行距離ベース
        const dueInKm = BASELINE_SCHEDULE.oil.kmInterval - (car.odoKm % BASELINE_SCHEDULE.oil.kmInterval);
        if (dueInKm <= BASELINE_SCHEDULE.oil.warningKm || monthsSinceStart >= BASELINE_SCHEDULE.oil.monthsInterval - BASELINE_SCHEDULE.oil.warningMonths) {
          suggestions.push({
            id: 'oil',
            title: 'エンジンオイル交換',
            icon: '🛢️',
            dueInKm: Math.max(0, dueInKm),
            onClick: () => onCreateFromTemplate('oil')
          });
        }
      } else {
        // 時間ベース
        const dueInMonths = BASELINE_SCHEDULE.oil.monthsInterval - (monthsSinceStart % BASELINE_SCHEDULE.oil.monthsInterval);
        if (dueInMonths <= BASELINE_SCHEDULE.oil.warningMonths) {
          suggestions.push({
            id: 'oil',
            title: 'エンジンオイル交換',
            icon: '🛢️',
            dueInDays: Math.max(0, dueInMonths * 30),
            onClick: () => onCreateFromTemplate('oil')
          });
        }
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
          onClick: () => onCreateFromTemplate('air-filter')
        });
      }
    }
    
    // ワイパー交換の提案
    const lastWiper = maintenanceRecords
      .filter(r => r.title.toLowerCase().includes('ワイパー'))
      .sort((a, b) => toMillis(b.date) - toMillis(a.date))[0];
    
    if (lastWiper) {
      // 履歴ベース
      const monthsSinceChange = getMonthsSince(new Date(toMillis(lastWiper.date)));
      const dueInMonths = BASELINE_SCHEDULE.wiper.monthsInterval - monthsSinceChange;
      
      if (dueInMonths <= BASELINE_SCHEDULE.wiper.warningMonths) {
        suggestions.push({
          id: 'wiper',
          title: 'ワイパーゴム交換',
          icon: '🌧️',
          dueInDays: Math.max(0, dueInMonths * 30),
          onClick: () => onCreateFromTemplate('wiper')
        });
      }
    } else {
      // 履歴なし - ベースラインスケジュール（時間ベースのみ）
      const dueInMonths = BASELINE_SCHEDULE.wiper.monthsInterval - (monthsSinceStart % BASELINE_SCHEDULE.wiper.monthsInterval);
      
      if (dueInMonths <= BASELINE_SCHEDULE.wiper.warningMonths) {
        suggestions.push({
          id: 'wiper',
          title: 'ワイパーゴム交換',
          icon: '🌧️',
          dueInDays: Math.max(0, dueInMonths * 30),
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
      
      {/* ODO未登録の警告 */}
      {!car.odoKm && suggestions.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            ⚠️ 走行距離（ODO）を登録すると、より正確なメンテナンス提案ができます
          </p>
        </div>
      )}
      
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
                <div className="text-gray-500 italic mt-1">
                  ※部品・費用は車種により異なります
                </div>
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

