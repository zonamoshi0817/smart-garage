'use client';

import { useState, useEffect, useMemo } from 'react';
import { Car, MaintenanceRecord, FuelLog, Customization, InsurancePolicy } from '@/types';
import { usePremiumGuard } from '@/hooks/usePremium';
import VehicleHeader from './VehicleHeader';
import QuickActions from './QuickActions';
import VehicleHealthIndicator from './VehicleHealthIndicator';
import ActivityTimeline from './ActivityTimeline';
import CostAndFuelDashboard from './CostAndFuelDashboard';
import FuelAndPriceChart from './FuelAndPriceChart';
import NextMaintenanceSuggestion from './NextMaintenanceSuggestion';
import DocumentsAndDrafts from './DocumentsAndDrafts';
import ShareAndPDF from './ShareAndPDF';
import ContextualAd from './ContextualAd';
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
      onClick: () => handleGeneratePDF()
    },
    {
      id: 'share',
      label: '共有リンク',
      icon: '🔗',
      isPremium: true,
      onClick: () => handleGenerateShareLink()
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
  
  // ヘルスインジケータからの1タップ追加
  const handleQuickAddMaintenance = (type: string) => {
    onOpenModal('maintenance', { type });
  };
  
  // アクティビティの詳細表示
  const handleViewActivityDetails = (type: string, id: string) => {
    onOpenModal(`${type}-detail`, { id });
  };
  
  // アクティビティの複製
  const handleDuplicateActivity = (type: string, id: string) => {
    onOpenModal(`${type}-duplicate`, { id });
  };
  
  // メンテナンステンプレートから作成
  const handleCreateFromTemplate = (type: string) => {
    onOpenModal('maintenance', { template: type });
  };
  
  // OCRドラフトの確定
  const handleConfirmDraft = (draftId: string) => {
    onOpenModal('confirm-draft', { draftId });
  };
  
  // ドキュメント表示
  const handleViewDocument = (documentId: string) => {
    onOpenModal('view-document', { documentId });
  };
  
  // 検証ページ表示
  const handleViewVerification = (verificationId: string) => {
    window.open(`/verification/${verificationId}`, '_blank');
  };
  
  // PDF生成
  const handleGeneratePDF = () => {
    if (!checkFeature('pdf_export')) return;
    onOpenModal('generate-pdf', { carId: car.id });
  };
  
  // 共有リンク生成
  const handleGenerateShareLink = () => {
    if (!checkFeature('share_links')) return;
    onOpenModal('generate-share-link', { carId: car.id });
  };
  
  // 共有リンク失効
  const handleRevokeShareLink = () => {
    onOpenModal('revoke-share-link', { carId: car.id });
  };
  
  // 車両画像変更
  const handleImageChange = () => {
    onOpenModal('change-car-image', { carId: car.id });
  };
  
  // ダミーデータ（実際にはFirestoreから取得）
  const dummyDrafts: any[] = [];
  const dummyDocuments: any[] = [];
  const dummyShareLink = undefined;

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
        
        {/* 3. 車両ヘルスインジケータ */}
        <VehicleHealthIndicator
          car={car}
          maintenanceRecords={maintenanceRecords}
          onQuickAdd={handleQuickAddMaintenance}
        />
        
        {/* 4. 直近の活動タイムライン */}
        <ActivityTimeline
          maintenanceRecords={maintenanceRecords}
          fuelLogs={fuelLogs}
          customizations={customizations}
          insurancePolicies={insurancePolicies}
          onViewDetails={handleViewActivityDetails}
          onDuplicate={handleDuplicateActivity}
        />
        
        {/* 5. コスト & 燃費ミニダッシュボード */}
        <CostAndFuelDashboard
          maintenanceRecords={maintenanceRecords}
          fuelLogs={fuelLogs}
          insurancePolicies={insurancePolicies}
        />
        
        {/* 6. 燃費・単価チャート */}
        <FuelAndPriceChart
          fuelLogs={fuelLogs}
        />
        
        {/* 7. メンテ & カスタムの「次回提案」カード */}
        <NextMaintenanceSuggestion
          car={car}
          maintenanceRecords={maintenanceRecords}
          onCreateFromTemplate={handleCreateFromTemplate}
        />
        
        {/* 8. ドキュメント & OCRドラフト */}
        <DocumentsAndDrafts
          drafts={dummyDrafts}
          documents={dummyDocuments}
          onConfirmDraft={handleConfirmDraft}
          onViewDocument={handleViewDocument}
          onViewVerification={handleViewVerification}
        />
        
        {/* 9. 共有 & PDF */}
        <ShareAndPDF
          carId={car.id!}
          shareLink={dummyShareLink}
          onGeneratePDF={handleGeneratePDF}
          onGenerateShareLink={handleGenerateShareLink}
          onRevokeShareLink={handleRevokeShareLink}
          onViewVerificationPage={() => window.open('/verification', '_blank')}
        />
        
        {/* 10. コンテキスト広告/アフィリ枠（無料ユーザーのみ） */}
        <ContextualAd
          car={car}
          isPremium={isPremium}
        />
      </div>
    </div>
  );
}

