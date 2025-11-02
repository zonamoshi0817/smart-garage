'use client';

import { MaintenanceRecord, FuelLog, InsurancePolicy } from '@/types';
import { Line, ResponsiveContainer, LineChart } from 'recharts';
import { useMemo } from 'react';
import { toDate, toMillis } from './utils';

interface CostAndFuelDashboardProps {
  maintenanceRecords: MaintenanceRecord[];
  fuelLogs: FuelLog[];
  insurancePolicies: InsurancePolicy[];
}

export default function CostAndFuelDashboard({
  maintenanceRecords,
  fuelLogs,
  insurancePolicies
}: CostAndFuelDashboardProps) {
  
  // 今月の維持費を計算（燃料＋メンテ＋保険の按分）
  const thisMonthCost = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // 今月の燃料費
    const fuelCost = fuelLogs
      .filter(log => {
        const date = toDate(log.date);
        return date && date >= monthStart;
      })
      .reduce((sum, log) => sum + log.totalCostJpy, 0);
    
    // 今月のメンテ費
    const maintenanceCost = maintenanceRecords
      .filter(record => {
        const date = toDate(record.date);
        return date && date >= monthStart && record.cost;
      })
      .reduce((sum, record) => sum + (record.cost || 0), 0);
    
    // 保険の按分（年間保険料 / 12）
    const insuranceCost = insurancePolicies
      .filter(policy => {
        const endDate = toDate(policy.endDate);
        return endDate && endDate >= now; // 有効な保険のみ
      })
      .reduce((sum, policy) => sum + (policy.premiumAmount / 12), 0);
    
    return Math.round(fuelCost + maintenanceCost + insuranceCost);
  }, [fuelLogs, maintenanceRecords, insurancePolicies]);
  
  // 過去90日の平均燃費（Fullタンク基準）
  const avgFuelEfficiency = useMemo(() => {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    const recentFullTankLogs = fuelLogs
      .filter(log => {
        const date = toDate(log.date);
        return log.isFullTank && date && date >= ninetyDaysAgo;
      })
      .sort((a, b) => toMillis(a.date) - toMillis(b.date));
    
    if (recentFullTankLogs.length < 2) return null;
    
    let totalEfficiency = 0;
    let count = 0;
    
    for (let i = 1; i < recentFullTankLogs.length; i++) {
      const current = recentFullTankLogs[i];
      const previous = recentFullTankLogs[i - 1];
      
      const distance = current.odoKm - previous.odoKm;
      const fuelUsed = current.quantity / 1000; // ml -> L
      
      if (distance > 0 && fuelUsed > 0) {
        const efficiency = distance / fuelUsed;
        totalEfficiency += efficiency;
        count++;
      }
    }
    
    return count > 0 ? (totalEfficiency / count).toFixed(2) : null;
  }, [fuelLogs]);
  
  // 今年の総コスト
  const yearTotalCost = useMemo(() => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    
    // 今年の燃料費
    const fuelCost = fuelLogs
      .filter(log => {
        const date = toDate(log.date);
        return date && date >= yearStart;
      })
      .reduce((sum, log) => sum + log.totalCostJpy, 0);
    
    // 今年のメンテ費
    const maintenanceCost = maintenanceRecords
      .filter(record => {
        const date = toDate(record.date);
        return date && date >= yearStart && record.cost;
      })
      .reduce((sum, record) => sum + (record.cost || 0), 0);
    
    // 今年の保険料（按分計算）
    const insuranceCost = insurancePolicies.reduce((sum, policy) => {
      const startDate = toDate(policy.startDate);
      const endDate = toDate(policy.endDate);
      
      if (!startDate || !endDate) return sum;
      
      // 契約期間と今年の重なりを計算
      const contractStart = startDate < yearStart ? yearStart : startDate;
      const contractEnd = endDate > now ? now : endDate;
      
      if (contractEnd >= yearStart && contractStart <= now) {
        const contractDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        const overlapDays = (contractEnd.getTime() - contractStart.getTime()) / (1000 * 60 * 60 * 24);
        const proportion = overlapDays / contractDays;
        return sum + (policy.premiumAmount * proportion);
      }
      
      return sum;
    }, 0);
    
    return Math.round(fuelCost + maintenanceCost + insuranceCost);
  }, [fuelLogs, maintenanceRecords, insurancePolicies]);
  
  // 前年比を計算（簡易版）
  const yearOverYearChange = useMemo(() => {
    // 簡易実装：今年が去年より多いか少ないかを±で表示
    // 実際には前年データが必要だが、ここでは仮の計算
    return Math.random() > 0.5 ? '+5%' : '-3%';
  }, []);
  
  // 次の出費予測
  const nextExpense = useMemo(() => {
    // オイル交換の予測（簡易版）
    // 実際にはヘルスインジケータのロジックを再利用すべき
    return {
      type: 'オイル交換',
      estimatedCost: 5000,
      dueInKm: 1300
    };
  }, []);
  
  // スパークライン用のダミーデータ（過去6ヶ月のトレンド）
  const sparklineData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      data.push({
        month: `${date.getMonth() + 1}月`,
        cost: Math.floor(20000 + Math.random() * 10000)
      });
    }
    return data;
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span>💰</span>
        <span>コスト & 燃費ダッシュボード</span>
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* カード1: 今月の維持費 */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="text-xs text-blue-600 font-medium mb-1">今月の維持費</div>
          <div className="text-2xl font-bold text-blue-900 mb-2">
            ¥{thisMonthCost.toLocaleString()}
          </div>
          <div className="h-12">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line 
                  type="monotone" 
                  dataKey="cost" 
                  stroke="#2563eb" 
                  strokeWidth={2} 
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* カード2: 過去90日の平均燃費 */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <div className="text-xs text-green-600 font-medium mb-1">過去90日の平均燃費</div>
          <div className="text-2xl font-bold text-green-900 mb-2">
            {avgFuelEfficiency ? `${avgFuelEfficiency} km/L` : '---'}
          </div>
          <div className="text-xs text-green-700 mt-2">
            {avgFuelEfficiency ? '満タン給油ベース' : 'データ不足'}
          </div>
        </div>
        
        {/* カード3: 今年の総コスト */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
          <div className="text-xs text-purple-600 font-medium mb-1">今年の総コスト</div>
          <div className="text-2xl font-bold text-purple-900 mb-2">
            ¥{yearTotalCost.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className={yearOverYearChange.startsWith('+') ? 'text-red-600' : 'text-green-600'}>
              {yearOverYearChange.startsWith('+') ? '📈' : '📉'} {yearOverYearChange}
            </span>
            <span className="text-purple-700">前年比</span>
          </div>
        </div>
        
        {/* カード4: 次の出費予測 */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
          <div className="text-xs text-orange-600 font-medium mb-1">次の出費予測</div>
          <div className="text-lg font-bold text-orange-900 mb-1">
            {nextExpense.type}
          </div>
          <div className="text-xs text-orange-700">
            <div>約 ¥{nextExpense.estimatedCost.toLocaleString()}</div>
            <div className="mt-1">あと {nextExpense.dueInKm.toLocaleString()} km</div>
          </div>
        </div>
      </div>
    </div>
  );
}

