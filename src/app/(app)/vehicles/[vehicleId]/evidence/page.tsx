/**
 * 証跡一覧・管理ページ
 * /vehicles/[vehicleId]/evidence
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { auth, db, storage } from '@/lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Evidence } from '@/types';
import EvidenceMaskEditor from '@/components/EvidenceMaskEditor';

export default function EvidenceListPage() {
  return (
    <AuthGate>
      <EvidenceListContent />
    </AuthGate>
  );
}

function EvidenceListContent() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.vehicleId as string;
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [remaskingId, setRemaskingId] = useState<string | null>(null);
  const [remaskImageUrl, setRemaskImageUrl] = useState<string | null>(null);
  const [remaskStoragePath, setRemaskStoragePath] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser || !vehicleId) return;
    loadEvidences();
  }, [vehicleId]);

  const loadEvidences = async () => {
    if (!auth.currentUser) return;

    try {
      setLoading(true);
      const q = query(
        collection(db, 'evidences'),
        where('vehicleId', '==', vehicleId),
        where('ownerUid', '==', auth.currentUser.uid),
        where('deletedAt', '==', null)
      );

      const snapshot = await getDocs(q);
      const evidenceList: Evidence[] = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        evidenceList.push({
          id: docSnap.id,
          vehicleId: data.vehicleId,
          saleProfileId: data.saleProfileId,
          recordId: data.recordId,
          storagePath: data.storagePath,
          maskedStoragePath: data.maskedStoragePath,
          maskStatus: data.maskStatus,
          maskPolicyVersion: data.maskPolicyVersion,
          ownerUid: data.ownerUid,
          createdBy: data.createdBy,
          updatedBy: data.updatedBy,
          deletedAt: data.deletedAt || null,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as Evidence);
      }

      // 作成日時でソート（新しい順）
      evidenceList.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || (a.createdAt as any)?._seconds || 0;
        const timeB = b.createdAt?.toMillis?.() || (b.createdAt as any)?._seconds || 0;
        return timeB - timeA;
      });

      setEvidences(evidenceList);
    } catch (error: any) {
      console.error('Failed to load evidences:', error);
      alert(`証跡の読み込みに失敗しました: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (evidenceId: string, storagePath: string, maskedStoragePath?: string) => {
    if (!auth.currentUser) return;
    if (!confirm('この証跡を削除しますか？')) return;

    try {
      setDeletingId(evidenceId);

      // Firestoreの証跡ドキュメントを削除（論理削除）
      await updateDoc(doc(db, 'evidences', evidenceId), {
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser.uid,
      });

      // Storageから画像を削除
      try {
        const originalRef = ref(storage, storagePath);
        await deleteObject(originalRef);
      } catch (error) {
        console.warn('Failed to delete original image:', error);
      }

      if (maskedStoragePath) {
        try {
          const maskedRef = ref(storage, maskedStoragePath);
          await deleteObject(maskedRef);
        } catch (error) {
          console.warn('Failed to delete masked image:', error);
        }
      }

      // 一覧を更新
      await loadEvidences();
      alert('証跡を削除しました');
    } catch (error: any) {
      console.error('Failed to delete evidence:', error);
      alert(`証跡の削除に失敗しました: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRemask = async (evidence: Evidence) => {
    if (!evidence.storagePath) return;

    try {
      // 元画像のURLを取得
      const storageRef = ref(storage, evidence.storagePath);
      const imageUrl = await getDownloadURL(storageRef);
      
      setRemaskImageUrl(imageUrl);
      setRemaskStoragePath(evidence.storagePath);
      setRemaskingId(evidence.id!);
    } catch (error: any) {
      console.error('Failed to load image for remask:', error);
      alert(`画像の読み込みに失敗しました: ${error.message}`);
    }
  };

  const handleRemaskComplete = async (maskedImageBlob: Blob) => {
    if (!auth.currentUser || !remaskingId || !remaskStoragePath) return;

    try {
      // マスク済み画像をアップロード
      const timestamp = Date.now();
      const maskedStoragePath = `public/sales/${auth.currentUser.uid}/${vehicleId}/evidence/masked_${timestamp}.jpg`;
      const maskedRef = ref(storage, maskedStoragePath);
      
      await uploadBytes(maskedRef, maskedImageBlob, {
        contentType: 'image/jpeg',
        customMetadata: {
          ownerUid: auth.currentUser.uid,
          maskedAt: new Date().toISOString(),
        },
      });

      // 証跡ドキュメントを更新
      await updateDoc(doc(db, 'evidences', remaskingId), {
        maskedStoragePath,
        maskStatus: 'masked',
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser.uid,
      });

      alert('マスクを再適用しました');
      
      // 状態をリセット
      setRemaskingId(null);
      setRemaskImageUrl(null);
      setRemaskStoragePath(null);
      
      // 一覧を更新
      await loadEvidences();
    } catch (error: any) {
      console.error('Failed to remask evidence:', error);
      alert(`マスクの再適用に失敗しました: ${error.message}`);
    }
  };

  const handleRemaskCancel = () => {
    setRemaskingId(null);
    setRemaskImageUrl(null);
    setRemaskStoragePath(null);
  };

  const getImageUrl = async (storagePath: string): Promise<string | null> => {
    try {
      const storageRef = ref(storage, storagePath);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Failed to get image URL:', error);
      return null;
    }
  };

  // 再マスクエディタを表示
  if (remaskingId && remaskImageUrl && remaskStoragePath) {
    return (
      <EvidenceMaskEditor
        imageUrl={remaskImageUrl}
        onComplete={handleRemaskComplete}
        onCancel={handleRemaskCancel}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">証跡管理</h1>
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/vehicles/${vehicleId}/evidence/upload`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              証跡をアップロード
            </button>
            <button
              onClick={() => router.push(`/vehicles/${vehicleId}/sale-mode`)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              売却モードに戻る
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : evidences.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <p className="text-gray-500 mb-4">証跡がありません</p>
            <button
              onClick={() => router.push(`/vehicles/${vehicleId}/evidence/upload`)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              証跡をアップロード
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {evidences.map((evidence) => (
              <EvidenceCard
                key={evidence.id}
                evidence={evidence}
                onDelete={handleDelete}
                onRemask={handleRemask}
                deleting={deletingId === evidence.id}
                getImageUrl={getImageUrl}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface EvidenceCardProps {
  evidence: Evidence;
  onDelete: (id: string, storagePath: string, maskedStoragePath?: string) => void;
  onRemask: (evidence: Evidence) => void;
  deleting: boolean;
  getImageUrl: (storagePath: string) => Promise<string | null>;
}

function EvidenceCard({ evidence, onDelete, onRemask, deleting, getImageUrl }: EvidenceCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      const url = evidence.maskedStoragePath 
        ? await getImageUrl(evidence.maskedStoragePath)
        : await getImageUrl(evidence.storagePath);
      setImageUrl(url);
      setLoadingImage(false);
    };
    loadImage();
  }, [evidence]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '---';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'masked':
        return { label: 'マスク済み', color: 'bg-green-100 text-green-700' };
      case 'pending':
        return { label: 'マスク待ち', color: 'bg-yellow-100 text-yellow-700' };
      case 'failed':
        return { label: 'マスク失敗', color: 'bg-red-100 text-red-700' };
      default:
        return { label: '未マスク', color: 'bg-gray-100 text-gray-700' };
    }
  };

  const status = getStatusLabel(evidence.maskStatus);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="aspect-video bg-gray-100 flex items-center justify-center">
        {loadingImage ? (
          <div className="text-gray-400">読み込み中...</div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt="証跡"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-gray-400">画像なし</div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs px-2 py-1 rounded ${status.color}`}>
            {status.label}
          </span>
          <span className="text-xs text-gray-500">
            {formatDate(evidence.createdAt)}
          </span>
        </div>
        <div className="flex gap-2 mt-4">
          {evidence.maskStatus === 'masked' && (
            <button
              onClick={() => onRemask(evidence)}
              className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
            >
              再マスク
            </button>
          )}
          <button
            onClick={() => onDelete(evidence.id!, evidence.storagePath, evidence.maskedStoragePath)}
            disabled={deleting}
            className="flex-1 px-3 py-2 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 disabled:opacity-50"
          >
            {deleting ? '削除中...' : '削除'}
          </button>
        </div>
      </div>
    </div>
  );
}
