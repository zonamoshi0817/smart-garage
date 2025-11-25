/**
 * Google Analytics 4 (GA4) イベント追跡ユーティリティ
 */

// Google Analyticsの型定義
declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string | Date,
      config?: Record<string, any>
    ) => void;
    dataLayer?: any[];
  }
}

/**
 * ページビューを追跡
 */
export function trackPageView(url: string) {
  if (typeof window === "undefined" || !window.gtag) return;

  window.gtag("config", process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "", {
    page_path: url,
  });
}

/**
 * イベントを追跡
 */
export function trackEvent(
  eventName: string,
  eventParams?: Record<string, any>
) {
  if (typeof window === "undefined" || !window.gtag) return;

  window.gtag("event", eventName, eventParams);
}

/**
 * LPのイベント追跡用のヘルパー関数
 */
export const lpEvents = {
  /**
   * CTAボタンのクリックを追跡
   */
  ctaClick: (location: string) => {
    trackEvent("lp_cta_click", {
      location, // "hero", "pricing", "features", "cta_section" など
    });
  },

  /**
   * ログインボタンのクリックを追跡
   */
  loginClick: (location: string) => {
    trackEvent("lp_login_click", {
      location, // "header", "hero", "cta_section" など
    });
  },

  /**
   * セクションの表示を追跡
   */
  sectionView: (sectionName: string) => {
    trackEvent("lp_section_view", {
      section_name: sectionName, // "hero", "features", "pricing", "faq" など
    });
  },

  /**
   * FAQの展開を追跡
   */
  faqExpand: (question: string) => {
    trackEvent("lp_faq_expand", {
      question,
    });
  },

  /**
   * 価格プランの表示を追跡
   */
  pricingView: (plan: string) => {
    trackEvent("lp_pricing_view", {
      plan, // "free", "premium" など
    });
  },

  /**
   * スクロール深度を追跡
   */
  scrollDepth: (depth: number) => {
    trackEvent("lp_scroll_depth", {
      depth, // 25, 50, 75, 100 など
    });
  },
};

/**
 * OCR関連のイベント追跡
 */
export function logOcrStarted(type: string, fileSize?: number) {
  trackEvent("ocr_started", {
    type,
    file_size: fileSize,
  });
}

export function logOcrUsed(type: string, success: boolean) {
  trackEvent("ocr_used", {
    type,
    success,
  });
}

export function logOcrAutofillDone(type: string, fieldsPopulated: number) {
  trackEvent("ocr_autofill_done", {
    type,
    fields_populated: fieldsPopulated,
  });
}

/**
 * ペイウォール関連のイベント追跡
 */
export function logPaywallShown(feature: string, plan: string) {
  trackEvent("paywall_shown", {
    feature,
    plan,
  });
}

export function logPaywallClick(feature: string, plan: string) {
  trackEvent("paywall_click", {
    feature,
    plan,
  });
}

export function logSubscribeStarted(plan: string, billingCycle: string) {
  trackEvent("subscribe_started", {
    plan,
    billing_cycle: billingCycle,
  });
}

/**
 * 車両関連のイベント追跡
 */
export function logCarAdded(carCount: number, isFirstCar: boolean) {
  trackEvent("car_added", {
    car_count: carCount,
    is_first_car: isFirstCar,
  });
}

export function logCarDeleted(carCount: number) {
  trackEvent("car_deleted", {
    car_count: carCount,
  });
}

/**
 * カスタマイズ関連のイベント追跡
 */
export function logCustomizationCreated(carId: string, categories: string[]) {
  trackEvent("customization_created", {
    car_id: carId,
    categories: categories.join(","),
  });
}

/**
 * 給油記録関連のイベント追跡
 */
export function logFuelCreated(carId: string, isOcrUsed: boolean) {
  trackEvent("fuel_created", {
    car_id: carId,
    is_ocr_used: isOcrUsed,
  });
}

/**
 * メンテナンス関連のイベント追跡
 */
export function logMaintenanceCreated(carId: string, title: string) {
  trackEvent("maintenance_created", {
    car_id: carId,
    title,
  });
}

/**
 * PDFエクスポート関連のイベント追跡
 */
export function logPdfExported(carId: string, recordCount: number) {
  trackEvent("pdf_exported", {
    car_id: carId,
    record_count: recordCount,
  });
}
