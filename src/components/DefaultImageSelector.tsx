// src/components/DefaultImageSelector.tsx
"use client";

import { useState } from 'react';
import { defaultImages, getImagesByCategory, getAllCategories, type DefaultImage } from '@/lib/defaultImages';

interface DefaultImageSelectorProps {
  onSelect: (image: DefaultImage) => void;
  onClose: () => void;
  currentImage?: string;
}

export default function DefaultImageSelector({ onSelect, onClose, currentImage }: DefaultImageSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<DefaultImage['category']>('generic');
  const [selectedImage, setSelectedImage] = useState<DefaultImage | null>(null);

  const categories = getAllCategories();
  const categoryImages = getImagesByCategory(selectedCategory);

  const handleImageSelect = (image: DefaultImage) => {
    setSelectedImage(image);
  };

  const handleConfirm = () => {
    if (selectedImage) {
      onSelect(selectedImage);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">デフォルト画像を選択</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* カテゴリ選択 */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">カテゴリ</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {getCategoryLabel(category)}
              </button>
            ))}
          </div>
        </div>

        {/* 画像グリッド */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            {getCategoryLabel(selectedCategory)}の画像
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {categoryImages.map((image) => (
              <div
                key={image.id}
                className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition ${
                  selectedImage?.id === image.id
                    ? 'border-blue-600 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleImageSelect(image)}
              >
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  {image.path === '/car.jpg' ? (
                    // 既存のcar.jpgを表示
                    <img
                      src={image.path}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    // プレースホルダー画像
                    <div className="text-center p-4">
                      <div className="w-16 h-16 mx-auto mb-2 bg-gray-300 rounded-lg flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      </div>
                      <p className="text-xs text-gray-600">{image.name}</p>
                    </div>
                  )}
                </div>
                {selectedImage?.id === image.id && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 選択された画像の情報 */}
        {selectedImage && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">選択された画像</h4>
            <p className="text-blue-800">{selectedImage.name}</p>
            <p className="text-sm text-blue-700">{selectedImage.description}</p>
          </div>
        )}

        {/* ボタン */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedImage}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            選択
          </button>
        </div>
      </div>
    </div>
  );
}

// カテゴリラベルの取得
function getCategoryLabel(category: DefaultImage['category']): string {
  const labels = {
    generic: '汎用',
    sedan: 'セダン',
    suv: 'SUV',
    sports: 'スポーツカー',
    hatchback: 'ハッチバック',
    truck: 'トラック'
  };
  return labels[category];
}
