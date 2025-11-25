"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { useEffect } from "react";

/**
 * Google Analytics 4 (GA4) コンポーネント
 * 環境変数 NEXT_PUBLIC_GA_MEASUREMENT_ID が設定されている場合のみ読み込む
 */
export function GoogleAnalyticsComponent() {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  // 開発環境でのデバッグ情報（本番環境では表示しない）
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      if (gaMeasurementId) {
        console.log("✅ Google Analytics: 設定済み", {
          measurementId: gaMeasurementId,
          isProduction: process.env.NODE_ENV === "production",
        });
      } else {
        console.warn("⚠️  Google Analytics: 測定IDが設定されていません");
        console.info("💡 設定方法: .env.local に NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX を追加");
      }
    }
  }, [gaMeasurementId]);

  if (!gaMeasurementId) {
    // 開発環境やGA測定IDが設定されていない場合は何も表示しない
    return null;
  }

  return <GoogleAnalytics gaId={gaMeasurementId} />;
}

