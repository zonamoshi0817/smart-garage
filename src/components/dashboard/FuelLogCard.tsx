"use client";

import { useState, useEffect } from "react";
import { watchFuelLogs, calculateFuelEfficiency, calculateMonthlyFuelCosts, calculateAverageFuelEfficiency, updateFuelLog, deleteFuelLog } from "@/lib/fuelLogs";
import type { FuelLog, Car } from "@/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import FuelLogModal from '../modals/FuelLogModal';

interface FuelLogCardProps {
  car: Car;
}

export default function FuelLogCard({ car }: FuelLogCardProps) {
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFuelLog, setEditingFuelLog] = useState<FuelLog | null>(null);

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

  // 個別の給油ログの燃費を計算する関数
  const calculateIndividualFuelEfficiency = (log: FuelLog, index: number) => {
    if (index === 0) return null; // 最新のログは燃費計算できない
    
    const previousLog = fuelLogs[index - 1];
    if (!previousLog || !log.isFullTank || !previousLog.isFullTank) return null;
    
    const distance = log.odoKm - previousLog.odoKm;
    const fuelUsed = log.fuelAmount;
    
    if (distance <= 0 || fuelUsed <= 0) return null;
    
    return Math.round((distance / fuelUsed) * 10) / 10;
  };

  // デバッグ情報
  console.log("FuelLogCard Debug:", {
    fuelLogsCount: fuelLogs.length,
    fuelLogs: fuelLogs.map(log => ({
      id: log.id,
      date: log.date.toLocaleDateString(),
      odoKm: log.odoKm,
      fuelAmount: log.fuelAmount,
      isFullTank: log.isFullTank
    })),
    currentFuelEfficiency,
    averageFuelEfficiency
  });

  // 最新の給油ログ
  const latestFuelLog = fuelLogs[0];

  // 月間ガソリン代のグラフデータ（直近6ヶ月）
  const chartData = monthlyCosts.slice(-6).map(item => ({
    month: item.month.slice(5), // MM形式
    cost: item.cost,
  }));

  // 編集ハンドラー
  const handleEdit = (log: FuelLog) => {
    setEditingFuelLog(log);
    setShowEditModal(true);
  };

  // 削除ハンドラー
  const handleDelete = async (log: FuelLog) => {
    if (!log.id) return;
    
    if (confirm(`給油記録を削除しますか？\n日時: ${log.date.toLocaleDateString('ja-JP')}\n給油量: ${log.fuelAmount}L`)) {
      try {
        await deleteFuelLog(log.id);
        console.log("Fuel log deleted successfully");
      } catch (error) {
        console.error("Error deleting fuel log:", error);
        alert('給油記録の削除に失敗しました。');
      }
    }
  };

  // モーダルを閉じるハンドラー
  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingFuelLog(null);
  };

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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">給油ログ</h3>
              <p className="text-sm text-gray-500">{fuelLogs.length}件の記録</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {fuelLogs.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">給油ログがありません</h4>
            <p className="text-gray-500 mb-4">「給油を記録」ボタンから記録を開始しましょう</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 燃費情報カード */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-900">
                      {currentFuelEfficiency ? `${currentFuelEfficiency}` : "-"}
                    </div>
                    <div className="text-sm text-blue-600 font-medium">km/L</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-blue-800">現在の燃費</div>
                <div className="text-xs text-blue-600 mt-1">満タン間の燃費</div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-2xl border border-emerald-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-emerald-900">
                      {averageFuelEfficiency ? `${averageFuelEfficiency}` : "-"}
                    </div>
                    <div className="text-sm text-emerald-600 font-medium">km/L</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-emerald-800">平均燃費</div>
                <div className="text-xs text-emerald-600 mt-1">全期間平均</div>
              </div>
            </div>

            {/* 最新の給油情報 */}
            {latestFuelLog && (
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-2xl border border-gray-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">最新の給油</h4>
                  {latestFuelLog.isFullTank && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                      満タン
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {latestFuelLog.date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                    </div>
                    <div className="text-xs text-gray-500">日時</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{latestFuelLog.fuelAmount}</div>
                    <div className="text-xs text-gray-500">L</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{latestFuelLog.odoKm.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">km</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">¥{latestFuelLog.cost.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">金額</div>
                  </div>
                </div>
              </div>
            )}

            {/* 月別ガソリン代推移 */}
            {chartData.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">月別ガソリン代推移</h3>
                  <div className="flex gap-2 text-sm">
                    <button className="px-3 py-1 rounded-full bg-blue-100 text-blue-700">月次</button>
                    <button className="px-3 py-1 rounded-full text-gray-600 hover:bg-gray-100">年次</button>
                  </div>
                </div>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        axisLine={{ stroke: '#e0e0e0' }}
                        tickFormatter={(value) => `${value}月`}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        axisLine={{ stroke: '#e0e0e0' }}
                        tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`¥${value.toLocaleString()}`, 'ガソリン代']}
                        labelFormatter={(label) => `${label}月`}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Bar 
                        dataKey="cost" 
                        fill="#10b981" 
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* 給油履歴（最新5件） */}
            {fuelLogs.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">最近の給油履歴</h4>
                </div>
                <div className="space-y-3">
                  {fuelLogs.slice(0, 5).map((log, index) => {
                    const individualEfficiency = calculateIndividualFuelEfficiency(log, index);
                    return (
                      <div key={log.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-sm font-semibold text-gray-600">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-semibold text-gray-900">
                                {log.date.toLocaleDateString('ja-JP')}
                              </span>
                              {log.isFullTank && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                  満タン
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {log.odoKm.toLocaleString()} km • {log.fuelAmount}L • ¥{log.cost.toLocaleString()}
                              {individualEfficiency && (
                                <span className="ml-2 text-green-600 font-medium">
                                  • {individualEfficiency} km/L
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">
                              ¥{Math.round(log.cost / log.fuelAmount).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">/L</div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEdit(log)}
                              className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors"
                              title="編集"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(log)}
                              className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
                              title="削除"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 編集モーダル */}
      <FuelLogModal
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        car={car}
        editingFuelLog={editingFuelLog}
        onSuccess={() => {
          console.log("Fuel log updated successfully");
        }}
      />
    </div>
  );
}
