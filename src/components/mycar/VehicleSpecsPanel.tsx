'use client';

import { Car, MaintenanceRecord, FuelLog, Customization } from '@/types';
import { useMemo, useState } from 'react';
import { toDate } from './utils';

interface VehicleSpecsPanelProps {
  car: Car;
  maintenanceRecords: MaintenanceRecord[];
  fuelLogs: FuelLog[];
  customizations: Customization[];
}

export default function VehicleSpecsPanel({ 
  car, 
  maintenanceRecords,
  fuelLogs,
  customizations
}: VehicleSpecsPanelProps) {
  
  // 平均燃費を計算
  const averageFuelEfficiency = useMemo(() => {
    const fullTankLogs = fuelLogs
      .filter(log => log.isFullTank)
      .sort((a, b) => (a.odoKm || 0) - (b.odoKm || 0));
    
    if (fullTankLogs.length < 2) return null;
    
    let totalDistance = 0;
    let totalFuel = 0;
    
    for (let i = 1; i < fullTankLogs.length; i++) {
      const distance = fullTankLogs[i].odoKm - fullTankLogs[i - 1].odoKm;
      const fuel = (fullTankLogs[i].quantity || 0) / 1000;
      if (distance > 0 && fuel > 0) {
        totalDistance += distance;
        totalFuel += fuel;
      }
    }
    
    return totalFuel > 0 ? (totalDistance / totalFuel).toFixed(2) : null;
  }, [fuelLogs]);
  
  // 月間平均走行距離
  const monthlyAverageKm = car.avgKmPerMonth || 0;
  
  // 最終メンテナンスからの経過
  const daysSinceLastMaintenance = useMemo(() => {
    if (maintenanceRecords.length === 0) return null;
    const latest = maintenanceRecords.sort((a, b) => 
      (toDate(b.date)?.getTime() || 0) - (toDate(a.date)?.getTime() || 0)
    )[0];
    const date = toDate(latest.date);
    if (!date) return null;
    return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  }, [maintenanceRecords]);
  
  // 総メンテナンスコスト
  const totalMaintenanceCost = useMemo(() => {
    return maintenanceRecords.reduce((sum, record) => sum + (record.cost || 0), 0);
  }, [maintenanceRecords]);
  
  // 総給油コスト
  const totalFuelCost = useMemo(() => {
    return fuelLogs.reduce((sum, log) => sum + (log.totalCostJpy || log.cost || 0), 0);
  }, [fuelLogs]);
  
  // カスタマイズをカテゴリ別に集計
  const customizationsByCategory = useMemo(() => {
    const categories = {
      engine: [] as Customization[],
      exhaust: [] as Customization[],
      intake: [] as Customization[],
      suspension: [] as Customization[],
      brake: [] as Customization[],
      tire_wheel: [] as Customization[],
      exterior: [] as Customization[],
      interior: [] as Customization[],
      electrical: [] as Customization[],
      ecu: [] as Customization[],
      drivetrain: [] as Customization[],
      other: [] as Customization[]
    };
    
    customizations
      .filter(c => c.status === 'installed') // インストール済みのみ
      .forEach(custom => {
        custom.categories.forEach(cat => {
          if (cat in categories) {
            categories[cat as keyof typeof categories].push(custom);
          }
        });
      });
    
    return categories;
  }, [customizations]);
  
  // カテゴリ別の表示名
  const categoryLabels = {
    engine: { name: 'エンジン', subcategories: ['ピストン', 'カムシャフト', 'ターボ', 'インタークーラー'] },
    exhaust: { name: '排気系', subcategories: ['マフラー', 'エキマニ', '触媒'] },
    intake: { name: '吸気系', subcategories: ['エアクリーナー', 'インテークパイプ', 'スロットル'] },
    suspension: { name: 'サスペンション', subcategories: ['ショック', 'スプリング', 'アーム', 'スタビライザー'] },
    brake: { name: 'ブレーキ', subcategories: ['パッド', 'ローター', 'キャリパー', 'ブレーキライン'] },
    tire_wheel: { name: 'ホイール・タイヤ', subcategories: ['ホイール', 'タイヤ', 'ナット'] },
    exterior: { name: 'エクステリア', subcategories: ['エアロ', 'ウィング', 'ボンネット', 'ライト'] },
    interior: { name: 'インテリア', subcategories: ['シート', 'ハンドル', 'シフトノブ', 'メーター'] },
    electrical: { name: '電装系', subcategories: ['バッテリー', 'オルタネーター', 'イグニッション'] },
    ecu: { name: 'ECU', subcategories: ['ECU', 'サブコン', 'ハーネス'] },
    drivetrain: { name: '駆動系', subcategories: ['クラッチ', 'LSD', 'デフ', 'ドライブシャフト'] },
    other: { name: 'その他', subcategories: [] }
  };
  
  // 開閉状態を管理
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
      {/* ヘッダー */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span>📊</span>
          <span>車両データ</span>
        </h2>
        <p className="text-gray-500 text-sm mt-1">Vehicle Performance & Statistics</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左パネル：基本スペック */}
        <div className="space-y-6">
          {/* 基本情報 */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h3 className="text-lg font-bold text-blue-700 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-500 rounded"></span>
              基本情報
            </h3>
            <div className="space-y-3">
              <DataRow label="車名" value={car.name} highlight />
              <DataRow label="型式" value={car.modelCode || '---'} />
              <DataRow label="年式" value={car.year ? `${car.year}年` : '---'} />
              <DataRow label="初年度登録" value={car.firstRegYm || '---'} />
            </div>
          </div>
          
          {/* 走行データ */}
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <h3 className="text-lg font-bold text-green-700 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-green-500 rounded"></span>
              走行データ
            </h3>
            <div className="space-y-3">
              <DataRow 
                label="現在走行距離" 
                value={car.odoKm ? `${car.odoKm.toLocaleString()} km` : '---'} 
                highlight 
              />
              <DataRow 
                label="月間平均" 
                value={monthlyAverageKm ? `${monthlyAverageKm.toLocaleString()} km/月` : '---'} 
              />
              <DataRow 
                label="年間推定" 
                value={monthlyAverageKm ? `${(monthlyAverageKm * 12).toLocaleString()} km/年` : '---'} 
              />
              {averageFuelEfficiency && (
              <DataRow 
                label="平均燃費" 
                value={`${averageFuelEfficiency} km/L`}
                valueColor="text-green-600"
              />
              )}
            </div>
          </div>
          
          {/* メンテナンス統計 */}
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <h3 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-purple-500 rounded"></span>
              メンテナンス統計
            </h3>
            <div className="space-y-3">
              <DataRow 
                label="総メンテナンス回数" 
                value={`${maintenanceRecords.length}回`} 
              />
              <DataRow 
                label="最終メンテナンス" 
                value={daysSinceLastMaintenance !== null ? `${daysSinceLastMaintenance}日前` : '---'} 
              />
              <DataRow 
                label="総メンテナンス費" 
                value={`¥${totalMaintenanceCost.toLocaleString()}`}
                valueColor="text-purple-600"
              />
            </div>
          </div>
        </div>
        
        {/* 右パネル：給油・コストデータ */}
        <div className="space-y-6">
          {/* 給油統計 */}
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
            <h3 className="text-lg font-bold text-orange-700 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-orange-500 rounded"></span>
              給油統計
            </h3>
            <div className="space-y-3">
              <DataRow 
                label="総給油回数" 
                value={`${fuelLogs.length}回`} 
              />
              <DataRow 
                label="総給油量" 
                value={`${fuelLogs.reduce((sum, log) => sum + ((log.quantity || 0) / 1000 || log.fuelAmount || 0), 0).toFixed(1)} L`} 
              />
              <DataRow 
                label="総燃料費" 
                value={`¥${totalFuelCost.toLocaleString()}`}
                valueColor="text-orange-600"
              />
              {averageFuelEfficiency && (
                <DataRow 
                  label="燃費評価" 
                  value={getFuelEfficiencyRating(parseFloat(averageFuelEfficiency))}
                  valueColor={getFuelEfficiencyColor(parseFloat(averageFuelEfficiency))}
                />
              )}
            </div>
          </div>
          
          {/* コストサマリー */}
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <h3 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-red-500 rounded"></span>
              コストサマリー
            </h3>
            <div className="space-y-3">
              <DataRow 
                label="総維持費" 
                value={`¥${(totalMaintenanceCost + totalFuelCost).toLocaleString()}`}
                highlight
              />
              <DataRow 
                label="燃料費割合" 
                value={`${((totalFuelCost / (totalMaintenanceCost + totalFuelCost)) * 100).toFixed(1)}%`}
              />
              <DataRow 
                label="メンテナンス費割合" 
                value={`${((totalMaintenanceCost / (totalMaintenanceCost + totalFuelCost)) * 100).toFixed(1)}%`}
              />
            </div>
          </div>
          
          {/* 車検情報 */}
          {(() => {
            const inspectionDate = toDate(car.inspectionExpiry);
            if (!inspectionDate) return null;
            
            const daysRemaining = Math.ceil((inspectionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            
            return (
              <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                <h3 className="text-lg font-bold text-yellow-700 mb-4 flex items-center gap-2">
                  <span className="w-1 h-6 bg-yellow-500 rounded"></span>
                  車検情報
                </h3>
                <div className="space-y-3">
                  <DataRow 
                    label="車検期限" 
                    value={inspectionDate.toLocaleDateString('ja-JP')} 
                  />
                  <DataRow 
                    label="残り日数" 
                    value={`${daysRemaining}日`}
                    valueColor={getInspectionColor(daysRemaining)}
                  />
                </div>
              </div>
            );
          })()}
        </div>
        
        {/* 中央パネル：カスタムパーツ */}
        <div className="space-y-6">
          {/* パーツリスト */}
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-4 border border-cyan-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-cyan-700 flex items-center gap-2">
                <span className="w-1 h-6 bg-cyan-500 rounded"></span>
                カスタムパーツ
              </h3>
              {customizations.filter(c => c.status === 'installed').length > 0 && (
                <button
                  onClick={() => {
                    if (expandedCategories.size > 0) {
                      setExpandedCategories(new Set());
                    } else {
                      setExpandedCategories(new Set(Object.keys(customizationsByCategory)));
                    }
                  }}
                  className="text-xs text-cyan-600 hover:text-cyan-800 font-semibold"
                >
                  {expandedCategories.size > 0 ? '全て閉じる' : '全て開く'}
                </button>
              )}
            </div>
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {Object.entries(customizationsByCategory).map(([category, items]) => {
                const hasCustom = items.length > 0;
                const categoryInfo = categoryLabels[category as keyof typeof categoryLabels];
                const isExpanded = expandedCategories.has(category);
                
                if (!categoryInfo) return null;
                
                return (
                  <PartAccordion
                    key={category}
                    category={category}
                    categoryInfo={categoryInfo}
                    parts={items}
                    isStock={!hasCustom}
                    isExpanded={isExpanded}
                    onToggle={() => toggleCategory(category)}
                  />
                );
              })}
            </div>
            {customizations.filter(c => c.status === 'installed').length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm mb-1">カスタムパーツなし</p>
                <p className="text-xs text-gray-400">全て純正パーツです</p>
              </div>
            )}
          </div>
          
          {/* パフォーマンス指標 */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
            <h3 className="text-lg font-bold text-indigo-700 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-indigo-500 rounded"></span>
              パフォーマンス評価
            </h3>
            <div className="space-y-4">
              <PerformanceBar 
                label="燃費効率" 
                value={averageFuelEfficiency ? Math.min(parseFloat(averageFuelEfficiency) / 20 * 100, 100) : 0}
                color="green"
              />
              <PerformanceBar 
                label="メンテナンス頻度" 
                value={Math.min((maintenanceRecords.length / 12) * 100, 100)}
                color="purple"
              />
              <PerformanceBar 
                label="コスト効率" 
                value={totalMaintenanceCost > 0 ? Math.max(100 - (totalMaintenanceCost / 100000) * 100, 0) : 100}
                color="blue"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// データ行コンポーネント
function DataRow({ 
  label, 
  value, 
  highlight = false,
  valueColor
}: { 
  label: string; 
  value: string; 
  highlight?: boolean;
  valueColor?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${highlight ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
        {label}
      </span>
      <span className={`font-mono ${highlight ? 'text-xl font-bold' : 'text-base font-bold'} ${valueColor || 'text-gray-900'}`}>
        {value}
      </span>
    </div>
  );
}

// パーツアコーディオンコンポーネント
function PartAccordion({
  category,
  categoryInfo,
  parts,
  isStock,
  isExpanded,
  onToggle
}: {
  category: string;
  categoryInfo: { name: string; subcategories: string[] };
  parts: Customization[];
  isStock: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-gray-200">
      {/* ヘッダー（クリック可能） */}
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center py-3 px-2 hover:bg-gray-50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">{categoryInfo.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {isStock ? (
            <span className="text-sm text-gray-500 italic">純正</span>
          ) : (
            <span className="text-xs bg-cyan-600 text-white px-2 py-0.5 rounded-full font-semibold">
              カスタム {parts.length}
            </span>
          )}
          <svg 
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      {/* 展開コンテンツ */}
      {isExpanded && (
        <div className="pb-3 px-2 space-y-2">
          {isStock ? (
            <div className="ml-8 text-sm text-gray-600 py-2">
              このカテゴリは全て純正パーツです
            </div>
          ) : (
            <div className="ml-8 space-y-3">
              {parts.map((part, index) => (
                <div key={part.id || index} className="bg-cyan-50 rounded-lg p-3 border border-cyan-200">
                  {/* パーツ名 */}
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-cyan-600 mt-0.5 font-bold">▸</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-cyan-700 mb-1">
                        {part.brand ? `${part.brand} ${part.modelCode || ''}` : part.title}
                      </div>
                      <div className="text-sm text-gray-700 font-semibold mb-1">
                        {part.title}
                      </div>
                    </div>
                  </div>
                  
                  {/* 詳細情報 */}
                  <div className="ml-6 space-y-1 text-xs text-gray-600">
                    {part.odoKm && (
                      <div>装着時走行距離: <span className="font-semibold text-gray-800">{part.odoKm.toLocaleString()} km</span></div>
                    )}
                    {part.vendorName && (
                      <div>施工: <span className="font-semibold text-gray-800">{part.vendorName}</span></div>
                    )}
                    {(part.partsCostJpy || part.laborCostJpy) && (
                      <div>
                        費用: <span className="font-semibold text-cyan-700">
                          ¥{((part.partsCostJpy || 0) + (part.laborCostJpy || 0)).toLocaleString()}
                        </span>
                        {part.partsCostJpy && part.laborCostJpy && (
                          <span className="text-gray-500"> (部品: ¥{part.partsCostJpy.toLocaleString()} / 工賃: ¥{part.laborCostJpy.toLocaleString()})</span>
                        )}
                      </div>
                    )}
                    {part.memo && (
                      <div className="mt-2 pt-2 border-t border-cyan-200">
                        <span className="text-gray-700">{part.memo}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// パフォーマンスバーコンポーネント
function PerformanceBar({ 
  label, 
  value, 
  color 
}: { 
  label: string; 
  value: number; 
  color: 'green' | 'purple' | 'blue' 
}) {
  const colorClasses = {
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    blue: 'bg-blue-500'
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-mono text-gray-900 font-bold">{value.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClasses[color]} transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ヘルパー関数
function getFuelEfficiencyRating(efficiency: number): string {
  if (efficiency >= 15) return 'S 優秀';
  if (efficiency >= 12) return 'A 良好';
  if (efficiency >= 10) return 'B 標準';
  if (efficiency >= 8) return 'C 要改善';
  return 'D 要注意';
}

function getFuelEfficiencyColor(efficiency: number): string {
  if (efficiency >= 15) return 'text-green-600';
  if (efficiency >= 12) return 'text-blue-600';
  if (efficiency >= 10) return 'text-yellow-600';
  if (efficiency >= 8) return 'text-orange-600';
  return 'text-red-600';
}

function getInspectionColor(days: number): string {
  if (days < 30) return 'text-red-600';
  if (days < 90) return 'text-orange-600';
  return 'text-green-600';
}

