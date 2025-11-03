'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Car, MaintenanceRecord, FuelLog, Customization, InsurancePolicy } from '@/types';
import { usePremiumGuard } from '@/hooks/usePremium';
import { getDisplayAmount, getDisplayCost } from '@/lib/fuelLogs';
import { isPremiumPlan } from '@/lib/plan';
import VehicleHeader from './VehicleHeader';
import QuickActions from './QuickActions';
import NextMaintenanceSuggestion from './NextMaintenanceSuggestion';
import ContextualAd from './ContextualAd';
import VehicleSpecsPanel from './VehicleSpecsPanel';
import CustomPartsPanel from './CustomPartsPanel';
import PaywallModal from '../modals/PaywallModal';
import Breadcrumbs from '../Breadcrumbs';

interface MyCarPageProps {
  car: Car;
  maintenanceRecords: MaintenanceRecord[];
  fuelLogs: FuelLog[];
  customizations: Customization[];
  insurancePolicies: InsurancePolicy[];
  readOnly?: boolean; // READ ONLYモード（売却済み・廃車済み車両用）
  onOpenModal: (modalType: string, data?: any) => void;
}

export default function MyCarPage({
  car,
  maintenanceRecords,
  fuelLogs,
  customizations,
  insurancePolicies,
  readOnly = false,
  onOpenModal
}: MyCarPageProps) {
  const { userPlan, checkFeature, showPaywall, closePaywall, paywallFeature, paywallVariant } = usePremiumGuard();
  const isPremium = isPremiumPlan(userPlan);
  const searchParams = useSearchParams();

  const dayMs = 1000 * 60 * 60 * 24;

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
    const action = searchParams.get('action');
    const tab = searchParams.get('tab');
    
    console.log('[MyCarPage] Deep link detected:', { action, tab });
    
    if (action && !readOnly) {
      // アクション実行（編集不可モードではスキップ）
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
        case 'add-insurance':
          onOpenModal('insurance');
          break;
      }
    }
    
    // タブへのスクロール（将来実装）
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
  
  // アクティブな保険を取得
  const activeInsurance = useMemo(() => {
    if (insurancePolicies.length === 0) return undefined;
    const now = Date.now();
    return [...insurancePolicies]
      .filter((policy) => (toJsDate(policy.endDate)?.getTime() || 0) >= now)
      .sort((a, b) => {
        const aTime = toJsDate(a.startDate)?.getTime() || 0;
        const bTime = toJsDate(b.startDate)?.getTime() || 0;
        return bTime - aTime;
      })[0];
  }, [insurancePolicies]);

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
  const insuranceEndDate = activeInsurance ? toJsDate(activeInsurance.endDate) : null;
  const insuranceDaysLeft = insuranceEndDate ? Math.ceil((insuranceEndDate.getTime() - Date.now()) / dayMs) : null;

  const latestMaintenanceDate = latestMaintenance ? toJsDate(latestMaintenance.date) : null;

  const highlightCards = [
    {
      id: 'odo',
      icon: '🛣️',
      iconBg: 'bg-sky-100 text-sky-600',
      label: '総走行距離',
      value: car.odoKm ? `${formatNumber(car.odoKm)} km` : '---',
      description: car.avgKmPerMonth
        ? `月平均 ${formatNumber(car.avgKmPerMonth)} km`
        : 'ODOメーターを更新すると精度が上がります',
    },
    {
      id: 'fuel',
      icon: '⛽',
      iconBg: 'bg-amber-100 text-amber-600',
      label: '最新給油',
      value: latestFuelDate ? formatRelativeDate(latestFuelDate) : '記録なし',
      description:
        latestFuelLog && latestFuelAmount && latestFuelCost !== null
          ? `${formatNumber(latestFuelAmount.value, latestFuelAmount.unit === 'L' ? 1 : 0)}${latestFuelAmount.unit} / ${formatCurrency(latestFuelCost)}`
          : '給油を記録するとサマリーに表示されます',
    },
    {
      id: 'inspection',
      icon: '🗓️',
      iconBg: 'bg-purple-100 text-purple-600',
      label: '次回車検',
      value: inspectionDate ? formatCountdown(inspectionDate) : '未登録',
      description: inspectionDate
        ? `${formatDateLabel(inspectionDate)}まで`
        : '車検日を登録するとリマインドされます',
    },
    {
      id: 'maintenance',
      icon: '🔧',
      iconBg: 'bg-emerald-100 text-emerald-600',
      label: '直近メンテ',
      value: latestMaintenanceDate ? formatRelativeDate(latestMaintenanceDate) : '未実施',
      description:
        latestMaintenance?.title ||
        (maintenanceRecords.length ? '直近のメンテナンスにタイトルがありません' : 'メンテナンスを記録しましょう'),
    },
  ];

  const insightItems = [
    {
      id: 'insurance',
      label: '保険満了',
      value: insuranceEndDate ? formatDateLabel(insuranceEndDate) : '未登録',
      tone:
        insuranceEndDate && insuranceDaysLeft !== null
          ? insuranceDaysLeft <= 0
            ? 'text-red-600'
            : insuranceDaysLeft <= 30
            ? 'text-orange-600'
            : 'text-gray-900'
          : 'text-gray-400',
      helper: insuranceEndDate ? formatCountdown(insuranceEndDate) : '保険証券を登録すると期限を追跡します',
    },
    {
      id: 'maintenance-count',
      label: '登録済みメンテ',
      value: `${maintenanceRecords.length}件`,
      tone: maintenanceRecords.length ? 'text-gray-900' : 'text-gray-400',
      helper: latestMaintenanceDate
        ? `最終: ${formatDateLabel(latestMaintenanceDate)}`
        : '重要な作業は記録を残しましょう',
    },
    {
      id: 'customizations',
      label: 'カスタムパーツ',
      value: `${customizations.length}件`,
      tone: customizations.length ? 'text-gray-900' : 'text-gray-400',
      helper: customizations.length
        ? `累計投資: ${formatCurrency(totalCustomizationCost)}`
        : 'カスタムを追加して履歴を残しましょう',
    },
    {
      id: 'odo-insight',
      label: '現在ODO',
      value: car.odoKm ? `${formatNumber(car.odoKm)} km` : '未入力',
      tone: car.odoKm ? 'text-gray-900' : 'text-gray-400',
      helper: car.avgKmPerMonth
        ? `月平均 ${formatNumber(car.avgKmPerMonth)} km`
        : 'ODOを更新すると推定走行距離を算出します',
    },
  ];
 
  // クイックアクションの定義
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
      id: 'ocr',
      label: 'レシートOCR',
      icon: '📸',
      isPremium: true,
      onClick: () => onOpenModal('ocr')
    },
    {
      id: 'insurance',
      label: '保険を追加',
      icon: '🛡️',
      onClick: () => onOpenModal('insurance')
    },
    {
      id: 'edit-car',
      label: '車両情報編集',
      icon: '📝',
      onClick: () => onOpenModal('edit-car', { carId: car.id })
    },
    {
      id: 'share',
      label: 'PDF/共有',
      icon: '📤',
      isPremium: true,
      onClick: () => onOpenModal('share', { carId: car.id })
    }
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

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      {showPaywall && (
        <PaywallModal
          onClose={closePaywall}
          feature={paywallFeature}
          variant={paywallVariant}
        />
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <Breadcrumbs
          items={[
            { label: 'ダッシュボード', onClick: () => window.history.back() },
            { label: `${car.name}${car.modelCode ? ` (${car.modelCode})` : ''}` },
          ]}
        />

        <section className="relative overflow-hidden rounded-[32px] border border-gray-200 bg-white shadow-xl">
          <div className="absolute -top-32 -right-28 h-64 w-64 rounded-full bg-emerald-100/50 blur-3xl" />
          <div className="absolute -bottom-28 -left-32 h-72 w-72 rounded-full bg-sky-100/50 blur-3xl" />

          <div className="relative z-10 grid gap-8 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] p-6 sm:p-8">
            <div className="space-y-6">
              <VehicleHeader
                car={car}
                latestMaintenance={latestMaintenance}
                activeInsurance={activeInsurance}
                onImageChange={handleImageChange}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {highlightCards.map((card) => (
                  <div
                    key={card.id}
                    className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${card.iconBg}`}>
                        {card.icon}
                      </span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{card.label}</p>
                        <p className="mt-1 text-xl font-semibold text-gray-900">{card.value}</p>
                      </div>
                    </div>
                    {card.description && (
                      <p className="mt-3 text-sm leading-snug text-gray-500">{card.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {readOnly ? (
                <div className="rounded-2xl border border-orange-200 bg-orange-50/90 p-6 text-orange-800 shadow-sm">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="space-y-2">
                      <div className="font-semibold text-lg">
                        {car.status === 'sold' ? '売却済み車両（閲覧専用）' : '廃車済み車両（閲覧専用）'}
                      </div>
                      {car.status === 'sold' && car.soldDate && (
                        <p className="text-sm text-orange-700">
                          売却日: {formatDateLabel(toJsDate(car.soldDate))}
                          {car.soldPrice && ` / 売却価格: ${formatCurrency(car.soldPrice)}`}
                          {car.soldTo && ` / 売却先: ${car.soldTo}`}
                        </p>
                      )}
                      <p className="text-sm text-orange-700">
                        💡 過去データの閲覧は可能ですが、新規登録や編集はできません。
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">クイック操作</p>
                      <p className="mt-1 text-sm text-gray-500">よく使う操作に素早くアクセス</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <span>ショートカット</span>
                    </div>
                  </div>
                  <div className="mt-4 -mx-1">
                    <QuickActions
                      actions={quickActions}
                      isPremium={isPremium}
                      onLockedClick={handleLockedAction}
                    />
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">状況サマリー</p>
                <ul className="mt-4 space-y-4">
                  {insightItems.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{item.label}</p>
                        {item.helper && (
                          <p className="mt-1 text-xs leading-snug text-gray-500">{item.helper}</p>
                        )}
                      </div>
                      <span className={`text-sm font-semibold ${item.tone}`}>{item.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <div className="space-y-8">
            <div id="section-specs" className="scroll-mt-24">
              <VehicleSpecsPanel car={car} maintenanceRecords={maintenanceRecords} fuelLogs={fuelLogs} />
            </div>
            <div id="section-custom" className="scroll-mt-24">
              <CustomPartsPanel
                customizations={customizations}
                onAddCustomization={(category) => {
                  onOpenModal('customization', { category });
                }}
              />
            </div>
          </div>

          <div className="space-y-8">
            <div id="section-maintenance" className="scroll-mt-24">
              <NextMaintenanceSuggestion
                car={car}
                maintenanceRecords={maintenanceRecords}
                onCreateFromTemplate={handleCreateFromTemplate}
              />
            </div>
            <div>
              <ContextualAd car={car} isPremium={isPremium} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

