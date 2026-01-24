import React, { useState, useEffect, useRef } from 'react';
import { ModalProps } from '@/types';
import { Customization, CustomizationInput, CustomStatus, CustomCategory } from '@/types';
import { CATEGORY_LABELS, STATUS_LABELS } from '@/lib/customizations';
import { addCustomization, updateCustomization } from '@/lib/customizations';
import { auth, db, storage } from '@/lib/firebase';
import { toTimestamp, toDate } from '@/lib/dateUtils';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import EvidenceMaskEditor from '@/components/EvidenceMaskEditor';

interface CustomizationModalProps extends ModalProps {
  carId: string;
  editingCustomization?: Customization | null;
  onSave: () => void;
}

export default function CustomizationModal({ 
  isOpen, 
  onClose, 
  carId, 
  editingCustomization, 
  onSave 
}: CustomizationModalProps) {
  const [formData, setFormData] = useState<Omit<CustomizationInput, 'carId'>>({
    title: '',
    brand: '',
    modelCode: '',
    categories: [],
    status: 'planned',
    date: toTimestamp(new Date())!,
    odoKm: undefined,
    vendorType: undefined,
    vendorName: '',
    partsCostJpy: undefined,
    laborCostJpy: undefined,
    otherCostJpy: undefined,
    currency: 'JPY',
    link: '',
    memo: '',
    isPublic: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreviewUrl, setEvidencePreviewUrl] = useState<string | null>(null);
  const [evidenceUploading, setEvidenceUploading] = useState(false);
  const [showMaskEditor, setShowMaskEditor] = useState(false);
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const [originalStoragePath, setOriginalStoragePath] = useState<string | null>(null);
  const [saleProfileId, setSaleProfileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingCustomization) {
      setFormData({
        title: editingCustomization.title,
        brand: editingCustomization.brand || '',
        modelCode: editingCustomization.modelCode || '',
        categories: editingCustomization.categories,
        status: editingCustomization.status,
        date: editingCustomization.date,
        odoKm: editingCustomization.odoKm ?? undefined,
        vendorType: editingCustomization.vendorType ?? undefined,
        vendorName: editingCustomization.vendorName || '',
        partsCostJpy: editingCustomization.partsCostJpy ?? undefined,
        laborCostJpy: editingCustomization.laborCostJpy ?? undefined,
        otherCostJpy: editingCustomization.otherCostJpy ?? undefined,
        currency: editingCustomization.currency,
        link: editingCustomization.link || '',
        memo: editingCustomization.memo || '',
        isPublic: editingCustomization.isPublic,
      });
    } else {
      // 新規作成時はフォームをリセット
      setFormData({
        title: '',
        brand: '',
        modelCode: '',
        categories: [],
        status: 'planned',
        date: toTimestamp(new Date())!,
        odoKm: undefined,
        vendorType: undefined,
        vendorName: '',
        partsCostJpy: undefined,
        laborCostJpy: undefined,
        otherCostJpy: undefined,
        currency: 'JPY',
        link: '',
        memo: '',
        isPublic: false,
      });
    }
    // モーダルを開くたびに証跡関連の状態をリセット
    setEvidenceFile(null);
    setEvidencePreviewUrl(null);
    setShowMaskEditor(false);
    setEvidenceId(null);
    setOriginalStoragePath(null);
    setSaleProfileId(null);
  }, [editingCustomization, isOpen]);

  // 売却プロフィールIDを取得
  useEffect(() => {
    const loadSaleProfileId = async () => {
      if (!auth.currentUser || !carId) return;
      const userId = carId.split('/')[0];
      const vehicleId = carId.split('/')[2];
      
      try {
        const carDoc = await getDoc(doc(db, 'users', userId, 'cars', vehicleId));
        if (carDoc.exists()) {
          const carData = carDoc.data();
          const activeSaleProfileId = carData.activeSaleProfileId || carData.activeShareProfileIds?.sale_buyer;
          setSaleProfileId(activeSaleProfileId || null);
        }
      } catch (error) {
        console.error('Failed to load sale profile ID:', error);
      }
    };
    
    if (isOpen) {
      loadSaleProfileId();
    }
  }, [carId, isOpen]);

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => {
      // 文字列フィールドは常に文字列（空文字列でも）を保持
      const stringFields: (keyof typeof formData)[] = ['title', 'brand', 'modelCode', 'vendorName', 'link', 'memo'];
      if (stringFields.includes(field)) {
        return {
          ...prev,
          [field]: value || ''
        };
      }
      // 数値フィールドは空文字列の場合undefined
      return {
        ...prev,
        [field]: value === '' ? undefined : value
      };
    });
  };

  const handleCategoryToggle = (category: CustomCategory) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleEvidenceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // ファイルサイズチェック（10MB制限）
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (selectedFile.size > maxSize) {
        alert('ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。');
        return;
      }
      
      // ファイルタイプチェック
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      const isAllowedExtension = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(fileExtension || '');
      
      if (!allowedTypes.includes(selectedFile.type) && !isAllowedExtension) {
        alert('許可されていないファイル形式です。JPEG、PNG、WebP、HEIC形式の画像を選択してください。');
        return;
      }
      
      setEvidenceFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setEvidencePreviewUrl(url);
    }
  };

  const handleEvidenceUpload = async () => {
    if (!evidenceFile || !auth.currentUser) return;
    if (!saleProfileId) {
      alert('証跡をアップロードするには、先に売却モードを有効にする必要があります。\n「共有」ページから売却用リンクを作成してください。');
      return;
    }

    try {
      setEvidenceUploading(true);
      const currentUserId = auth.currentUser.uid;
      const vehicleId = carId.split('/')[2];
      
      // 元画像をアップロード
      // Storageルールでusers/{userId}/...のパスでは、パス内のuserIdがrequest.auth.uidと一致する必要がある
      const timestamp = Date.now();
      const fileName = `evidence_${timestamp}_${evidenceFile.name}`;
      const storagePath = `users/${currentUserId}/vehicles/${vehicleId}/evidence/${fileName}`;
      
      const storageRef = ref(storage, storagePath);
      
      // ファイルタイプを判定（file.typeを優先、なければ拡張子から判定）
      let contentType = evidenceFile.type || 'image/jpeg'; // デフォルト
      if (!contentType || contentType === 'application/octet-stream') {
        const fileExtension = evidenceFile.name.split('.').pop()?.toLowerCase();
        if (fileExtension === 'png') contentType = 'image/png';
        else if (fileExtension === 'webp') contentType = 'image/webp';
        else if (fileExtension === 'heic' || fileExtension === 'heif') contentType = 'image/heic';
        else if (fileExtension === 'jpg' || fileExtension === 'jpeg') contentType = 'image/jpeg';
        else contentType = 'image/jpeg'; // デフォルト
      }
      
      // Storageルールの要件を満たすため、contentTypeを正規化
      // isAllowedImageType()は image/(jpeg|jpg|png|webp|heic) をチェック
      if (contentType === 'image/jpg') {
        contentType = 'image/jpeg'; // jpgをjpegに正規化
      }
      
      const metadata = {
        contentType: contentType,
        customMetadata: {
          ownerUid: currentUserId, // Storageルールでrequest.auth.uidと一致する必要がある
          uploadedAt: new Date().toISOString(),
        },
      };

      console.log('Uploading evidence:', {
        storagePath,
        currentUserId,
        fileSize: evidenceFile.size,
        contentType,
        fileName: evidenceFile.name,
        fileType: evidenceFile.type,
        metadata: JSON.stringify(metadata, null, 2),
      });

      try {
        await uploadBytes(storageRef, evidenceFile, metadata);
      } catch (uploadError: any) {
        console.error('uploadBytes failed:', uploadError);
        console.error('Upload error details:', {
          code: uploadError.code,
          message: uploadError.message,
          serverResponse: uploadError.serverResponse,
          storagePath,
          contentType,
          fileSize: evidenceFile.size,
          currentUserId,
        });
        throw uploadError;
      }
      setOriginalStoragePath(storagePath);

      // 証跡ドキュメントを作成（maskStatus='pending'）
      // ownerUidはauth.currentUser.uidと一致させる必要がある（Firestoreルールの要件）
      console.log('Creating evidence document:', {
        vehicleId,
        saleProfileId,
        storagePath,
        ownerUid: currentUserId,
      });

      const evidenceDocRef = await addDoc(collection(db, 'evidences'), {
        vehicleId,
        saleProfileId: saleProfileId,
        storagePath,
        maskStatus: 'pending',
        maskPolicyVersion: '1.0',
        ownerUid: currentUserId, // Firestoreルールでrequest.auth.uidと一致する必要がある
        createdBy: currentUserId,
        updatedBy: currentUserId,
        deletedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setEvidenceId(evidenceDocRef.id);

      // マスクエディタを表示
      setShowMaskEditor(true);
    } catch (error: any) {
      console.error('Evidence upload failed:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack,
        storagePath,
        currentUserId: auth.currentUser?.uid,
        fileSize: evidenceFile?.size,
        fileName: evidenceFile?.name,
      });
      
      // より詳細なエラーメッセージ
      let errorMessage = `証跡のアップロードに失敗しました: ${error.message}`;
      if (error.code === 'storage/unauthorized') {
        errorMessage += '\n\n権限エラーが発生しました。ファイルサイズ（10MB以下）とファイル形式（JPEG、PNG、WebP、HEIC）を確認してください。';
      } else if (error.code === 'permission-denied') {
        errorMessage += '\n\nFirestoreの権限エラーが発生しました。';
      }
      
      alert(errorMessage);
      setEvidenceUploading(false);
    }
  };

  const handleMaskComplete = async (maskedImageBlob: Blob) => {
    if (!auth.currentUser || !originalStoragePath || !evidenceId || !saleProfileId) return;

    try {
      const currentUserId = auth.currentUser.uid;
      
      // マスク済み画像をアップロード
      const fileExtension = originalStoragePath.split('.').pop() || 'jpg';
      const maskedStoragePath = `public/sales/${saleProfileId}/${evidenceId}.${fileExtension}`;
      const maskedStorageRef = ref(storage, maskedStoragePath);
      
      const metadata = {
        contentType: 'image/jpeg',
        customMetadata: {
          ownerUid: currentUserId, // Storageルールでrequest.auth.uidと一致する必要がある
          maskedAt: new Date().toISOString(),
          maskPolicyVersion: '1.0',
        },
      };

      console.log('Uploading masked image:', {
        maskedStoragePath,
        saleProfileId,
        currentUserId,
        blobSize: maskedImageBlob.size,
      });

      await uploadBytes(maskedStorageRef, maskedImageBlob, metadata);

      // 証跡ドキュメントを更新
      console.log('Updating evidence document:', {
        evidenceId,
        maskedStoragePath,
        currentUserId,
      });

      await updateDoc(doc(db, 'evidences', evidenceId), {
        maskedStoragePath,
        maskStatus: 'masked',
        updatedBy: currentUserId,
        updatedAt: serverTimestamp(),
      });

      setShowMaskEditor(false);
      setEvidenceUploading(false);
      setEvidenceFile(null);
      setEvidencePreviewUrl(null);
      setEvidenceId(null);
      setOriginalStoragePath(null);
      alert('証跡のアップロードが完了しました');
    } catch (error: any) {
      console.error('Masked image upload failed:', error);
      alert(`マスク済み画像のアップロードに失敗しました: ${error.message}`);
      setEvidenceUploading(false);
    }
  };

  const handleMaskCancel = () => {
    setShowMaskEditor(false);
    setEvidenceUploading(false);
    // 証跡ドキュメントを削除（pending状態のまま残すか、削除するかは要件次第）
    if (evidenceId) {
      // ここでは削除せず、pending状態のまま残す
      setEvidenceId(null);
      setOriginalStoragePath(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('タイトルを入力してください');
      return;
    }

    if (formData.categories.length === 0) {
      alert('カテゴリを1つ以上選択してください');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Saving customization with form data:', formData);
      console.log('CarId:', carId);
      console.log('Current user:', auth.currentUser);
      console.log('User ID:', auth.currentUser?.uid);
      console.log('Parsed userId:', carId.split('/')[0]);
      console.log('Parsed carId:', carId.split('/')[2]);
      
      if (!auth.currentUser) {
        throw new Error('ユーザーが認証されていません');
      }
      
      let customizationId: string;
      if (editingCustomization) {
        console.log('Updating existing customization:', editingCustomization.id);
        await updateCustomization(
          carId.split('/')[0], // userId
          carId.split('/')[2], // carId
          editingCustomization.id!,
          formData
        );
        customizationId = editingCustomization.id!;
      } else {
        console.log('Adding new customization');
        customizationId = await addCustomization(
          carId.split('/')[0], // userId
          carId.split('/')[2], // carId
          formData
        );
      }

      // 証跡がアップロード済みで、カスタマイズIDが取得できた場合、証跡に関連付ける
      if (evidenceId && customizationId) {
        try {
          const currentUserId = auth.currentUser.uid;
          await updateDoc(doc(db, 'evidences', evidenceId), {
            recordId: customizationId,
            updatedBy: currentUserId,
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          console.warn('Failed to link evidence to customization:', error);
          // エラーは無視（証跡は保存されている）
        }
      }
      
      console.log('Customization saved successfully');
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving customization:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        stack: error instanceof Error ? error.stack : undefined
      });
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      const errorCode = (error as any)?.code || 'unknown';
      alert(`保存に失敗しました\nエラー: ${errorMessage}\nコード: ${errorCode}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions: CustomStatus[] = ['planned', 'ordered', 'installed', 'removed_temp', 'removed'];
  const categoryOptions: CustomCategory[] = [
    'exterior', 'interior', 'intake', 'exhaust', 'ecu', 'suspension',
    'brake', 'reinforcement', 'drivetrain', 'tire_wheel', 'electrical',
    'audio', 'safety', 'other'
  ];

  // マスクエディタを表示
  if (showMaskEditor && evidencePreviewUrl && originalStoragePath) {
    return (
      <EvidenceMaskEditor
        imageUrl={evidencePreviewUrl}
        onComplete={handleMaskComplete}
        onCancel={handleMaskCancel}
      />
    );
  }

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${isOpen ? 'block' : 'hidden'}`}>
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingCustomization ? 'カスタマイズを編集' : 'カスタマイズを追加'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600 text-gray-900"
              placeholder="例: HKS Hi-Power マフラー"
              required
            />
          </div>

          {/* ブランド・型番 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                ブランド
              </label>
              <input
                type="text"
                value={formData.brand || ''}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600 text-gray-900"
                placeholder="例: HKS"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                型番
              </label>
              <input
                type="text"
                value={formData.modelCode || ''}
                onChange={(e) => handleInputChange('modelCode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600 text-gray-900"
                placeholder="例: Hi-Power"
              />
            </div>
          </div>

          {/* カテゴリ */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              カテゴリ <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {categoryOptions.map((category) => (
                <label key={category} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.categories.includes(category)}
                    onChange={() => handleCategoryToggle(category)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-800">{CATEGORY_LABELS[category]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ステータス・実施日 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                ステータス
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as CustomStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                実施日
              </label>
              <input
                type="date"
                value={toDate(formData.date)?.toISOString().split('T')[0] || ''}
                onChange={(e) => handleInputChange('date', toTimestamp(new Date(e.target.value))!)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              />
            </div>
          </div>

          {/* 走行距離・実施場所 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                走行距離 (km)
              </label>
              <input
                type="number"
                value={formData.odoKm || ''}
                onChange={(e) => handleInputChange('odoKm', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600 text-gray-900"
                placeholder="例: 50000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                実施場所
              </label>
              <select
                value={formData.vendorType || ''}
                onChange={(e) => handleInputChange('vendorType', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">選択してください</option>
                <option value="self">自分で実施</option>
                <option value="shop">整備工場</option>
                <option value="dealer">ディーラー</option>
              </select>
            </div>
          </div>

          {/* 実施場所名 */}
          {formData.vendorType && (
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                実施場所名
              </label>
              <input
                type="text"
                value={formData.vendorName || ''}
                onChange={(e) => handleInputChange('vendorName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600 text-gray-900"
                placeholder="例: 〇〇整備工場"
              />
            </div>
          )}

          {/* 費用 */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              費用 (円)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-700 mb-1">部品代</label>
                  <input
                    type="number"
                    value={formData.partsCostJpy || ''}
                    onChange={(e) => handleInputChange('partsCostJpy', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600 text-gray-900"
                    placeholder="0"
                  />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1">工賃</label>
                <input
                  type="number"
                  value={formData.laborCostJpy || ''}
                  onChange={(e) => handleInputChange('laborCostJpy', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600 text-gray-900"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1">その他</label>
                <input
                  type="number"
                  value={formData.otherCostJpy || ''}
                  onChange={(e) => handleInputChange('otherCostJpy', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600 text-gray-900"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* リンク・メモ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                商品リンク
              </label>
              <input
                type="url"
                value={formData.link || ''}
                onChange={(e) => handleInputChange('link', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600 text-gray-900"
                placeholder="https://..."
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-800">公開マイカーページに表示</span>
              </label>
            </div>
          </div>

          {/* メモ */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              メモ
            </label>
            <textarea
              value={formData.memo || ''}
              onChange={(e) => handleInputChange('memo', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600 text-gray-900"
              placeholder="カスタマイズの詳細や感想など..."
            />
          </div>

          {/* 証跡アップロード */}
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-medium text-gray-800 mb-2">
              証跡（領収書・明細など）
            </label>
            {!saleProfileId && (
              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-xs text-yellow-800">
                  証跡をアップロードするには、先に「共有」ページから売却用リンクを作成してください。
                </p>
              </div>
            )}
            {evidencePreviewUrl && !showMaskEditor ? (
              <div className="mb-3">
                <div className="relative inline-block">
                  <img
                    src={evidencePreviewUrl}
                    alt="証跡プレビュー"
                    className="max-w-full h-32 object-contain border border-gray-300 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setEvidenceFile(null);
                      setEvidencePreviewUrl(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
                {!evidenceUploading && (
                  <button
                    type="button"
                    onClick={handleEvidenceUpload}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    証跡をアップロードしてマスク
                  </button>
                )}
              </div>
            ) : !showMaskEditor ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleEvidenceFileSelect}
                  disabled={!saleProfileId || evidenceUploading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  領収書や明細書の画像をアップロードできます。アップロード後、マスクエディタで個人情報を手動でマスクしてください。
                </p>
              </div>
            ) : null}
            {evidenceUploading && (
              <div className="text-sm text-gray-600">
                アップロード中...
              </div>
            )}
          </div>

          {/* ボタン */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? '保存中...' : (editingCustomization ? '更新' : '追加')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
