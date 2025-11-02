'use client';

import { useState } from 'react';
import { Car } from '@/types';
import { Timestamp } from 'firebase/firestore';

interface SellCarModalProps {
  car: Car;
  onClose: () => void;
  onSave: (carId: string, soldData: {
    soldDate: Timestamp;
    soldPrice?: number;
    soldTo?: string;
    soldNotes?: string;
  }) => Promise<void>;
}

export default function SellCarModal({ car, onClose, onSave }: SellCarModalProps) {
  const [soldDate, setSoldDate] = useState(new Date().toISOString().split('T')[0]);
  const [soldPrice, setSoldPrice] = useState('');
  const [soldTo, setSoldTo] = useState('');
  const [soldNotes, setSoldNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!soldDate) {
      alert('売却日を入力してください');
      return;
    }

    setIsSaving(true);
    
    try {
      const soldTimestamp = Timestamp.fromDate(new Date(soldDate));
      
      await onSave(car.id!, {
        soldDate: soldTimestamp,
        soldPrice: soldPrice ? parseFloat(soldPrice) : undefined,
        soldTo: soldTo.trim() || undefined,
        soldNotes: soldNotes.trim() || undefined,
      });
      
      onClose();
    } catch (error) {
      console.error('Error marking car as sold:', error);
      alert('売却処理に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>📦</span>
              <span>車両を売却済みにする</span>
            </h2>
            <p className="text-sm text-gray-600 mt-1">{car.name}</p>
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

        {/* コンテンツ */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 売却日 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              売却日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={soldDate}
              onChange={(e) => setSoldDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-gray-900 font-medium"
            />
          </div>

          {/* 売却価格 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              売却価格（円）
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700 font-semibold">¥</span>
              <input
                type="number"
                value={soldPrice}
                onChange={(e) => setSoldPrice(e.target.value)}
                placeholder="例: 1500000"
                min="0"
                step="10000"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal"
              />
            </div>
            {soldPrice && (
              <p className="text-xs text-gray-500 mt-1">
                ¥{parseFloat(soldPrice).toLocaleString()}
              </p>
            )}
          </div>

          {/* 売却先 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              売却先
            </label>
            <input
              type="text"
              value={soldTo}
              onChange={(e) => setSoldTo(e.target.value)}
              placeholder="例: ○○中古車センター、個人売買、下取り"
              maxLength={100}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal"
            />
          </div>

          {/* メモ */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              メモ
            </label>
            <textarea
              value={soldNotes}
              onChange={(e) => setSoldNotes(e.target.value)}
              placeholder="売却時の状況や備考を記録できます"
              rows={4}
              maxLength={500}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal"
            />
            <p className="text-xs text-gray-500 mt-1">
              {soldNotes.length} / 500文字
            </p>
          </div>

          {/* 注意事項 */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-orange-800">
                <p className="font-semibold mb-1">売却後について</p>
                <ul className="space-y-1 text-xs">
                  <li>• 車両は「売却済み」セクションに移動します</li>
                  <li>• 過去の記録（給油・メンテ）は保持されます</li>
                  <li>• いつでも編集メニューから元に戻せます</li>
                </ul>
              </div>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? '処理中...' : '売却済みにする'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

