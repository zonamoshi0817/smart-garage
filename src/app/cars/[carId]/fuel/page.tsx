"use client";

import { useEffect, useState, useMemo, use as usePromise } from "react";
import { AppShell } from "@/components/common/AppChrome";
import type { Car, FuelLog } from "@/types";
import { watchCars } from "@/lib/cars";
import { watchFuelLogs, calculateAverageFuelEfficiency, getDisplayAmount, getDisplayCost } from "@/lib/fuelLogs";
import FuelLogModal from "@/components/modals/FuelLogModal";
import { Droplet, TrendingUp, Calendar, DollarSign, Gauge, Plus, ChevronRight, Filter } from "lucide-react";
import { Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Legend } from 'recharts';

type Props = { params: Promise<{ carId: string }> };

// 見出しの統一
function SectionHeader({ title, subtitle, right, size = 'md' }: { title: string; subtitle?: string; right?: React.ReactNode; size?: 'sm' | 'md' }) {
  const titleClass = size === 'sm'
    ? "text-sm font-medium text-gray-700"
    : "text-lg font-semibold text-gray-900";
  const subClass = size === 'sm'
    ? "text-xs text-gray-500"
    : "text-sm text-gray-500";
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <h2 className={titleClass}>{title}</h2>
        {subtitle && <p className={subClass}>{subtitle}</p>}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}

export default function FuelPage({ params }: Props) {
  const { carId } = usePromise(params);
  const [car, setCar] = useState<Car | null>(null);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterFullTank, setFilterFullTank] = useState<string>('all'); // 'all' | 'full' | 'partial'
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'cost' | 'odo'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const unsubCars = watchCars((cars) => setCar(cars.find((c) => c.id === carId) || null));
    const unsubFuel = watchFuelLogs(carId, (logs) => {
      setFuelLogs(logs);
    });
    return () => {
      unsubCars?.();
      unsubFuel?.();
    };
  }, [carId]);

  // 個別の給油ログの燃費を計算
  const calculateIndividualFuelEfficiency = (log: FuelLog, index: number) => {
    if (index === 0) return null; // 最新のログは燃費計算できない
    
    const previousLog = fuelLogs[index - 1];
    if (!previousLog || !log.isFullTank || !previousLog.isFullTank) return null;
    
    const distance = log.odoKm - previousLog.odoKm;
    const fuelUsed = log.quantity !== undefined 
      ? (log.unit === 'ml' ? log.quantity / 1000 : log.quantity)
      : (log.fuelAmount || 0);
    
    if (distance <= 0 || !fuelUsed || fuelUsed <= 0) return null;
    
    return Math.round((distance / fuelUsed) * 10) / 10;
  };

  // フィルター適用後の給油ログ
  const filteredFuelLogs = useMemo(() => {
    let filtered = fuelLogs;
    
    // 検索フィルター
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log => {
        const date = log.date?.toDate ? log.date.toDate() : new Date();
        const dateStr = date.toLocaleDateString('ja-JP');
        const { value: fuelAmount } = getDisplayAmount(log);
        const cost = getDisplayCost(log);
        const odoKm = log.odoKm?.toString() || '';
        
        return dateStr.includes(term) ||
               fuelAmount.toString().includes(term) ||
               cost.toString().includes(term) ||
               odoKm.includes(term);
      });
    }
    
    // 年フィルター
    if (filterYear !== 'all') {
      filtered = filtered.filter(log => {
        const date = log.date?.toDate ? log.date.toDate() : new Date();
        return date.getFullYear().toString() === filterYear;
      });
    }
    
    // 月フィルター
    if (filterMonth !== 'all' && filterYear !== 'all') {
      filtered = filtered.filter(log => {
        const date = log.date?.toDate ? log.date.toDate() : new Date();
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return monthKey === filterMonth;
      });
    }
    
    // 満タン/部分給油フィルター
    if (filterFullTank !== 'all') {
      filtered = filtered.filter(log => {
        if (filterFullTank === 'full') return log.isFullTank === true;
        if (filterFullTank === 'partial') return log.isFullTank === false;
        return true;
      });
    }
    
    // ソート
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          const dateA = a.date?.toDate ? a.date.toDate() : new Date();
          const dateB = b.date?.toDate ? b.date.toDate() : new Date();
          comparison = dateA.getTime() - dateB.getTime();
          break;
        case 'amount':
          const amountA = getDisplayAmount(a).value;
          const amountB = getDisplayAmount(b).value;
          comparison = amountA - amountB;
          break;
        case 'cost':
          const costA = getDisplayCost(a);
          const costB = getDisplayCost(b);
          comparison = costA - costB;
          break;
        case 'odo':
          const odoA = a.odoKm || 0;
          const odoB = b.odoKm || 0;
          comparison = odoA - odoB;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [fuelLogs, searchTerm, filterYear, filterMonth, filterFullTank, sortBy, sortOrder]);

  // ダッシュボード指標を計算
  const dashboardMetrics = useMemo(() => {
    const logsToUse = filteredFuelLogs.length > 0 ? filteredFuelLogs : fuelLogs;
    
    if (logsToUse.length === 0) {
      return {
        avgEfficiency: null,
        thisMonthCost: 0,
        thisMonthCount: 0,
        totalCost: 0,
        bestEfficiency: null,
        worstEfficiency: null,
      };
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const thisMonthLogs = logsToUse.filter(log => {
      const date = log.date?.toDate ? log.date.toDate() : undefined;
      return date && date >= monthStart;
    });

    const thisMonthCost = thisMonthLogs.reduce((sum, log) => {
      return sum + getDisplayCost(log);
    }, 0);

    const totalCost = logsToUse.reduce((sum, log) => {
      return sum + getDisplayCost(log);
    }, 0);

    const avgEfficiency = calculateAverageFuelEfficiency(logsToUse);

    // 最良・最悪の燃費を計算
    const efficiencies: number[] = [];
    logsToUse.forEach((log, index) => {
      const efficiency = calculateIndividualFuelEfficiency(log, index);
      if (efficiency) efficiencies.push(efficiency);
    });

    return {
      avgEfficiency,
      thisMonthCost,
      thisMonthCount: thisMonthLogs.length,
      totalCost,
      bestEfficiency: efficiencies.length > 0 ? Math.max(...efficiencies) : null,
      worstEfficiency: efficiencies.length > 0 ? Math.min(...efficiencies) : null,
    };
  }, [filteredFuelLogs, fuelLogs]);

  // グラフ用データの準備
  const chartData = useMemo(() => {
    const logsToUse = filteredFuelLogs.length > 0 ? filteredFuelLogs : fuelLogs;
    const data: Array<{
      date: string;
      fullDate: Date;
      efficiency: number;
      cost: number;
      odoKm: number;
    }> = [];

    // 満タン給油のペアを見つけて燃費を計算
    for (let i = 1; i < logsToUse.length; i++) {
      const currentLog = logsToUse[i];
      const prevLog = logsToUse[i - 1];
      
      if (currentLog.isFullTank && prevLog.isFullTank) {
        const efficiency = calculateIndividualFuelEfficiency(currentLog, i);
        if (efficiency) {
          const date = currentLog.date?.toDate ? currentLog.date.toDate() : new Date();
          const cost = getDisplayCost(currentLog);
          
          data.push({
            date: date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
            fullDate: date,
            efficiency,
            cost,
            odoKm: currentLog.odoKm || 0,
          });
        }
      }
    }

    return data.slice(-12); // 最新12件
  }, [filteredFuelLogs, fuelLogs]);

  // 月別統計データ
  const monthlyStats = useMemo(() => {
    const logsToUse = filteredFuelLogs.length > 0 ? filteredFuelLogs : fuelLogs;
    const monthlyMap = new Map<string, { cost: number; count: number; efficiency: number[] }>();
    
    logsToUse.forEach((log, index) => {
      const date = log.date?.toDate ? log.date.toDate() : new Date();
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { cost: 0, count: 0, efficiency: [] });
      }
      
      const monthData = monthlyMap.get(monthKey)!;
      monthData.cost += getDisplayCost(log);
      monthData.count += 1;
      
      const efficiency = calculateIndividualFuelEfficiency(log, index);
      if (efficiency) monthData.efficiency.push(efficiency);
    });

    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        cost: data.cost,
        count: data.count,
        avgEfficiency: data.efficiency.length > 0 
          ? Math.round((data.efficiency.reduce((a, b) => a + b, 0) / data.efficiency.length) * 10) / 10
          : null,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // 最新6ヶ月
  }, [filteredFuelLogs, fuelLogs]);

  // 利用可能な年月のリスト
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    fuelLogs.forEach(log => {
      const date = log.date?.toDate ? log.date.toDate() : new Date();
      months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(months).sort().reverse();
  }, [fuelLogs]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    fuelLogs.forEach(log => {
      const date = log.date?.toDate ? log.date.toDate() : new Date();
      years.add(date.getFullYear().toString());
    });
    return Array.from(years).sort().reverse();
  }, [fuelLogs]);

  return (
    <AppShell activeCarId={car?.id}>
      <div className="space-y-4 sm:space-y-6">
        {/* ヘッダー */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">給油記録</h1>
            {car && <p className="text-sm text-gray-600 mt-1">{car.name}</p>}
          </div>
          {car && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 shadow-md transition-all duration-200 hover:shadow-lg"
            >
              <Plus className="w-4 h-4" />
              給油を追加
            </button>
          )}
        </div>

        {/* フィルター・検索 */}
        {fuelLogs.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 検索 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  検索
                </label>
                <input
                  type="text"
                  placeholder="日付、給油量、金額、走行距離で検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
                />
              </div>

              {/* 年フィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  年
                </label>
                <select
                  value={filterYear}
                  onChange={(e) => {
                    setFilterYear(e.target.value);
                    setFilterMonth('all');
                  }}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
                >
                  <option value="all">すべての年</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}年</option>
                  ))}
                </select>
              </div>

              {/* 月フィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  月
                </label>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
                  disabled={filterYear === 'all'}
                >
                  <option value="all">すべての月</option>
                  {filterYear !== 'all' && availableMonths
                    .filter(m => m.startsWith(filterYear))
                    .map(month => {
                      const [, m] = month.split('-');
                      return (
                        <option key={month} value={month}>
                          {parseInt(m)}月
                        </option>
                      );
                    })}
                </select>
              </div>

              {/* 給油タイプフィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  給油タイプ
                </label>
                <select
                  value={filterFullTank}
                  onChange={(e) => setFilterFullTank(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
                >
                  <option value="all">すべて</option>
                  <option value="full">満タンのみ</option>
                  <option value="partial">部分給油のみ</option>
                </select>
              </div>
            </div>

            {/* ソートオプション */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">並び順:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'cost' | 'odo')}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="date">実施日</option>
                  <option value="amount">給油量</option>
                  <option value="cost">金額</option>
                  <option value="odo">走行距離</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-1 rounded hover:bg-gray-100 transition"
                  title={sortOrder === 'asc' ? '昇順' : '降順'}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
              
              <div className="text-sm text-gray-600">
                {filteredFuelLogs.length}件の給油記録
              </div>
            </div>
          </div>
        )}

        {/* ダッシュボード指標 */}
        {fuelLogs.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Gauge className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-xs text-gray-600 font-medium">平均燃費</div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">
                {dashboardMetrics.avgEfficiency ? `${dashboardMetrics.avgEfficiency} km/L` : '---'}
              </div>
              {dashboardMetrics.bestEfficiency && dashboardMetrics.worstEfficiency && (
                <div className="text-xs text-gray-500 mt-1">
                  最高 {dashboardMetrics.bestEfficiency} / 最低 {dashboardMetrics.worstEfficiency}
                </div>
              )}
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-xs text-gray-600 font-medium">今月の燃料費</div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">
                ¥{dashboardMetrics.thisMonthCost.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">{dashboardMetrics.thisMonthCount}回の給油</div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-xs text-gray-600 font-medium">累計燃料費</div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">
                ¥{dashboardMetrics.totalCost.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">{filteredFuelLogs.length || fuelLogs.length}件の記録</div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                </div>
                <div className="text-xs text-gray-600 font-medium">給油回数</div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">
                {filteredFuelLogs.length || fuelLogs.length}
              </div>
              <div className="text-xs text-gray-500 mt-1">満タン: {filteredFuelLogs.filter(l => l.isFullTank).length || fuelLogs.filter(l => l.isFullTank).length}回</div>
            </div>
          </div>
        )}

        {/* グラフセクション */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
            <SectionHeader 
              title="燃費推移" 
              subtitle="最新12回の満タン給油の燃費"
              size="md"
            />
            <div className="mt-4 h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    label={{ value: 'km/L', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend />
                  <Bar 
                    yAxisId="left"
                    dataKey="efficiency" 
                    fill="#3b82f6" 
                    name="燃費 (km/L)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="efficiency" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                    name="平均線"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 月別統計グラフ */}
        {monthlyStats.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
            <SectionHeader 
              title="月別燃料費" 
              subtitle="最新6ヶ月の燃料費推移"
              size="md"
            />
            <div className="mt-4 h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => {
                      const [, m] = value.split('-');
                      return `${parseInt(m)}月`;
                    }}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    label={{ value: '円', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    label={{ value: 'km/L', angle: 90, position: 'insideRight' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === '燃料費') return `¥${value.toLocaleString()}`;
                      if (name === '平均燃費') return `${value} km/L`;
                      return value;
                    }}
                  />
                  <Legend />
                  <Bar 
                    yAxisId="left"
                    dataKey="cost" 
                    fill="#3b82f6" 
                    name="燃料費"
                    radius={[4, 4, 0, 0]}
                  />
                  {monthlyStats.some(m => m.avgEfficiency !== null) && (
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="avgEfficiency" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ fill: '#10b981', r: 4 }}
                      name="平均燃費"
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 給油記録リスト */}
        <div>
          <SectionHeader 
            title="給油履歴" 
            size="md"
          />
          
          {(filteredFuelLogs.length || fuelLogs.length) === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Droplet className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {fuelLogs.length === 0 
                  ? '給油記録がありません' 
                  : 'フィルター条件に一致する給油記録がありません'}
              </h3>
              <p className="text-gray-600 mb-6">
                {fuelLogs.length === 0 
                  ? '給油を記録して、燃費やコストを管理しましょう'
                  : 'フィルター条件を変更して再度お試しください。'}
              </p>
              {car && (
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 shadow-md transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  最初の給油を記録
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="divide-y divide-gray-100">
                {(filteredFuelLogs.length > 0 ? filteredFuelLogs : fuelLogs).map((log, index) => {
                  const { value: fuelAmount, unit: fuelUnit } = getDisplayAmount(log);
                  const cost = getDisplayCost(log);
                  const pricePerLiter = fuelAmount > 0 ? Math.round(cost / fuelAmount) : 0;
                  const actualIndex = filteredFuelLogs.length > 0 
                    ? fuelLogs.findIndex(l => l.id === log.id)
                    : index;
                  const efficiency = calculateIndividualFuelEfficiency(log, actualIndex);
                  const date = log.date?.toDate ? log.date.toDate() : new Date();
                  
                  return (
                    <div 
                      key={log.id} 
                      className="p-4 sm:p-5 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 sm:gap-3 mb-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <div className="text-base sm:text-lg font-semibold text-gray-900">
                                {date.toLocaleDateString('ja-JP', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </div>
                            </div>
                            {log.isFullTank && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                                満タン
                              </span>
                            )}
                            {efficiency && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                                <Gauge className="w-3 h-3 mr-1" />
                                {efficiency} km/L
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-sm">
                            <div className="flex items-center gap-2 text-gray-700">
                              <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                <span className="text-xs">📏</span>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500">走行距離</div>
                                <div className="font-semibold text-gray-900">{log.odoKm?.toLocaleString()} km</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-gray-700">
                              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Droplet className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="text-xs text-gray-500">給油量</div>
                                <div className="font-semibold text-gray-900">{fuelAmount.toFixed(1)} {fuelUnit}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-gray-700">
                              <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                                <DollarSign className="w-4 h-4 text-green-600" />
                              </div>
                              <div>
                                <div className="text-xs text-gray-500">金額</div>
                                <div className="font-semibold text-gray-900">¥{cost.toLocaleString()}</div>
                              </div>
                            </div>
                            {pricePerLiter > 0 && (
                              <div className="flex items-center gap-2 text-gray-700">
                                <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                                  <TrendingUp className="w-4 h-4 text-purple-600" />
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500">単価</div>
                                  <div className="font-semibold text-gray-900">¥{pricePerLiter.toLocaleString()}/L</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {car && (
        <FuelLogModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          car={car}
          onSuccess={() => {}}
        />
      )}
    </AppShell>
  );
}


