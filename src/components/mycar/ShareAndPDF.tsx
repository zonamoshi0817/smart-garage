'use client';

interface PDFOnlyProps {
  carId: string;
  onGeneratePDF: () => void;
  onViewVerificationPage: () => void;
}

/**
 * PDF出力コンポーネント（共有URL機能は削除済み）
 * 車両履歴のPDF出力のみを提供
 */
export default function ShareAndPDF({
  carId,
  onGeneratePDF,
  onViewVerificationPage
}: PDFOnlyProps) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span>📄</span>
        <span>PDF出力</span>
      </h2>
      
      <div className="space-y-4">
        {/* PDF発行 */}
        <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <span>📄</span>
                <span>車両履歴PDF</span>
              </h3>
              <p className="text-xs text-gray-600">
                全メンテナンス履歴・給油記録を証跡付きPDFで出力
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onGeneratePDF}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-md"
              >
                📥 PDF発行
              </button>
              <button
                onClick={onViewVerificationPage}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-indigo-600 text-sm font-medium rounded-lg border border-indigo-300 transition-colors"
              >
                検証ページ
              </button>
            </div>
          </div>
        </div>
        
        {/* 証跡について */}
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start gap-2 text-xs text-gray-600">
            <span className="flex-shrink-0 mt-0.5">ℹ️</span>
            <p>
              PDFには、すべてのデータに対するブロックチェーン検証IDが含まれています。
              データの改ざんがないことを第三者が検証できます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

