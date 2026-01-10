/**
 * 決済キャンセルページ
 * 
 * Stripe Checkout からキャンセルして戻ってきたときに表示される
 */

'use client';

import { useRouter } from 'next/navigation';

export default function BillingCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-lg p-12 max-w-2xl w-full text-center">
        {/* アイコン */}
        <div className="mb-6">
          <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto flex items-center justify-center">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        </div>

        {/* メッセージ */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          決済がキャンセルされました
        </h1>
        <p className="text-gray-600 mb-8">
          サブスクリプションの登録はキャンセルされました。<br />
          いつでも再度お試しいただけます。
        </p>

        {/* 無料プランでできること */}
        <div className="bg-gray-50 rounded-xl p-6 mb-8">
          <h2 className="font-bold text-gray-900 mb-4">無料プランでできること</h2>
          <div className="space-y-2 text-left text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <span className="text-blue-600">✓</span>
              <span>1台の車両登録</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-blue-600">✓</span>
              <span>基本的なメンテナンス記録</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-blue-600">✓</span>
              <span>給油ログの管理</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-blue-600">✓</span>
              <span>基本的なリマインダー（5件まで）</span>
            </div>
          </div>
        </div>

        {/* ボタン */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push('/home')}
            className="rounded-xl bg-blue-600 text-white px-8 py-3 font-bold hover:bg-blue-700 transition"
          >
            ホームに戻る
          </button>
          <button
            onClick={() => router.push('/settings/billing')}
            className="rounded-xl border-2 border-gray-300 text-gray-700 px-8 py-3 font-bold hover:border-gray-400 transition"
          >
            プランを見る
          </button>
        </div>

        {/* サポート */}
        <div className="mt-8 text-sm text-gray-500">
          質問がありますか？{' '}
          <a href="mailto:kobayashi0817@gmail.com" className="text-blue-600 hover:underline">
            サポートに問い合わせる
          </a>
        </div>
      </div>
    </div>
  );
}



