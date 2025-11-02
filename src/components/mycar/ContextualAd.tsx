'use client';

import { Car } from '@/types';

interface AdProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  imageUrl: string;
  affiliateUrl: string;
}

interface ContextualAdProps {
  car: Car;
  isPremium: boolean;
}

export default function ContextualAd({ car, isPremium }: ContextualAdProps) {
  // プレミアムユーザーは広告を表示しない
  if (isPremium) {
    return null;
  }
  
  // 車種・スペックに応じた関連商品を生成（実際にはAPIから取得）
  const getRelevantProducts = (): AdProduct[] => {
    // ダミーデータ（実際にはアフィリエイトAPIから取得）
    return [
      {
        id: '1',
        title: 'エンジンオイル 5W-30 4L',
        description: '高性能合成オイル。静音性と燃費向上に最適',
        price: '¥3,980',
        imageUrl: '/default-images/product-oil.jpg',
        affiliateUrl: '#'
      }
    ];
  };
  
  const products = getRelevantProducts();
  
  if (products.length === 0) {
    return null;
  }
  
  const product = products[0];

  return (
    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl shadow-md p-6 border-2 border-amber-200">
      {/* 広告ラベル */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-amber-800 bg-amber-200 px-2 py-1 rounded">
          🏷️ 広告
        </span>
        <button
          className="text-xs text-gray-500 hover:text-gray-700"
          onClick={() => {/* プレミアムアップグレードモーダルを表示 */}}
        >
          広告を非表示にする →
        </button>
      </div>
      
      {/* 商品カード */}
      <a
        href={product.affiliateUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="block hover:opacity-90 transition-opacity"
      >
        <div className="flex gap-4">
          {/* 商品画像 */}
          <div className="flex-shrink-0 w-24 h-24 bg-white rounded-lg overflow-hidden border border-amber-300">
            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
              <span className="text-4xl">🛢️</span>
            </div>
          </div>
          
          {/* 商品情報 */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 mb-1 line-clamp-2">
              {product.title}
            </h3>
            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
              {product.description}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-amber-900">
                {product.price}
              </span>
              <span className="text-xs text-indigo-600 font-medium">
                詳細を見る →
              </span>
            </div>
          </div>
        </div>
      </a>
      
      {/* 車種連動メッセージ */}
      <div className="mt-3 pt-3 border-t border-amber-300">
        <p className="text-xs text-gray-600">
          <span className="font-medium">{car.name}</span> に最適な商品です
        </p>
      </div>
    </div>
  );
}

