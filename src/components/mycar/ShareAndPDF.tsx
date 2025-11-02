'use client';

import { useState } from 'react';

interface ShareLink {
  url: string;
  expiresAt: Date;
  isActive: boolean;
}

interface ShareAndPDFProps {
  carId: string;
  shareLink?: ShareLink;
  onGeneratePDF: () => void;
  onGenerateShareLink: () => void;
  onRevokeShareLink: () => void;
  onViewVerificationPage: () => void;
}

export default function ShareAndPDF({
  carId,
  shareLink,
  onGeneratePDF,
  onGenerateShareLink,
  onRevokeShareLink,
  onViewVerificationPage
}: ShareAndPDFProps) {
  const [copied, setCopied] = useState(false);
  
  const handleCopyLink = async () => {
    if (shareLink?.url) {
      await navigator.clipboard.writeText(shareLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const formatExpiryDate = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return '期限切れ';
    if (diffDays === 0) return '今日まで';
    if (diffDays === 1) return '明日まで';
    return `あと${diffDays}日`;
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span>🔗</span>
        <span>共有 & PDF</span>
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
        
        {/* 共有URL */}
        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span>🌐</span>
            <span>共有URL</span>
          </h3>
          
          {shareLink && shareLink.isActive ? (
            <div className="space-y-3">
              {/* URL表示 */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shareLink.url}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {copied ? '✓ コピー済み' : '📋 コピー'}
                </button>
              </div>
              
              {/* 期限と失効ボタン */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">
                  有効期限: <span className="font-medium">{formatExpiryDate(shareLink.expiresAt)}</span>
                </span>
                <button
                  onClick={onRevokeShareLink}
                  className="text-red-600 hover:text-red-800 font-medium"
                >
                  🔒 URLを失効
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 mb-3">
                車両情報を他の人と安全に共有できます
              </p>
              <button
                onClick={onGenerateShareLink}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors shadow-md"
              >
                🔗 共有URLを発行
              </button>
            </div>
          )}
        </div>
        
        {/* 証跡について */}
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start gap-2 text-xs text-gray-600">
            <span className="flex-shrink-0 mt-0.5">ℹ️</span>
            <p>
              PDFと共有URLには、すべてのデータに対するブロックチェーン検証IDが含まれています。
              データの改ざんがないことを第三者が検証できます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

