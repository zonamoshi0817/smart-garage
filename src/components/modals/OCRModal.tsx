'use client';

import { useState, useRef } from 'react';
import { Car } from '@/types';

interface OCRModalProps {
  car: Car;
  onClose: () => void;
  onRecordCreated?: () => void;
}

export default function OCRModal({ car, onClose, onRecordCreated }: OCRModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcessOCR = async () => {
    if (!selectedImage) {
      alert('画像を選択してください');
      return;
    }

    setIsProcessing(true);
    try {
      // TODO: OCR処理の実装
      alert('OCR機能は現在開発中です。プレミアム機能として近日公開予定です。');
      
      // 実装後は以下のような処理を行う
      // 1. 画像をサーバーに送信
      // 2. OCR処理を実行
      // 3. 結果を受け取る
      // 4. ユーザーに確認・編集してもらう
      // 5. 給油記録またはメンテナンス記録として保存
      
      if (onRecordCreated) {
        onRecordCreated();
      }
    } catch (error) {
      console.error('OCR処理エラー:', error);
      alert('OCR処理中にエラーが発生しました。');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>📸</span>
                <span>レシートOCR</span>
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {car.name}{car.modelCode ? ` (${car.modelCode})` : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-6 space-y-6">
          {/* 説明 */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 text-2xl">💡</span>
              <div className="text-sm text-gray-700 space-y-2">
                <p className="font-medium text-gray-900">レシートOCRとは？</p>
                <p>
                  給油やメンテナンスのレシートを撮影するだけで、自動的に情報を読み取り記録できます。
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>給油量・金額を自動抽出</li>
                  <li>日付・場所を自動認識</li>
                  <li>メンテナンス内容を自動分類</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 画像アップロード */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              レシート画像をアップロード
            </label>
            
            {selectedImage ? (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border-2 border-gray-200">
                  <img 
                    src={selectedImage} 
                    alt="Selected receipt" 
                    className="w-full h-auto max-h-96 object-contain bg-gray-50"
                  />
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={handleProcessOCR}
                  disabled={isProcessing}
                  className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  <span>🔍</span>
                  <span>{isProcessing ? 'OCR処理中...' : 'OCR処理を開始'}</span>
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all"
              >
                <div className="space-y-3">
                  <div className="text-5xl">📷</div>
                  <div>
                    <p className="text-gray-700 font-medium">クリックして画像を選択</p>
                    <p className="text-sm text-gray-500 mt-1">
                      またはドラッグ&ドロップ
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">
                    対応形式: JPG, PNG, HEIC
                  </p>
                </div>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {/* 使い方のヒント */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 text-xl">📋</span>
              <div className="text-sm text-gray-600 space-y-2">
                <p className="font-medium text-gray-900">撮影のコツ</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>レシート全体が写るように撮影</li>
                  <li>明るい場所で、影が入らないように</li>
                  <li>文字がぼやけないようにピントを合わせる</li>
                  <li>レシートをできるだけ平らにする</li>
                </ul>
              </div>
            </div>
          </div>

          {/* プレミアム機能バッジ */}
          <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⭐</span>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">プレミアム機能</p>
                <p className="text-sm text-gray-600 mt-1">
                  この機能は現在開発中です。プレミアムプランで近日公開予定です。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}


