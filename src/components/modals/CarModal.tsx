import React, { useState, useEffect } from 'react';
import Modal from '@/components/common/Modal';
import { Car, CarInput } from '@/types';
import { uploadCarImage, isImageFile, validateFileSize } from '@/lib/storage';
import { compressImage } from '@/lib/imageCompression';

interface CarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (carData: CarInput) => Promise<void>;
  editingCar?: Car | null;
  title: string;
}

export default function CarModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingCar, 
  title 
}: CarModalProps) {
  const [formData, setFormData] = useState<CarInput>({
    name: '',
    modelCode: '',
    year: undefined,
    odoKm: undefined,
    imagePath: '',
    inspectionExpiry: '',
    firstRegYm: '',
    avgKmPerMonth: undefined,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    if (editingCar) {
      setFormData({
        name: editingCar.name || '',
        modelCode: editingCar.modelCode || '',
        year: editingCar.year || undefined,
        odoKm: editingCar.odoKm || undefined,
        imagePath: editingCar.imagePath || '',
        inspectionExpiry: editingCar.inspectionExpiry || '',
        firstRegYm: editingCar.firstRegYm || '',
        avgKmPerMonth: editingCar.avgKmPerMonth || undefined,
      });
      setImagePreview(editingCar.imagePath || '');
    } else {
      setFormData({
        name: '',
        modelCode: '',
        year: undefined,
        odoKm: undefined,
        imagePath: '',
        inspectionExpiry: '',
        firstRegYm: '',
        avgKmPerMonth: undefined,
      });
      setImagePreview('');
    }
    setError(null);
  }, [editingCar, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? undefined : (name === 'year' || name === 'odoKm' || name === 'avgKmPerMonth' ? Number(value) : value)
    }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isImageFile(file)) {
      setError('画像ファイルを選択してください');
      return;
    }

    if (!validateFileSize(file, 5 * 1024 * 1024)) {
      setError('ファイルサイズは5MB以下にしてください');
      return;
    }

    setImageFile(file);
    
    // プレビュー用のURLを作成
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let imagePath = formData.imagePath;

      // 新しい画像がアップロードされた場合
      if (imageFile) {
        const compressedImage = await compressImage(imageFile, { quality: 0.8 });
        imagePath = await uploadCarImage(compressedImage);
      }

      const carData: CarInput = {
        ...formData,
        imagePath,
      };

      await onSave(carData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* オーバーレイ */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* モーダルコンテンツ */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* ボディ - スクロール可能 */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 車両名 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    車両名 *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 車種コード */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    車種コード
                  </label>
                  <input
                    type="text"
                    name="modelCode"
                    value={formData.modelCode || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 年式 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    年式
                  </label>
                  <input
                    type="number"
                    name="year"
                    value={formData.year || ''}
                    onChange={handleInputChange}
                    min="1900"
                    max="2030"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 走行距離 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    走行距離 (km)
                  </label>
                  <input
                    type="number"
                    name="odoKm"
                    value={formData.odoKm || ''}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 車検期限 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    車検期限
                  </label>
                  <input
                    type="date"
                    name="inspectionExpiry"
                    value={formData.inspectionExpiry || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 初度登録年月 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    初度登録年月
                  </label>
                  <input
                    type="month"
                    name="firstRegYm"
                    value={formData.firstRegYm || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 平均月間走行距離 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    平均月間走行距離 (km)
                  </label>
                  <input
                    type="number"
                    name="avgKmPerMonth"
                    value={formData.avgKmPerMonth || ''}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 画像アップロード */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  車両画像
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="車両画像プレビュー"
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* フッター - 固定 */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? '保存中...' : (editingCar ? '保存' : '追加')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
