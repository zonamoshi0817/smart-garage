/**
 * アカウント設定ページ
 * 
 * - アカウント情報の表示
 * - アカウント削除機能
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, updateUserProfile } from '@/lib/firebase';
import { usePremium } from '@/hooks/usePremium';
import { getPlanDisplayName } from '@/lib/plan';
import DeleteAccountModal from '@/components/modals/DeleteAccountModal';
import Logo from '@/components/common/Logo';
import { AlertTriangle, User, Mail, Calendar, CreditCard, Edit2, Check, X, Loader2 } from 'lucide-react';

export default function AccountPage() {
  const router = useRouter();
  const { userPlan, isLoading: premiumLoading } = usePremium();
  const [user, setUser] = useState(auth.currentUser);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [createdAt, setCreatedAt] = useState<Date | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
      
      if (currentUser?.metadata.creationTime) {
        setCreatedAt(new Date(currentUser.metadata.creationTime));
      }
      
      // 表示名を初期化
      if (currentUser) {
        setDisplayName(currentUser.displayName || '');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleStartEditName = () => {
    setDisplayName(user?.displayName || '');
    setIsEditingName(true);
    setNameError(null);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setDisplayName(user?.displayName || '');
    setNameError(null);
  };

  const handleSaveName = async () => {
    if (!user) return;

    const trimmedName = displayName.trim();
    
    // バリデーション
    if (trimmedName.length > 50) {
      setNameError('名前は50文字以内で入力してください');
      return;
    }

    setIsUpdatingName(true);
    setNameError(null);

    try {
      await updateUserProfile(trimmedName);
      // ユーザー情報を更新
      setUser(auth.currentUser);
      setIsEditingName(false);
    } catch (error: any) {
      console.error('Failed to update name:', error);
      setNameError('名前の更新に失敗しました。もう一度お試しください。');
    } finally {
      setIsUpdatingName(false);
    }
  };

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
              {/* 表示名 */}
              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <User className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-500 mb-1">表示名</div>
                    {isEditingName ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          disabled={isUpdatingName}
                          maxLength={50}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="表示名を入力"
                          autoFocus
                        />
                        {nameError && (
                          <p className="text-sm text-red-600">{nameError}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSaveName}
                            disabled={isUpdatingName}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isUpdatingName ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                保存中...
                              </>
                            ) : (
                              <>
                                <Check className="h-4 w-4" />
                                保存
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleCancelEditName}
                            disabled={isUpdatingName}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <X className="h-4 w-4" />
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-base font-medium text-gray-900 truncate">
                          {user.displayName || user.email?.split('@')[0] || '未設定'}
                        </div>
                        <button
                          onClick={handleStartEditName}
                          className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                        >
                          <Edit2 className="h-4 w-4" />
                          編集
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

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

