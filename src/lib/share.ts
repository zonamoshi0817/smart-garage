/**
 * ネイティブShare Sheet実装
 * iOS（Capacitor）ではOS標準のShare Sheet、WebではWeb Share APIまたはURLコピーにフォールバック
 */

import { isCompanionBrowser } from './companion';

export type SharePayload = {
  title?: string;
  text?: string;
  url?: string;
  files?: { name: string; blob: Blob }[];
};

export type ShareResult = {
  ok: boolean;
  method: 'capacitor' | 'webshare' | 'copy' | 'none';
  error?: string;
};

/**
 * 共有機能を実行
 * companion判定→Capacitor Share / Web Share API / URLコピー
 */
export async function share(payload: SharePayload): Promise<ShareResult> {
  const { title, text, url } = payload;

  // companion（Capacitor）の場合
  if (isCompanionBrowser()) {
    try {
      const { Share } = await import('@capacitor/share');
      
      // canShare()で共有可能か確認
      const canShareResult = await Share.canShare();
      if (!canShareResult.value) {
        // 共有できない場合はURLコピーにフォールバック
        if (url) {
          return await fallbackToCopy(url);
        }
        return { ok: false, method: 'none', error: 'Share not available' };
      }

      // Share.share()を呼び出し
      await Share.share({
        title: title || 'GarageLog',
        text: text || '',
        url: url || '',
        dialogTitle: title || '共有',
      });

      // （任意）Hapticsフィードバック
      try {
        const { Haptics } = await import('@capacitor/haptics');
        await Haptics.impact({ style: 'light' });
      } catch (hapticsError) {
        // Hapticsが利用できない場合は無視
        console.debug('Haptics not available:', hapticsError);
      }

      return { ok: true, method: 'capacitor' };
    } catch (error: any) {
      console.error('Capacitor Share error:', error);
      
      // エラー時はURLコピーにフォールバック
      if (url) {
        return await fallbackToCopy(url);
      }
      
      return { 
        ok: false, 
        method: 'capacitor', 
        error: error.message || 'Share failed' 
      };
    }
  }

  // Web（通常ブラウザ）の場合
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: title || 'GarageLog',
        text: text || '',
        url: url || '',
      });
      return { ok: true, method: 'webshare' };
    } catch (error: any) {
      // ユーザーがキャンセルした場合はエラーとしない
      if (error.name === 'AbortError') {
        return { ok: false, method: 'webshare', error: 'User cancelled' };
      }
      
      console.error('Web Share API error:', error);
      
      // エラー時はURLコピーにフォールバック
      if (url) {
        return await fallbackToCopy(url);
      }
      
      return { 
        ok: false, 
        method: 'webshare', 
        error: error.message || 'Share failed' 
      };
    }
  }

  // Web Share APIが利用できない場合はURLコピーにフォールバック
  if (url) {
    return await fallbackToCopy(url);
  }

  return { ok: false, method: 'none', error: 'No share method available' };
}

/**
 * URLをクリップボードにコピー（フォールバック）
 */
async function fallbackToCopy(url: string): Promise<ShareResult> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      return { ok: true, method: 'copy' };
    }
    
    // フォールバック: 古いブラウザ対応
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return { ok: true, method: 'copy' };
    } catch (err) {
      document.body.removeChild(textArea);
      throw err;
    }
  } catch (error: any) {
    console.error('Copy to clipboard error:', error);
    return { 
      ok: false, 
      method: 'copy', 
      error: error.message || 'Copy failed' 
    };
  }
}
