import React from 'react';

interface HistoryItemProps {
  record: any;
  carName?: string;
  onClick: () => void;
  onEdit: () => void;
  className?: string;
}

export default function HistoryItem({ 
  record, 
  carName, 
  onClick, 
  onEdit,
  className = ""
}: HistoryItemProps) {
  
  const getMaintenanceIcon = (title: string) => {
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
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const icon = getMaintenanceIcon(record.title);

  return (
    <div 
      className={`group bg-white border border-gray-200 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md hover:border-gray-300 ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          {/* アイコン */}
          <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
            {icon}
          </div>
          
          {/* メインコンテンツ */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {record.title}
              </h3>
              
              {/* 編集ボタン（ホバー時のみ表示） */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-blue-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
            
            {/* メタ情報 */}
            <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
              <span>{formatDate(record.date)}</span>
              {record.mileage && (
                <span>{record.mileage.toLocaleString()}km</span>
              )}
              {record.cost && (
                <span className="font-medium text-gray-900">¥{record.cost.toLocaleString()}</span>
              )}
            </div>
            
            {/* 車両名と場所 */}
            <div className="mt-1 flex items-center space-x-3 text-xs text-gray-500">
              {carName && (
                <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                  {carName}
                </span>
              )}
              {record.location && (
                <span>@ {record.location}</span>
              )}
            </div>
            
            {/* 説明（省略表示） */}
            {record.description && (
              <p className="mt-2 text-xs text-gray-600 line-clamp-2">
                {record.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 給油ログ用の履歴アイテム
interface FuelLogItemProps {
  fuelLog: {
    id?: string;
    date: string | Date;
    odoKm: number;
    fuelAmount: number;
    cost: number;
    isFullTank?: boolean;
    memo?: string;
    carId: string;
  };
  carName?: string;
  onClick: () => void;
  onEdit: () => void;
  className?: string;
}

export function FuelLogItem({ 
  fuelLog, 
  carName, 
  onClick, 
  onEdit,
  className = ""
}: FuelLogItemProps) {
  
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getFuelEfficiency = () => {
    // 前回の給油からの燃費計算（実装は簡略化）
    return null; // 実際の実装では燃費を計算
  };

  return (
    <div 
      className={`group bg-white border border-gray-200 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md hover:border-gray-300 ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          {/* アイコン */}
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-lg">
            ⛽
          </div>
          
          {/* メインコンテンツ */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-medium text-gray-900">
                給油記録
              </h3>
              
              {/* 編集ボタン（ホバー時のみ表示） */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-blue-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
            
            {/* メタ情報 */}
            <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
              <span>{formatDate(fuelLog.date.toString())}</span>
              <span>{fuelLog.odoKm.toLocaleString()}km</span>
              <span>{fuelLog.fuelAmount}L</span>
              <span className="font-medium text-gray-900">¥{fuelLog.cost.toLocaleString()}</span>
            </div>
            
            {/* 車両名と場所 */}
            <div className="mt-1 flex items-center space-x-3 text-xs text-gray-500">
              {carName && (
                <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                  {carName}
                </span>
              )}
              {fuelLog.isFullTank && (
                <span className="bg-green-100 px-2 py-0.5 rounded text-green-700">
                  満タン
                </span>
              )}
              {fuelLog.memo && (
                <span className="text-gray-600">{fuelLog.memo}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
