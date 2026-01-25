import React, { useState, useEffect, useRef } from 'react';
import Modal from '@/components/common/Modal';
import { MaintenanceRecord, MaintenanceInput, Car } from '@/types';
import { toTimestamp, toDate } from '@/lib/dateUtils';
import { uploadMaintenanceImage, isImageFile } from '@/lib/storage';
import { auth } from '@/lib/firebase';
import { usePremium } from '@/hooks/usePremium';
import PaywallModal from './PaywallModal';
import { EvidenceLimitExceededError } from '@/lib/errors';
import { logEvidenceUploadBlocked, logEvidenceUploadSuccess, logUpgradeFromEvidence } from '@/lib/analytics';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recordData: MaintenanceInput) => Promise<void>;
  editingRecord?: MaintenanceRecord | null;
  cars: Car[];
  title: string;
}

export default function MaintenanceModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingRecord, 
  cars,
  title 
}: MaintenanceModalProps) {
  const [formData, setFormData] = useState<MaintenanceInput>({
    carId: '',
    title: '',
    description: '',
    cost: undefined,
    mileage: 0,
    date: toTimestamp(new Date())!,
    location: '',
    imageUrl: undefined,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const { isPremium } = usePremium();

  useEffect(() => {
    if (editingRecord) {
      setFormData({
        carId: editingRecord.carId || '',
        title: editingRecord.title || '',
        description: editingRecord.description || '',
        cost: editingRecord.cost || undefined,
        mileage: editingRecord.mileage || 0,
        date: editingRecord.date || new Date(),
        location: editingRecord.location || '',
        imageUrl: editingRecord.imageUrl || undefined,
      });
      setImagePreview(editingRecord.imageUrl || null);
    } else {
      setFormData({
        carId: '',
        title: '',
        description: '',
        cost: undefined,
        mileage: 0,
        date: toTimestamp(new Date())!,
        location: '',
        imageUrl: undefined,
      });
      setImagePreview(null);
    }
    setSelectedImageFile(null);
    setError(null);
  }, [editingRecord, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? undefined : (name === 'cost' || name === 'mileage' ? Number(value) : value)
    }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      date: toTimestamp(new Date(e.target.value))!
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
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    if (imagePreview && imagePreview !== editingRecord?.imageUrl) {
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
    setLoading(true);
    setError(null);

    try {
      let finalImageUrl = formData.imageUrl;

      // 新規画像が選択されている場合、アップロード
      if (selectedImageFile && auth.currentUser) {
        setIsUploadingImage(true);
        setUploadProgress(0);
        try {
          // 一時パスにアップロード（recordIdは後で更新）
          const tempRecordId = editingRecord?.id || `temp_${Date.now()}`;
          const uploadedUrl = await uploadMaintenanceImage(
            selectedImageFile,
            auth.currentUser.uid,
            tempRecordId,
            (progress) => setUploadProgress(progress)
          );
          finalImageUrl = uploadedUrl;
          
          // アップロード成功イベント
          logEvidenceUploadSuccess('maintenance', selectedImageFile.size, selectedImageFile.type);
        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
          
          // 制限超過エラーの場合
          if (uploadError instanceof EvidenceLimitExceededError) {
            logEvidenceUploadBlocked(
              uploadError.reason,
              uploadError.limitType,
              'maintenance'
            );
            // エラーメッセージを表示してからPaywallModalを表示
            setError(uploadError.reason);
            setIsUploadingImage(false);
            setLoading(false);
            // 少し遅延してからPaywallModalを表示（エラーメッセージを確認してもらうため）
            setTimeout(() => {
              setShowPaywall(true);
            }, 500);
            return;
          }
          
          setError(`画像のアップロードに失敗しました: ${uploadError instanceof Error ? uploadError.message : '不明なエラー'}`);
          setIsUploadingImage(false);
          setLoading(false);
          return;
        }
        setIsUploadingImage(false);
      }

      await onSave({
        ...formData,
        imageUrl: finalImageUrl
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setLoading(false);
      setIsUploadingImage(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 車両選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              車両 *
            </label>
            <select
              name="carId"
              value={formData.carId}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">車両を選択してください</option>
              {cars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.name}
                </option>
              ))}
            </select>
          </div>

          {/* 作業日 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              作業日 *
            </label>
            <input
              type="date"
              value={toDate(formData.date)?.toISOString().split('T')[0] || ''}
              onChange={handleDateChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* タイトル */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              作業内容 *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              placeholder="例: オイル交換、タイヤ交換など"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 走行距離 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              走行距離 (km) *
            </label>
            <input
              type="number"
              name="mileage"
              value={formData.mileage}
              onChange={handleInputChange}
              required
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 費用 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              費用 (円)
            </label>
            <input
              type="number"
              name="cost"
              value={formData.cost || ''}
              onChange={handleInputChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 作業場所 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              作業場所
            </label>
            <input
              type="text"
              name="location"
              value={formData.location || ''}
              onChange={handleInputChange}
              placeholder="例: ガソリンスタンド、ディーラーなど"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 詳細説明 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            詳細説明
          </label>
          <textarea
            name="description"
            value={formData.description || ''}
            onChange={handleInputChange}
            rows={4}
            placeholder="作業の詳細や使用した部品などを記入してください"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 画像アップロード */}
        <div className="border-t border-gray-200 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
                disabled={isUploadingImage || loading}
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
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </Modal>
    
    {showPaywall && (
      <PaywallModal
        onClose={() => {
          setShowPaywall(false);
          logUpgradeFromEvidence('minimal', 'maintenance');
        }}
        feature="evidence_upload"
        variant="minimal"
      />
    )}
    </>
  );
}
