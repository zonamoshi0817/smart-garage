// src/lib/imageGeneration.ts
"use client";

import type { Car, Customization } from '@/types';
import { timestampToDate } from './converters';

export interface ImageGenerationOptions {
  car: Car;
  customizations: Customization[];
  type: 'og' | 'instagram' | 'story';
}

/**
 * OG画像・SNS用カード画像を生成
 */
export async function generateSocialCardImage(options: ImageGenerationOptions): Promise<Blob> {
  const { car, customizations, type } = options;
  
  // 画像サイズを決定
  const dimensions = {
    og: { width: 1200, height: 630 }, // OG画像（1.91:1）
    instagram: { width: 1080, height: 1080 }, // Instagram投稿（1:1）
    story: { width: 1080, height: 1920 }, // Instagram Story（9:16）
  };
  
  const { width, height } = dimensions[type];
  
  // Canvasを作成
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Canvas context not available');
  }
  
  // 背景グラデーション
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1e40af'); // 青
  gradient.addColorStop(1, '#3b82f6'); // 明るい青
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // 車両画像を読み込んで描画（左側）
  const imgSize = Math.min(width * 0.4, height * 0.8);
  const imgX = width * 0.05;
  const imgY = (height - imgSize) / 2;
  
  // 画像読み込みを試みる（エラーを完全に抑制）
  // Firebase Storageの画像はCORSの問題で読み込めない可能性があるため、
  // エラーが発生してもコンソールに表示されないようにする
  let imageLoaded = false;
  if (car.imagePath) {
    try {
      // 画像読み込みを試みる（タイムアウト付き）
      const loadedImg = await new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        let resolved = false;
        
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            img.onerror = null;
            img.onload = null;
            resolve(null);
          }
        }, 2000);
        
        // エラーハンドラーを先に設定（ブラウザのデフォルトエラーを抑制）
        img.onerror = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            img.onerror = null;
            img.onload = null;
            resolve(null);
          }
        };
        
        img.onload = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            img.onerror = null;
            img.onload = null;
            resolve(img);
          }
        };
        
        // 画像URLを設定（エラーを抑制するため、try-catchで囲む）
        try {
          // 画像の読み込みを開始（エラーが発生してもコンソールに表示されないようにする）
          img.src = car.imagePath;
        } catch (e) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            img.onerror = null;
            img.onload = null;
            resolve(null);
          }
        }
      });
      
      if (loadedImg && loadedImg.complete && loadedImg.naturalWidth > 0) {
        // 画像を丸角で描画
        ctx.save();
        ctx.beginPath();
        const radius = 20;
        ctx.moveTo(imgX + radius, imgY);
        ctx.lineTo(imgX + imgSize - radius, imgY);
        ctx.quadraticCurveTo(imgX + imgSize, imgY, imgX + imgSize, imgY + radius);
        ctx.lineTo(imgX + imgSize, imgY + imgSize - radius);
        ctx.quadraticCurveTo(imgX + imgSize, imgY + imgSize, imgX + imgSize - radius, imgY + imgSize);
        ctx.lineTo(imgX + radius, imgY + imgSize);
        ctx.quadraticCurveTo(imgX, imgY + imgSize, imgX, imgY + imgSize - radius);
        ctx.lineTo(imgX, imgY + radius);
        ctx.quadraticCurveTo(imgX, imgY, imgX + radius, imgY);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(loadedImg, imgX, imgY, imgSize, imgSize);
        ctx.restore();
        imageLoaded = true;
      }
    } catch (error) {
      // エラーは完全に無視（エラーメッセージを表示しない）
      imageLoaded = false;
    }
  }
  
  // 画像が読み込めなかった場合はプレースホルダーを描画
  if (!imageLoaded) {
    drawPlaceholder(ctx, imgX, imgY, imgSize, imgSize);
  }
  
  // テキストエリア（右側）
  const textX = width * 0.5;
  const textY = height * 0.2;
  const textWidth = width * 0.45;
  
  // 車名
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${type === 'story' ? 48 : 36}px 'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  // テキストを折り返して描画
  const carName = car.name;
  const maxWidth = textWidth;
  const lineHeight = type === 'story' ? 60 : 48;
  let y = textY;
  
  const carNameLines = wrapText(ctx, carName, textX, y, maxWidth, lineHeight);
  y += carNameLines * lineHeight + 20;
  
  // モデルコードと年式
  if (car.modelCode || car.year) {
    ctx.font = `${type === 'story' ? 24 : 18}px 'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif`;
    ctx.fillStyle = '#e0e7ff';
    const details = [car.modelCode, car.year ? `${car.year}年式` : ''].filter(Boolean).join(' / ');
    const detailsLines = wrapText(ctx, details, textX, y, maxWidth, lineHeight * 0.7);
    y += detailsLines * lineHeight * 0.7 + 30;
  }
  
  // OWNER'S PICKまたは代表カスタム3件
  const topCustoms = car.ownerPicks
    ? customizations.filter(c => car.ownerPicks?.includes(c.id || '')).slice(0, 3)
    : customizations.slice(0, 3);
  
  if (topCustoms.length > 0) {
    ctx.font = `bold ${type === 'story' ? 28 : 20}px 'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif`;
    ctx.fillStyle = '#ffffff';
    const titleLines = wrapText(ctx, '代表カスタム', textX, y, maxWidth, lineHeight * 0.8);
    y += titleLines * lineHeight * 0.8 + 15;
    
    ctx.font = `${type === 'story' ? 20 : 16}px 'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif`;
    ctx.fillStyle = '#e0e7ff';
    
    topCustoms.forEach((custom) => {
      if (y > height * 0.8) return; // 画面外に出ないように
      
      const customText = `${custom.brand ? `${custom.brand} ` : ''}${custom.title}`;
      const customLines = wrapText(ctx, customText, textX, y, maxWidth, lineHeight * 0.6);
      y += customLines * lineHeight * 0.6 + 10;
    });
  }
  
  // GarageLogロゴ（右下）
  ctx.font = `bold ${type === 'story' ? 32 : 24}px 'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('GarageLog', width - 30, height - 30);
  
  // CanvasをBlobに変換
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('画像の生成に失敗しました'));
      }
    }, 'image/png');
  });
}

/**
 * 画像を読み込む（エラー時は静かに失敗）
 * fetch APIを使用して画像の存在を確認してから読み込む
 */
async function loadImage(src: string): Promise<HTMLImageElement> {
  // まずfetchで画像の存在を確認（エラーを抑制）
  try {
    const response = await fetch(src, { 
      method: 'HEAD',
      mode: 'no-cors' // CORSエラーを回避
    });
    // no-corsモードではレスポンスを確認できないが、エラーは発生しない
  } catch (error) {
    // エラーは無視
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    let resolved = false;
    let rejected = false;
    
    const timeout = setTimeout(() => {
      if (!resolved && !rejected) {
        rejected = true;
        img.onerror = null;
        img.onload = null;
        reject(new Error('Timeout'));
      }
    }, 2000); // 2秒でタイムアウト
    
    img.onload = () => {
      if (!resolved && !rejected) {
        resolved = true;
        clearTimeout(timeout);
        img.onerror = null;
        img.onload = null;
        resolve(img);
      }
    };
    
    // エラーハンドラーを設定（エラーメッセージを抑制）
    img.onerror = () => {
      if (!resolved && !rejected) {
        rejected = true;
        clearTimeout(timeout);
        img.onerror = null;
        img.onload = null;
        // エラーを静かに拒否
        reject(new Error('Image load failed'));
      }
    };
    
    // 画像の読み込みを開始
    // crossOriginは設定しない（Firebase StorageのCORS設定に依存）
    try {
      // 画像URLを設定（エラーを抑制するため、try-catchで囲む）
      img.src = src;
    } catch (error) {
      if (!resolved && !rejected) {
        rejected = true;
        clearTimeout(timeout);
        img.onerror = null;
        img.onload = null;
        reject(new Error('Image load failed'));
      }
    }
  });
}

/**
 * プレースホルダーを描画
 */
function drawPlaceholder(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, width, height);
  
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  
  // アイコンを描画
  ctx.fillStyle = '#94a3b8';
  ctx.font = '48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🚗', x + width / 2, y + height / 2);
}

/**
 * テキストを折り返して描画し、行数を返す
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const chars = text.split('');
  let line = '';
  let currentY = y;
  let lineCount = 0;
  
  for (let i = 0; i < chars.length; i++) {
    const testLine = line + chars[i];
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && line.length > 0) {
      ctx.fillText(line, x, currentY);
      line = chars[i];
      currentY += lineHeight;
      lineCount++;
    } else {
      line = testLine;
    }
  }
  
  if (line.length > 0) {
    ctx.fillText(line, x, currentY);
    lineCount++;
  }
  
  return lineCount || 1;
}

/**
 * 画像をダウンロード
 */
export async function downloadSocialCardImage(options: ImageGenerationOptions): Promise<void> {
  try {
    const blob = await generateSocialCardImage(options);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const filename = `garagelog_${options.car.name}_${options.type}_${new Date().toISOString().split('T')[0]}.png`;
    link.download = filename;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('画像生成エラー:', error);
    throw new Error('画像の生成に失敗しました');
  }
}

