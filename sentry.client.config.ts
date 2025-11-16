import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "development";

Sentry.init({
  dsn: SENTRY_DSN || "",
  
  // 本番環境でのみ有効化
  enabled: process.env.NODE_ENV === "production" && !!SENTRY_DSN,
  
  // 環境設定
  environment: SENTRY_ENVIRONMENT,
  
  // 動的トレースサンプリング: 重要イベントは100%、一般は10%
  tracesSampler: (samplingContext) => {
    // 開発環境は全て100%
    if (SENTRY_ENVIRONMENT !== "production") {
      return 1.0;
    }
    
    const transactionName = samplingContext.transactionContext?.name || samplingContext.name || "";
    
    // 重要イベント: 100%サンプリング
    const criticalPaths = [
      "/api/stripe",       // Stripe決済関連
      "billing",           // 請求関連
      "ocr",               // OCR処理
      "/share/",           // 共有URL
      "payment",           // 決済フロー
      "checkout",          // チェックアウト
    ];
    
    // 重要パスに一致する場合は100%
    if (criticalPaths.some(path => transactionName.includes(path))) {
      return 1.0;
    }
    
    // 一般イベント: 10%サンプリング
    return 0.1;
  },
  
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
  
  // Breadcrumb強化（重要イベントは詳細記録）
  beforeBreadcrumb(breadcrumb) {
    // 重要イベントのBreadcrumbは必ず残す
    const criticalCategories = ['fetch', 'xhr', 'navigation'];
    if (criticalCategories.includes(breadcrumb.category || '')) {
      // URLチェック
      const url = breadcrumb.data?.url || '';
      if (
        url.includes('/api/stripe') ||
        url.includes('ocr') ||
        url.includes('/share/') ||
        url.includes('billing')
      ) {
        // 重要イベントのBreadcrumbにマーキング
        breadcrumb.level = 'info';
        breadcrumb.data = breadcrumb.data || {};
        breadcrumb.data.__critical = true;
      }
    }
    
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

