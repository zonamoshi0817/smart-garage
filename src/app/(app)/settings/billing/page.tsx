/**
 * 請求管理ページ
 * 
 * - 現在のプラン表示
 * - サブスクリプションステータス
 * - 次回請求日
 * - カスタマーポータルへのリンク
 * - プランのアップグレード/ダウングレード
 */

'use client';

import '../../home/home.css';

import { useState } from 'react';
import { usePremium } from '@/hooks/usePremium';
import { auth } from '@/lib/firebase';
import {
  getPlanDisplayName,
  getSubscriptionStatusDisplayName,
  getSubscriptionStatusColor,
  formatNextBillingDate,
} from '@/lib/plan';
import { PREMIUM_PRICING } from '@/lib/premium';
import PaywallModal from '@/components/modals/PaywallModal';
import DowngradePlanModal from '@/components/modals/DowngradePlanModal';
import Logo from '@/components/common/Logo';

export default function BillingPage() {
  const {
    userPlan,
    isLoading,
    subscriptionStatus,
    currentPeriodEnd,
    stripeCustomerId,
    cancelAtPeriodEnd,
    isPremium,
  } = usePremium();

  const [showPaywall, setShowPaywall] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  /**
   * カスタマーポータルを開く
   */
  const openCustomerPortal = async () => {
    try {
      setIsOpeningPortal(true);

      const user = auth.currentUser;
      if (!user) {
        alert('ログインが必要です。');
        return;
      }

      const idToken = await user.getIdToken();

      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error: any) {
      console.error('Failed to open customer portal:', error);
      alert(`エラーが発生しました: ${error.message}`);
      setIsOpeningPortal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="app-home min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a1a18] mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-home min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* ロゴ */}
        <div className="mb-6">
          <Logo size="md" />
        </div>
        
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">請求管理</h1>
              <p className="text-gray-600">プランの管理と請求情報の確認</p>
            </div>
            <a
              href="/settings/account"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              アカウント設定 →
            </a>
          </div>
        </div>

        <div className="space-y-6">
          {/* 現在のプラン */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">現在のプラン</h2>
              {isPremium && stripeCustomerId && (
                <button
                  onClick={openCustomerPortal}
                  disabled={isOpeningPortal}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                  {isOpeningPortal ? '開いています...' : '請求情報を管理 →'}
                </button>
              )}
            </div>

            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {getPlanDisplayName(userPlan)}
                  </span>
                  {subscriptionStatus && (
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-medium ${getSubscriptionStatusColor(
                        subscriptionStatus
                      )}`}
                    >
                      {getSubscriptionStatusDisplayName(subscriptionStatus)}
                    </span>
                  )}
                </div>

                {isPremium && currentPeriodEnd && (
                  <div className="text-sm text-gray-600 space-y-1">
                    {cancelAtPeriodEnd ? (
                      <p className="text-yellow-600 font-medium">
                        ⚠️ {formatNextBillingDate(currentPeriodEnd)} に無料プランに戻ります
                      </p>
                    ) : (
                      <p>次回請求日: {formatNextBillingDate(currentPeriodEnd)}</p>
                    )}
                  </div>
                )}

                {!isPremium && (
                  <p className="text-sm text-gray-600">
                    プレミアムプランにアップグレードして、すべての機能を利用できます
                  </p>
                )}
              </div>

              {!isPremium && (
                <button
                  onClick={() => setShowPaywall(true)}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 font-bold hover:shadow-lg transition"
                >
                  プレミアムにする
                </button>
              )}
            </div>
          </div>

          {/* 無料プランでできること */}
          {!isPremium && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">無料プランでできること</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { icon: '🚗', title: '車両登録', desc: '1台まで' },
                  { icon: '📝', title: '記録管理', desc: '給油・メンテ・カスタムの記録' },
                  { icon: '📊', title: 'グラフ・ホーム', desc: 'データの可視化' },
                  { icon: '📎', title: '証憑アップロード', desc: '月1枚まで' },
                  { icon: '🔔', title: 'リマインダー', desc: '5件まで' },
                ].map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-4 rounded-xl bg-gray-50"
                  >
                    <div className="text-2xl">{feature.icon}</div>
                    <div>
                      <div className="font-bold text-gray-900">{feature.title}</div>
                      <div className="text-sm text-gray-600">{feature.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* プレミアム機能一覧 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">プレミアム機能</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: '🚗', title: '無制限の車両登録', desc: '何台でも登録可能' },
                { icon: '📄', title: 'PDF出力', desc: 'メンテナンス履歴をPDF化' },
                { icon: '📸', title: 'OCRスキャン', desc: 'レシートを自動読み取り' },
                { icon: '📊', title: 'データ分析', desc: '詳細な統計レポート' },
                { icon: '⭐', title: '優先サポート', desc: '専任サポート対応' },
                { icon: '📎', title: '証憑アップロード無制限', desc: '領収書等を無制限でアップロード' },
              ].map((feature, index) => (
                <div
                  key={index}
                  className={`flex items-start space-x-3 p-4 rounded-xl transition ${
                    isPremium ? 'bg-blue-50' : 'bg-gray-50'
                  }`}
                >
                  <div className="text-2xl">{feature.icon}</div>
                  <div>
                    <div className="font-bold text-gray-900">{feature.title}</div>
                    <div className="text-sm text-gray-600">{feature.desc}</div>
                  </div>
                  {isPremium && (
                    <div className="ml-auto text-green-600 text-xl">✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* プランの価格 */}
          {!isPremium && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">プラン料金</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 transition">
                  <div className="font-bold text-gray-900 mb-2">月額プラン</div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    ¥{PREMIUM_PRICING.monthly.price.toLocaleString()}
                    <span className="text-lg font-normal text-gray-500">/月</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-4">毎月課金</div>
                  <button
                    onClick={() => setShowPaywall(true)}
                    className="w-full rounded-lg bg-blue-600 text-white py-2 font-bold hover:bg-blue-700 transition"
                  >
                    月額で始める
                  </button>
                </div>

                <div className="border-2 border-blue-500 rounded-xl p-6 relative">
                  <div className="absolute -top-3 right-4 bg-green-500 text-white text-xs px-3 py-1 rounded-full font-bold">
                    16%お得
                  </div>
                  <div className="font-bold text-gray-900 mb-2">年額プラン</div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    ¥{PREMIUM_PRICING.yearly.price.toLocaleString()}
                    <span className="text-lg font-normal text-gray-500">/年</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-4">月額換算 ¥{Math.round(PREMIUM_PRICING.yearly.price / 12).toLocaleString()}</div>
                  <button
                    onClick={() => setShowPaywall(true)}
                    className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 font-bold hover:shadow-lg transition"
                  >
                    年額で始める
                  </button>
                </div>
              </div>
              <div className="mt-4 text-center text-sm text-gray-500">
                いつでもキャンセル可能
              </div>
            </div>
          )}

          {/* プラン変更（プレミアムユーザー向け） */}
          {isPremium && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">プラン変更</h2>
              <p className="text-sm text-gray-600 mb-4">
                無料プランに変更すると、サブスクリプションが解約されます。すべてのデータは保持されます。
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">無料プランに変更すると：</p>
                    <ul className="list-disc list-inside space-y-1 text-yellow-700">
                      <li>車両登録は1台まで</li>
                      <li>PDF出力とOCR機能は利用できません</li>
                      <li>証憑アップロードは月1枚まで</li>
                    </ul>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowDowngradeModal(true)}
                className="w-full rounded-lg border-2 border-gray-300 bg-white text-gray-700 px-6 py-3 font-bold hover:bg-gray-50 transition-colors"
              >
                無料プランに変更する
              </button>
            </div>
          )}

          {/* カスタマーポータルボタン（プレミアムユーザー向け） */}
          {isPremium && stripeCustomerId && (
            <div className="bg-blue-50 rounded-xl p-6 text-center">
              <h3 className="font-bold text-gray-900 mb-2">請求情報の管理</h3>
              <p className="text-sm text-gray-600 mb-4">
                Stripe カスタマーポータルで以下の操作ができます：
              </p>
              <ul className="text-sm text-gray-600 mb-6 space-y-1">
                <li>✓ 支払い方法の変更</li>
                <li>✓ 請求履歴の確認</li>
                <li>✓ 領収書のダウンロード</li>
              </ul>
              <button
                onClick={openCustomerPortal}
                disabled={isOpeningPortal}
                className="rounded-xl bg-blue-600 text-white px-8 py-3 font-bold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isOpeningPortal ? '開いています...' : '請求情報を管理'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ペイウォールモーダル */}
      {showPaywall && (
        <PaywallModal onClose={() => setShowPaywall(false)} variant="hero" />
      )}

      {/* プラン変更モーダル */}
      {showDowngradeModal && (
        <DowngradePlanModal
          onClose={() => setShowDowngradeModal(false)}
          currentPlan={getPlanDisplayName(userPlan)}
        />
      )}
    </div>
  );
}


