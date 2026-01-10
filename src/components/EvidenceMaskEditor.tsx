/**
 * 証跡マスクエディタ（Canvasで矩形マスク）
 */

'use client';

import { useState, useRef, useEffect } from 'react';

interface EvidenceMaskEditorProps {
  imageUrl: string;
  onComplete: (maskedImageBlob: Blob) => void;
  onCancel: () => void;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function EvidenceMaskEditor({
  imageUrl,
  onComplete,
  onCancel,
}: EvidenceMaskEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [masks, setMasks] = useState<Rect[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<Rect | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };
  }, [imageUrl, masks, currentRect]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvasサイズを画像サイズに合わせる
    canvas.width = img.width;
    canvas.height = img.height;

    // 画像を描画
    ctx.drawImage(img, 0, 0);

    // 既存のマスクを描画
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    masks.forEach(mask => {
      ctx.fillRect(mask.x, mask.y, mask.width, mask.height);
    });

    // 現在描画中の矩形を描画
    if (currentRect) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
    }
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasCoordinates(e);
    if (!pos) return;

    setIsDrawing(true);
    setStartPos(pos);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;

    const pos = getCanvasCoordinates(e);
    if (!pos) return;

    const rect: Rect = {
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      width: Math.abs(pos.x - startPos.x),
      height: Math.abs(pos.y - startPos.y),
    };
    setCurrentRect(rect);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentRect) return;

    // 最小サイズチェック（10x10px）
    if (currentRect.width >= 10 && currentRect.height >= 10) {
      setMasks([...masks, currentRect]);
    }

    setIsDrawing(false);
    setCurrentRect(null);
    setStartPos(null);
  };

  const handleComplete = async () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // マスク済み画像を生成
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    // 全てのマスクを描画
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    masks.forEach(mask => {
      ctx.fillRect(mask.x, mask.y, mask.width, mask.height);
    });

    // Blobに変換
    canvas.toBlob((blob) => {
      if (blob) {
        onComplete(blob);
      }
    }, 'image/png');
  };

  const handleClearLast = () => {
    setMasks(masks.slice(0, -1));
  };

  const handleClearAll = () => {
    setMasks([]);
    setCurrentRect(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">証跡マスク編集</h2>
        <p className="text-sm text-gray-600 mb-6">
          個人情報が含まれる部分をドラッグしてマスクしてください。
        </p>

        <div className="mb-4 flex gap-4">
          <button
            onClick={handleClearLast}
            disabled={masks.length === 0}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
          >
            最後のマスクを削除
          </button>
          <button
            onClick={handleClearAll}
            disabled={masks.length === 0}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
          >
            全てクリア
          </button>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-auto max-h-[600px]">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="cursor-crosshair max-w-full"
            style={{ maxHeight: '600px' }}
          />
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={handleComplete}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            完了
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
