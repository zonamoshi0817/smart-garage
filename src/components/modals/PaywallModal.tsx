'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  const modalRef = useRef<HTMLDivElement>(null);

  // モーダル表示をトラッキング
  useEffect(() => {
    logPaywallShown(feature || 'unknown', 'premium');
  }, [feature]);

  // Focus trap: モーダル内にフォーカスを閉じ込める
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // 初期フォーカスを設定
    firstElement?.focus();

    document.addEventListener('keydown', handleTabKey);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('keydown', handleTabKey);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);

  // 主要機能（最初に表示）
  const primaryFeatures: PremiumFeature[] = [
    'multiple_cars',
    'ocr_scan',
    'pdf_export'
  ];

  // その他の機能（「もっと見る」で表示）
  const secondaryFeatures: PremiumFeature[] = [
    'advanced_reminders',
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

  const handleUpgradeClick = async (plan: 'monthly' | 'yearly') => {
    logPaywallClick(feature || 'unknown', 'premium');
    logSubscribeStarted('premium', plan === 'monthly' ? 'monthly' : 'annual');

    try {
      // Firebase Auth から ID Token を取得
      const { auth } = await import('@/lib/firebase');
      const user = auth.currentUser;
      
      if (!user) {
        alert('ログインが必要です。');
        return;
      }

      const idToken = await user.getIdToken();

      // Checkout セッションを作成
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, idToken }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();

      // Stripe Checkout ページへリダイレクト
      window.location.href = url;
    } catch (error: any) {
      console.error('Failed to start checkout:', error);
      alert(`エラーが発生しました: ${error.message}`);
    }
  };

  // variant: minimal - シンプルな1機能訴求
  if (variant === 'minimal') {
    const featureDesc = feature ? PREMIUM_FEATURE_DESCRIPTIONS[feature] : null;
    
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60] animate-fadeIn">
        <div ref={modalRef} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
          <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl"
            >
              ×
            </button>
            <div className="text-center">
              <div className="text-5xl mb-4">🔒</div>
              <h2 id="paywall-title" className="text-2xl font-bold mb-2">プレミアム機能</h2>
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

            {/* プラン選択カード */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => setSelectedPlan('yearly')}
                className={`rounded-xl border-2 p-3 transition text-left ${
                  selectedPlan === 'yearly'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-900">年額</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                    お得
                  </span>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  ¥{PREMIUM_PRICING.yearly.price.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">月額換算 ¥400</div>
                <div className="text-xs font-semibold text-green-600 mt-1">
                  2ヶ月分無料
                </div>
              </button>
              
              <button
                onClick={() => setSelectedPlan('monthly')}
                className={`rounded-xl border-2 p-3 transition text-left ${
                  selectedPlan === 'monthly'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-xs font-bold text-gray-900 mb-1">月額</div>
                <div className="text-xl font-bold text-gray-900">
                  ¥{PREMIUM_PRICING.monthly.price.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">毎月課金</div>
              </button>
            </div>

            <button
              onClick={() => handleUpgradeClick(selectedPlan)}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 font-bold text-lg hover:shadow-lg transition"
            >
              {selectedPlan === 'yearly' ? '年額プラン' : '月額プラン'}で始める
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
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[60] animate-fadeIn">
        <div ref={modalRef} className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
          <div className="sticky top-0 z-10">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl z-10"
            >
              ×
            </button>

            {/* ヒーローセクション */}
            <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white text-center">
              <div className="text-5xl mb-3">🚗✨</div>
              <h2 id="paywall-title" className="text-3xl font-bold mb-3">
                もっと快適な<br />カーライフを
              </h2>
              <p className="text-white/90">
                プレミアムプランで、すべての機能を無制限に
              </p>
            </div>
          </div>

          {/* 機能一覧 */}
          <div className="p-6">
            {/* Free vs Premium 比較表（コンパクト版） */}
            <div className="mb-6 overflow-hidden rounded-xl border-2 border-gray-200">
              <div className="grid grid-cols-[1fr_auto_auto] gap-0 text-sm">
                {/* ヘッダー */}
                <div className="bg-gray-100 px-3 py-2 font-semibold text-gray-700 text-xs">機能</div>
                <div className="bg-gray-100 px-4 py-2 text-center font-semibold text-gray-700 border-l border-gray-200 text-xs">無料</div>
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-center font-semibold text-white border-l border-gray-200 text-xs">Premium</div>
                
                {/* 主要機能の比較 */}
                {primaryFeatures.map((feat, idx) => {
                  const desc = PREMIUM_FEATURE_DESCRIPTIONS[feat];
                  return (
                    <React.Fragment key={feat}>
                      <div className={`px-3 py-2 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-t border-gray-200`}>
                        <div className="font-medium text-gray-900 text-xs">{desc.title}</div>
                      </div>
                      <div className={`px-4 py-2 text-center ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-l border-t border-gray-200 text-xs text-gray-600`}>
                        {desc.freeLimit}
                      </div>
                      <div className={`px-4 py-2 text-center ${idx % 2 === 0 ? 'bg-blue-50' : 'bg-blue-100/50'} border-l border-t border-gray-200 font-semibold text-blue-700 text-xs`}>
                        {desc.premiumBenefit}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* プラン選択 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => setSelectedPlan('yearly')}
                className={`rounded-xl border-2 p-4 transition text-left ${
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
                  <span className="text-sm font-normal text-gray-500">/年</span>
                </div>
                <div className="text-sm text-gray-500">月額¥400相当</div>
                <div className="mt-1 text-xs font-semibold text-green-600">
                  💰 2ヶ月分無料
                </div>
              </button>

              <button
                onClick={() => setSelectedPlan('monthly')}
                className={`rounded-xl border-2 p-4 transition text-left ${
                  selectedPlan === 'monthly'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-bold text-gray-900 mb-1">月額</div>
                <div className="text-2xl font-bold text-gray-900">
                  ¥{PREMIUM_PRICING.monthly.price.toLocaleString()}
                  <span className="text-sm font-normal text-gray-500">/月</span>
                </div>
                <div className="text-sm text-gray-500">毎月課金</div>
              </button>
            </div>

            <button
              onClick={() => handleUpgradeClick(selectedPlan)}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 font-bold text-lg hover:shadow-xl transition"
            >
              {selectedPlan === 'yearly' ? '年額' : '月額'}プランを始める
            </button>

            <div className="text-center text-xs text-gray-500 mt-3">
              いつでもキャンセル可能
            </div>
          </div>
        </div>
      </div>
    );
  }

  // variant: default - 標準的なペイウォール
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60] animate-fadeIn">
      <div ref={modalRef} className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
        <div className="sticky top-0 bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white rounded-t-3xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl"
          >
            ×
          </button>
          <div className="text-center">
            <div className="text-5xl mb-3">🚀</div>
            <h2 id="paywall-title" className="text-3xl font-bold mb-2">プレミアムプラン</h2>
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
                <span className="text-sm font-normal text-gray-500">/年</span>
              </div>
              <div className="text-sm text-gray-500">月額換算 ¥400</div>
              <div className="mt-2 text-xs font-semibold text-green-600">
                💰 実質2ヶ月分無料（¥{(PREMIUM_PRICING.monthly.price * 12 - PREMIUM_PRICING.yearly.price).toLocaleString()}お得）
              </div>
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

          {/* Free vs Premium 比較表 */}
          <div className="overflow-hidden rounded-xl border-2 border-gray-200">
            <div className="grid grid-cols-[1fr_auto_auto] gap-0 text-sm">
              {/* ヘッダー */}
              <div className="bg-gray-100 px-3 py-2.5 font-semibold text-gray-700 text-xs">機能</div>
              <div className="bg-gray-100 px-4 py-2.5 text-center font-semibold text-gray-700 border-l border-gray-200 text-xs">無料</div>
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-center font-semibold text-white border-l border-gray-200 text-xs">Premium</div>
              
              {/* 主要機能の比較 */}
              {primaryFeatures.map((feat, idx) => {
                const desc = PREMIUM_FEATURE_DESCRIPTIONS[feat];
                const isHighlighted = feat === feature;
                return (
                  <React.Fragment key={feat}>
                    <div className={`px-3 py-2.5 ${isHighlighted ? 'bg-blue-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-t border-gray-200 ${isHighlighted ? 'border-l-4 border-l-blue-500' : ''}`}>
                      <div className="font-medium text-gray-900 text-xs">{desc.title}</div>
                    </div>
                    <div className={`px-4 py-2.5 text-center ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-l border-t border-gray-200 text-xs text-gray-600`}>
                      {desc.freeLimit}
                    </div>
                    <div className={`px-4 py-2.5 text-center ${idx % 2 === 0 ? 'bg-blue-50' : 'bg-blue-100/50'} border-l border-t border-gray-200 font-semibold text-blue-700 text-xs`}>
                      {desc.premiumBenefit}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* 機能一覧 */}
          <div className="space-y-3">
            {!showAllFeatures && (
              <button
                onClick={() => setShowAllFeatures(true)}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2"
              >
                さらに{secondaryFeatures.length}個の機能を見る ↓
              </button>
            )}
            
            {showAllFeatures && secondaryFeatures.map((feat) => {
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
          </div>

          {/* アップグレードボタン */}
          <div className="space-y-3">
            <button
              onClick={() => handleUpgradeClick(selectedPlan)}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 font-bold text-lg hover:shadow-lg transition"
            >
              {selectedPlan === 'yearly' ? '年額プラン' : '月額プラン'}で始める
            </button>

            <div className="text-center text-xs text-gray-500">
              いつでもキャンセル可能 • 安全な決済
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

