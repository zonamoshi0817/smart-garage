"use client";

import { useState, useEffect } from "react";
import { watchFuelLogs, calculateFuelEfficiency, calculateMonthlyFuelCosts, calculateAverageFuelEfficiency } from "@/lib/fuelLogs";
import type { FuelLog, Car } from "@/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface FuelLogCardProps {
  car: Car;
}

export default function FuelLogCard({ car }: FuelLogCardProps) {
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!car.id) return;

    const unsubscribe = watchFuelLogs(car.id, (logs) => {
      setFuelLogs(logs);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [car.id]);

  const currentFuelEfficiency = calculateFuelEfficiency(fuelLogs);
  const averageFuelEfficiency = calculateAverageFuelEfficiency(fuelLogs);
  const monthlyCosts = calculateMonthlyFuelCosts(fuelLogs);

  // 最新の給油ログ
  const latestFuelLog = fuelLogs[0];

  // 月間ガソリン代のグラフデータ（直近6ヶ月）
  const chartData = monthlyCosts.slice(-6).map(item => ({
    month: item.month.slice(5), // MM形式
    cost: item.cost,
  }));

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">給油ログ</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">給油ログ</h3>
        <span className="text-sm text-gray-500">{fuelLogs.length}件の記録</span>
      </div>

      {fuelLogs.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">⛽</div>
          <p className="text-gray-500">給油ログがありません</p>
          <p className="text-sm text-gray-400">「給油を記録」ボタンから記録を開始しましょう</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 燃費情報 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">現在の燃費</div>
              <div className="text-2xl font-bold text-blue-900">
                {currentFuelEfficiency ? `${currentFuelEfficiency} km/L` : "-"}
              </div>
              <div className="text-xs text-blue-600">満タン間の燃費</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium">平均燃費</div>
              <div className="text-2xl font-bold text-green-900">
                {averageFuelEfficiency ? `${averageFuelEfficiency} km/L` : "-"}
              </div>
              <div className="text-xs text-green-600">全期間平均</div>
            </div>
          </div>

          {/* 最新の給油情報 */}
          {latestFuelLog && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 font-medium mb-2">最新の給油</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">日時:</span>
                  <span className="ml-2 font-medium">
                    {latestFuelLog.date.toLocaleDateString('ja-JP')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">走行距離:</span>
                  <span className="ml-2 font-medium">{latestFuelLog.odoKm.toLocaleString()} km</span>
                </div>
                <div>
                  <span className="text-gray-500">給油量:</span>
                  <span className="ml-2 font-medium">{latestFuelLog.fuelAmount} L</span>
                </div>
                <div>
                  <span className="text-gray-500">金額:</span>
                  <span className="ml-2 font-medium">¥{latestFuelLog.cost.toLocaleString()}</span>
                </div>
              </div>
              {latestFuelLog.isFullTank && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    満タン
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 月間ガソリン代グラフ */}
          {chartData.length > 0 && (
            <div>
              <div className="text-sm text-gray-600 font-medium mb-3">月間ガソリン代</div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${value}月`}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `¥${value}`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`¥${value.toLocaleString()}`, 'ガソリン代']}
                      labelFormatter={(label) => `${label}月`}
                    />
                    <Bar 
                      dataKey="cost" 
                      fill="#3B82F6" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 給油履歴（最新5件） */}
          {fuelLogs.length > 0 && (
            <div>
              <div className="text-sm text-gray-600 font-medium mb-3">最近の給油履歴</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {fuelLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">
                          {log.date.toLocaleDateString('ja-JP')}
                        </span>
                        {log.isFullTank && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            満タン
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {log.odoKm.toLocaleString()} km • {log.fuelAmount}L • ¥{log.cost.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        ¥{Math.round(log.cost / log.fuelAmount).toLocaleString()}/L
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
