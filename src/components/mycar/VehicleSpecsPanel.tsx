'use client';

import { Car, MaintenanceRecord, FuelLog } from '@/types';
import { useMemo } from 'react';
import { toDate } from './utils';

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

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl p-6 border border-slate-700">
      {/* ヘッダー */}
      <div className="mb-6 pb-4 border-b border-slate-700">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>📊</span>
          <span>車両データ</span>
        </h2>
        <p className="text-slate-400 text-sm mt-1">Vehicle Performance & Statistics</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左パネル：基本スペック */}
        <div className="space-y-6">
          {/* 基本情報 */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-400 rounded"></span>
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
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-green-400 rounded"></span>
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
                  valueColor="text-green-300"
                />
              )}
            </div>
          </div>
          
          {/* メンテナンス統計 */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-purple-400 rounded"></span>
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
                valueColor="text-purple-300"
              />
            </div>
          </div>
        </div>
        
        {/* 右パネル：給油・コストデータ */}
        <div className="space-y-6">
          {/* 給油統計 */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-orange-400 rounded"></span>
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
                valueColor="text-orange-300"
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
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-red-400 rounded"></span>
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
          {car.inspectionExpiry && (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="text-lg font-bold text-yellow-400 mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-yellow-400 rounded"></span>
                車検情報
              </h3>
              <div className="space-y-3">
                <DataRow 
                  label="車検期限" 
                  value={toDate(car.inspectionExpiry)?.toLocaleDateString('ja-JP') || '---'} 
                />
                <DataRow 
                  label="残り日数" 
                  value={`${Math.ceil((toDate(car.inspectionExpiry)!.getTime() - Date.now()) / (1000 * 60 * 60 * 24))}日`}
                  valueColor={getInspectionColor(Math.ceil((toDate(car.inspectionExpiry)!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}
                />
              </div>
            </div>
          )}
          
          {/* パフォーマンス指標 */}
          <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-xl p-4 border border-blue-700">
            <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-cyan-400 rounded"></span>
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
  valueColor = 'text-slate-200'
}: { 
  label: string; 
  value: string; 
  highlight?: boolean;
  valueColor?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${highlight ? 'font-semibold text-slate-300' : 'text-slate-400'}`}>
        {label}
      </span>
      <span className={`font-mono ${highlight ? 'text-lg font-bold' : 'text-base font-semibold'} ${valueColor}`}>
        {value}
      </span>
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
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-mono text-slate-300">{value.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
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
  if (efficiency >= 15) return 'text-green-400';
  if (efficiency >= 12) return 'text-blue-400';
  if (efficiency >= 10) return 'text-yellow-400';
  if (efficiency >= 8) return 'text-orange-400';
  return 'text-red-400';
}

function getInspectionColor(days: number): string {
  if (days < 30) return 'text-red-400';
  if (days < 90) return 'text-orange-400';
  return 'text-green-400';
}

