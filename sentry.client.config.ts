import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "development";

Sentry.init({
  dsn: SENTRY_DSN || "",
  
  // 本番環境でのみ有効化
  enabled: process.env.NODE_ENV === "production" && !!SENTRY_DSN,
  
  // 環境設定
  environment: SENTRY_ENVIRONMENT,
  
  // トレースサンプリング率（1.0 = 100%）
  tracesSampleRate: SENTRY_ENVIRONMENT === "production" ? 0.1 : 1.0,
  
  // セッションリプレイ設定
  replaysSessionSampleRate: 0.1, // 10%のセッションを記録
  replaysOnErrorSampleRate: 1.0, // エラー時は100%記録
  
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
      // PII除去: テキスト入力をマスク
      maskAllInputs: true,
    }),
    new Sentry.BrowserTracing({
      // パフォーマンス監視のトレース設定
      tracePropagationTargets: ["localhost", /^https:\/\/[^/]*\.vercel\.app/],
    }),
  ],
  
  // PII（個人情報）の自動除去
  beforeBreadcrumb(breadcrumb) {
    // URLからクエリパラメータを除去（個人情報が含まれる可能性）
    if (breadcrumb.category === 'navigation' && breadcrumb.data?.to) {
      const url = new URL(breadcrumb.data.to, window.location.origin);
      breadcrumb.data.to = url.pathname; // クエリパラメータを削除
    }
    
    // フォーム入力データを除去
    if (breadcrumb.category === 'ui.input') {
      delete breadcrumb.message;
      delete breadcrumb.data;
    }
    
    return breadcrumb;
  },
  
  // エラーフィルタリング
  beforeSend(event, hint) {
    // 開発環境ではコンソールに出力のみ
    if (process.env.NODE_ENV === "development") {
      console.log("Sentry Event (Dev):", event);
      return null; // 送信しない
    }
    
    // PII除去: ユーザー情報から機密情報を削除
    if (event.user) {
      // メールアドレスの一部をマスク
      if (event.user.email) {
        const [localPart, domain] = event.user.email.split('@');
        event.user.email = `${localPart.substring(0, 2)}***@${domain}`;
      }
      // IPアドレスを除去
      delete event.user.ip_address;
    }
    
    // 特定のエラーを除外
    const error = hint.originalException;
    if (error && typeof error === "object" && "message" in error) {
      const message = String(error.message);
      
      // ブラウザ拡張機能のエラーを除外
      if (message.includes("chrome-extension://") || message.includes("moz-extension://")) {
        return null;
      }
      
      // ResizeObserver エラーを除外（無害な警告）
      if (message.includes("ResizeObserver")) {
        return null;
      }
    }
    
    return event;
  },
  
  // デバッグモード（開発時のみ）
  debug: process.env.NODE_ENV === "development",
});

// グローバルエラーハンドラー
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled Promise Rejection:", event.reason);
    Sentry.captureException(event.reason);
  });
}

export default Sentry;

