/**
 * 売却用リンク管理ページ
 * /vehicles/[vehicleId]/sale-mode
 * 売却用リンクの作成・管理、分類ウィザード実行
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { enableSaleMode, disableSaleMode, updateSaleProfileVisibility } from '@/lib/saleProfileManager';
import { watchMaintenanceRecords } from '@/lib/maintenance';
import SaleModeWizard from '@/components/SaleModeWizard';
import type { MaintenanceRecord, SaleProfile } from '@/types';
import { updateDoc, serverTimestamp } from 'firebase/firestore';

export default function SaleModePage() {
  return (
    <AuthGate>
      <SaleModeContent />
    </AuthGate>
  );
}

function SaleModeContent() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.vehicleId as string;
  const [car, setCar] = useState<any>(null);
  const [saleProfile, setSaleProfile] = useState<SaleProfile | null>(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !vehicleId) return;

    // 車両情報を取得
    const loadCar = async () => {
      const carDoc = await getDoc(doc(db, 'users', user.uid, 'cars', vehicleId));
      if (carDoc.exists()) {
        const carData = { id: carDoc.id, ...carDoc.data() };
        setCar(carData);

        // activeSaleProfileIdがある場合はsaleProfileを取得
        if (carData.activeSaleProfileId) {
          const saleProfileDoc = await getDoc(doc(db, 'saleProfiles', carData.activeSaleProfileId));
          if (saleProfileDoc.exists()) {
            setSaleProfile({ id: saleProfileDoc.id, ...saleProfileDoc.data() } as SaleProfile);
          }
        }
      }
      setLoading(false);
    };

    loadCar();

    // メンテナンス記録を監視
    const unsubscribe = watchMaintenanceRecords(vehicleId, (records) => {
      setMaintenanceRecords(records);
    });

    return () => unsubscribe();
  }, [vehicleId]);

  const handleEnableSaleMode = async () => {
    if (!auth.currentUser) return;

    try {
      setUpdating(true);
      const saleProfileId = await enableSaleMode(vehicleId, {
        visibility: 'unlisted',
        includeEvidence: true,
        includeAmounts: false,
        highlightTopN: 10,
        analyticsEnabled: true,
      });

      // saleProfileを再取得
      const saleProfileDoc = await getDoc(doc(db, 'saleProfiles', saleProfileId));
      if (saleProfileDoc.exists()) {
        setSaleProfile({ id: saleProfileDoc.id, ...saleProfileDoc.data() } as SaleProfile);
      }

      // 車両情報を再取得
      const carDoc = await getDoc(doc(db, 'users', auth.currentUser.uid, 'cars', vehicleId));
      if (carDoc.exists()) {
        setCar({ id: carDoc.id, ...carDoc.data() });
      }

      // 分類ウィザードを表示
      setShowWizard(true);
    } catch (error: any) {
      console.error('Failed to enable sale mode:', error);
      alert(`売却用リンクの作成に失敗しました: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleDisableSaleMode = async () => {
    if (!auth.currentUser) return;

    if (!confirm('売却用リンクを停止しますか？公開ページは404になります。')) {
      return;
    }

    try {
      setUpdating(true);
      await disableSaleMode(vehicleId);
      setSaleProfile(null);
      const carDoc = await getDoc(doc(db, 'users', auth.currentUser.uid, 'cars', vehicleId));
      if (carDoc.exists()) {
        setCar({ id: carDoc.id, ...carDoc.data() });
      }
    } catch (error: any) {
      console.error('Failed to disable sale mode:', error);
      alert(`売却用リンクの停止に失敗しました: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateVisibility = async (visibility: 'unlisted' | 'public' | 'disabled') => {
    if (!saleProfile) return;

    try {
      setUpdating(true);
      await updateSaleProfileVisibility(saleProfile.id!, visibility);
      
      if (visibility === 'disabled') {
        setSaleProfile(null);
        const carDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid, 'cars', vehicleId));
        if (carDoc.exists()) {
          setCar({ id: carDoc.id, ...carDoc.data() });
        }
      } else {
        // saleProfileを再取得
        const saleProfileDoc = await getDoc(doc(db, 'saleProfiles', saleProfile.id!));
        if (saleProfileDoc.exists()) {
          setSaleProfile({ id: saleProfileDoc.id, ...saleProfileDoc.data() } as SaleProfile);
        }
      }
    } catch (error: any) {
      console.error('Failed to update visibility:', error);
      alert(`公開範囲の更新に失敗しました: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleWizardComplete = async (classifications: Map<string, {
    category?: string;
    isPreventive?: boolean;
    typeTag?: 'receipt_backed' | 'owner_log' | 'other';
  }>) => {
    if (!auth.currentUser) return;

    try {
      setUpdating(true);

      // 分類結果をMaintenanceRecordに反映
      const updates = Array.from(classifications.entries()).map(([recordId, classification]) => {
        const recordRef = doc(db, 'users', auth.currentUser!.uid, 'maintenance', recordId);
        return updateDoc(recordRef, {
          category: classification.category || 'other',
          isPreventive: classification.isPreventive || false,
          typeTag: classification.typeTag || 'owner_log',
          updatedBy: auth.currentUser!.uid,
          updatedAt: serverTimestamp(),
        });
      });

      await Promise.all(updates);
      setShowWizard(false);
      alert('分類が完了しました');
    } catch (error: any) {
      console.error('Failed to save classifications:', error);
      alert(`分類の保存に失敗しました: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  if (!car) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-gray-600">車両が見つかりません</div>
      </div>
    );
  }

  // 未分類レコードを確認（直近12ヶ月）
  const recentRecords = maintenanceRecords.filter(record => {
    const recordDate = record.date?.toDate?.() || (record.date as any) instanceof Date
      ? (record.date as any)
      : new Date(record.date as any);
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);
    return recordDate >= twelveMonthsAgo;
  });

  const unclassifiedRecords = recentRecords.filter(record => !record.category);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">売却用リンク</h1>

        {!saleProfile ? (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700 mb-4">
                売却用リンクを作成すると、査定用の公開ページが作成されます。
              </p>
              {unclassifiedRecords.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    直近12ヶ月に未分類のメンテナンス記録が{unclassifiedRecords.length}件あります。
                    リンク作成時に分類ウィザードが表示されます。
                  </p>
                </div>
              )}
              <button
                onClick={handleEnableSaleMode}
                disabled={updating}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                売却用リンクを作成
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-green-800">売却用リンク：有効</span>
                <button
                  onClick={handleDisableSaleMode}
                  disabled={updating}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                >
                  売却用リンクを停止
                </button>
              </div>
              <p className="text-sm text-green-700">
                公開URL: <a
                  href={`/s/${saleProfile.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  /s/{saleProfile.slug}
                </a>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                公開範囲
              </label>
              <p className="text-xs text-gray-500 mb-3">
                リンクを知っている人だけがアクセスできます（推奨: unlisted）。検索エンジンにはインデックスされません。
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateVisibility('unlisted')}
                  disabled={updating || saleProfile.visibility === 'unlisted'}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    saleProfile.visibility === 'unlisted'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  } disabled:opacity-50`}
                >
                  unlisted（推奨）
                </button>
                <button
                  onClick={() => handleUpdateVisibility('public')}
                  disabled={updating || saleProfile.visibility === 'public'}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    saleProfile.visibility === 'public'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  } disabled:opacity-50`}
                >
                  public（公開）
                </button>
                <button
                  onClick={() => handleUpdateVisibility('disabled')}
                  disabled={updating || saleProfile.visibility === 'disabled'}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    saleProfile.visibility === 'disabled'
                      ? 'bg-red-50 border-red-500 text-red-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  } disabled:opacity-50`}
                >
                  disabled（非公開）
                </button>
              </div>
            </div>

            {unclassifiedRecords.length > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 mb-2">
                  未分類のメンテナンス記録が{unclassifiedRecords.length}件あります。
                </p>
                <button
                  onClick={() => setShowWizard(true)}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  分類ウィザードを実行
                </button>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => router.push(`/vehicles/${vehicleId}/evidence`)}
                className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                証跡を管理
              </button>
              <button
                onClick={() => router.push(`/vehicles/${vehicleId}/evidence/upload`)}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                証跡をアップロード
              </button>
            </div>
          </div>
        )}
      </div>

      {showWizard && (
        <SaleModeWizard
          records={maintenanceRecords}
          onComplete={handleWizardComplete}
          onCancel={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}
