/**
 * プラン変更確認モーダル（有料→無料）
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { AlertTriangle, X, Loader2, Info } from 'lucide-react';

interface DowngradePlanModalProps {
  onClose: () => void;
  currentPlan: string;
}

export default function DowngradePlanModal({
  onClose,
  currentPlan,
}: DowngradePlanModalProps) {
  const router = useRouter();
  const [isDowngrading, setIsDowngrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDowngrade = async () => {
    try {
      setIsDowngrading(true);
      setError(null);

      const user = auth.currentUser;
      if (!user) {
        throw new Error('ログインが必要です');
      }

      const idToken = await user.getIdToken();

      const response = await fetch('/api/account/downgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = errorData.error || 'プラン変更に失敗しました';
        
        // 環境変数エラーの場合はより分かりやすいメッセージを表示
        if (errorMessage.includes('FIREBASE_SERVICE_ACCOUNT_BASE64') || 
            errorMessage.includes('サーバー設定エラー')) {
          errorMessage = 'サーバー設定エラーが発生しました。しばらく時間をおいてから再度お試しください。';
        } else if (errorMessage.includes('User document not found')) {
          // ユーザードキュメントが見つからない場合は、再試行を促す
          errorMessage = 'ユーザー情報が見つかりませんでした。ページをリロードしてから再度お試しください。';
        }
        
        throw new Error(errorMessage);
      }

      // 成功後、モーダルを閉じる
      // usePremiumフックのonSnapshotが自動的にFirestoreの更新を検知して反映する
      // リロードは不要（onSnapshotがリアルタイムで更新を検知する）
      onClose();
      
      // Firestoreの更新が反映されるまで少し待つ（onSnapshotが更新を検知する時間を確保）
      // ただし、リロードはしない（onSnapshotが自動的に反映する）
      // もし更新が反映されない場合は、ユーザーが手動でリロードできる
    } catch (err: any) {
      console.error('Plan downgrade error:', err);
      setError(err.message || 'プラン変更に失敗しました。もう一度お試しください。');
      setIsDowngrading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">無料プランに変更しますか？</h2>
            <button
              onClick={onClose}
              disabled={isDowngrading}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* 情報メッセージ */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2">データは保持されます</p>
                <p className="mb-2">以下の変更が行われます：</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700 mb-2">
                  <li>サブスクリプションが解約されます</li>
                  <li>無料プランに変更されます</li>
                  <li>すべてのデータは保持されます</li>
                </ul>
                <p className="font-medium mt-2">制限事項：</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>車両登録は1台まで</li>
                  <li>PDF出力とOCR機能は利用できません</li>
                  <li>高度なリマインダー機能は制限されます</li>
                </ul>
              </div>
            </div>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* ボタン */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isDowngrading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              キャンセル
            </button>
            <button
              onClick={handleDowngrade}
              disabled={isDowngrading}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isDowngrading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  変更中...
                </>
              ) : (
                '無料プランに変更する'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

