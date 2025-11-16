'use client';

import { useState } from 'react';
import { Car, MaintenanceRecord } from '@/types';
import { downloadMaintenancePDF } from '@/lib/pdfExport';

interface ShareAndPDFModalProps {
  car: Car;
  maintenanceRecords: MaintenanceRecord[];
  onClose: () => void;
}

/**
 * PDF出力モーダル（共有URL機能は削除済み）
 * 車両履歴のPDF出力のみを提供
 */
export default function ShareAndPDFModal({ car, maintenanceRecords, onClose }: ShareAndPDFModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePDF = async () => {
    if (maintenanceRecords.length === 0) {
      alert('メンテナンス履歴がありません。先にメンテナンス記録を追加してください。');
      return;
    }

    setIsGenerating(true);
    try {
      await downloadMaintenancePDF({
        car,
        maintenanceRecords
      });
      alert('✅ PDFを出力しました！');
    } catch (error) {
      console.error('PDF生成エラー:', error);
      alert('PDF生成中にエラーが発生しました。');
    } finally {
      setIsGenerating(false);
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
                <span>📄</span>
                <span>PDF出力</span>
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
          {/* PDF発行 */}
          <div className="p-5 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span>📄</span>
              <span>車両履歴PDF</span>
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              全メンテナンス履歴・給油記録を証跡付きPDFで出力します
            </p>
            {maintenanceRecords.length > 0 ? (
              <p className="text-xs text-indigo-700 mb-4">
                📊 {maintenanceRecords.length}件のメンテナンス記録をPDFに含めます
              </p>
            ) : (
              <p className="text-xs text-orange-700 mb-4">
                ⚠️ メンテナンス記録がありません。先に記録を追加してください。
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleGeneratePDF}
                disabled={isGenerating || maintenanceRecords.length === 0}
                className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <span>📥</span>
                <span>{isGenerating ? 'PDF生成中...' : 'PDF発行'}</span>
              </button>
              <button
                className="px-4 py-3 bg-white hover:bg-gray-50 text-indigo-600 font-medium rounded-lg border border-indigo-300 transition-colors"
              >
                検証ページ
              </button>
            </div>
          </div>
          
          {/* 証跡について */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 text-2xl">ℹ️</span>
              <div className="text-sm text-gray-600 space-y-2">
                <p className="font-medium text-gray-900">証跡機能について</p>
                <p>
                  PDFには、すべてのデータに対するブロックチェーン検証IDが含まれています。
                  データの改ざんがないことを第三者が検証できます。
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


