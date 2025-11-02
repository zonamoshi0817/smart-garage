// src/lib/imageEnhancer.ts
"use client";

/**
 * OCR精度向上のための高度な画像強化
 * 保険証券のような複雑なドキュメントに特化
 */

/**
 * 保険証券用の最適化された前処理
 * @param file 元の画像ファイル
 * @returns 最適化された画像Blob
 */
export async function enhanceInsuranceDocument(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Canvas context取得失敗'));
            return;
          }

          // 高解像度化（3倍）- 小さい文字対策
          const scale = 3.0;
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;

          // 高品質レンダリング
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // 画像データ取得
          let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          let data = imageData.data;

          // 1. グレースケール変換
          for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
          }

          // 2. シャープネス強化
          imageData = applySharpen(imageData, ctx);
          data = imageData.data;

          // 3. コントラスト強化（適応的ヒストグラム平坦化）
          imageData = applyAdaptiveContrast(imageData);
          data = imageData.data;

          // 処理済み画像を描画
          ctx.putImageData(imageData, 0, 0);

          // 最高品質でエクスポート
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Blob変換失敗'));
            }
          }, 'image/png', 1.0);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('画像読み込み失敗'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('ファイル読み込み失敗'));
    reader.readAsDataURL(file);
  });
}

/**
 * シャープネスフィルタを適用
 */
function applySharpen(imageData: ImageData, ctx: CanvasRenderingContext2D): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const output = ctx.createImageData(width, height);

  // シャープネスカーネル
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const kernelIdx = (ky + 1) * 3 + (kx + 1);
          sum += data[idx] * kernel[kernelIdx];
        }
      }
      
      const outIdx = (y * width + x) * 4;
      const value = Math.max(0, Math.min(255, sum));
      output.data[outIdx] = value;
      output.data[outIdx + 1] = value;
      output.data[outIdx + 2] = value;
      output.data[outIdx + 3] = 255;
    }
  }

  return output;
}

/**
 * 適応的コントラスト強化
 */
function applyAdaptiveContrast(imageData: ImageData): ImageData {
  const data = imageData.data;
  
  // ヒストグラムを計算
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    histogram[data[i]]++;
  }
  
  // 累積分布関数（CDF）を計算
  const cdf = new Array(256).fill(0);
  cdf[0] = histogram[0];
  for (let i = 1; i < 256; i++) {
    cdf[i] = cdf[i - 1] + histogram[i];
  }
  
  // 正規化
  const totalPixels = data.length / 4;
  const cdfMin = cdf.find(v => v > 0) || 0;
  
  // ヒストグラム平坦化を適用
  for (let i = 0; i < data.length; i += 4) {
    const oldValue = data[i];
    const newValue = Math.round(((cdf[oldValue] - cdfMin) / (totalPixels - cdfMin)) * 255);
    
    data[i] = newValue;
    data[i + 1] = newValue;
    data[i + 2] = newValue;
  }
  
  return imageData;
}

