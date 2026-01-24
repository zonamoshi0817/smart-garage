/**
 * 証跡アップロード・マスク編集ページ
 * /vehicles/[vehicleId]/evidence/upload
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { auth, storage, db } from '@/lib/firebase';
import { ref, uploadBytes } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import EvidenceMaskEditor from '@/components/EvidenceMaskEditor';

export default function EvidenceUploadPage() {
  return (
    <AuthGate>
      <EvidenceUploadContent />
    </AuthGate>
  );
}

function EvidenceUploadContent() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.vehicleId as string;
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [originalStoragePath, setOriginalStoragePath] = useState<string | null>(null);
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const [showMaskEditor, setShowMaskEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!file || !auth.currentUser) return;

    try {
      setUploading(true);
      setUploadProgress(0);

      // 元画像をアップロード
      const timestamp = Date.now();
      const fileName = `evidence_${timestamp}_${file.name}`;
      const storagePath = `users/${auth.currentUser.uid}/vehicles/${vehicleId}/evidence/${fileName}`;
      
      const storageRef = ref(storage, storagePath);
      
      // ファイルタイプを判定（file.typeを優先、なければ拡張子から判定）
      let contentType = file.type || 'image/jpeg'; // デフォルト
      if (!contentType || contentType === 'application/octet-stream') {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        if (fileExtension === 'png') contentType = 'image/png';
        else if (fileExtension === 'webp') contentType = 'image/webp';
        else if (fileExtension === 'heic' || fileExtension === 'heif') contentType = 'image/heic';
        else if (fileExtension === 'jpg' || fileExtension === 'jpeg') contentType = 'image/jpeg';
        else contentType = 'image/jpeg'; // デフォルト
      }
      
      // Storageルールの要件を満たすため、contentTypeを正規化
      if (contentType === 'image/jpg') {
        contentType = 'image/jpeg'; // jpgをjpegに正規化
      }
      
      const metadata = {
        contentType: contentType,
        customMetadata: {
          ownerUid: auth.currentUser.uid,
          uploadedAt: new Date().toISOString(),
        },
      };

      // アップロード（進捗監視なしの簡易版）
      await uploadBytes(storageRef, file, metadata);
      setOriginalStoragePath(storagePath);

      // activeSaleProfileIdを取得（車両から取得）
      const carsRef = collection(db, 'users', auth.currentUser.uid, 'cars');
      const carDoc = await getDoc(doc(carsRef, vehicleId));
      
      if (!carDoc.exists()) {
        alert('車両が見つかりません');
        return;
      }
      
      const carData = carDoc.data();
      const activeSaleProfileId = carData.activeSaleProfileId;
      
      if (!activeSaleProfileId) {
        alert('この車両は売却モードがONになっていません。先に売却プロフィールを作成してください。');
        return;
      }
      
      const saleProfileId = activeSaleProfileId;
      
      // 証跡ドキュメントを作成（maskStatus='pending'）
      const evidenceDocRef = await addDoc(collection(db, 'evidences'), {
        vehicleId,
        saleProfileId: saleProfileId || null,
        storagePath,
        maskStatus: 'pending',
        maskPolicyVersion: '1.0',
        ownerUid: auth.currentUser.uid,
        createdBy: auth.currentUser.uid,
        updatedBy: auth.currentUser.uid,
        deletedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setEvidenceId(evidenceDocRef.id);

      // マスクエディタを表示
      setShowMaskEditor(true);
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(`アップロードに失敗しました: ${error.message}`);
      setUploading(false);
    }
  };

  const handleMaskComplete = async (maskedImageBlob: Blob) => {
    if (!auth.currentUser || !originalStoragePath || !evidenceId) return;

    try {
      // 証跡ドキュメントからsaleProfileIdを取得
      const evidenceRef = doc(db, 'evidences', evidenceId);
      const evidenceDoc = await getDoc(evidenceRef);
      
      if (!evidenceDoc.exists()) {
        alert('証跡が見つかりません');
        return;
      }
      
      const evidenceData = evidenceDoc.data();
      const saleProfileId = evidenceData.saleProfileId;
      
      if (!saleProfileId) {
        alert('この証跡に対応する売却プロフィールが見つかりません。先に売却プロフィールを作成してください。');
        return;
      }
      
      // マスク済み画像をpublic/sales/{saleProfileId}/{evidenceId}.jpgにアップロード
      const fileExtension = originalStoragePath.split('.').pop() || 'jpg';
      const maskedStoragePath = `public/sales/${saleProfileId}/${evidenceId}.${fileExtension}`;
      const maskedStorageRef = ref(storage, maskedStoragePath);
      
      const metadata = {
        customMetadata: {
          ownerUid: auth.currentUser.uid,
          uploadedAt: new Date().toISOString(),
          maskPolicyVersion: '1.0',
        },
      };

      await uploadBytes(maskedStorageRef, maskedImageBlob, metadata);

      // 証跡ドキュメントを更新（既存のevidenceRefを再利用）
      await updateDoc(evidenceRef, {
        maskedStoragePath,
        maskStatus: 'masked',
        updatedBy: auth.currentUser.uid,
        updatedAt: serverTimestamp(),
      });

      alert('証跡のアップロードが完了しました');
      router.push(`/cars/${vehicleId}`);
    } catch (error: any) {
      console.error('Masked image upload failed:', error);
      alert(`マスク済み画像のアップロードに失敗しました: ${error.message}`);
    }
  };

  if (showMaskEditor && previewUrl && originalStoragePath) {
    return (
      <EvidenceMaskEditor
        imageUrl={previewUrl}
        onComplete={handleMaskComplete}
        onCancel={() => {
          setShowMaskEditor(false);
          setFile(null);
          setPreviewUrl(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">証跡アップロード</h1>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              画像を選択
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {previewUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                プレビュー
              </label>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-auto max-h-96 object-contain"
                />
              </div>
            </div>
          )}

          {uploading && (
            <div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">アップロード中: {uploadProgress}%</p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              アップロード
            </button>
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
