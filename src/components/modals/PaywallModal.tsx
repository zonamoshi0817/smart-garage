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

      // 強制的に新しいトークンを取得（trueを渡すと強制リフレッシュ）
      let idToken = await user.getIdToken(true);

      if (!idToken) {
        throw new Error('ID Tokenの取得に失敗しました。再度ログインしてください。');
      }

      // ID Tokenの前後の空白を削除（改行やスペースが含まれている可能性がある）
      idToken = idToken.trim();

      // ID Tokenの形式を確認（JWT形式: header.payload.signature）
      if (!idToken || typeof idToken !== 'string' || idToken.split('.').length !== 3) {
        console.error('Invalid ID Token format:', {
          hasToken: !!idToken,
          type: typeof idToken,
          length: idToken?.length,
          parts: idToken?.split('.').length,
        });
        throw new Error('ID Tokenの形式が正しくありません。ページをリロードして再度お試しください。');
      }

      console.log('ID Token obtained:', {
        length: idToken.length,
        parts: idToken.split('.').length,
        prefix: idToken.substring(0, 20),
      });

      // Checkout セッションを作成
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, idToken }),
      });

      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch (e) {
          // JSONパースに失敗した場合
          const text = await response.text();
          console.error('Failed to parse error response:', text);
          errorData = { error: `Server error (${response.status}): ${text.substring(0, 200)}` };
        }
        
        const errorMessage = errorData.error || 'Failed to create checkout session';
        const errorCode = errorData.code;
        const errorDetails = errorData.details;
        
        console.error('Checkout session creation failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          code: errorCode,
          type: errorData.type,
          details: errorDetails,
          fullError: errorData,
          responseHeaders: Object.fromEntries(response.headers.entries()),
        });
        
        // Stripe APIエラーの場合
        if (errorCode || errorData.type?.startsWith('Stripe')) {
          let userMessage = errorMessage;
          
          // 接続エラーの場合は再試行を促す
          if (errorData.type === 'StripeConnectionError' || errorData.type === 'StripeAPIError' || errorData.retryable) {
            userMessage = 'Stripeへの接続に失敗しました。\n\nしばらく待ってから再度お試しください。';
          } else if (errorCode === 'resource_missing') {
            userMessage = '価格情報が見つかりません。管理者にお問い合わせください。';
          } else if (errorDetails) {
            userMessage += `\n\n詳細: ${errorDetails}`;
          }
          
          alert(userMessage);
          return;
        }
        
        // 認証エラーの場合は、より詳細なメッセージを表示
        if (errorMessage.includes('authentication') || errorMessage.includes('token') || errorMessage.includes('認証')) {
          console.error('Authentication error:', errorMessage);
          // 開発環境での詳細なメッセージ
          if (process.env.NODE_ENV === 'development') {
            alert('認証エラーが発生しました。\n\n開発環境では、.env.localにFIREBASE_SERVICE_ACCOUNT_BASE64を設定する必要があります。\n\n本番環境では正常に動作します。');
          } else {
            alert('認証に失敗しました。ページをリロードして再度お試しください。');
          }
          return;
        }
        
        // サーバー設定エラーの場合
        if (errorMessage.includes('FIREBASE_SERVICE_ACCOUNT') || errorMessage.includes('サーバー設定') || errorMessage.includes('Firebase Admin SDK')) {
          console.error('Server configuration error:', errorMessage);
          if (process.env.NODE_ENV === 'development') {
            alert(
              '開発環境の設定が必要です。\n\n' +
              'Stripe Checkoutを使用するには、.env.localに以下の環境変数を設定してください：\n\n' +
              '1. FIREBASE_SERVICE_ACCOUNT_BASE64\n' +
              '2. FIREBASE_PROJECT_ID\n' +
              '3. STRIPE_SECRET_KEY\n' +
              '4. NEXT_PUBLIC_PRICE_MONTHLY\n' +
              '5. NEXT_PUBLIC_PRICE_YEARLY\n\n' +
              '詳細は docs/STRIPE_CHECKOUT_SETUP.md を参照してください。'
            );
          } else {
            alert('サーバー設定エラーが発生しました。管理者にお問い合わせください。');
          }
          return;
        }
        
        // その他のエラー
        alert(`エラーが発生しました: ${errorMessage}${errorDetails ? `\n\n詳細: ${errorDetails}` : ''}`);
        throw new Error(errorMessage);
      }

      const { url } = await response.json();

      if (!url) {
        throw new Error('Checkout URLの取得に失敗しました。');
      }

      // Stripe Checkout ページへリダイレクト
      window.location.href = url;
    } catch (error: any) {
      console.error('Failed to start checkout:', error);
      const errorMessage = error.message || 'エラーが発生しました';
      alert(`エラーが発生しました: ${errorMessage}`);
    }
  };

  // variant: minimal - シンプルな1機能訴求
  if (variant === 'minimal') {
    const featureDesc = feature ? PREMIUM_FEATURE_DESCRIPTIONS[feature] : null;
    
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60] animate-fadeIn">
        <div ref={modalRef} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
          <div className="relative bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-8 text-white overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16"></div>
            </div>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/90 hover:text-white text-2xl z-10 transition"
            >
              ×
            </button>
            <div className="relative text-center">
              <h2 id="paywall-title" className="text-2xl font-extrabold mb-2">プレミアム機能</h2>
              {featureDesc && (
                <p className="text-white/95 text-sm">{featureDesc.description}</p>
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
                className={`relative rounded-xl border-2 p-3 transition-all text-left ${
                  selectedPlan === 'yearly'
                    ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md scale-105'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                {selectedPlan === 'yearly' && (
                  <div className="absolute -top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    お得
                  </div>
                )}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-900">年額</span>
                </div>
                <div className="text-xl font-extrabold text-gray-900">
                  ¥{PREMIUM_PRICING.yearly.price.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600">月額約¥{Math.round(PREMIUM_PRICING.yearly.price / 12).toLocaleString()}相当</div>
                <div className="text-xs font-semibold text-green-600 mt-1">
                  2ヶ月分無料
                </div>
              </button>
              
              <button
                onClick={() => setSelectedPlan('monthly')}
                className={`rounded-xl border-2 p-3 transition-all text-left ${
                  selectedPlan === 'monthly'
                    ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md scale-105'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="text-xs font-bold text-gray-900 mb-1">月額</div>
                <div className="text-xl font-extrabold text-gray-900">
                  ¥{PREMIUM_PRICING.monthly.price.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600">毎月課金</div>
              </button>
            </div>

            <button
              onClick={() => handleUpgradeClick(selectedPlan)}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white py-3 font-bold text-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
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
            <div className="relative bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-10 text-white text-center overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -ml-24 -mb-24"></div>
              </div>
              <div className="relative">
                <h2 id="paywall-title" className="text-3xl sm:text-4xl font-extrabold mb-3 leading-tight">
                  もっと快適な<br />カーライフを
                </h2>
                <p className="text-white/95 text-base">
                  プレミアムプランで、すべての機能を無制限に
                </p>
              </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setSelectedPlan('yearly')}
                className={`relative rounded-2xl border-2 p-5 transition-all text-left ${
                  selectedPlan === 'yearly'
                    ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg scale-105'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                {selectedPlan === 'yearly' && (
                  <div className="absolute -top-3 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                    おすすめ
                  </div>
                )}
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-gray-900 text-sm">年額プラン</span>
                </div>
                <div className="text-3xl font-extrabold text-gray-900 mb-1">
                  ¥{PREMIUM_PRICING.yearly.price.toLocaleString()}
                  <span className="text-lg font-normal text-gray-500">/年</span>
                </div>
                <div className="text-sm text-gray-600 mb-2">月額約¥{Math.round(PREMIUM_PRICING.yearly.price / 12).toLocaleString()}相当</div>
                <div className="text-xs font-semibold text-green-600">
                  実質2ヶ月分無料
                </div>
              </button>

              <button
                onClick={() => setSelectedPlan('monthly')}
                className={`rounded-2xl border-2 p-5 transition-all text-left ${
                  selectedPlan === 'monthly'
                    ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg scale-105'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className="font-bold text-gray-900 mb-2 text-sm">月額プラン</div>
                <div className="text-3xl font-extrabold text-gray-900 mb-1">
                  ¥{PREMIUM_PRICING.monthly.price.toLocaleString()}
                  <span className="text-lg font-normal text-gray-500">/月</span>
                </div>
                <div className="text-sm text-gray-600">毎月自動課金</div>
              </button>
            </div>

            <button
              onClick={() => handleUpgradeClick(selectedPlan)}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white py-4 font-bold text-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
            >
              {selectedPlan === 'yearly' ? '年額プラン' : '月額プラン'}で始める
            </button>

            <div className="text-center text-xs text-gray-500 mt-4">
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
        <div className="sticky top-0 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-8 text-white rounded-t-3xl overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white rounded-full -mr-24 -mt-24"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full -ml-16 -mb-16"></div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/90 hover:text-white text-2xl z-10 transition"
          >
            ×
          </button>
          <div className="relative text-center">
            <h2 id="paywall-title" className="text-3xl font-extrabold mb-2">プレミアムプラン</h2>
            <p className="text-white/95">すべての機能を無制限に使えます</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* プラン選択 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setSelectedPlan('yearly')}
              className={`relative rounded-2xl border-2 p-5 transition-all ${
                selectedPlan === 'yearly'
                  ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg scale-105'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              {selectedPlan === 'yearly' && (
                <div className="absolute -top-3 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                  おすすめ
                </div>
              )}
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-gray-900 text-sm">年額プラン</span>
              </div>
              <div className="text-3xl font-extrabold text-gray-900 mb-1">
                ¥{PREMIUM_PRICING.yearly.price.toLocaleString()}
                <span className="text-lg font-normal text-gray-500">/年</span>
              </div>
              <div className="text-sm text-gray-600 mb-2">月額約¥{Math.round(PREMIUM_PRICING.yearly.price / 12).toLocaleString()}相当</div>
              <div className="text-xs font-semibold text-green-600">
                実質2ヶ月分無料
              </div>
            </button>

            <button
              onClick={() => setSelectedPlan('monthly')}
              className={`rounded-2xl border-2 p-5 transition-all ${
                selectedPlan === 'monthly'
                  ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg scale-105'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="font-bold text-gray-900 mb-2 text-sm">月額プラン</div>
              <div className="text-3xl font-extrabold text-gray-900 mb-1">
                ¥{PREMIUM_PRICING.monthly.price.toLocaleString()}
                <span className="text-lg font-normal text-gray-500">/月</span>
              </div>
              <div className="text-sm text-gray-600">毎月自動課金</div>
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
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white py-4 font-bold text-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
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

