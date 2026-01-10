/**
 * 売却モード分類ウィザード
 * 直近12ヶ月のMaintenanceRecordを分類する
 */

'use client';

import { useState, useEffect } from 'react';
import type { MaintenanceRecord } from '@/types';
import { toDate } from '@/lib/dateUtils';

interface SaleModeWizardProps {
  records: MaintenanceRecord[];
  onComplete: (classifiedRecords: Map<string, {
    category?: string;
    isPreventive?: boolean;
    typeTag?: 'receipt_backed' | 'owner_log' | 'other';
  }>) => void;
  onCancel: () => void;
}

const CATEGORIES = [
  { value: 'oil', label: 'オイル' },
  { value: 'tire', label: 'タイヤ' },
  { value: 'brake', label: 'ブレーキ' },
  { value: 'battery', label: 'バッテリー' },
  { value: 'coolant', label: 'クーラント' },
  { value: 'other', label: 'その他' },
] as const;

export default function SaleModeWizard({
  records,
  onComplete,
  onCancel,
}: SaleModeWizardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [classifications, setClassifications] = useState<Map<string, {
    category?: string;
    isPreventive?: boolean;
    typeTag?: 'receipt_backed' | 'owner_log' | 'other';
  }>>(new Map());

  // 直近12ヶ月の記録のみフィルタ（未分類のみ）
  const recentRecords = records.filter(record => {
    const recordDate = toDate(record.date);
    if (!recordDate) return false;
    
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);
    const isRecent = recordDate >= twelveMonthsAgo;
    const isUnclassified = !record.category; // categoryがないものを未分類とする
    
    return isRecent && isUnclassified;
  }).sort((a, b) => {
    const dateA = toDate(a.date)?.getTime() || 0;
    const dateB = toDate(b.date)?.getTime() || 0;
    return dateB - dateA; // 新しい順
  });

  const currentRecord = recentRecords[currentIndex];

  const handleNext = () => {
    // カテゴリが未設定の場合は次に進めない
    const currentClassification = classifications.get(currentRecord.id || '');
    if (!currentClassification?.category) {
      alert('カテゴリを選択してください');
      return;
    }

    if (currentIndex < recentRecords.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 完了
      onComplete(classifications);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSkip = () => {
    if (currentIndex < recentRecords.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete(classifications);
    }
  };

  const updateClassification = (field: 'category' | 'isPreventive' | 'typeTag', value: any) => {
    const newClassifications = new Map(classifications);
    const current = newClassifications.get(currentRecord.id || '') || {};
    newClassifications.set(currentRecord.id || '', {
      ...current,
      [field]: value,
    });
    setClassifications(newClassifications);
  };

  if (recentRecords.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full">
          <h2 className="text-xl font-bold mb-4">分類ウィザード</h2>
          <p className="text-gray-600 mb-4">
            直近12ヶ月のメンテナンス記録がありません。
          </p>
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            閉じる
          </button>
        </div>
      </div>
    );
  }

  const currentClassification = classifications.get(currentRecord.id || '') || {};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold">メンテナンス記録の分類</h2>
            <span className="text-sm text-gray-500">
              {currentIndex + 1} / {recentRecords.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / recentRecords.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="mb-6">
          <div className="mb-4">
            <div className="text-lg font-medium mb-1">{currentRecord.title}</div>
            <div className="text-sm text-gray-600">
              {toDate(currentRecord.date)?.toLocaleDateString('ja-JP')} / 
              走行距離: {currentRecord.mileage?.toLocaleString()}km
            </div>
            {currentRecord.description && (
              <div className="text-sm text-gray-600 mt-1">{currentRecord.description}</div>
            )}
          </div>

          <div className="space-y-4">
            {/* カテゴリ選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                カテゴリ <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => updateClassification('category', cat.value)}
                    className={`px-3 py-2 rounded-lg border transition-colors ${
                      currentClassification.category === cat.value
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 予防整備 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                予防整備
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateClassification('isPreventive', true)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    currentClassification.isPreventive === true
                      ? 'bg-green-50 border-green-500 text-green-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  はい
                </button>
                <button
                  onClick={() => updateClassification('isPreventive', false)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    currentClassification.isPreventive === false
                      ? 'bg-gray-50 border-gray-500 text-gray-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  いいえ
                </button>
              </div>
            </div>

            {/* 記録の種類 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                記録の種類
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateClassification('typeTag', 'receipt_backed')}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    currentClassification.typeTag === 'receipt_backed'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  レシートあり
                </button>
                <button
                  onClick={() => updateClassification('typeTag', 'owner_log')}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    currentClassification.typeTag === 'owner_log'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  オーナー記録
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            キャンセル
          </button>
          {currentIndex > 0 && (
            <button
              onClick={handlePrev}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              前へ
            </button>
          )}
          <button
            onClick={handleSkip}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            スキップ
          </button>
          <button
            onClick={handleNext}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {currentIndex < recentRecords.length - 1 ? '次へ' : '完了'}
          </button>
        </div>
      </div>
    </div>
  );
}
