import React, { useState, useEffect, useRef } from 'react';
import { ModalProps } from '@/types';
import { Customization, CustomizationInput, CustomStatus, CustomCategory } from '@/types';
import { CATEGORY_LABELS } from '@/lib/customizations';
import { addCustomization, updateCustomization } from '@/lib/customizations';
import { auth } from '@/lib/firebase';
import { toTimestamp, toDate } from '@/lib/dateUtils';
import { uploadCustomizationImage, isImageFile } from '@/lib/storage';
import { usePremium } from '@/hooks/usePremium';
import PaywallModal from './PaywallModal';
import { EvidenceLimitExceededError } from '@/lib/errors';
import { logEvidenceUploadBlocked, logEvidenceUploadSuccess, logUpgradeFromEvidence } from '@/lib/analytics';

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
    status: 'installed',
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
    imageUrl: undefined,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const { isPremium } = usePremium();

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
        imageUrl: editingCustomization.imageUrl || undefined,
      });
      setImagePreview(editingCustomization.imageUrl || null);
    } else {
      // 新規作成時はフォームをリセット
      setFormData({
        title: '',
        brand: '',
        modelCode: '',
        categories: [],
        status: 'installed',
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
        imageUrl: undefined,
      });
      setImagePreview(null);
    }
    setSelectedImageFile(null);
  }, [editingCustomization, isOpen]);

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

  // 画像ファイル選択ハンドラー
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isImageFile(file)) {
      alert("画像ファイルを選択してください。");
      return;
    }

    // ファイルサイズチェック（10MB制限）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。");
      return;
    }

    setSelectedImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  // 画像削除ハンドラー
  const handleImageDelete = () => {
    setSelectedImageFile(null);
    if (imagePreview && imagePreview !== editingCustomization?.imageUrl) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setFormData(prev => ({
      ...prev,
      imageUrl: undefined
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

      const userId = carId.split('/')[0];
      const vehicleId = carId.split('/')[2];
      let finalImageUrl = formData.imageUrl;

      // 新規画像が選択されている場合、先にアップロード
      if (selectedImageFile && auth.currentUser) {
        setIsUploadingImage(true);
        setUploadProgress(0);
        try {
          // 一時パスにアップロード（customizationIdは後で更新）
          const tempCustomizationId = editingCustomization?.id || `temp_${Date.now()}`;
          const uploadedUrl = await uploadCustomizationImage(
            selectedImageFile,
            userId,
            vehicleId,
            tempCustomizationId,
            (progress) => setUploadProgress(progress)
          );
          finalImageUrl = uploadedUrl;
          
          // アップロード成功イベント
          logEvidenceUploadSuccess('customization', selectedImageFile.size, selectedImageFile.type);
        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
          
          // 制限超過エラーの場合
          if (uploadError instanceof EvidenceLimitExceededError) {
            logEvidenceUploadBlocked(
              uploadError.reason,
              uploadError.limitType,
              'customization'
            );
            // 直接PaywallModalを表示
            setIsUploadingImage(false);
            setIsSubmitting(false);
            setShowPaywall(true);
            return;
          }
          
          alert(`画像のアップロードに失敗しました: ${uploadError instanceof Error ? uploadError.message : '不明なエラー'}`);
          setIsUploadingImage(false);
          setIsSubmitting(false);
          return;
        }
        setIsUploadingImage(false);
      }
      
      // ステータスは常に'installed'として保存
      const dataToSave = {
        ...formData,
        status: 'installed' as CustomStatus,
        imageUrl: finalImageUrl,
      };
      
      let customizationId: string;
      if (editingCustomization) {
        console.log('Updating existing customization:', editingCustomization.id);
        await updateCustomization(
          userId,
          vehicleId,
          editingCustomization.id!,
          dataToSave
        );
        customizationId = editingCustomization.id!;
      } else {
        console.log('Adding new customization');
        customizationId = await addCustomization(
          userId,
          vehicleId,
          dataToSave
        );
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

  const categoryOptions: CustomCategory[] = [
    'exterior', 'interior', 'intake', 'exhaust', 'ecu', 'suspension',
    'brake', 'reinforcement', 'drivetrain', 'tire_wheel', 'electrical',
    'audio', 'safety', 'other'
  ];

  return (
    <>
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

          {/* 実施日 */}
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

          {/* 画像アップロード */}
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-medium text-gray-800 mb-2">
              画像（領収書など）
            </label>
            {imagePreview || formData.imageUrl ? (
              <div className="mb-3">
                <div className="relative inline-block">
                  <img
                    src={imagePreview || formData.imageUrl || ''}
                    alt="プレビュー"
                    className="max-w-full h-32 object-contain border border-gray-300 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={handleImageDelete}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  disabled={isUploadingImage || isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  領収書や作業写真の画像をアップロードできます（10MB以下）
                </p>
              </div>
            )}
            {isUploadingImage && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">アップロード中... {Math.round(uploadProgress)}%</p>
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
              disabled={isSubmitting || isUploadingImage}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting || isUploadingImage ? (isUploadingImage ? '画像アップロード中...' : '保存中...') : (editingCustomization ? '更新' : '追加')}
            </button>
          </div>
        </form>
      </div>
    </div>
    
    {showPaywall && (
      <PaywallModal
        onClose={() => {
          setShowPaywall(false);
          logUpgradeFromEvidence('minimal', 'customization');
        }}
        feature="evidence_upload"
        variant="minimal"
      />
    )}
    </>
  );
}
