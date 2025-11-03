/**
 * 決済成功ページ
 * 
 * Stripe Checkout から戻ってきたときに表示される
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // カウントダウン
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl w-full text-center">
        {/* 成功アイコン */}
        <div className="mb-6">
          <div className="w-24 h-24 bg-green-100 rounded-full mx-auto flex items-center justify-center">
            <svg
              className="w-12 h-12 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* メッセージ */}
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🎉 ようこそプレミアムへ！
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          サブスクリプションの登録が完了しました。<br />
          7日間の無料トライアルをお楽しみください！
        </p>

        {/* 機能一覧 */}
        <div className="bg-blue-50 rounded-xl p-6 mb-8">
          <h2 className="font-bold text-gray-900 mb-4">利用可能になった機能</h2>
          <div className="grid grid-cols-2 gap-3 text-left">
            {[
              '🚗 無制限の車両登録',
              '📄 PDF出力',
              '🔗 共有URL',
              '📸 OCRスキャン',
              '🔔 高度なリマインダー',
              '📊 データ分析',
              '🎯 広告非表示',
              '⭐ 優先サポート',
            ].map((feature) => (
              <div key={feature} className="flex items-center space-x-2">
                <span className="text-green-600 text-xl">✓</span>
                <span className="text-sm text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* セッション情報（デバッグ用） */}
        {sessionId && (
          <div className="text-xs text-gray-400 mb-6">
            Session ID: {sessionId}
          </div>
        )}

        {/* リダイレクトメッセージ */}
        <div className="text-sm text-gray-500 mb-6">
          {countdown}秒後にダッシュボードに戻ります...
        </div>

        {/* ボタン */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push('/')}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 font-bold hover:shadow-lg transition"
          >
            今すぐ始める
          </button>
          <button
            onClick={() => router.push('/settings/billing')}
            className="rounded-xl border-2 border-gray-300 text-gray-700 px-8 py-3 font-bold hover:border-gray-400 transition"
          >
            請求情報を確認
          </button>
        </div>

        {/* 注意事項 */}
        <div className="mt-8 text-xs text-gray-500">
          ※ 7日間の無料トライアル終了後、自動的に課金が開始されます。<br />
          いつでもキャンセル可能です。
        </div>
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="text-white text-xl">読み込み中...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}

