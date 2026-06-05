'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { parseQuery } from '@/lib/urlParams';
import { Car, MaintenanceRecord, FuelLog, Customization } from '@/types';
import { usePremiumGuard } from '@/hooks/usePremium';
import { getDisplayAmount, getDisplayCost } from '@/lib/fuelLogs';
import { isPremiumPlan } from '@/lib/plan';
import VehicleHeader from './VehicleHeader';
import QuickActions from './QuickActions';
// 広告はマイカーページから削除（意思決定面をクリーンに保つ）
// 広告はダッシュボードのみに表示
import CustomPartsPanel from './CustomPartsPanel';
import VehicleHealthIndicator from './VehicleHealthIndicator';
import PaywallModal from '../modals/PaywallModal';
import { share } from '@/lib/share';
import { getBestShareUrlForCar } from '@/lib/shareUrl';

interface MyCarPageProps {
  car: Car;
  maintenanceRecords: MaintenanceRecord[];
  fuelLogs: FuelLog[];
  customizations: Customization[];
  readOnly?: boolean; // READ ONLYモード（売却済み・廃車済み車両用）
  onOpenModal: (modalType: string, data?: any) => void;
}

export default function MyCarPage({
  car,
  maintenanceRecords,
  fuelLogs,
  customizations,
  readOnly = false,
  onOpenModal
}: MyCarPageProps) {
  const { userPlan, checkFeature, showPaywall, closePaywall, paywallFeature, paywallVariant } = usePremiumGuard();
  const isPremium = isPremiumPlan(userPlan);
  const searchParams = useSearchParams();
  const router = useRouter();

  const dayMs = 1000 * 60 * 60 * 24;

  // 見出しの統一
  function SectionHeader({ title, subtitle, right, size = 'md' }: { title: string; subtitle?: string; right?: React.ReactNode; size?: 'sm' | 'md' }) {
    const titleClass = size === 'sm'
      ? "text-xs sm:text-sm font-medium text-gray-700"
      : "text-base sm:text-lg font-semibold text-gray-900";
    const subClass = size === 'sm'
      ? "text-xs text-gray-500"
      : "text-xs sm:text-sm text-gray-500";
    return (
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div>
          <div className={titleClass}>{title}</div>
          {subtitle && <div className={subClass}>{subtitle}</div>}
        </div>
        {right}
      </div>
    );
  }

  const toJsDate = (input: any): Date | null => {
    if (!input) return null;
    if (input instanceof Date) return input;
    if (typeof input === 'object' && 'toDate' in input && typeof input.toDate === 'function') {
      try {
        return input.toDate();
      } catch {
        return null;
      }
    }
    const parsed = new Date(input);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatNumber = (value?: number | null, maximumFractionDigits = 0) => {
    if (value === undefined || value === null || Number.isNaN(value)) return '---';
    return value.toLocaleString('ja-JP', {
      minimumFractionDigits: value % 1 !== 0 && maximumFractionDigits > 0 ? 1 : 0,
      maximumFractionDigits,
    });
  };

  const formatCurrency = (value?: number | null) => {
    if (value === undefined || value === null || Number.isNaN(value)) return '¥0';
    return `¥${formatNumber(value, Math.abs(value) < 1000 ? 1 : 0)}`;
  };

  const formatDateLabel = (input: any, fallback = '---') => {
    const date = toJsDate(input);
    if (!date) return fallback;
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const formatRelativeDate = (date: Date | null) => {
    if (!date) return '---';
    const diffDays = Math.round((Date.now() - date.getTime()) / dayMs);
    if (diffDays === 0) return '今日';
    if (diffDays === 1) return '昨日';
    if (diffDays < 0) {
      const future = Math.abs(diffDays);
      return future === 1 ? '明日' : `${future}日後`;
    }
    if (diffDays < 7) return `${diffDays}日前`;
    return formatDateLabel(date);
  };

  const formatCountdown = (date: Date | null) => {
    if (!date) return '未登録';
    const diffDays = Math.ceil((date.getTime() - Date.now()) / dayMs);
    if (diffDays > 0) return `あと${diffDays}日`;
    if (diffDays === 0) return '今日まで';
    return `${Math.abs(diffDays)}日経過`;
  };

  // URLクエリパラメータから直接アクションを実行
  useEffect(() => {
    const { action, tab } = parseQuery(searchParams as unknown as URLSearchParams);
    console.log('[MyCarPage] Deep link detected (guarded):', { action, tab });
    
    if (action && !readOnly) {
      switch (action) {
        case 'add-fuel':
        case 'add':
          onOpenModal('fuel');
          break;
        case 'add-maintenance':
          onOpenModal('maintenance');
          break;
        case 'add-customization':
          onOpenModal('customization');
          break;
      }
    }
    
    if (tab) {
      const element = document.getElementById(`section-${tab}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [searchParams, readOnly, onOpenModal]);
  
  // 最新のメンテナンス記録を取得
  const latestMaintenance = useMemo(() => {
    if (maintenanceRecords.length === 0) return undefined;
    return [...maintenanceRecords]
      .sort((a, b) => {
        const aTime = toJsDate(a.date)?.getTime() || 0;
        const bTime = toJsDate(b.date)?.getTime() || 0;
        return bTime - aTime;
      })[0];
  }, [maintenanceRecords]);
  
  const sortedFuelLogs = useMemo(() => {
    if (fuelLogs.length === 0) return [] as FuelLog[];
    return [...fuelLogs].sort((a, b) => {
      const aTime = toJsDate(a.date)?.getTime() || 0;
      const bTime = toJsDate(b.date)?.getTime() || 0;
      return bTime - aTime;
    });
  }, [fuelLogs]);

  const latestFuelLog = sortedFuelLogs[0];
  const latestFuelDate = latestFuelLog ? toJsDate(latestFuelLog.date) : null;
  const latestFuelAmount = latestFuelLog ? getDisplayAmount(latestFuelLog) : null;
  const latestFuelCost = latestFuelLog ? getDisplayCost(latestFuelLog) : null;

  const totalCustomizationCost = useMemo(() => {
    return customizations.reduce((sum, item) => {
      const parts = Number(item.partsCostJpy) || 0;
      const labor = Number(item.laborCostJpy) || 0;
      const other = Number(item.otherCostJpy) || 0;
      return sum + parts + labor + other;
    }, 0);
  }, [customizations]);

  const inspectionDate = toJsDate(car.inspectionExpiry);
  const inspectionDaysLeft = inspectionDate ? Math.ceil((inspectionDate.getTime() - Date.now()) / dayMs) : null;

  const latestMaintenanceDate = latestMaintenance ? toJsDate(latestMaintenance.date) : null;
  
  // 共有中の状態管理
  const [isSharing, setIsSharing] = useState(false);

  // 共有ハンドラー
  const handleShare = async () => {
    if (isSharing) return;
    
    setIsSharing(true);
    try {
      // 最適な共有URLを取得（優先順位: /s/{slug} > /c/{carId} > window.location.href）
      const shareUrl = await getBestShareUrlForCar(car);
      
      const result = await share({
        title: 'GarageLog',
        text: `${car.name}の情報を共有`,
        url: shareUrl,
      });
      
      if (result.ok) {
        if (result.method === 'copy') {
          alert('URLをクリップボードにコピーしました');
        }
      } else if (result.error && result.error !== 'User cancelled') {
        alert(`共有に失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to get share URL:', error);
      // エラー時は現在のURLをフォールバック
      const fallbackUrl = typeof window !== 'undefined' ? window.location.href : '';
      const result = await share({
        title: 'GarageLog',
        text: `${car.name}の情報を共有`,
        url: fallbackUrl,
      });
      
      if (result.ok && result.method === 'copy') {
        alert('URLをクリップボードにコピーしました');
      } else if (result.error && result.error !== 'User cancelled') {
        alert(`共有に失敗しました: ${result.error}`);
      }
    } finally {
      setIsSharing(false);
    }
  };

  // クイックアクションの定義（高頻度操作のみに絞る）
  const quickActions = [
    {
      id: 'fuel',
      label: '給油を記録',
      icon: '⛽',
      onClick: () => onOpenModal('fuel')
    },
    {
      id: 'maintenance',
      label: 'メンテを追加',
      icon: '🔧',
      onClick: () => onOpenModal('maintenance')
    },
    {
      id: 'customization',
      label: 'カスタム追加',
      icon: '✨',
      onClick: () => onOpenModal('customization')
    },
    {
      id: 'share',
      label: '共有',
      icon: '📤',
      onClick: handleShare
    },
    {
      id: 'ocr',
      label: 'レシートOCR',
      icon: '📸',
      isPremium: true,
      onClick: () => onOpenModal('ocr')
    }
    // 「PDF出力」と「車両情報編集」は削除
    // - PDF出力: 共有ページから到達可能
    // - 車両情報編集: サマリーカード右上の編集ボタンなどからアクセス
  ];
  
  // ペイウォール表示ハンドラー
  const handleLockedAction = (actionId: string) => {
    checkFeature(actionId as any, undefined, 'minimal');
  };
  
  // メンテナンステンプレートから作成
  const handleCreateFromTemplate = (type: string) => {
    onOpenModal('maintenance', { template: type });
  };
  
  // 車両画像変更
  const handleImageChange = () => {
    onOpenModal('change-car-image', { carId: car.id });
  };

  // ヘルスインジケータからのクイック追加
  const handleQuickAdd = (type: 'oil' | 'brake' | 'tire' | 'battery') => {
    const templateMap: Record<string, string> = {
      'oil': 'オイル交換',
      'brake': 'ブレーキパッド交換',
      'tire': 'タイヤ交換',
      'battery': 'バッテリー交換'
    };
    onOpenModal('maintenance', { template: templateMap[type] || type });
  };

  return (
    <div className="bg-gray-50 pb-16 overflow-x-hidden">
      {showPaywall && (
        <PaywallModal
          onClose={closePaywall}
          feature={paywallFeature}
          variant={paywallVariant}
        />
      )}

      <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-10 space-y-4 sm:space-y-6 lg:space-y-10">
        {/* 軽量アラート（車検・メンテ期限など） */}
        {(() => {
          const alerts: Array<React.ReactNode> = [];
          // 車検期限アラート
          if (inspectionDate) {
            const days = inspectionDaysLeft ?? null;
            if (days !== null) {
              if (days < 0) {
                alerts.push(
                  <div key="inspection-overdue" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg sm:rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                    <div className="text-xs sm:text-sm text-red-800">
                      車検期限が過ぎています（{Math.abs(days)}日前）。早めに更新手続きを行ってください。
                    </div>
                    <button
                      onClick={() => onOpenModal('maintenance')}
                      className="text-xs px-2 py-1 rounded-md bg-white border border-red-200 text-red-700 hover:bg-red-100 whitespace-nowrap self-start sm:self-auto"
                    >
                      対応する
                    </button>
                  </div>
                );
              } else if (days <= 60) {
                alerts.push(
                  <div key="inspection-soon" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg sm:rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2">
                    <div className="text-xs sm:text-sm text-yellow-900">
                      車検期限まで残り {days}日です。点検や準備を進めましょう。
                    </div>
                    <button
                      onClick={() => onOpenModal('maintenance')}
                      className="text-xs px-2 py-1 rounded-md bg-white border border-yellow-200 text-yellow-800 hover:bg-yellow-100 whitespace-nowrap self-start sm:self-auto"
                    >
                      点検を記録
                    </button>
                  </div>
                );
              }
            }
          }
          if (alerts.length === 0) return null;
          return <div className="space-y-2">{alerts}</div>;
        })()}

        <VehicleHeader
          car={car}
          latestMaintenance={latestMaintenance}
          onImageChange={handleImageChange}
        />

        <div className="space-y-4 sm:space-y-6 lg:space-y-8">
          {/* クイック操作 + ヘルスインジケータ + カスタムパーツ */}
          <div className="space-y-4 sm:space-y-6 lg:space-y-8 min-w-0">
            {/* クイック操作 */}
            {readOnly ? (
              <div className="rounded-xl sm:rounded-2xl border border-orange-200 bg-orange-50/90 p-4 sm:p-5 lg:p-6 text-orange-800 shadow-sm">
                <div className="flex items-start gap-2 sm:gap-3">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="font-semibold text-base sm:text-lg">
                      {car.status === 'sold' 
                        ? '売却済み車両（閲覧専用）' 
                        : car.status === 'scrapped' 
                        ? '廃車済み車両（閲覧専用）'
                        : car.status === 'downgraded_premium'
                        ? '閲覧専用（プラン制限）'
                        : '閲覧専用'}
                    </div>
                    {car.status === 'sold' && car.soldDate && (
                      <p className="text-sm text-orange-700">
                        売却日: {formatDateLabel(toJsDate(car.soldDate))}
                        {car.soldPrice && ` / 売却価格: ${formatCurrency(car.soldPrice)}`}
                        {car.soldTo && ` / 売却先: ${car.soldTo}`}
                      </p>
                    )}
                    {car.status === 'downgraded_premium' && car.downgradedAt && (
                      <p className="text-sm text-orange-700">
                        💡 無料プランでは1台のみ編集可能です。この車両は閲覧専用になりました。
                        <br />
                        <span className="text-xs">
                          （ダウングレード日: {formatDateLabel(toJsDate(car.downgradedAt))}）
                        </span>
                      </p>
                    )}
                    <p className="text-sm text-orange-700">
                      💡 過去データの閲覧・PDF出力は可能ですが、新規登録や編集はできません。
                      {car.status === 'downgraded_premium' && (
                        <span className="block mt-1 font-semibold">
                          🚀 プレミアムプランに再登録すると、すぐに編集可能になります。
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 lg:p-5 shadow-sm opacity-90">
                <SectionHeader
                  title="クイック操作"
                  subtitle="よく使う操作に素早くアクセス"
                  size="sm"
                />
                <div className="mt-3 sm:mt-4 -mx-1">
                  <QuickActions
                    actions={quickActions}
                    isPremium={isPremium}
                    onLockedClick={handleLockedAction}
                  />
                </div>
              </div>
            )}

            {/* 車両ヘルスインジケータ */}
            {!readOnly && (
              <div id="section-health" className="scroll-mt-24">
                <VehicleHealthIndicator
                  car={car}
                  maintenanceRecords={maintenanceRecords}
                  onQuickAdd={handleQuickAdd}
                />
              </div>
            )}
            
            <div id="section-custom" className="scroll-mt-24">
              <CustomPartsPanel
                customizations={customizations}
                onAddCustomization={(category) => {
                  onOpenModal('customization', { category });
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

