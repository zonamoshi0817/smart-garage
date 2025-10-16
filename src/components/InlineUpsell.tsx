import React, { useState } from 'react';

interface InlineUpsellProps {
  type: 'photo' | 'pdf' | 'share' | 'export';
  onUpgrade?: () => void;
  className?: string;
}

export default function InlineUpsell({ 
  type, 
  onUpgrade,
  className = ""
}: InlineUpsellProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const getUpsellContent = () => {
    switch (type) {
      case 'photo':
        return {
          icon: '🔒',
          text: '高解像度写真はプレミアムで保存できます',
          tooltip: 'プレミアムでは：\n• 無制限の高解像度写真保存\n• 自動バックアップ\n• クラウド同期',
          buttonText: 'プレミアムにアップグレード'
        };
      case 'pdf':
        return {
          icon: '📄',
          text: 'PDF出力はプレミアム機能です',
          tooltip: 'プレミアムでは：\n• メンテナンス履歴のPDF出力\n• カスタムレポート\n• 印刷用フォーマット',
          buttonText: 'PDF機能を有効化'
        };
      case 'share':
        return {
          icon: '🔗',
          text: '共有リンクはプレミアム機能です',
          tooltip: 'プレミアムでは：\n• 安全な共有リンク生成\n• アクセス権限管理\n• 有効期限設定',
          buttonText: '共有機能を有効化'
        };
      case 'export':
        return {
          icon: '📊',
          text: 'データエクスポートはプレミアム機能です',
          tooltip: 'プレミアムでは：\n• CSV/Excel形式でのエクスポート\n• 全データの一括ダウンロード\n• データ移行支援',
          buttonText: 'エクスポート機能を有効化'
        };
      default:
        return {
          icon: '⭐',
          text: 'この機能はプレミアムで利用できます',
          tooltip: 'プレミアム機能の詳細をご確認ください',
          buttonText: 'プレミアムにアップグレード'
        };
    }
  };

  const content = getUpsellContent();

  return (
    <div className={`relative ${className}`}>
      {/* インラインアップセル */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{content.icon}</span>
            <span className="text-sm text-gray-700">{content.text}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* ツールチップボタン */}
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="text-blue-600 hover:text-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            
            {/* アップグレードボタン */}
            <button
              onClick={onUpgrade}
              className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              {content.buttonText}
            </button>
          </div>
        </div>
      </div>

      {/* ツールチップ */}
      {showTooltip && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 z-20 shadow-lg">
          <div className="whitespace-pre-line">{content.tooltip}</div>
          {/* 矢印 */}
          <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
        </div>
      )}
    </div>
  );
}

// ロックアイコン付き機能用のコンポーネント
interface LockedFeatureProps {
  feature: string;
  benefits: string[];
  onUpgrade?: () => void;
  className?: string;
}

export function LockedFeature({ 
  feature, 
  benefits, 
  onUpgrade,
  className = ""
}: LockedFeatureProps) {
  const [showBenefits, setShowBenefits] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <div 
        className="flex items-center space-x-2 text-gray-500 cursor-pointer hover:text-gray-700 transition-colors"
        onMouseEnter={() => setShowBenefits(true)}
        onMouseLeave={() => setShowBenefits(false)}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span className="text-sm">{feature}</span>
      </div>

      {/* ベネフィットツールチップ */}
      {showBenefits && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg p-3 z-20 shadow-lg">
          <h4 className="font-medium text-gray-900 mb-2">プレミアム機能</h4>
          <ul className="space-y-1">
            {benefits.map((benefit, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-center space-x-2">
                <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="mt-3 w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              プレミアムにアップグレード
            </button>
          )}
        </div>
      )}
    </div>
  );
}

