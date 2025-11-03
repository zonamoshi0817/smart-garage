import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || "development";

Sentry.init({
  dsn: SENTRY_DSN || "",
  
  // 本番環境でのみ有効化
  enabled: process.env.NODE_ENV === "production" && !!SENTRY_DSN,
  
  // 環境設定
  environment: SENTRY_ENVIRONMENT,
  
  // トレースサンプリング率
  tracesSampleRate: SENTRY_ENVIRONMENT === "production" ? 0.1 : 1.0,
  
  // デバッグモード（開発時のみ）
  debug: process.env.NODE_ENV === "development",
});

export default Sentry;

