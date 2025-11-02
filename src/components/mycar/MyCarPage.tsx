'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Car, MaintenanceRecord, FuelLog, Customization, InsurancePolicy } from '@/types';
import { usePremiumGuard } from '@/hooks/usePremium';
import { toDate } from '@/lib/dateUtils';
import VehicleHeader from './VehicleHeader';
import QuickActions from './QuickActions';
import FuelAndPriceChart from './FuelAndPriceChart';
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
  const isPremium = userPlan === 'premium';
  const searchParams = useSearchParams();
  
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
    return maintenanceRecords
      .sort((a, b) => b.date.toMillis() - a.date.toMillis())[0];
  }, [maintenanceRecords]);
  
  // アクティブな保険を取得
  const activeInsurance = useMemo(() => {
    const now = new Date();
    return insurancePolicies
      .filter(p => p.endDate.toDate() >= now)
      .sort((a, b) => b.startDate.toMillis() - a.startDate.toMillis())[0];
  }, [insurancePolicies]);
  
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
      id: 'ocr',
      label: 'レシートOCR',
      icon: '📸',
      isPremium: true,
      onClick: () => onOpenModal('ocr')
    },
    {
      id: 'insurance',
      label: '保険証券を追加',
      icon: '🛡️',
      onClick: () => onOpenModal('insurance')
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-12">
      {/* ペイウォールモーダル */}
      {showPaywall && (
        <PaywallModal
          onClose={closePaywall}
          feature={paywallFeature}
          variant={paywallVariant}
        />
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* パンくずナビゲーション */}
        <Breadcrumbs 
          items={[
            { label: 'ダッシュボード', onClick: () => window.history.back() },
            { label: `${car.name}${car.modelCode ? ` (${car.modelCode})` : ''}` }
          ]} 
        />
        
        {/* 1. ヘッダー（車両カード・ミニヒーロー） */}
        <VehicleHeader
          car={car}
          latestMaintenance={latestMaintenance}
          activeInsurance={activeInsurance}
          onImageChange={handleImageChange}
        />
        
        {/* READ ONLYバナー（売却済み・廃車済み車両） */}
        {readOnly && (
          <div className="mb-4 p-4 bg-orange-50 border-2 border-orange-200 rounded-xl">
            <div className="flex items-center gap-3 text-orange-800 mb-2">
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <span className="font-bold text-lg">
                  {car.status === 'sold' ? '売却済み車両（閲覧専用）' : '廃車済み車両（閲覧専用）'}
                </span>
                {car.status === 'sold' && car.soldDate && (
                  <p className="text-sm text-orange-700 mt-1">
                    売却日: {toDate(car.soldDate)?.toLocaleDateString('ja-JP')}
                    {car.soldPrice && ` / 売却価格: ¥${car.soldPrice.toLocaleString()}`}
                    {car.soldTo && ` / 売却先: ${car.soldTo}`}
                  </p>
                )}
              </div>
            </div>
            <p className="text-sm text-orange-700">
              💡 過去データの閲覧は可能ですが、新規登録や編集はできません。
            </p>
          </div>
        )}
        
        {/* 2. クイックアクション（横スクロールの丸ボタン）※READ ONLYモードでは非表示 */}
        {!readOnly && (
          <QuickActions
            actions={quickActions}
            isPremium={isPremium}
            onLockedClick={handleLockedAction}
          />
        )}
        
        {/* 2.5. 車両データパネル（GTスタイル） */}
        <div id="section-specs">
          <VehicleSpecsPanel
            car={car}
            maintenanceRecords={maintenanceRecords}
            fuelLogs={fuelLogs}
          />
        </div>
        
        {/* 2.6. カスタムパーツ一覧 */}
        <div id="section-custom">
          <CustomPartsPanel
            customizations={customizations}
            onAddCustomization={(category) => {
              onOpenModal('customization', { category });
            }}
          />
        </div>
        
        {/* 3. 燃費・単価チャート */}
        <div id="section-fuel">
          <FuelAndPriceChart
            fuelLogs={fuelLogs}
          />
        </div>
        
        {/* 4. メンテ & カスタムの「次回提案」カード */}
        <div id="section-maintenance">
          <NextMaintenanceSuggestion
            car={car}
            maintenanceRecords={maintenanceRecords}
            onCreateFromTemplate={handleCreateFromTemplate}
          />
        </div>
        
        {/* 5. コンテキスト広告/アフィリ枠（無料ユーザーのみ） */}
        <ContextualAd
          car={car}
          isPremium={isPremium}
        />
      </div>
    </div>
  );
}

