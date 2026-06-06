"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateCar } from "@/lib/cars";
import type { Car } from "@/types";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from 'firebase/firestore';
import type { MaintenanceRecord } from "@/types";
import { uploadCarImageWithProgress, isImageFile } from "@/lib/storage";
import { CATEGORY_LABELS } from "@/lib/customizations";
import type { Customization } from "@/types";
import { getDisplayAmount, getDisplayCost } from "@/lib/fuelLogs";
import type { FuelLog } from "@/types";
import { Car as CarIcon } from 'lucide-react';
import UnifiedCTA from "@/components/UnifiedCTA";
import { toDate, toMillis } from "@/lib/dateUtils";
import { ExpenseChart } from "./dashboard/ExpenseChart";

export function DashboardContent({ 
  cars,
  activeCarId,
  car, 
  maintenanceRecords,
  fuelLogs,
  customizations,
  setCurrentPage,
  setActiveCarId,
  setShowMaintenanceModal,
  setShowFuelLogModal,
  setShowCustomizationModal,
  setShowAddCarModal
}: {
  cars: Car[];
  activeCarId?: string;
  car?: Car;
  maintenanceRecords: MaintenanceRecord[];
  fuelLogs: FuelLog[];
  customizations: Customization[];
  setCurrentPage: (page: 'dashboard' | 'maintenance-history' | 'fuel-logs' | 'customizations' | 'notifications' | 'my-car') => void;
  setActiveCarId: (id: string) => void;
  setShowMaintenanceModal: (show: boolean) => void;
  setShowFuelLogModal: (show: boolean) => void;
  setShowCustomizationModal: (show: boolean) => void;
  setShowAddCarModal: (show: boolean) => void;
}) {
  const router = useRouter();
  // SEO/アクセシビリティ用のh1タグ（非表示）
  const pageTitle = `ホーム${car ? ' - ' + car.name : ' - garage log'}`;

  
  // 共有状態（saleProfile）を取得
  const [shareStatus, setShareStatus] = useState<'none' | 'active' | 'stopped' | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  
  
  useEffect(() => {
    if (!activeCarId || !auth.currentUser || !car) return;

    const loadShareStatus = async () => {
      try {
        const carDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid, 'cars', activeCarId));
        if (carDoc.exists()) {
          const carData = carDoc.data();
          if (carData.activeSaleProfileId) {
            const saleProfileDoc = await getDoc(doc(db, 'saleProfiles', carData.activeSaleProfileId));
            if (saleProfileDoc.exists()) {
              const profileData = saleProfileDoc.data();
              setShareStatus(profileData.visibility === 'disabled' ? 'stopped' : 'active');
              if (profileData.slug) {
                setShareUrl(`${typeof window !== 'undefined' ? window.location.origin : ''}/s/${profileData.slug}`);
      }
            } else {
              setShareStatus('none');
              setShareUrl(null);
            }
          } else {
            setShareStatus('none');
            setShareUrl(null);
          }
        }
      } catch (error) {
        console.error('Failed to load share status:', error);
        setShareStatus('none');
        setShareUrl(null);
      }
    };
    
    loadShareStatus();
  }, [activeCarId, car]);

  // 費用データの計算（期間に応じて）





  return (
    <>
      {/* ヘッダー */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ホーム</h1>
          {/* Primaryアクション: 記録を追加（グローバルCTA） */}
          {car && (
            <UnifiedCTA
              onMaintenance={() => setShowMaintenanceModal(true)}
              onFuel={() => setShowFuelLogModal(true)}
              onCustom={() => setShowCustomizationModal(true)}
            />
          )}
        </div>
      </div>




      {/* 車検期限リマインダー */}
      {car?.inspectionExpiry && (() => {
        const expiryDate = car.inspectionExpiry.toDate ? car.inspectionExpiry.toDate() : new Date(car.inspectionExpiry as any);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // 走行ペースから推定走行距離を計算
        let estimatedKmUntilExpiry: number | null = null;
        if (car.avgKmPerMonth && car.avgKmPerMonth > 0) {
          estimatedKmUntilExpiry = Math.round((daysUntilExpiry / 30) * car.avgKmPerMonth);
        }
        
        if (daysUntilExpiry <= 30) {
          return (
            <div className={`rounded-2xl border p-6 mb-6 ${
              daysUntilExpiry <= 7 ? 'border-red-200 bg-red-50' :
              daysUntilExpiry <= 14 ? 'border-yellow-200 bg-yellow-50' :
              'border-blue-200 bg-blue-50'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">車検期限リマインダー</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {car.name}の車検期限まで <span className="font-bold">{daysUntilExpiry}日</span> です
                    {estimatedKmUntilExpiry && (
                      <span className="ml-1 text-sm">
                        （概ね{estimatedKmUntilExpiry.toLocaleString()}km）
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    期限: {expiryDate.toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  daysUntilExpiry <= 7 ? 'bg-red-100 text-red-800' :
                  daysUntilExpiry <= 14 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {daysUntilExpiry <= 7 ? '緊急' : daysUntilExpiry <= 14 ? '注意' : '情報'}
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}



            {/* 車カード（選択中の車を表示 / なければダミー） */}
            <section className="app-card p-4 sm:p-6">
        {/* 車選択ヘッダー */}
        {cars.length > 1 && (
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              現在の車: {car?.name || "未選択"}
              {car?.modelCode && `（${car.modelCode}）`}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
              {cars.length}台登録済み
            </div>
          </div>
        )}
        
              {car ? (
                <>
                  {/* 上：サマリー */}
                  <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 mb-4">
                  {car.imagePath ? (
                    <div className="overflow-hidden rounded-lg" style={{ border: '0.5px solid var(--border-bright)', background: 'var(--surface-muted)' }}>
                      <img
                        src={car.imagePath}
                        alt={car.name || "My Car"}
                        className="w-full h-44 md:h-full object-cover"
                      />
                    </div>
                  ) : (
                    <label
                      htmlFor="car-image-upload-home"
                      className="rounded-lg flex flex-col items-center justify-center h-44 md:h-full cursor-pointer transition-colors"
                      style={{ border: '1px dashed var(--border-bright)', background: 'var(--surface-muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-muted)')}
                    >
                      <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-dim)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M12 4v16m8-8H4" />
                      </svg>
                      <p className="text-xs mb-1" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>写真を追加</p>
                      <p className="text-xs" style={{ color: 'var(--text-dim)' }}>タップして選択</p>
                      <input
                        id="car-image-upload-home"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !car?.id) return;
                          if (!isImageFile(file)) { alert('画像ファイルを選択してください'); return; }
                          try {
                            const url = await uploadCarImageWithProgress(file, car.id, () => {});
                            await updateCar(car.id, { imagePath: url });
                          } catch { alert('アップロードに失敗しました'); }
                        }}
                      />
                    </label>
                  )}
                    <div>
                      <h2 className="text-xl font-bold mb-3">
                        {car.name}
                        {car.modelCode ? `（${car.modelCode}）` : ""}
                      </h2>
                      {/* 主要KPI: 走行距離・車検期限・共有状態を強調 */}
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">走行距離</div>
                          <div className="text-lg font-bold text-gray-900">
                            {car.odoKm
                              ? `${car.odoKm.toLocaleString()} km`
                              : "未設定"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">車検期限</div>
                          {car.inspectionExpiry ? (() => {
                            const expiryDate = car.inspectionExpiry.toDate ? car.inspectionExpiry.toDate() : new Date(car.inspectionExpiry as any);
                            const today = new Date();
                            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                            const isNearExpiry = daysUntilExpiry <= 30;
                            return (
                              <div>
                                <div className={`text-lg font-bold ${isNearExpiry ? daysUntilExpiry <= 7 ? 'text-red-600' : daysUntilExpiry <= 14 ? 'text-orange-600' : 'text-yellow-600' : 'text-gray-900'}`}>
                                  {expiryDate.toLocaleDateString('ja-JP', {
                                  year: 'numeric',
                                    month: 'numeric',
                                  day: 'numeric'
                                  })}
                      </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  あと{daysUntilExpiry}日
                    </div>
                              </div>
                            );
                          })() : (
                            <div className="text-lg font-bold text-gray-900">未設定</div>
                          )}
                        </div>
                      </div>
                      {/* 履歴の充実度 */}
                      {(() => {
                        const maintenanceCount = maintenanceRecords.length;
                        const latestMaintenance = maintenanceRecords.length > 0 ? maintenanceRecords.sort((a, b) => toMillis(b.date) - toMillis(a.date))[0] : null;
                        const evidenceCount = maintenanceRecords.filter(r => r.attachments && r.attachments.length > 0).length;
                        const evidenceDisplay = evidenceCount > 0 
                          ? `証憑: ${evidenceCount}件（${Math.round((evidenceCount / maintenanceCount) * 100)}%）`
                          : '証憑: 未登録';
                        return (
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 pt-3 border-t border-gray-200">
                            <span>記録: {maintenanceCount}件</span>
                            <span>{evidenceDisplay}</span>
                            <span>直近整備: {latestMaintenance ? (latestMaintenance.date?.toDate ? latestMaintenance.date.toDate() : toDate(latestMaintenance.date) || new Date()).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : 'なし'}</span>
                            {/* 共有状態 */}
                            {shareStatus !== null && (
                              <span>
                                共有: {shareStatus === 'active' ? (
                                  <span className="text-green-600">公開中</span>
                                ) : shareStatus === 'stopped' ? (
                                  <span className="text-gray-500">停止中</span>
                                ) : (
                                  <span className="text-gray-500">未設定</span>
                                )}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  {/* 下：アクション（1つに統一） */}
                  <div className="pt-4" style={{ borderTop: '0.5px solid var(--border-color)' }}>
                      <button
                        onClick={() => {
                          console.log("Navigate to vehicle data, activeCarId:", activeCarId);
                          router.push('/mycar');
                        }}
                        className="btn-primary-dark w-full px-4 py-2.5 rounded-none"
                      >
                        VIEW MY CAR
                      </button>
                    </div>
                </>
              ) : cars.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="mb-4" style={{ color: 'var(--text-dim)' }}>
                    <CarIcon className="h-16 w-16 mx-auto" />
                  </div>
                  <p className="text-sm mb-4" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                    まず車を追加してください
                  </p>
                  <button
                    onClick={() => setShowAddCarModal(true)}
                    className="btn-primary-dark px-4 py-2 rounded-none"
                  >
                    ADD CAR
                  </button>
                </div>
              ) : activeCarId && !car ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="animate-spin rounded-full border-2 w-8 h-8 mb-4" style={{ borderColor: 'var(--border-bright)', borderTopColor: 'var(--accent)' }}></div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>読み込み中...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="animate-spin rounded-full border-2 w-8 h-8 mb-4" style={{ borderColor: 'var(--border-bright)', borderTopColor: 'var(--accent)' }}></div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>読み込み中...</p>
                </div>
              )}
            </section>

            {/* メンテナンス、給油情報、カスタマイズ情報を3列に配置 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-4">
              {/* メンテナンス */}
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

              {/* 最近の給油 */}
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

              {/* カスタマイズ履歴 */}
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
            </div>

            {/* 下段：月別費用推移 */}
            <ExpenseChart
              maintenanceRecords={maintenanceRecords}
              fuelLogs={fuelLogs}
              customizations={customizations}
            />

      {/* フッター */}
      <footer className="border-t mt-12" style={{ borderColor: "var(--border-color)" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 text-sm text-gray-600">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img 
                src="/icon.png" 
                alt="GarageLog" 
                className="h-10 w-10 rounded-xl shadow-md"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <div>
                <p className="font-bold text-gray-900 text-base">GarageLog</p>
                <p className="text-xs text-gray-500">© {new Date().getFullYear()} GarageLog</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 md:gap-6 text-xs md:text-sm">
              <a className="hover:text-blue-600 font-medium transition-colors" href="/legal/privacy">プライバシーポリシー</a>
              <a className="hover:text-blue-600 font-medium transition-colors" href="/legal/terms">利用規約</a>
              <a className="hover:text-blue-600 font-medium transition-colors" href="/support">サポート</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

