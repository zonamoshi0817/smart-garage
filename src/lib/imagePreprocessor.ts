// src/lib/imagePreprocessor.ts
"use client";

/**
 * OCR精度向上のための画像前処理
 * 
 * 目的:
 * - コントラスト強化
 * - グレースケール変換
 * - ノイズ除去
 * - 文字の鮮明化
 */

/**
 * 画像を前処理してOCR精度を向上
 * @param file 元の画像ファイル
 * @returns 前処理済み画像のBlob
 */
export async function preprocessImageForOCR(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        try {
          // Canvasを作成
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Canvas context取得失敗'));
            return;
          }

          // 解像度を2倍にアップスケール（OCR精度向上）
          const scale = 2.0;
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;

          // 高品質スケーリング設定
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // 画像を拡大描画
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // 画像データを取得
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // 1. グレースケール変換
          for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            data[i] = gray;     // R
            data[i + 1] = gray; // G
            data[i + 2] = gray; // B
          }

          // 2. コントラスト強化（適応的処理 - 二値化は控えめに）
          // より緩やかな処理で元画像の情報を保持
          for (let i = 0; i < data.length; i += 4) {
            const value = data[i]; // グレースケール値
            
            // コントラスト強化（線形変換）
            // 中間値（128）を基準に拡大
            const enhanced = ((value - 128) * 1.5) + 128;
            
            // クリッピング
            const clipped = Math.max(0, Math.min(255, enhanced));
            
            data[i] = clipped;
            data[i + 1] = clipped;
            data[i + 2] = clipped;
          }

          // 処理済み画像をCanvasに戻す
          ctx.putImageData(imageData, 0, 0);

          // Blobとしてエクスポート
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('画像のBlob変換に失敗'));
            }
          }, 'image/png', 1.0); // 最高品質で保存
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('画像の読み込みに失敗'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗'));
    reader.readAsDataURL(file);
  });
}

/**
 * Otsuの二値化法で最適な閾値を計算
 * @param data 画像データ（グレースケール）
 * @returns 最適閾値
 */
function calculateOtsuThreshold(data: Uint8ClampedArray): number {
  // ヒストグラムを作成
  const histogram = new Array(256).fill(0);
  
  for (let i = 0; i < data.length; i += 4) {
    histogram[data[i]]++;
  }
  
  const total = data.length / 4; // ピクセル総数
  
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }
  
  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let threshold = 0;
  
  for (let i = 0; i < 256; i++) {
    wB += histogram[i];
    if (wB === 0) continue;
    
    wF = total - wB;
    if (wF === 0) break;
    
    sumB += i * histogram[i];
    
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    
    const variance = wB * wF * (mB - mF) * (mB - mF);
    
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = i;
    }
  }
  
  return threshold;
}

/**
 * 画像を拡大（OCR精度向上のため）
 * @param file 元の画像ファイル
 * @param scale 拡大倍率（デフォルト: 2.0）
 * @returns 拡大された画像のBlob
 */
export async function upscaleImage(file: File, scale: number = 2.0): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context取得失敗'));
          return;
        }

        // 拡大したサイズ
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        // アンチエイリアス無効化（シャープに）
        ctx.imageSmoothingEnabled = false;

        // 拡大描画
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('画像のBlob変換に失敗'));
          }
        }, 'image/png', 1.0);
      };

      img.onerror = () => reject(new Error('画像の読み込みに失敗'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗'));
    reader.readAsDataURL(file);
  });
}

/**
 * 画像の明度を調整
 * @param file 元の画像ファイル
 * @param brightness 明度調整値（-100〜100、0が元のまま）
 * @param contrast コントラスト調整値（0〜200、100が元のまま）
 * @returns 調整された画像のBlob
 */
export async function adjustImageLevels(
  file: File, 
  brightness: number = 20, 
  contrast: number = 130
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context取得失敗'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // コントラスト係数
        const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

        for (let i = 0; i < data.length; i += 4) {
          // コントラスト調整
          data[i] = contrastFactor * (data[i] - 128) + 128;
          data[i + 1] = contrastFactor * (data[i + 1] - 128) + 128;
          data[i + 2] = contrastFactor * (data[i + 2] - 128) + 128;

          // 明度調整
          data[i] = Math.min(255, Math.max(0, data[i] + brightness));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + brightness));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + brightness));
        }

        ctx.putImageData(imageData, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('画像のBlob変換に失敗'));
          }
        }, 'image/png', 1.0);
      };

      img.onerror = () => reject(new Error('画像の読み込みに失敗'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗'));
    reader.readAsDataURL(file);
  });
}

