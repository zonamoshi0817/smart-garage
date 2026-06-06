"use client";

import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import type { Car, MaintenanceRecord, FuelLog, Customization } from "@/types";
import { CATEGORY_LABELS } from "@/lib/customizations";
import { getDisplayAmount, getDisplayCost } from "@/lib/fuelLogs";
import { toDate, toMillis } from "@/lib/dateUtils";

export function MaintenanceSummaryCard({
  maintenanceRecords,
  activeCarId,
  setShowMaintenanceModal,
}: {
  maintenanceRecords: MaintenanceRecord[];
  activeCarId?: string;
  setShowMaintenanceModal: (show: boolean) => void;
}) {
  const router = useRouter();
  return (
              <div className="app-card p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="app-section-title">MAINTENANCE</h3>
                    <button
                      onClick={() => router.push('/maintenance')}
                      className="app-link"
                    >
                      ALL →
                    </button>
                </div>
              
              {maintenanceRecords.length > 0 ? (
                <div className="space-y-3">
                  {/* 最新1件 */}
                  {(() => {
                    const latest = maintenanceRecords.sort((a, b) => toMillis(b.date) - toMillis(a.date))[0];
                    return (
                      <div className="app-stat-cell p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs mb-1" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>LATEST</div>
                            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{latest.title}</div>
                          </div>
                          <div className="text-right">
                            {latest.cost && (
                              <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                                ¥{latest.cost.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                      {/* ミニ統計（2つ、期間統一：直近90日） */}
                      {(() => {
                        const now = new Date();
                        const ninetyDaysAgo = new Date();
                        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                        const recentRecords = maintenanceRecords.filter(r => {
                          const recordDate = toDate(r.date) || new Date();
                          return recordDate >= ninetyDaysAgo;
                        });
                        const recentTotalCost = recentRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
                        return (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="app-stat-cell text-center p-2">
                              <div className="text-xs font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                                {recentRecords.length}件
                              </div>
                              <div className="text-xs mt-1" style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>90日</div>
                            </div>
                            <div className="app-stat-cell text-center p-2">
                              <div className="text-xs font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                                ¥{recentTotalCost.toLocaleString()}
                              </div>
                              <div className="text-xs mt-1" style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>費用</div>
                            </div>
                          </div>
                        );
                      })()}

                  {/* 最近の履歴（直近3件） */}
                  <div className="space-y-2">
                  {maintenanceRecords
                    .sort((a, b) => toMillis(b.date) - toMillis(a.date))
                    .slice(0, 3)
                    .map((record) => (
                      <div key={record.id} className="app-list-item p-2">
                        <div className="flex items-center gap-2 text-sm">
                          {record.imageUrl && (
                            <div className="flex-shrink-0">
                              <img
                                src={record.imageUrl}
                                alt={record.title}
                                className="w-12 h-12 object-cover"
                                style={{ border: '0.5px solid var(--border-color)' }}
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{record.title}</div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              {(record.date?.toDate ? record.date.toDate() : toDate(record.date) || new Date()).toLocaleDateString('ja-JP')} · {record.mileage?.toLocaleString()}km
                            </div>
                          </div>
                          {record.cost && (
                            <div className="text-sm font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                              ¥{record.cost.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {maintenanceRecords.length > 3 && (
                    <div className="pt-2 text-center" style={{ borderTop: '0.5px solid var(--border-color)' }}>
                      <button
                        onClick={() => router.push('/maintenance')}
                        className="app-link"
                      >
                        MORE ({maintenanceRecords.length}) →
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="mb-4" style={{ color: 'var(--text-dim)' }}>
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-xs mb-1" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>NO RECORDS</p>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>オイル交換・車検から始めましょう</p>
                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => activeCarId ? setShowMaintenanceModal(true) : router.push('/mycar')}
                      className="btn-secondary-dark px-4 py-2 rounded-none"
                    >
                      ADD RECORD
                    </button>
                  </div>
                </div>
              )}
            </div>
  );
}

export function FuelSummaryCard({
  car,
  fuelLogs,
  activeCarId,
  setShowFuelLogModal,
  setShowAddCarModal,
}: {
  car?: Car;
  fuelLogs: FuelLog[];
  activeCarId?: string;
  setShowFuelLogModal: (show: boolean) => void;
  setShowAddCarModal: (show: boolean) => void;
}) {
  const router = useRouter();
  return (
              <div className="app-card p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="app-section-title">FUEL LOG</h3>
                    <button
                      onClick={() => router.push('/gas')}
                      className="app-link"
                    >
                      ALL →
                    </button>
                </div>
                
                {!car ? (
                  <div className="text-center py-8">
                    <div className="mb-4" style={{ color: 'var(--text-dim)' }}>
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      </svg>
                    </div>
                    <p className="text-xs mb-1" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>NO RECORDS</p>
                    <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>まず車を追加してください</p>
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => setShowAddCarModal(true)}
                        className="btn-primary-dark px-4 py-2 rounded-none"
                      >
                        ADD CAR
                      </button>
                    </div>
                  </div>
                ) : car && fuelLogs.length > 0 ? (
                    <div className="space-y-3">
                      {/* 最新1件 */}
                      {(() => {
                        const latest = fuelLogs.sort((a, b) => {
                          const aSeconds = a.date?.seconds || 0;
                          const bSeconds = b.date?.seconds || 0;
                          return bSeconds - aSeconds;
                        })[0];
                        const amt = getDisplayAmount(latest);
                        return (
                          <div className="app-stat-cell p-3">
                    <div className="flex items-center justify-between">
                              <div>
                                <div className="text-xs mb-1" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>LATEST</div>
                                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                  {(latest.date?.toDate ? latest.date.toDate() : new Date()).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })} · {((latest.quantity || 0) / 1000 || latest.fuelAmount || 0).toLocaleString()}L
                        </div>
                      </div>
                      <div className="text-right">
                            <div className="text-sm font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                                  ¥{getDisplayCost(latest).toLocaleString()}
                        </div>
                      </div>
                        </div>
                      </div>
                        );
                      })()}

                      {/* ミニ統計（2つ、期間統一：直近90日） */}
                      {(() => {
                        const now = new Date();
                        const ninetyDaysAgo = new Date();
                        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                        const recentLogs = fuelLogs.filter(log => {
                          const logDate = toDate(log.date) || new Date();
                          return logDate >= ninetyDaysAgo;
                        });
                        const recentTotalCost = recentLogs.reduce((sum, log) => sum + (log.totalCostJpy || log.cost || 0), 0);
                        // 平均単価を計算
                        const totalFuelAmount = recentLogs.reduce((sum, log) => sum + ((log.quantity || 0) / 1000 || log.fuelAmount || 0), 0);
                        const avgPricePerLiter = totalFuelAmount > 0 ? Math.round(recentTotalCost / totalFuelAmount) : 0;
                        // 前回からの走行距離
                        const sortedLogs = fuelLogs.sort((a, b) => {
                          const aSeconds = a.date?.seconds || 0;
                          const bSeconds = b.date?.seconds || 0;
                          return bSeconds - aSeconds;
                        });
                        const latestKm = sortedLogs[0]?.odoKm || 0;
                        const previousKm = sortedLogs[1]?.odoKm || 0;
                        const distanceSinceLastRefuel = latestKm > 0 && previousKm > 0 ? latestKm - previousKm : null;
                        return (
                            <div className="grid grid-cols-2 gap-3">
                            <div className="app-stat-cell text-center p-2">
                              <div className="text-xs font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                                {avgPricePerLiter > 0 ? `¥${avgPricePerLiter.toLocaleString()}` : '--'}
                                </div>
                              <div className="text-xs mt-1" style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>単価</div>
                              </div>
                            <div className="app-stat-cell text-center p-2">
                              <div className="text-xs font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                                {distanceSinceLastRefuel !== null ? `${distanceSinceLastRefuel.toLocaleString()}km` : '--'}
                                </div>
                              <div className="text-xs mt-1" style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>前回比</div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 最近の給油履歴（直近3件） */}
                        <div className="space-y-2">
                          {fuelLogs
                            .sort((a, b) => {
                              const aSeconds = a.date?.seconds || 0;
                              const bSeconds = b.date?.seconds || 0;
                              return bSeconds - aSeconds;
                            })
                            .slice(0, 3)
                            .map((log) => (
                            <div key={log.id} className="app-list-item p-2">
                            <div className="flex items-center justify-between" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                              <div className="flex items-center gap-2">
                                <span style={{ color: 'var(--text-muted)' }}>
                                      {(log.date?.toDate ? log.date.toDate() : new Date()).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                                </span>
                                <span style={{ color: 'var(--text-primary)' }}>
                                  {((log.quantity || 0) / 1000 || log.fuelAmount || 0).toLocaleString()}L
                                </span>
                                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                                  ¥{(log.totalCostJpy || log.cost || 0).toLocaleString()}
                                </span>
                                  </div>
                                  {log.isFullTank && (
                                <span className="px-2 py-0.5" style={{ background: 'var(--surface-muted)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.06em' }}>
                                      FULL
                                </span>
                  )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {fuelLogs.length > 3 && (
                        <div className="pt-2 text-center" style={{ borderTop: '0.5px solid var(--border-color)' }}>
                            <button
                              onClick={() => router.push('/gas')}
                              className="app-link"
                            >
                              MORE ({fuelLogs.length}) →
                            </button>
                          </div>
                        )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="mb-4" style={{ color: 'var(--text-dim)' }}>
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                        </svg>
                      </div>
                      <p className="text-xs mb-1" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>NO RECORDS</p>
                      <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>1件目の給油を記録しましょう</p>
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => activeCarId ? setShowFuelLogModal(true) : router.push('/mycar')}
                          className="btn-secondary-dark px-4 py-2 rounded-none"
                        >
                          ADD FUEL LOG
                        </button>
                      </div>
                    </div>
                  )}
              </div>
  );
}

export function CustomSummaryCard({
  customizations,
  activeCarId,
  setShowCustomizationModal,
  setCurrentPage,
}: {
  customizations: Customization[];
  activeCarId?: string;
  setShowCustomizationModal: (show: boolean) => void;
  setCurrentPage: (page: 'dashboard' | 'maintenance-history' | 'fuel-logs' | 'customizations' | 'notifications' | 'my-car') => void;
}) {
  const router = useRouter();
  return (
              <div className="app-card p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="app-section-title">CUSTOM</h3>
                  <button
                    onClick={() => {
                      setCurrentPage('customizations');
                      router.push('/home?tab=customizations');
                    }}
                    className="app-link"
                  >
                    ALL →
                  </button>
                </div>
                
                {customizations.length > 0 ? (
                  <div className="space-y-3">
                    {/* 最新1件 */}
                    {(() => {
                      const latest = customizations.sort((a, b) => toMillis(b.date) - toMillis(a.date))[0];
                      const totalCost = (latest.partsCostJpy || 0) + (latest.laborCostJpy || 0) + (latest.otherCostJpy || 0);
                      return (
                        <div className="app-stat-cell p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs mb-1" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>LATEST</div>
                              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{latest.title}</div>
                            </div>
                            <div className="text-right">
                              {totalCost > 0 && (
                                <div className="text-sm font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                                  ¥{totalCost.toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* ミニ統計（2つ、期間統一：直近90日） */}
                    {(() => {
                      const now = new Date();
                      const ninetyDaysAgo = new Date();
                      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                      const recentCustoms = customizations.filter(c => {
                        const customDate = toDate(c.date) || new Date();
                        return customDate >= ninetyDaysAgo;
                      });
                      const recentTotalCost = recentCustoms.reduce((sum, c) => 
                        sum + (c.partsCostJpy || 0) + (c.laborCostJpy || 0) + (c.otherCostJpy || 0), 0);
                      const categoryCount = new Set(recentCustoms.flatMap(c => c.categories)).size;
                      return (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="app-stat-cell text-center p-2">
                            <div className="text-xs font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                              ¥{recentTotalCost.toLocaleString()}
                            </div>
                            <div className="text-xs mt-1" style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>費用</div>
                          </div>
                          <div className="app-stat-cell text-center p-2">
                            <div className="text-xs font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                              {categoryCount}種類
                            </div>
                            <div className="text-xs mt-1" style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>カテゴリ</div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 最近の履歴（直近3件） */}
                    <div className="space-y-2">
                    {customizations
                      .sort((a, b) => toMillis(b.date) - toMillis(a.date))
                      .slice(0, 3)
                        .map((customization) => {
                          const totalCost = (customization.partsCostJpy || 0) + (customization.laborCostJpy || 0) + (customization.otherCostJpy || 0);
                          return (
                            <div key={customization.id} className="app-list-item p-2">
                              <div className="flex items-center gap-2 text-sm">
                                {customization.imageUrl && (
                                  <div className="flex-shrink-0">
                                    <img
                                      src={customization.imageUrl}
                                      alt={customization.title}
                                      className="w-12 h-12 object-cover"
                                      style={{ border: '0.5px solid var(--border-color)' }}
                                    />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{customization.title}</div>
                                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                    {(customization.date?.toDate ? customization.date.toDate() : toDate(customization.date) || new Date()).toLocaleDateString('ja-JP')}
                                    {customization.categories.length > 0 && (
                                      <span className="ml-2">
                                        {CATEGORY_LABELS[customization.categories[0]]}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {totalCost > 0 && (
                                  <div className="text-sm font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                                    ¥{totalCost.toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    {customizations.length > 3 && (
                      <div className="pt-2 text-center" style={{ borderTop: '0.5px solid var(--border-color)' }}>
                        <button
                          onClick={() => {
                            setCurrentPage('customizations');
                            router.push('/home?tab=customizations');
                          }}
                          className="app-link"
                        >
                          MORE ({customizations.length}) →
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="mb-4" style={{ color: 'var(--text-dim)' }}>
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </div>
                    <p className="text-xs mb-1" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>NO RECORDS</p>
                    <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>タイヤ・ホイール・足回りなど</p>
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => (activeCarId && auth.currentUser) ? setShowCustomizationModal(true) : router.push('/mycar')}
                        className="btn-secondary-dark px-4 py-2 rounded-none"
                      >
                        ADD CUSTOM
                      </button>
                    </div>
                  </div>
                )}
              </div>
  );
}
