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
