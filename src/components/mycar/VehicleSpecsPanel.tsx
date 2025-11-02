'use client';

import { Car, MaintenanceRecord, FuelLog } from '@/types';
import { useMemo } from 'react';
import { toDate } from './utils';

// FuelLog後方互換ヘルパー
function getFuelQuantityInLiters(log: FuelLog): number {
  // 新フィールド優先、なければ旧フィールド
  if (log.quantity !== undefined) {
    return log.unit === 'ml' ? log.quantity / 1000 : log.quantity; // mlをLに変換
  }
  return log.fuelAmount || 0;
}

function getFuelTotalCost(log: FuelLog): number {
  return log.totalCostJpy ?? log.cost ?? 0;
}

// 各整備項目の理想サイクル定義（月数またはkm）
const IDEAL_MAINTENANCE_CYCLES: Record<string, { months?: number; km?: number }> = {
  'オイル交換': { months: 6, km: 5000 },
  'オイルフィルター': { months: 6, km: 5000 },
  'エアフィルター': { months: 12, km: 10000 },
  'エアコンフィルター': { months: 12, km: 10000 },
  'ブレーキパッド': { months: 24, km: 20000 },
  'ブレーキフルード': { months: 24, km: 20000 },
  'タイヤ': { months: 36, km: 40000 },
  'バッテリー': { months: 36 },
  'スパークプラグ': { months: 24, km: 20000 },
  'クーラント': { months: 24 },
  'ワイパー': { months: 12 },
  '車検': { months: 24 },
};

// 車種クラス係数（コスト効率補正用）
const CLASS_FACTORS: Record<string, number> = {
  '軽自動車': 0.7,
  'コンパクト': 0.85,
  'Cセグメント': 1.0,   // 基準
  'Dセグメント': 1.15,
  'ミニバン': 1.2,
  'SUV': 1.25,
  'スポーツ': 1.3,
  'スーパーカー': 1.8,
};

interface VehicleSpecsPanelProps {
  car: Car;
  maintenanceRecords: MaintenanceRecord[];
  fuelLogs: FuelLog[];
}

export default function VehicleSpecsPanel({ 
  car, 
  maintenanceRecords,
  fuelLogs
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
      const fuel = getFuelQuantityInLiters(fullTankLogs[i]);
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
    return fuelLogs.reduce((sum, log) => sum + getFuelTotalCost(log), 0);
  }, [fuelLogs]);

  // 総走行距離（給油記録から算出）
  const totalDistance = useMemo(() => {
    const sortedLogs = [...fuelLogs]
      .filter(log => log.odoKm && log.odoKm > 0)
      .sort((a, b) => (a.odoKm || 0) - (b.odoKm || 0));
    
    if (sortedLogs.length < 2) return 0;
    
    const firstOdo = sortedLogs[0].odoKm || 0;
    const lastOdo = sortedLogs[sortedLogs.length - 1].odoKm || 0;
    
    return lastOdo - firstOdo;
  }, [fuelLogs]);

  // km当たりのメンテナンスコスト
  const costPerKm = useMemo(() => {
    if (totalDistance === 0 || totalMaintenanceCost === 0) return 0;
    return totalMaintenanceCost / totalDistance;
  }, [totalDistance, totalMaintenanceCost]);

  // コスト効率スコア（車種クラス補正適用）
  const costEfficiencyScore = useMemo(() => {
    if (costPerKm === 0) return 100; // データなしの場合は100%
    
    // 車種クラス係数を取得（デフォルトは1.0 = Cセグメント）
    const classFactor = car.vehicleClass ? CLASS_FACTORS[car.vehicleClass] || 1.0 : 1.0;
    
    // 補正後のコスト効率 = 実コスト / クラス係数
    const costPerKmAdjusted = costPerKm / classFactor;
    
    // km当たり20円を基準（0点）、0円で100点
    // 例（Cセグメント）: ¥5/km → (1 - 5/20) × 100 = 75点
    // 例（スポーツ、係数1.3）: ¥13/km → ¥10/km補正 → (1 - 10/20) × 100 = 50点
    const score = Math.max((1 - costPerKmAdjusted / 20) * 100, 0);
    return Math.min(score, 100);
  }, [costPerKm, car.vehicleClass]);

  // メンテナンススコア（理想頻度との差分評価）
  const maintenanceScore = useMemo(() => {
    if (maintenanceRecords.length === 0) return 50; // データなし＝中立評価
    
    // 各メンテナンス項目の実績周期を計算
    const itemCycles = new Map<string, number[]>();
    
    // メンテナンス記録を日付順にソート
    const sortedRecords = [...maintenanceRecords].sort((a, b) => {
      const dateA = toDate(a.date)?.getTime() || 0;
      const dateB = toDate(b.date)?.getTime() || 0;
      return dateA - dateB;
    });
    
    // 各項目の実施間隔を計算
    sortedRecords.forEach((record, index) => {
      const matchedKey = Object.keys(IDEAL_MAINTENANCE_CYCLES).find(key => 
        record.title.includes(key)
      );
      
      if (!matchedKey) return; // 理想サイクルが定義されていない項目はスキップ
      
      if (index > 0) {
        // 同じ項目の前回実施を探す
        const prevRecord = sortedRecords
          .slice(0, index)
          .reverse()
          .find(r => r.title.includes(matchedKey));
        
        if (prevRecord) {
          const currentDate = toDate(record.date);
          const prevDate = toDate(prevRecord.date);
          
          if (currentDate && prevDate) {
            // 月数ベースの周期計算
            const monthsDiff = (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
            
            if (!itemCycles.has(matchedKey)) {
              itemCycles.set(matchedKey, []);
            }
            itemCycles.get(matchedKey)!.push(monthsDiff);
          }
        }
      }
    });
    
    // 各項目のスコアを計算
    let totalScore = 0;
    let itemCount = 0;
    
    itemCycles.forEach((cycles, itemKey) => {
      const ideal = IDEAL_MAINTENANCE_CYCLES[itemKey];
      if (!ideal || !ideal.months) return;
      
      // 平均実績周期
      const avgCycle = cycles.reduce((sum, c) => sum + c, 0) / cycles.length;
      
      // スコア計算：理想との差分が小さいほど高評価
      // スコア = 1 - |実績周期 - 理想周期| / 理想周期
      const deviation = Math.abs(avgCycle - ideal.months);
      const itemScore = Math.max(1 - (deviation / ideal.months), 0) * 100;
      
      totalScore += itemScore;
      itemCount++;
    });
    
    // 全項目の平均スコア
    if (itemCount === 0) {
      // 周期データがない場合は中立評価
      return 50;
    }
    
    return Math.min(totalScore / itemCount, 100);
  }, [maintenanceRecords]);

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
      {/* ヘッダー */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span>📊</span>
          <span>車両データ</span>
        </h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左パネル：基本スペック */}
        <div className="space-y-6">
          {/* 基本情報 */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-gray-400 rounded"></span>
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
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-gray-400 rounded"></span>
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
              />
              )}
            </div>
          </div>
          
          {/* メンテナンス統計 */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-gray-400 rounded"></span>
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
              />
            </div>
          </div>
        </div>
        
        {/* 右パネル：給油・コストデータ */}
        <div className="space-y-6">
          {/* 給油統計 */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-gray-400 rounded"></span>
              給油統計
            </h3>
            <div className="space-y-3">
              <DataRow 
                label="総給油回数" 
                value={`${fuelLogs.length}回`} 
              />
              <DataRow 
                label="総給油量" 
                value={`${fuelLogs.reduce((sum, log) => sum + getFuelQuantityInLiters(log), 0).toFixed(1)} L`} 
              />
              <DataRow 
                label="総燃料費" 
                value={`¥${totalFuelCost.toLocaleString()}`}
              />
              {averageFuelEfficiency && (
                <DataRow 
                  label="燃費評価" 
                  value={getFuelEfficiencyRating(parseFloat(averageFuelEfficiency))}
                />
              )}
            </div>
          </div>
          
          {/* コストサマリー */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-gray-400 rounded"></span>
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
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-1 h-6 bg-gray-400 rounded"></span>
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
                  />
                </div>
              </div>
            );
          })()}
          
          {/* パフォーマンス指標 */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-gray-400 rounded"></span>
              パフォーマンス評価
            </h3>
            <div className="space-y-4">
              <PerformanceBar 
                label="燃費効率" 
                value={averageFuelEfficiency ? Math.min(parseFloat(averageFuelEfficiency) / 20 * 100, 100) : 0}
                color="green"
              />
              <PerformanceBar 
                label="メンテナンス品質" 
                value={maintenanceScore}
                color="purple"
                subtitle={maintenanceRecords.length > 0 ? `理想周期との適合度` : '実績データなし'}
              />
              <PerformanceBar 
                label="コスト効率" 
                value={costEfficiencyScore}
                color="blue"
                subtitle={costPerKm > 0 ? `¥${costPerKm.toFixed(2)}/km${car.vehicleClass ? ` (${car.vehicleClass})` : ''}` : undefined}
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

// パフォーマンスバーコンポーネント
function PerformanceBar({ 
  label, 
  value, 
  color,
  subtitle
}: { 
  label: string; 
  value: number; 
  color: 'green' | 'purple' | 'blue';
  subtitle?: string;
}) {
  const colorClasses = {
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    blue: 'bg-blue-500'
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {subtitle && (
            <span className="text-xs text-gray-500 font-mono">{subtitle}</span>
          )}
        </div>
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

