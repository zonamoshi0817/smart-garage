'use client';

import { useState, useEffect } from 'react';
import { PREMIUM_FEATURE_DESCRIPTIONS, PREMIUM_PRICING, PremiumFeature } from '@/lib/premium';
import { logPaywallShown, logPaywallClick, logSubscribeStarted } from '@/lib/analytics';

interface PaywallModalProps {
  onClose: () => void;
  feature?: PremiumFeature; // トリガーとなった機能
  variant?: 'default' | 'minimal' | 'hero'; // A/Bテスト用
}

export default function PaywallModal({ onClose, feature, variant = 'default' }: PaywallModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  // モーダル表示をトラッキング
  useEffect(() => {
    logPaywallShown(feature || 'unknown', 'premium');
  }, [feature]);

  // 主要機能（最初に表示）
  const primaryFeatures: PremiumFeature[] = [
    'multiple_cars',
    'pdf_export',
    'share_links',
    'advanced_reminders'
  ];

  // その他の機能（「もっと見る」で表示）
  const secondaryFeatures: PremiumFeature[] = [
    'receipt_auto_save',
    'unlimited_snooze',
    'auto_next_reminder',
    'multiple_recommendations',
    'filter_display',
    'data_analytics',
    'priority_support',
    'ad_free'
  ];

  const displayedFeatures = showAllFeatures 
    ? [...primaryFeatures, ...secondaryFeatures] 
    : primaryFeatures;

  const handleUpgradeClick = (plan: 'monthly' | 'yearly') => {
    logPaywallClick(feature || 'unknown', 'premium');
    logSubscribeStarted('premium', plan === 'monthly' ? 'monthly' : 'annual');

    // TODO: 決済フローへ遷移
    alert(`${plan === 'monthly' ? '月額' : '年額'}プランへのアップグレードを開始します。\n（決済システムは未実装）`);
  };

  // variant: minimal - シンプルな1機能訴求
  if (variant === 'minimal') {
    const featureDesc = feature ? PREMIUM_FEATURE_DESCRIPTIONS[feature] : null;
    
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-8 text-white">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl"
            >
              ×
            </button>
            <div className="text-center">
              <div className="text-5xl mb-4">🔒</div>
              <h2 className="text-2xl font-bold mb-2">プレミアム機能</h2>
              {featureDesc && (
                <p className="text-white/90 text-sm">{featureDesc.description}</p>
              )}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {featureDesc && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">無料プラン</span>
                  <span className="text-gray-900 font-medium">{featureDesc.freeLimit}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-gray-600">プレミアム</span>
                  <span className="text-blue-600 font-bold">{featureDesc.premiumBenefit}</span>
                </div>
              </div>
            )}

            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                ¥{PREMIUM_PRICING.monthly.price.toLocaleString()}
                <span className="text-lg font-normal text-gray-500">/月</span>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                または年額¥{PREMIUM_PRICING.yearly.price.toLocaleString()}（16%お得）
              </div>
            </div>

            <button
              onClick={() => handleUpgradeClick('monthly')}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 font-bold text-lg hover:shadow-lg transition"
            >
              今すぐアップグレード
            </button>

            <button
              onClick={onClose}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              あとで
            </button>
          </div>
        </div>
      </div>
    );
  }

  // variant: hero - 大きなヒーロー訴求
  if (variant === 'hero') {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fadeIn">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl z-10"
          >
            ×
          </button>

          {/* ヒーローセクション */}
          <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 p-12 text-white text-center">
            <div className="text-6xl mb-4">🚗✨</div>
            <h2 className="text-4xl font-bold mb-4">
              もっと快適な<br />カーライフを
            </h2>
            <p className="text-white/90 text-lg">
              プレミアムプランで、すべての機能を無制限に
            </p>
          </div>

          {/* 機能一覧 */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {primaryFeatures.map((feat) => {
                const desc = PREMIUM_FEATURE_DESCRIPTIONS[feat];
                return (
                  <div key={feat} className="flex items-start space-x-3 bg-gray-50 rounded-xl p-4">
                    <div className="text-2xl">✓</div>
                    <div>
                      <div className="font-bold text-gray-900">{desc.title}</div>
                      <div className="text-sm text-gray-600">{desc.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* プラン選択 */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setSelectedPlan('yearly')}
                className={`flex-1 rounded-xl border-2 p-4 transition ${
                  selectedPlan === 'yearly'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-gray-900">年額プラン</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                    16%お得
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  ¥{PREMIUM_PRICING.yearly.price.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">月額¥400相当</div>
              </button>

              <button
                onClick={() => setSelectedPlan('monthly')}
                className={`flex-1 rounded-xl border-2 p-4 transition ${
                  selectedPlan === 'monthly'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-bold text-gray-900 mb-1">月額プラン</div>
                <div className="text-2xl font-bold text-gray-900">
                  ¥{PREMIUM_PRICING.monthly.price.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">毎月課金</div>
              </button>
            </div>

            <button
              onClick={() => handleUpgradeClick(selectedPlan)}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 font-bold text-lg hover:shadow-xl transition"
            >
              {selectedPlan === 'yearly' ? '年額' : '月額'}プランを始める
            </button>

            <div className="text-center text-xs text-gray-500 mt-4">
              7日間無料トライアル • いつでもキャンセル可能
            </div>
          </div>
        </div>
      </div>
    );
  }

  // variant: default - 標準的なペイウォール
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-br from-blue-600 to-purple-600 p-6 text-white rounded-t-3xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl"
          >
            ×
          </button>
          <div className="text-center">
            <div className="text-5xl mb-3">🚀</div>
            <h2 className="text-3xl font-bold mb-2">プレミアムプラン</h2>
            <p className="text-white/90">すべての機能を無制限に使えます</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* プラン選択 */}
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedPlan('yearly')}
              className={`flex-1 rounded-xl border-2 p-4 transition ${
                selectedPlan === 'yearly'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-gray-900">年額</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                  おすすめ
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                ¥{PREMIUM_PRICING.yearly.price.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">月額換算 ¥400</div>
            </button>

            <button
              onClick={() => setSelectedPlan('monthly')}
              className={`flex-1 rounded-xl border-2 p-4 transition ${
                selectedPlan === 'monthly'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-bold text-gray-900 mb-1">月額</div>
              <div className="text-2xl font-bold text-gray-900">
                ¥{PREMIUM_PRICING.monthly.price.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">毎月課金</div>
            </button>
          </div>

          {/* 機能一覧 */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-900 text-lg">プレミアム機能</h3>
            {displayedFeatures.map((feat) => {
              const desc = PREMIUM_FEATURE_DESCRIPTIONS[feat];
              const isHighlighted = feat === feature;
              
              return (
                <div
                  key={feat}
                  className={`flex items-start space-x-3 p-3 rounded-xl transition ${
                    isHighlighted ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="text-blue-600 text-xl mt-0.5">✓</div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900">{desc.title}</div>
                    <div className="text-sm text-gray-600">{desc.description}</div>
                    <div className="flex gap-2 mt-1 text-xs">
                      <span className="text-red-600">無料: {desc.freeLimit}</span>
                      <span className="text-gray-400">→</span>
                      <span className="text-blue-600 font-bold">プレミアム: {desc.premiumBenefit}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {!showAllFeatures && (
              <button
                onClick={() => setShowAllFeatures(true)}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2"
              >
                さらに{secondaryFeatures.length}個の機能を見る ↓
              </button>
            )}
          </div>

          {/* アップグレードボタン */}
          <div className="space-y-3">
            <button
              onClick={() => handleUpgradeClick(selectedPlan)}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 font-bold text-lg hover:shadow-lg transition"
            >
              {selectedPlan === 'yearly' ? '年額プラン' : '月額プラン'}で始める
            </button>

            <div className="text-center text-xs text-gray-500">
              7日間無料トライアル • いつでもキャンセル可能 • 安全な決済
            </div>

            <button
              onClick={onClose}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
            >
              無料プランで続ける
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

