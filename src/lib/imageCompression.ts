// src/lib/imageCompression.ts
"use client";

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
}

/**
 * 画像を圧縮する
 */
export function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    maxSizeKB = 500
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        // 元の画像サイズを取得
        let { width, height } = img;

        // アスペクト比を維持しながらリサイズ
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        // キャンバスサイズを設定
        canvas.width = width;
        canvas.height = height;

        // 画像を描画
        ctx?.drawImage(img, 0, 0, width, height);

        // 圧縮された画像を生成
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('画像の圧縮に失敗しました'));
              return;
            }

            // ファイルサイズをチェック
            const sizeKB = blob.size / 1024;
            if (sizeKB > maxSizeKB) {
              // さらに圧縮が必要な場合、品質を下げる
              const newQuality = Math.max(0.1, quality * (maxSizeKB / sizeKB));
              canvas.toBlob(
                (newBlob) => {
                  if (!newBlob) {
                    reject(new Error('画像の圧縮に失敗しました'));
                    return;
                  }
                  
                  const compressedFile = new File([newBlob], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                  });
                  resolve(compressedFile);
                },
                'image/jpeg',
                newQuality
              );
            } else {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            }
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
 * 画像ファイルのサイズを取得（KB単位）
 */
export function getFileSizeKB(file: File): number {
  return Math.round(file.size / 1024);
}

/**
 * 画像ファイルのサイズを人間が読みやすい形式で取得
 */
export function getFileSizeString(file: File): string {
  const sizeKB = getFileSizeKB(file);
  if (sizeKB < 1024) {
    return `${sizeKB}KB`;
  } else {
    const sizeMB = (sizeKB / 1024).toFixed(1);
    return `${sizeMB}MB`;
  }
}

/**
 * 圧縮前後のサイズ比較情報を取得
 */
export function getCompressionInfo(originalFile: File, compressedFile: File): {
  originalSize: string;
  compressedSize: string;
  compressionRatio: string;
  savedSize: string;
} {
  const originalSizeKB = getFileSizeKB(originalFile);
  const compressedSizeKB = getFileSizeKB(compressedFile);
  const savedSizeKB = originalSizeKB - compressedSizeKB;
  const compressionRatio = ((savedSizeKB / originalSizeKB) * 100).toFixed(1);

  return {
    originalSize: getFileSizeString(originalFile),
    compressedSize: getFileSizeString(compressedFile),
    compressionRatio: `${compressionRatio}%`,
    savedSize: getFileSizeString(new File([new ArrayBuffer(savedSizeKB * 1024)], 'saved'))
  };
}
