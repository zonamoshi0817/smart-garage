// src/lib/imageThumbnail.ts
"use client";

/**
 * サムネイル（縮小版）画像を生成
 * 原本とは別に保存して表示速度を向上
 */

export interface ThumbnailOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * サムネイル画像を生成（最長辺を制限）
 */
export function generateThumbnail(
  file: File,
  options: ThumbnailOptions = {}
): Promise<File> {
  const {
    maxWidth = 400,   // サムネイルは400px
    maxHeight = 400,
    quality = 0.75
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        // 元の画像サイズを取得
        let { width, height } = img;

        // 最長辺を基準にリサイズ
        const maxDimension = Math.max(width, height);
        const targetMaxDimension = Math.min(maxWidth, maxHeight);
        
        if (maxDimension > targetMaxDimension) {
          const ratio = targetMaxDimension / maxDimension;
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // キャンバスサイズを設定
        canvas.width = width;
        canvas.height = height;

        // 画像を描画
        ctx?.drawImage(img, 0, 0, width, height);

        // サムネイル画像を生成
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('サムネイルの生成に失敗しました'));
              return;
            }

            const thumbnailFile = new File(
              [blob], 
              file.name.replace(/\.(jpg|jpeg|png|webp)$/i, '_thumb.jpg'),
              {
                type: 'image/jpeg',
                lastModified: Date.now()
              }
            );
            resolve(thumbnailFile);
          },
          'image/jpeg',
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('画像の読み込みに失敗しました'));
    };

    // ファイルを画像として読み込み
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('ファイルの読み込みに失敗しました'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * 画像ファイルから原本とサムネイルを両方生成
 */
export async function generateImageVariants(
  file: File
): Promise<{
  original: File;
  thumbnail: File;
}> {
  const { compressImage } = await import('./imageCompression');
  
  // 原本（最長辺1600px）
  const original = await compressImage(file, {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.85,
    maxSizeKB: 800
  });
  
  // サムネイル（最長辺400px）
  const thumbnail = await generateThumbnail(file, {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.75
  });
  
  return { original, thumbnail };
}

/**
 * 画像の寸法を取得
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height
      });
    };

    img.onerror = () => {
      reject(new Error('画像の読み込みに失敗しました'));
    };

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('ファイルの読み込みに失敗しました'));
    };

    reader.readAsDataURL(file);
  });
}

