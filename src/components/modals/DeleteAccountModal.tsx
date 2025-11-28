/**
 * アカウント削除確認モーダル
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { UserPlan } from '@/lib/premium';

interface DeleteAccountModalProps {
  onClose: () => void;
  userEmail: string;
  userPlan: UserPlan;
}

export default function DeleteAccountModal({
  onClose,
  userEmail,
  userPlan,
}: DeleteAccountModalProps) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiredText = '削除';
  const isConfirmValid = confirmText === requiredText;

  const handleDelete = async () => {
    if (!isConfirmValid) return;

    try {
      setIsDeleting(true);
      setError(null);

      const user = auth.currentUser;
      if (!user) {
        throw new Error('ログインが必要です');
      }

      const idToken = await user.getIdToken();

      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'アカウント削除に失敗しました';
        
        // 環境変数エラーの場合はより分かりやすいメッセージを表示
        if (errorMessage.includes('FIREBASE_SERVICE_ACCOUNT_BASE64') || 
            errorMessage.includes('サーバー設定エラー')) {
          throw new Error('サーバー設定エラーが発生しました。しばらく時間をおいてから再度お試しください。');
        }
        
        throw new Error(errorMessage);
      }

      // 削除成功後、ログアウトしてトップページへ
      await auth.signOut();
      router.push('/');
    } catch (err: any) {
      console.error('Account deletion error:', err);
      setError(err.message || 'アカウント削除に失敗しました。もう一度お試しください。');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">アカウントを削除しますか？</h2>
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* 警告メッセージ */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-medium mb-2">この操作は取り消せません</p>
                <p className="mb-2">以下のデータが完全に削除されます：</p>
                <ul className="list-disc list-inside space-y-1 text-red-700 mb-2">
                  <li>すべての車両情報</li>
                  <li>メンテナンス記録</li>
                  <li>給油記録とカスタム記録</li>
                  <li>アップロードした画像</li>
                  <li>アカウント情報</li>
                </ul>
                {userPlan !== 'free' && (
                  <p className="text-xs text-red-600 mt-2">
                    ※ プレミアムプランに加入している場合、サブスクリプションは自動的に解約されません。
                    プラン変更（有料→無料）は請求管理ページから行ってください。
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 確認入力 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              確認のため、「<span className="font-mono font-bold">{requiredText}</span>」と入力してください
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={isDeleting}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder={requiredText}
            />
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
              disabled={isDeleting}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              キャンセル
            </button>
            <button
              onClick={handleDelete}
              disabled={!isConfirmValid || isDeleting}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  削除中...
                </>
              ) : (
                'アカウントを削除する'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

