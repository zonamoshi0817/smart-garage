// src/components/ads/AdUnit.tsx
"use client";

import { useEffect, useState } from "react";
import { usePremium } from "@/hooks/usePremium";

interface AdUnitProps {
  slot: "sidebar" | "banner" | "inline";
  className?: string;
}

/**
 * 広告ユニットコンポーネント
 * プレミアムユーザーには表示されない
 */
export default function AdUnit({ slot, className = "" }: AdUnitProps) {
  const { isPremium, loading } = usePremium();
  const [shouldShowAd, setShouldShowAd] = useState(false);

  useEffect(() => {
    // プレミアムユーザーには広告を表示しない
    if (!loading && !isPremium) {
      setShouldShowAd(true);
    } else {
      setShouldShowAd(false);
    }
  }, [isPremium, loading]);

  // ローディング中または広告を表示しない場合は何も表示しない
  if (loading || !shouldShowAd) {
    return null;
  }

  const adConfig = getAdConfig(slot);

  return (
    <div className={`ad-unit ${className}`}>
      <div
        className={`bg-gray-100 rounded-xl p-4 border border-gray-200 ${adConfig.containerClass}`}
      >
        {/* 広告ラベル */}
        <div className="flex items-center justify-center mb-2">
          <span className="text-xs text-gray-500 uppercase tracking-wide">
            広告
          </span>
        </div>

        {/* プレースホルダー広告 */}
        <div className={`flex items-center justify-center ${adConfig.contentClass}`}>
          <div className="text-center">
            <div className="text-4xl mb-2">{adConfig.icon}</div>
            <p className="text-sm text-gray-600 font-medium">
              {adConfig.placeholderText}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {adConfig.dimensions}
            </p>
          </div>
        </div>

        {/* プレミアムアップグレードリンク */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <a
            href="/settings/billing"
            className="block text-center text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            広告を非表示にする →
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * 広告スロットごとの設定
 */
function getAdConfig(slot: string) {
  const configs = {
    sidebar: {
      containerClass: "min-h-[250px]",
      contentClass: "h-[200px]",
      icon: "🚗",
      placeholderText: "サイドバー広告",
      dimensions: "300x250",
    },
    banner: {
      containerClass: "min-h-[100px]",
      contentClass: "h-[70px]",
      icon: "📢",
      placeholderText: "バナー広告",
      dimensions: "728x90",
    },
    inline: {
      containerClass: "min-h-[150px]",
      contentClass: "h-[120px]",
      icon: "🎯",
      placeholderText: "インライン広告",
      dimensions: "336x280",
    },
  };

  return configs[slot as keyof typeof configs] || configs.inline;
}

/**
 * 広告表示頻度を制御するカスタムフック
 */
export function useAdFrequency(maxAdsPerPage: number = 3) {
  const [adCount, setAdCount] = useState(0);

  const shouldShowAd = () => {
    if (adCount >= maxAdsPerPage) {
      return false;
    }
    setAdCount((prev) => prev + 1);
    return true;
  };

  const resetAdCount = () => {
    setAdCount(0);
  };

  return { shouldShowAd, resetAdCount, adCount };
}

/**
 * アフィリエイトリンク付き広告カード
 */
export function AffiliateAdCard({
  title,
  description,
  imageUrl,
  linkUrl,
  ctaText = "詳細を見る",
}: {
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  ctaText?: string;
}) {
  const { isPremium } = usePremium();

  // プレミアムユーザーには表示しない
  if (isPremium) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      {/* 広告ラベル */}
      <div className="bg-gray-50 px-3 py-1 border-b border-gray-200">
        <span className="text-xs text-gray-500 uppercase tracking-wide">
          広告 / PR
        </span>
      </div>

      {/* 広告コンテンツ */}
      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="block p-4"
      >
        <div className="flex gap-4">
          {/* 画像 */}
          {imageUrl && (
            <div className="flex-shrink-0">
              <img
                src={imageUrl}
                alt={title}
                className="w-20 h-20 object-cover rounded-lg"
              />
            </div>
          )}

          {/* テキスト */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 mb-1 truncate">
              {title}
            </h4>
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
              {description}
            </p>
            <span className="text-sm text-blue-600 font-medium hover:text-blue-700">
              {ctaText} →
            </span>
          </div>
        </div>
      </a>
    </div>
  );
}

