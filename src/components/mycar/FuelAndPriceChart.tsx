'use client';

import { FuelLog } from '@/types';
import { useState, useMemo } from 'react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, ReferenceLine } from 'recharts';
import { toDate, toMillis } from './utils';

interface FuelAndPriceChartProps {
  fuelLogs: FuelLog[];
}

type ChartTab = 'efficiency' | 'price';

export default function FuelAndPriceChart({ fuelLogs }: FuelAndPriceChartProps) {
  const [activeTab, setActiveTab] = useState<ChartTab>('efficiency');
  
  // 燃費チャートデータ（満タン時のみ）
  const efficiencyChartData = useMemo(() => {
    const fullTankLogs = fuelLogs
      .filter(log => log.isFullTank)
      .sort((a, b) => toMillis(a.date) - toMillis(b.date));
    
    if (fullTankLogs.length < 2) return [];
    
    const data = [];
    for (let i = 1; i < fullTankLogs.length; i++) {
      const current = fullTankLogs[i];
      const previous = fullTankLogs[i - 1];
      
      const distance = current.odoKm - previous.odoKm;
      const fuelUsed = current.quantity / 1000; // ml -> L
      
      if (distance > 0 && fuelUsed > 0) {
        const efficiency = distance / fuelUsed;
        const date = toDate(current.date);
        if (date) {
          data.push({
            date: `${date.getMonth() + 1}/${date.getDate()}`,
            efficiency: Number(efficiency.toFixed(2)),
            odoKm: current.odoKm
          });
        }
      }
    }
    
    return data;
  }, [fuelLogs]);
  
  // 自己ベストの80%を目標ラインとして計算
  const efficiencyGoalLine = useMemo(() => {
    if (efficiencyChartData.length === 0) return null;
    const maxEfficiency = Math.max(...efficiencyChartData.map(d => d.efficiency));
    return maxEfficiency * 0.8;
  }, [efficiencyChartData]);
  
  // 単価チャートデータ
  const priceChartData = useMemo(() => {
    return fuelLogs
      .filter(log => log.pricePerUnit)
      .sort((a, b) => toMillis(a.date) - toMillis(b.date))
      .map(log => {
        const date = toDate(log.date);
        if (!date) return null;
        return {
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          price: log.pricePerUnit,
          odoKm: log.odoKm
        };
      })
      .filter((item): item is { date: string; price: number | undefined; odoKm: number } => item !== null);
  }, [fuelLogs]);
  
  // 単価の平均を目標ラインとして計算
  const priceAverageLine = useMemo(() => {
    if (priceChartData.length === 0) return null;
    const total = priceChartData.reduce((sum, d) => sum + (d.price || 0), 0);
    return total / priceChartData.length;
  }, [priceChartData]);

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span>📊</span>
          <span>燃費・単価チャート</span>
        </h2>
        
        {/* タブ切替 */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('efficiency')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'efficiency'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            燃費 (km/L)
          </button>
          <button
            onClick={() => setActiveTab('price')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'price'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            単価 (円/L)
          </button>
        </div>
      </div>
      
      {/* チャート表示エリア */}
      <div className="h-64">
        {activeTab === 'efficiency' ? (
          efficiencyChartData.length >= 2 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={efficiencyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)} km/L`, '燃費']}
                />
                {efficiencyGoalLine && (
                  <ReferenceLine 
                    y={efficiencyGoalLine} 
                    stroke="#f59e0b" 
                    strokeDasharray="5 5"
                    label={{ 
                      value: '目標ライン (自己ベスト80%)', 
                      position: 'insideTopRight',
                      style: { fontSize: '10px', fill: '#f59e0b' }
                    }}
                  />
                )}
                <Line 
                  type="monotone" 
                  dataKey="efficiency" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p>燃費データが不足しています</p>
                <p className="text-sm mt-2">満タン給油を2回以上記録してください</p>
              </div>
            </div>
          )
        ) : (
          priceChartData.length >= 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [`¥${value.toFixed(2)}/L`, '単価']}
                />
                {priceAverageLine && (
                  <ReferenceLine 
                    y={priceAverageLine} 
                    stroke="#10b981" 
                    strokeDasharray="5 5"
                    label={{ 
                      value: '平均単価', 
                      position: 'insideTopRight',
                      style: { fontSize: '10px', fill: '#10b981' }
                    }}
                  />
                )}
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p>単価データがありません</p>
                <p className="text-sm mt-2">給油記録に単価を入力してください</p>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

