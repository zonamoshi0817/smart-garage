import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || "development";

Sentry.init({
  dsn: SENTRY_DSN || "",
  
  // 本番環境でのみ有効化
  enabled: process.env.NODE_ENV === "production" && !!SENTRY_DSN,
  
  // 環境設定
  environment: SENTRY_ENVIRONMENT,
  
  // 動的トレースサンプリング: Edge環境でも重要イベントは100%
  tracesSampler: (samplingContext) => {
    // 開発環境は全て100%
    if (SENTRY_ENVIRONMENT !== "production") {
      return 1.0;
    }
    
    const transactionName = samplingContext.transactionContext?.name || samplingContext.name || "";
    
    // Middlewareの重要パス: 100%サンプリング
    const criticalMiddlewarePaths = [
      "/api/stripe",
      "/share/",
      "/billing",
    ];
    
    // 重要パスに一致する場合は100%
    if (criticalMiddlewarePaths.some(path => transactionName.includes(path))) {
      return 1.0;
    }
    
    // 一般Middleware: 5%サンプリング（Edge環境はコスト考慮で低め）
    return 0.05;
  },
  
  // エラーフィルタリング
  beforeSend(event, hint) {
    // 開発環境ではコンソールに出力のみ
    if (process.env.NODE_ENV === "development") {
      console.log("Sentry Event (Dev Edge):", event);
      return null;
    }
    
    // PII除去: リクエストから機密情報を削除
    if (event.request) {
      if (event.request.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }
      
      if (event.request.query_string) {
        const params = new URLSearchParams(event.request.query_string);
        params.delete('token');
        params.delete('idToken');
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

