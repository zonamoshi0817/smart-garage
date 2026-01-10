/**
 * 査定依頼用メッセージテンプレートコピーボタン
 */

'use client';

import { useState, useEffect } from 'react';

interface Vehicle {
  name: string;
  year?: number;
  odoKm?: number;
  inspectionExpiry?: Date | string; // ISO string形式も受け入れる
  modelCode?: string;
}

interface CopyTemplateButtonProps {
  slug: string;
  vehicle: Vehicle;
  analyticsEnabled: boolean;
}

const generateTemplate = (vehicle: Vehicle, slug: string, variant: 'short' | 'polite' | 'phone', baseUrl: string): string => {
  const vehicleInfo = [
    vehicle.name,
    vehicle.year ? `${vehicle.year}年式` : '',
    vehicle.modelCode ? `型式: ${vehicle.modelCode}` : '',
    vehicle.odoKm ? `走行距離: ${vehicle.odoKm.toLocaleString()}km` : '',
    vehicle.inspectionExpiry
      ? `車検満了: ${new Intl.DateTimeFormat('ja-JP', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }).format(
          typeof vehicle.inspectionExpiry === 'string'
            ? new Date(vehicle.inspectionExpiry)
            : vehicle.inspectionExpiry
        )}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const url = `${baseUrl}/s/${slug}`;

  if (variant === 'short') {
    // SMS用（超短文）
    return `査定お願いします。${vehicle.name}${vehicle.year ? `${vehicle.year}年式` : ''}。詳細はこちら: ${url}`;
  } else if (variant === 'phone') {
    // 電話口用（口頭スクリプト）
    return `お忙しいところ失礼いたします。${vehicle.name}${vehicle.year ? `${vehicle.year}年式` : ''}の査定をお願いしたいのですが。

【車両情報】
${vehicleInfo}

詳細なメンテナンス履歴や整備記録のURLをSMSかメールでお送りさせていただきたいのですが、よろしいでしょうか？
URLはこちらです: ${url}

ご確認いただければ、ご連絡お願いします。`;
  } else {
    // メール用（丁寧）
    return `いつもお世話になっております。

以下の車両について、査定をお願いしたくご連絡いたします。

【車両情報】
${vehicleInfo}

詳細なメンテナンス履歴や整備記録は、以下のURLよりご確認いただけます。
${url}

ご査定のほど、よろしくお願いいたします。`;
  }
};

export default function CopyTemplateButton({
  slug,
  vehicle,
  analyticsEnabled,
}: CopyTemplateButtonProps) {
  const [copied, setCopied] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<'short' | 'polite' | 'phone'>('short');
  const [mounted, setMounted] = useState(false);
  const [baseUrl, setBaseUrl] = useState<string>('');

  // クライアント側のみでURLを生成（Hydrationエラーを防ぐ）
  useEffect(() => {
    setMounted(true);
    setBaseUrl(window.location.origin);
  }, []);

  const handleCopy = async () => {
    const currentBaseUrl = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    const template = generateTemplate(vehicle, slug, selectedVariant, currentBaseUrl);

    try {
      await navigator.clipboard.writeText(template);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      // イベント記録
      if (analyticsEnabled) {
        fetch(`/api/s/${slug}/event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'copy_template', variant: selectedVariant }),
        }).catch(() => {});
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedVariant('short')}
          className={`px-3 py-2 rounded-lg border transition-colors text-sm ${
            selectedVariant === 'short'
              ? 'bg-blue-50 border-blue-500 text-blue-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          SMS用
        </button>
        <button
          onClick={() => setSelectedVariant('polite')}
          className={`px-3 py-2 rounded-lg border transition-colors text-sm ${
            selectedVariant === 'polite'
              ? 'bg-blue-50 border-blue-500 text-blue-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          メール用
        </button>
        <button
          onClick={() => setSelectedVariant('phone')}
          className={`px-3 py-2 rounded-lg border transition-colors text-sm ${
            selectedVariant === 'phone'
              ? 'bg-blue-50 border-blue-500 text-blue-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          電話用
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap" suppressHydrationWarning>
        {mounted && baseUrl ? generateTemplate(vehicle, slug, selectedVariant, baseUrl) : (
          <span className="text-gray-400">読み込み中...</span>
        )}
      </div>

      <button
        onClick={handleCopy}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        {copied ? '✓ コピーしました' : 'テンプレートをコピー'}
      </button>
    </div>
  );
}