"use client";

import { useEffect, useState, useMemo, use as usePromise } from "react";
import { AppShell } from "@/components/common/AppChrome";
import type { Car, FuelLog } from "@/types";
import { watchCars } from "@/lib/cars";
import { watchFuelLogs, calculateAverageFuelEfficiency, getDisplayAmount, getDisplayCost } from "@/lib/fuelLogs";
import FuelLogModal from "@/components/modals/FuelLogModal";

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

  // ダッシュボード指標を計算
  const dashboardMetrics = useMemo(() => {
    if (fuelLogs.length === 0) {
      return {
        avgEfficiency: null,
        thisMonthCost: 0,
        thisMonthCount: 0,
        totalCost: 0,
      };
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const thisMonthLogs = fuelLogs.filter(log => {
      const date = log.date?.toDate ? log.date.toDate() : undefined;
      return date && date >= monthStart;
    });

    const thisMonthCost = thisMonthLogs.reduce((sum, log) => {
      return sum + getDisplayCost(log);
    }, 0);

    const totalCost = fuelLogs.reduce((sum, log) => {
      return sum + getDisplayCost(log);
    }, 0);

    const avgEfficiency = calculateAverageFuelEfficiency(fuelLogs);

    return {
      avgEfficiency,
      thisMonthCost,
      thisMonthCount: thisMonthLogs.length,
      totalCost,
    };
  }, [fuelLogs]);

  return (
    <AppShell activeCarId={car?.id}>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">給油記録</h1>
            {car && <p className="text-sm text-gray-600 mt-1">{car.name}</p>}
          </div>
          {car && (
            <button
              onClick={() => setShowModal(true)}
              className="rounded-xl bg-blue-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              給油を追加
            </button>
          )}
        </div>

        {/* 簡素化されたダッシュボード（燃料関連のみ） */}
        {fuelLogs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
              <div className="text-xs text-blue-600 font-medium mb-1">平均燃費</div>
              <div className="text-2xl font-bold text-blue-900">
                {dashboardMetrics.avgEfficiency ? `${dashboardMetrics.avgEfficiency} km/L` : '---'}
              </div>
              <div className="text-xs text-blue-700 mt-1">満タン給油ベース</div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
              <div className="text-xs text-green-600 font-medium mb-1">今月の燃料費</div>
              <div className="text-2xl font-bold text-green-900">
                ¥{dashboardMetrics.thisMonthCost.toLocaleString()}
              </div>
              <div className="text-xs text-green-700 mt-1">{dashboardMetrics.thisMonthCount}回の給油</div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
              <div className="text-xs text-purple-600 font-medium mb-1">累計燃料費</div>
              <div className="text-2xl font-bold text-purple-900">
                ¥{dashboardMetrics.totalCost.toLocaleString()}
              </div>
              <div className="text-xs text-purple-700 mt-1">{fuelLogs.length}件の記録</div>
            </div>
          </div>
        )}

        {/* 給油記録リスト */}
        <div>
          <SectionHeader 
            title="給油履歴" 
            subtitle={fuelLogs.length > 0 ? `${fuelLogs.length}件の記録` : undefined}
            size="md"
          />
          
          {fuelLogs.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">給油記録がありません</h3>
              <p className="text-gray-600 mb-6">給油を記録して、燃費やコストを管理しましょう</p>
              {car && (
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-sm transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  最初の給油を記録
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {fuelLogs.map((log, index) => {
                  const { value: fuelAmount, unit: fuelUnit } = getDisplayAmount(log);
                  const cost = getDisplayCost(log);
                  const pricePerLiter = fuelAmount > 0 ? Math.round(cost / fuelAmount) : 0;
                  const efficiency = calculateIndividualFuelEfficiency(log, index);
                  const date = log.date?.toDate ? log.date.toDate() : new Date();
                  
                  return (
                    <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="text-base font-semibold text-gray-900">
                              {date.toLocaleDateString('ja-JP', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </div>
                            {log.isFullTank && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                満タン
                              </span>
                            )}
                            {efficiency && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                {efficiency} km/L
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{log.odoKm?.toLocaleString()} km</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                              </svg>
                              <span>{fuelAmount.toFixed(1)} {fuelUnit}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>¥{cost.toLocaleString()}</span>
                            </div>
                            {pricePerLiter > 0 && (
                              <div className="text-gray-500">
                                ¥{pricePerLiter.toLocaleString()}/L
                              </div>
                            )}
                          </div>
                        </div>
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


