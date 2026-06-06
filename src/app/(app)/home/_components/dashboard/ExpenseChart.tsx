"use client";

import { useMemo, useState } from "react";
import { Bar as RechartsBar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import type { MaintenanceRecord, FuelLog, Customization } from "@/types";
import { toDate } from "@/lib/dateUtils";

export function ExpenseChart({
  maintenanceRecords,
  fuelLogs,
  customizations,
}: {
  maintenanceRecords: MaintenanceRecord[];
  fuelLogs: FuelLog[];
  customizations: Customization[];
}) {
  const [expensePeriod, setExpensePeriod] = useState<'monthly' | 'yearly' | 'all'>('monthly');

  const expenseData = useMemo(() => {
    const now = new Date();
    
    if (expensePeriod === 'monthly') {
      // 月次: 過去6ヶ月のデータ
    const months = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('ja-JP', { month: 'long' });

      // その月のメンテナンス費用を計算
      const maintenanceCost = maintenanceRecords
        .filter(record => {
          const recordDate = toDate(record.date) || new Date();
          return recordDate.getFullYear() === date.getFullYear() && 
                 recordDate.getMonth() === date.getMonth();
        })
        .reduce((sum, record) => sum + (record.cost || 0), 0);
      
      // その月の給油費用を計算
      const fuelCost = fuelLogs
        .filter(log => {
          const logDate = toDate(log.date) || new Date();
          return logDate.getFullYear() === date.getFullYear() && 
                 logDate.getMonth() === date.getMonth();
        })
        .reduce((sum, log) => sum + (log.totalCostJpy || log.cost || 0), 0);
      
      // その月のカスタマイズ費用を計算
      const customizationCost = customizations
        .filter(custom => {
          const customDate = toDate(custom.date) || new Date();
          return customDate.getFullYear() === date.getFullYear() && 
                 customDate.getMonth() === date.getMonth();
        })
        .reduce((sum, custom) => {
          const partsCost = custom.partsCostJpy || 0;
          const laborCost = custom.laborCostJpy || 0;
          const otherCost = custom.otherCostJpy || 0;
          return sum + partsCost + laborCost + otherCost;
        }, 0);
      
      const totalCost = maintenanceCost + fuelCost + customizationCost;
      
      months.push({
        month: monthName,
        monthKey,
        maintenanceCost,
        fuelCost,
        customizationCost,
          cost: totalCost,
          cumulativeCost: 0
      });
    }
    
    // 累積費用を計算
    let cumulative = 0;
    months.forEach(month => {
      cumulative += month.cost;
      month.cumulativeCost = cumulative;
    });
    
    return months;
    } else if (expensePeriod === 'yearly') {
      // 年次: 過去3年のデータ
      const years = [];
      
      for (let i = 2; i >= 0; i--) {
        const year = now.getFullYear() - i;
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);
        
        // その年のメンテナンス費用を計算
        const maintenanceCost = maintenanceRecords
          .filter(record => {
            const recordDate = toDate(record.date) || new Date();
            return recordDate >= yearStart && recordDate <= yearEnd;
          })
          .reduce((sum, record) => sum + (record.cost || 0), 0);
        
        // その年の給油費用を計算
        const fuelCost = fuelLogs
          .filter(log => {
            const logDate = toDate(log.date) || new Date();
            return logDate >= yearStart && logDate <= yearEnd;
          })
          .reduce((sum, log) => sum + (log.totalCostJpy || log.cost || 0), 0);
        
        // その年のカスタマイズ費用を計算
        const customizationCost = customizations
          .filter(custom => {
            const customDate = toDate(custom.date) || new Date();
            return customDate >= yearStart && customDate <= yearEnd;
          })
          .reduce((sum, custom) => {
            const partsCost = custom.partsCostJpy || 0;
            const laborCost = custom.laborCostJpy || 0;
            const otherCost = custom.otherCostJpy || 0;
            return sum + partsCost + laborCost + otherCost;
          }, 0);
        
        const totalCost = maintenanceCost + fuelCost + customizationCost;
        
        years.push({
          month: `${year}年`,
          monthKey: `${year}`,
          maintenanceCost,
          fuelCost,
          customizationCost,
          cost: totalCost,
          cumulativeCost: 0
        });
      }
      
      // 累積費用を計算
      let cumulative = 0;
      years.forEach(year => {
        cumulative += year.cost;
        year.cumulativeCost = cumulative;
      });
      
      return years;
    } else {
      // 全期間: 全データを月次で集計
      const allMonths = new Map<string, {
        month: string;
        monthKey: string;
        maintenanceCost: number;
        fuelCost: number;
        customizationCost: number;
        cost: number;
        cumulativeCost: number;
        date: Date;
      }>();
      
      // 全データから年月を抽出
      [...maintenanceRecords, ...fuelLogs, ...customizations].forEach(item => {
        const itemDate = toDate((item as any).date) || new Date();
        const monthKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!allMonths.has(monthKey)) {
          const date = new Date(itemDate.getFullYear(), itemDate.getMonth(), 1);
          allMonths.set(monthKey, {
            month: date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' }),
            monthKey,
            maintenanceCost: 0,
            fuelCost: 0,
            customizationCost: 0,
            cost: 0,
            cumulativeCost: 0,
            date
          });
        }
      });
      
      // 各月の費用を計算
      allMonths.forEach((monthData, monthKey) => {
        const date = monthData.date;
        
        // メンテナンス費用
        monthData.maintenanceCost = maintenanceRecords
          .filter(record => {
            const recordDate = toDate(record.date) || new Date();
            return recordDate.getFullYear() === date.getFullYear() && 
                   recordDate.getMonth() === date.getMonth();
          })
          .reduce((sum, record) => sum + (record.cost || 0), 0);
        
        // 給油費用
        monthData.fuelCost = fuelLogs
          .filter(log => {
            const logDate = toDate(log.date) || new Date();
            return logDate.getFullYear() === date.getFullYear() && 
                   logDate.getMonth() === date.getMonth();
          })
          .reduce((sum, log) => sum + (log.totalCostJpy || log.cost || 0), 0);
        
        // カスタマイズ費用
        monthData.customizationCost = customizations
          .filter(custom => {
            const customDate = toDate(custom.date) || new Date();
            return customDate.getFullYear() === date.getFullYear() && 
                   customDate.getMonth() === date.getMonth();
          })
          .reduce((sum, custom) => {
            const partsCost = custom.partsCostJpy || 0;
            const laborCost = custom.laborCostJpy || 0;
            const otherCost = custom.otherCostJpy || 0;
            return sum + partsCost + laborCost + otherCost;
          }, 0);
        
        monthData.cost = monthData.maintenanceCost + monthData.fuelCost + monthData.customizationCost;
      });
      
      // 日付順にソート
      const sortedMonths = Array.from(allMonths.values()).sort((a, b) => 
        a.date.getTime() - b.date.getTime()
      );
      
      // 累積費用を計算
      let cumulative = 0;
      sortedMonths.forEach(month => {
        cumulative += month.cost;
        month.cumulativeCost = cumulative;
      });
      
      return sortedMonths;
    }
  }, [expensePeriod, maintenanceRecords, fuelLogs, customizations]);

  // 後方互換性のため、monthlyExpenseDataを維持
  const monthlyExpenseData = expenseData;

  return (
            <section className="w-full">
              <div className="app-card p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="app-section-title">
                    {expensePeriod === 'monthly' ? 'MONTHLY COST' : 
                     expensePeriod === 'yearly' ? 'YEARLY COST' : 
                     'ALL TIME COST'}
                  </h3>
                  <div className="flex gap-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.08em' }}>
                    <button 
                      onClick={() => setExpensePeriod('monthly')}
                      className="px-2 py-1 transition-colors"
                      style={expensePeriod === 'monthly'
                        ? { background: 'var(--accent)', color: '#f7f5f0' }
                        : { color: 'var(--text-muted)', background: 'transparent' }}
                    >
                      MON
                    </button>
                    <button 
                      onClick={() => setExpensePeriod('yearly')}
                      className="px-2 py-1 transition-colors"
                      style={expensePeriod === 'yearly'
                        ? { background: 'var(--accent)', color: '#f7f5f0' }
                        : { color: 'var(--text-muted)', background: 'transparent' }}
                    >
                      YR
                    </button>
                    <button 
                      onClick={() => setExpensePeriod('all')}
                      className="px-2 py-1 transition-colors"
                      style={expensePeriod === 'all'
                        ? { background: 'var(--accent)', color: '#f7f5f0' }
                        : { color: 'var(--text-muted)', background: 'transparent' }}
                    >
                      ALL
                    </button>
                </div>
                </div>
                {/* 要約値チップ（月次表示時のみ） */}
                {expensePeriod === 'monthly' && monthlyExpenseData.length > 0 && (() => {
                  const now = new Date();
                  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                  const currentMonthData = monthlyExpenseData.find(m => m.monthKey === currentMonthKey) || monthlyExpenseData[monthlyExpenseData.length - 1];
                  const previousMonthData = monthlyExpenseData[monthlyExpenseData.length - 2] || null;
                  const totalCost = currentMonthData.cost;
                  const diff = previousMonthData ? totalCost - previousMonthData.cost : 0;
                  return (
                    <div className="mb-4 flex flex-wrap gap-3">
                      <div className="app-stat-cell px-3 py-2">
                        <div className="text-xs mb-0.5" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>THIS MONTH</div>
                        <div className="text-xl font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>¥{totalCost.toLocaleString()}</div>
                      </div>
                      <div className="app-stat-cell px-3 py-2">
                        <div className="text-xs mb-0.5" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>BREAKDOWN</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          MNT: ¥{currentMonthData.maintenanceCost.toLocaleString()} / GAS: ¥{currentMonthData.fuelCost.toLocaleString()} / MOD: ¥{currentMonthData.customizationCost.toLocaleString()}
                        </div>
                      </div>
                      {previousMonthData && (
                        <div className="app-stat-cell px-3 py-2">
                          <div className="text-xs mb-0.5" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>VS PREV</div>
                          <div className="text-sm font-bold" style={{ fontFamily: 'var(--font-mono)', color: diff >= 0 ? '#c04020' : '#2a6a35' }}>
                            {diff >= 0 ? '+' : ''}¥{Math.abs(diff).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlyExpenseData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 10, fontFamily: 'Space Mono, monospace', fill: '#6a6a60' }}
                        axisLine={{ stroke: 'rgba(0,0,0,0.08)' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 10, fontFamily: 'Space Mono, monospace', fill: '#6a6a60' }}
                        axisLine={{ stroke: 'rgba(0,0,0,0.08)' }}
                        tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          const nameMap: { [key: string]: string } = {
                            'maintenanceCost': 'MNT',
                            'fuelCost': 'GAS',
                            'customizationCost': 'MOD',
                            'cumulativeCost': 'TOTAL'
                          };
                          return [`¥${value.toLocaleString()}`, nameMap[name] || name];
                        }}
                        labelFormatter={(label) => `${label}`}
                        contentStyle={{
                          backgroundColor: '#f7f5f0',
                          border: '0.5px solid rgba(0,0,0,0.15)',
                          borderRadius: '0',
                          fontFamily: 'Space Mono, monospace',
                          fontSize: '11px'
                        }}
                        filterNull={false}
                      />
                      <RechartsBar 
                        dataKey="maintenanceCost" 
                        fill="#1a1a18" 
                        radius={[0, 0, 0, 0]}
                        name="maintenanceCost"
                      />
                      <RechartsBar 
                        dataKey="fuelCost" 
                        fill="#6a6a60" 
                        radius={[0, 0, 0, 0]}
                        name="fuelCost"
                      />
                      <RechartsBar 
                        dataKey="customizationCost" 
                        fill="#a0a098" 
                        radius={[0, 0, 0, 0]}
                        name="customizationCost"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cumulativeCost" 
                        stroke="#f59e0b" 
                        strokeWidth={3}
                        dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                        name="cumulativeCost"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                
                {/* 凡例 */}
                <div className="mt-4 flex justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>メンテナンス費用</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>給油費用</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded"></div>
                    <span>カスタマイズ費用</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                    <span>累積費用</span>
                  </div>
                </div>
              </div>

            </section>
  );
}
