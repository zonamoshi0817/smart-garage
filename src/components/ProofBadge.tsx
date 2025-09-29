// src/components/ProofBadge.tsx
import React from 'react';
import { ProofData } from '@/lib/proof';

interface ProofBadgeProps {
  proof: ProofData;
  showDetails?: boolean;
  className?: string;
}

export default function ProofBadge({ proof, showDetails = false, className = '' }: ProofBadgeProps) {
  const badgeText = `証明済み ${proof.generatedAt.toLocaleDateString('ja-JP')} ${proof.generatedAt.toLocaleTimeString('ja-JP', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })}`;

  return (
    <div className={`proof-badge ${className}`}>
      <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
        {/* 証明アイコン */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        
        {/* 証明情報 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-green-800">
              {badgeText}
            </span>
            <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
              v{proof.version}
            </span>
          </div>
          
          {showDetails && (
            <div className="mt-1 text-xs text-gray-600">
              <div className="flex items-center gap-4">
                <span>ハッシュ: <code className="bg-gray-100 px-1 rounded">{proof.hash}</code></span>
                {proof.recordCount && (
                  <span>記録数: {proof.recordCount}件</span>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* 詳細表示ボタン */}
        <button
          className="flex-shrink-0 text-green-600 hover:text-green-800 transition-colors"
          title="証明性の詳細を表示"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// 証明性ステータス表示用の小さなバッジ
export function ProofStatusBadge({ proof, className = '' }: { proof: ProofData; className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full ${className}`}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>証明済み</span>
    </div>
  );
}

// 証明性の詳細モーダル
export function ProofDetailsModal({ 
  proof, 
  isOpen, 
  onClose 
}: { 
  proof: ProofData; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  if (!isOpen) return null;

  const typeMap = {
    'car': '車両情報',
    'maintenance': 'メンテナンス記録',
    'reminder': 'リマインダー',
    'combined': '統合データ'
  };

  const typeName = typeMap[proof.dataType] || 'データ';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">証明性の詳細</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-green-800">データの整合性が証明されています</div>
              <div className="text-sm text-green-600">改ざん防止ハッシュによる検証済み</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-700">データ種別</div>
              <div className="text-gray-600">{typeName}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">バージョン</div>
              <div className="text-gray-600">v{proof.version}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">生成日時</div>
              <div className="text-gray-600">{proof.generatedAt.toLocaleString('ja-JP')}</div>
            </div>
            {proof.recordCount && (
              <div>
                <div className="font-medium text-gray-700">記録数</div>
                <div className="text-gray-600">{proof.recordCount}件</div>
              </div>
            )}
          </div>
          
          <div>
            <div className="font-medium text-gray-700 mb-2">整合性ハッシュ</div>
            <div className="bg-gray-100 p-3 rounded-lg font-mono text-sm break-all">
              {proof.hash}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              このハッシュはデータの内容に基づいて生成され、改ざんを検出できます
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-1">証明性について</div>
                <div>
                  このデータは改ざん防止ハッシュにより証明されています。
                  第三者による検証や信頼性の確認にご利用いただけます。
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
