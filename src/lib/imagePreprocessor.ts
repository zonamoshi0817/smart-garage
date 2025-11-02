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
 * 領域候補を検出（アンカーベース）
 * 低解像度で重要なラベル（キーワード）を検出し、その近傍矩形を特定
 */
export interface TextRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;  // 検出されたラベル（例: "金額", "数量"）
}

/**
 * 罫線を薄化（テーブル構造のOCRノイズ除去）
 */
function thinLines(imageData: ImageData): void {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  
  // 縦線・横線を検出して薄くする（簡易実装）
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const current = data[idx];
      
      // 黒い線（閾値50以下）を検出
      if (current < 50) {
        // 上下左右をチェック
        const top = data[((y - 1) * width + x) * 4];
        const bottom = data[((y + 1) * width + x) * 4];
        const left = data[(y * width + (x - 1)) * 4];
        const right = data[(y * width + (x + 1)) * 4];
        
        // 罫線パターン（両端が白）なら薄くする
        if ((top > 200 && bottom > 200) || (left > 200 && right > 200)) {
          data[idx] = data[idx + 1] = data[idx + 2] = 180;  // グレーに薄化
        }
      }
    }
  }
}

/**
 * 台形補正（射影変換の簡易版）
 * ※完全な実装はOpenCV.js等が必要、ここでは回転補正のみ
 */
function correctPerspective(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
  // 簡易的な回転補正のみ実装
  // 本格的な台形補正は別ライブラリが必要
  // 今回はスキップ（将来拡張）
}

/**
 * 適応二値化（Otsu法ベース、局所的に適用）
 */
function applyAdaptiveBinarization(imageData: ImageData, blockSize: number = 16): void {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  
  // ブロック単位で二値化
  for (let by = 0; by < height; by += blockSize) {
    for (let bx = 0; bx < width; bx += blockSize) {
      const blockData: number[] = [];
      
      // ブロック内のピクセルを取得
      for (let y = by; y < Math.min(by + blockSize, height); y++) {
        for (let x = bx; x < Math.min(bx + blockSize, width); x++) {
          const idx = (y * width + x) * 4;
          blockData.push(data[idx]);
        }
      }
      
      // ブロック内の平均値を閾値として使用
      const threshold = blockData.reduce((a, b) => a + b, 0) / blockData.length;
      
      // 二値化適用
      for (let y = by; y < Math.min(by + blockSize, height); y++) {
        for (let x = bx; x < Math.min(bx + blockSize, width); x++) {
          const idx = (y * width + x) * 4;
          const value = data[idx] > threshold ? 255 : 0;
          data[idx] = data[idx + 1] = data[idx + 2] = value;
        }
      }
    }
  }
}

/**
 * 画像を前処理してOCR精度を向上（拡張版）
 * 
 * 改善ポイント:
 * - 罫線薄化: テーブル構造のノイズ除去
 * - 適応二値化: 局所的な明度変化に対応
 * - 台形補正: 撮影角度の補正（将来拡張）
 * 
 * @param file 元の画像ファイル
 * @param options.useLineThinning 罫線薄化を使用（デフォルト: true）
 * @param options.useAdaptiveBinarization 適応二値化を使用（デフォルト: false、保険証券向け）
 * @returns 前処理済み画像のBlob
 */
export async function preprocessImageForOCR(
  file: File, 
  options: {
    useLineThinning?: boolean;
    useAdaptiveBinarization?: boolean;
  } = {}
): Promise<Blob> {
  const { useLineThinning = true, useAdaptiveBinarization = false } = options;
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

          // 2. 罫線薄化（オプション）
          if (useLineThinning) {
            thinLines(imageData);
          }

          // 3. 適応二値化（オプション、保険証券など表形式に有効）
          if (useAdaptiveBinarization) {
            applyAdaptiveBinarization(imageData);
          } else {
            // 通常のコントラスト強化
            for (let i = 0; i < data.length; i += 4) {
              const value = data[i];
              const enhanced = ((value - 128) * 1.5) + 128;
              const clipped = Math.max(0, Math.min(255, enhanced));
              data[i] = clipped;
              data[i + 1] = clipped;
              data[i + 2] = clipped;
            }
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

