'use client';

import { useState } from 'react';
import { share, type SharePayload } from '@/lib/share';

interface ShareButtonProps {
  url?: string;
  getUrl?: () => Promise<string>;
  title?: string;
  text?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * 共有ボタンコンポーネント
 * companion判定→Capacitor Share / Web Share API / URLコピー
 */
export default function ShareButton({ 
  url, 
  getUrl,
  title, 
  text, 
  className = '',
  children 
}: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (isSharing) return;
    
    setIsSharing(true);
    try {
      // getUrl が優先、なければ url を使用、それもなければ現在URLをフォールバック
      let shareUrl: string;
      if (getUrl) {
        try {
          shareUrl = await getUrl();
        } catch (error) {
          console.error('Failed to get URL from getUrl:', error);
          // エラー時は url があればそれを使用、なければ現在URL
          shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
        }
      } else {
        shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
      }
      
      const payload: SharePayload = {
        title: title || 'GarageLog',
        text: text || 'この車の情報を共有',
        url: shareUrl,
      };
      
      const result = await share(payload);
      
      if (result.ok) {
        // 成功時のフィードバック
        if (result.method === 'copy') {
          alert('URLをクリップボードにコピーしました');
        }
        // capacitor/webshareの場合はOS標準UIが表示されるため、追加のフィードバックは不要
      } else {
        // エラー時のフィードバック
        if (result.error && result.error !== 'User cancelled') {
          alert(`共有に失敗しました: ${result.error}`);
        }
      }
    } catch (error: any) {
      console.error('Share error:', error);
      alert(`共有に失敗しました: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={isSharing}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {children || (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span>{isSharing ? '共有中...' : '共有'}</span>
        </>
      )}
    </button>
  );
}
