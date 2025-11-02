'use client';

import { useState, useEffect, useMemo } from 'react';
import { Car, MaintenanceRecord, FuelLog, Customization, InsurancePolicy } from '@/types';
import { usePremiumGuard } from '@/hooks/usePremium';
import VehicleHeader from './VehicleHeader';
import QuickActions from './QuickActions';
import FuelAndPriceChart from './FuelAndPriceChart';
import NextMaintenanceSuggestion from './NextMaintenanceSuggestion';
import ContextualAd from './ContextualAd';
import VehicleSpecsPanel from './VehicleSpecsPanel';
import CustomPartsPanel from './CustomPartsPanel';
import PaywallModal from '../modals/PaywallModal';

interface MyCarPageProps {
  car: Car;
  maintenanceRecords: MaintenanceRecord[];
  fuelLogs: FuelLog[];
  customizations: Customization[];
  insurancePolicies: InsurancePolicy[];
  onOpenModal: (modalType: string, data?: any) => void;
}

export default function MyCarPage({
  car,
  maintenanceRecords,
  fuelLogs,
  customizations,
  insurancePolicies,
  onOpenModal
}: MyCarPageProps) {
  const { userPlan, checkFeature, showPaywall, closePaywall, paywallFeature, paywallVariant } = usePremiumGuard();
  const isPremium = userPlan === 'premium';
  
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
      id: 'pdf',
      label: 'PDF出力',
      icon: '📄',
      isPremium: true,
      onClick: () => onOpenModal('pdf')
    },
    {
      id: 'share',
      label: '共有リンク',
      icon: '🔗',
      isPremium: true,
      onClick: () => onOpenModal('share')
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
        {/* 1. ヘッダー（車両カード・ミニヒーロー） */}
        <VehicleHeader
          car={car}
          latestMaintenance={latestMaintenance}
          activeInsurance={activeInsurance}
          isPremium={isPremium}
          onImageChange={handleImageChange}
        />
        
        {/* 2. クイックアクション（横スクロールの丸ボタン） */}
        <QuickActions
          actions={quickActions}
          isPremium={isPremium}
          onLockedClick={handleLockedAction}
        />
        
        {/* 2.5. 車両データパネル（GTスタイル） */}
        <VehicleSpecsPanel
          car={car}
          maintenanceRecords={maintenanceRecords}
          fuelLogs={fuelLogs}
        />
        
        {/* 2.6. カスタムパーツ一覧 */}
        <CustomPartsPanel
          customizations={customizations}
          onAddCustomization={(category) => {
            onOpenModal('customization', { category });
          }}
        />
        
        {/* 3. 燃費・単価チャート */}
        <FuelAndPriceChart
          fuelLogs={fuelLogs}
        />
        
        {/* 4. メンテ & カスタムの「次回提案」カード */}
        <NextMaintenanceSuggestion
          car={car}
          maintenanceRecords={maintenanceRecords}
          onCreateFromTemplate={handleCreateFromTemplate}
        />
        
        {/* 5. コンテキスト広告/アフィリ枠（無料ユーザーのみ） */}
        <ContextualAd
          car={car}
          isPremium={isPremium}
        />
      </div>
    </div>
  );
}

