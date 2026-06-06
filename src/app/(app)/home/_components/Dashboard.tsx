"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateCar } from "@/lib/cars";
import type { Car } from "@/types";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from 'firebase/firestore';
import type { MaintenanceRecord } from "@/types";
import { uploadCarImageWithProgress, isImageFile } from "@/lib/storage";
import type { Customization } from "@/types";
import type { FuelLog } from "@/types";
import { Car as CarIcon } from 'lucide-react';
import UnifiedCTA from "@/components/UnifiedCTA";
import { toDate, toMillis } from "@/lib/dateUtils";
import { ExpenseChart } from "./dashboard/ExpenseChart";
import { MaintenanceSummaryCard, FuelSummaryCard, CustomSummaryCard } from "./dashboard/SummaryCards";

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
              <MaintenanceSummaryCard
                maintenanceRecords={maintenanceRecords}
                activeCarId={activeCarId}
                setShowMaintenanceModal={setShowMaintenanceModal}
              />
              <FuelSummaryCard
                car={car}
                fuelLogs={fuelLogs}
                activeCarId={activeCarId}
                setShowFuelLogModal={setShowFuelLogModal}
                setShowAddCarModal={setShowAddCarModal}
              />
              <CustomSummaryCard
                customizations={customizations}
                activeCarId={activeCarId}
                setShowCustomizationModal={setShowCustomizationModal}
                setCurrentPage={setCurrentPage}
              />
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

