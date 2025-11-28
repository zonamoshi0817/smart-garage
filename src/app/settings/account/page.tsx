/**
 * アカウント設定ページ
 * 
 * - アカウント情報の表示
 * - アカウント削除機能
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { usePremium } from '@/hooks/usePremium';
import { getPlanDisplayName } from '@/lib/plan';
import DeleteAccountModal from '@/components/modals/DeleteAccountModal';
import Logo from '@/components/common/Logo';
import { AlertTriangle, User, Mail, Calendar, CreditCard } from 'lucide-react';

export default function AccountPage() {
  const router = useRouter();
  const { userPlan, isLoading: premiumLoading } = usePremium();
  const [user, setUser] = useState(auth.currentUser);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [createdAt, setCreatedAt] = useState<Date | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
      
      if (currentUser?.metadata.creationTime) {
        setCreatedAt(new Date(currentUser.metadata.creationTime));
      }
    });

    return () => unsubscribe();
  }, []);

  if (isLoading || premiumLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* ロゴ */}
        <div className="mb-6">
          <Logo size="md" />
        </div>
        
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">アカウント設定</h1>
              <p className="text-gray-600">アカウント情報の確認と管理</p>
            </div>
            <a
              href="/settings/billing"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              請求管理 →
            </a>
          </div>
        </div>

        <div className="space-y-6">
          {/* アカウント情報 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <User className="h-5 w-5" />
              アカウント情報
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">メールアドレス</div>
                    <div className="text-base font-medium text-gray-900">{user.email}</div>
                  </div>
                </div>
              </div>

              {createdAt && (
                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">登録日</div>
                      <div className="text-base font-medium text-gray-900">
                        {createdAt.toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">現在のプラン</div>
                    <div className="text-base font-medium text-gray-900">
                      {getPlanDisplayName(userPlan)}
                    </div>
                  </div>
                </div>
                <a
                  href="/settings/billing"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  請求管理へ →
                </a>
              </div>
            </div>
          </div>

          {/* データ管理 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">データ管理</h2>
            <p className="text-sm text-gray-600 mb-4">
              アカウントを削除すると、すべてのデータが完全に削除されます。この操作は取り消せません。
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">削除されるデータ</p>
                  <ul className="list-disc list-inside space-y-1 text-yellow-700">
                    <li>車両情報とメンテナンス記録</li>
                    <li>給油記録とカスタム記録</li>
                    <li>アップロードした画像</li>
                    <li>アカウント情報</li>
                  </ul>
                  <p className="mt-2 text-xs text-yellow-700">
                    ※ プレミアムプランに加入している場合でも、アカウント削除時はサブスクリプションは自動的に解約されません。
                    プラン変更（有料→無料）は請求管理ページから行ってください。
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="rounded-lg bg-red-600 text-white px-6 py-3 font-bold hover:bg-red-700 transition-colors"
            >
              アカウントを削除する
            </button>
          </div>
        </div>
      </div>

      {/* アカウント削除モーダル */}
      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          userEmail={user.email || ''}
          userPlan={userPlan}
        />
      )}
    </div>
  );
}

