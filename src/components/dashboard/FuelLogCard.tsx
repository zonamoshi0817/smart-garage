"use client";

import { useState, useEffect, useMemo } from "react";
import { watchFuelLogs, calculateFuelEfficiency, calculateAverageFuelEfficiency, deleteFuelLog } from "@/lib/fuelLogs";
import type { FuelLog, Car } from "@/types";
import FuelLogModal from '../modals/FuelLogModal';

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

interface FuelLogCardProps {
  car: Car;
  fuelLogs?: FuelLog[]; // オプショナル: フィルター済みのログを外部から渡せる
  setShowFuelLogModal?: (show: boolean) => void; // オプショナル: モーダル表示関数
}

export default function FuelLogCard({ car, fuelLogs: externalFuelLogs, setShowFuelLogModal: externalSetShowFuelLogModal }: FuelLogCardProps) {
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFuelLog, setEditingFuelLog] = useState<FuelLog | null>(null);

  // 外部からfuelLogsが渡されている場合はそれを使用、そうでなければ監視
  useEffect(() => {
    if (externalFuelLogs !== undefined) {
      setFuelLogs(externalFuelLogs);
      setIsLoading(false);
      return;
    }

    if (!car.id) return;

    const unsubscribe = watchFuelLogs(car.id, (logs) => {
      setFuelLogs(logs);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [car.id, externalFuelLogs]);
  
  // 表示するログ（外部から渡されている場合はそれを使用）
  const displayLogs = externalFuelLogs !== undefined ? externalFuelLogs : fuelLogs;


  // 個別の給油ログの燃費を計算する関数
  const calculateIndividualFuelEfficiency = (log: FuelLog, index: number) => {
    if (index === 0) return null; // 最新のログは燃費計算できない
    
    const previousLog = fuelLogs[index - 1];
    if (!previousLog || !log.isFullTank || !previousLog.isFullTank) return null;
    
    const distance = log.odoKm - previousLog.odoKm;
    const fuelUsed = getFuelQuantityInLiters(log);
    
    if (distance <= 0 || !fuelUsed || fuelUsed <= 0) return null;
    
    return Math.round((distance / fuelUsed) * 10) / 10;
  };


  // 編集ハンドラー
  const handleEdit = (log: FuelLog) => {
    setEditingFuelLog(log);
    setShowEditModal(true);
  };

  // 削除ハンドラー
  const handleDelete = async (log: FuelLog) => {
    if (!log.id) return;
    
    if (confirm(`給油記録を削除しますか？\n日時: ${(log.date?.toDate ? log.date.toDate() : new Date()).toLocaleDateString('ja-JP')}\n給油量: ${getFuelQuantityInLiters(log)}L`)) {
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
    <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-5 lg:p-6 border border-gray-200">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="flex-shrink-0">⛽</span>
          <span className="break-words">給油記録</span>
          {displayLogs.length > 0 && (
            <span className="text-xs sm:text-sm font-normal text-gray-500 flex-shrink-0 hidden sm:inline">
              ({displayLogs.length}件)
            </span>
          )}
        </h2>
        {displayLogs.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-0">
            <span className="text-xs text-gray-500 sm:hidden">
              ({displayLogs.length}件)
            </span>
          </div>
        )}
      </div>

      {/* 給油履歴リスト */}
      <div className="space-y-1">
        {displayLogs.length === 0 ? (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-dashed border-blue-300 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="text-2xl sm:text-3xl flex-shrink-0">💡</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-blue-700 mb-0.5 sm:mb-1 break-words">
                  給油記録を追加してみましょう！
                </p>
                <p className="text-[10px] sm:text-xs text-gray-600 break-words leading-relaxed">
                  給油を記録すると、燃費やコストを管理できます
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {displayLogs.map((log, index) => {
              // 元の配列でのインデックスを取得（燃費計算のため）
              const originalIndex = externalFuelLogs !== undefined 
                ? fuelLogs.findIndex(l => l.id === log.id)
                : index;
              const individualEfficiency = calculateIndividualFuelEfficiency(log, originalIndex >= 0 ? originalIndex : index);
              const date = log.date?.toDate ? log.date.toDate() : new Date();
              
              return (
                <div key={log.id} className="border-b border-gray-200 last:border-b-0">
                  <div className="flex items-center justify-between py-3 sm:py-4 px-3 hover:bg-gray-50 transition-colors rounded-lg">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-semibold text-gray-900 min-w-0">
                        {date.toLocaleDateString('ja-JP', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      {log.isFullTank && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap">
                          満タン
                        </span>
                      )}
                      {individualEfficiency && (
                        <span className="text-[10px] sm:text-xs text-gray-600 whitespace-nowrap">
                          {individualEfficiency} km/L
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-2">
                      <div className="text-right">
                        <div className="text-sm sm:text-base font-bold text-gray-900">
                          {getFuelQuantityInLiters(log).toFixed(1)}L
                        </div>
                        <div className="text-xs sm:text-sm font-semibold text-gray-700">
                          ¥{getFuelTotalCost(log).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(log)}
                          className="p-1.5 sm:p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors"
                          title="編集"
                        >
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(log)}
                          className="p-1.5 sm:p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
                          title="削除"
                        >
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
