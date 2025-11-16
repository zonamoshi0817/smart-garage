import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || "development";

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
    
    // 重要エンドポイント: 100%サンプリング
    const criticalEndpoints = [
      "POST /api/stripe",
      "GET /api/stripe",
      "/api/stripe/webhook",
      "/api/stripe/checkout",
      "/api/stripe/portal",
    ];
    
    // 重要エンドポイントに一致する場合は100%
    if (criticalEndpoints.some(endpoint => transactionName.includes(endpoint))) {
      return 1.0;
    }
    
    // 一般エンドポイント: 10%サンプリング
    return 0.1;
  },
  
  // サーバーサイドでのトレース設定
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
  
  // エラーフィルタリング
  beforeSend(event, hint) {
    // 開発環境ではコンソールに出力のみ
    if (process.env.NODE_ENV === "development") {
      console.log("Sentry Event (Dev Server):", event);
      return null;
    }
    
    // PII除去: リクエストヘッダーから機密情報を削除
    if (event.request) {
      // Authorization ヘッダーを除去
      if (event.request.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
        delete event.request.headers['X-Firebase-Token'];
      }
      
      // クエリパラメータから機密情報を除去
      if (event.request.query_string) {
        const params = new URLSearchParams(event.request.query_string);
        params.delete('token');
        params.delete('idToken');
        params.delete('sessionId');
        event.request.query_string = params.toString();
      }
    }
    
    // ユーザー情報のPII除去
    if (event.user) {
      if (event.user.email) {
        const [localPart, domain] = event.user.email.split('@');
        event.user.email = `${localPart.substring(0, 2)}***@${domain}`;
      }
      delete event.user.ip_address;
    }
    
    return event;
  },
  
  // デバッグモード（開発時のみ）
  debug: process.env.NODE_ENV === "development",
});

export default Sentry;

