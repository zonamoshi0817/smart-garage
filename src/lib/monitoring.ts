// src/lib/monitoring.ts
"use client";

import * as Sentry from "@sentry/nextjs";
import type { User } from "firebase/auth";

/**
 * ユーザー情報をSentryに設定
 */
export function setSentryUser(user: User | null) {
  if (user) {
    Sentry.setUser({
      id: user.uid,
      email: user.email || undefined,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * カスタムタグを設定
 */
export function setSentryTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

/**
 * カスタムコンテキストを設定
 */
export function setSentryContext(name: string, context: Record<string, any>) {
  Sentry.setContext(name, context);
}

/**
 * エラーをSentryに送信
 */
export function captureError(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * カスタムメッセージをSentryに送信
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: Record<string, any>
) {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureMessage(message, level);
    });
  } else {
    Sentry.captureMessage(message, level);
  }
}

/**
 * パフォーマンストランザクションを開始
 */
export function startTransaction(name: string, op: string) {
  return Sentry.startTransaction({ name, op });
}

/**
 * ブレッドクラムを追加（ユーザーの行動履歴）
 */
export function addBreadcrumb(
  category: string,
  message: string,
  level: "info" | "warning" | "error" = "info",
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    category,
    message,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * ユーザーフロー追跡用のブレッドクラム
 */
export const trackUserAction = {
  login: () => addBreadcrumb("auth", "User logged in", "info"),
  logout: () => addBreadcrumb("auth", "User logged out", "info"),
  
  addCar: (carId: string) => addBreadcrumb("car", "Car added", "info", { carId }),
  editCar: (carId: string) => addBreadcrumb("car", "Car edited", "info", { carId }),
  deleteCar: (carId: string) => addBreadcrumb("car", "Car deleted", "info", { carId }),
  
  addMaintenance: (recordId: string) => 
    addBreadcrumb("maintenance", "Maintenance record added", "info", { recordId }),
  
  addFuelLog: (logId: string) => 
    addBreadcrumb("fuel", "Fuel log added", "info", { logId }),
  
  ocrStarted: (imageSize: number) => 
    addBreadcrumb("ocr", "OCR processing started", "info", { imageSize }),
  ocrCompleted: (confidence: number) => 
    addBreadcrumb("ocr", "OCR processing completed", "info", { confidence }),
  ocrFailed: (error: string) => 
    addBreadcrumb("ocr", "OCR processing failed", "error", { error }),
  
  exportPdf: (carId: string, recordCount: number) => 
    addBreadcrumb("export", "PDF exported", "info", { carId, recordCount }),
  
  createShareLink: (carId: string) => 
    addBreadcrumb("share", "Share link created", "info", { carId }),
  
  paywallShown: (reason: string) => 
    addBreadcrumb("paywall", "Paywall shown", "info", { reason }),
  
  subscriptionStarted: (plan: string) => 
    addBreadcrumb("subscription", "Subscription started", "info", { plan }),
};

/**
 * Cloud Logging構造化ログ（Firebase Functions用）
 */
export interface StructuredLog {
  severity: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  message: string;
  userId?: string;
  carId?: string;
  component?: string;
  action?: string;
  duration?: number;
  metadata?: Record<string, any>;
  timestamp: string;
}

/**
 * 構造化ログを出力
 */
export function logStructured(log: Omit<StructuredLog, "timestamp">) {
  const structuredLog: StructuredLog = {
    ...log,
    timestamp: new Date().toISOString(),
  };
  
  // 開発環境ではコンソールに出力
  if (process.env.NODE_ENV === "development") {
    console.log(`[${log.severity}]`, log.message, log.metadata || "");
    return;
  }
  
  // 本番環境ではJSON形式で出力（Cloud Loggingが自動収集）
  console.log(JSON.stringify(structuredLog));
}

/**
 * 重要イベントのログ記録
 */
export const logCriticalEvent = {
  ocrStarted: (userId: string, imageSize: number) => {
    logStructured({
      severity: "INFO",
      message: "OCR processing started",
      userId,
      component: "ocr",
      action: "ocr_started",
      metadata: { imageSize },
    });
  },
  
  ocrCompleted: (userId: string, confidence: number, duration: number) => {
    logStructured({
      severity: "INFO",
      message: "OCR processing completed",
      userId,
      component: "ocr",
      action: "ocr_completed",
      duration,
      metadata: { confidence },
    });
  },
  
  ocrFailed: (userId: string, error: string, duration: number) => {
    logStructured({
      severity: "ERROR",
      message: "OCR processing failed",
      userId,
      component: "ocr",
      action: "ocr_failed",
      duration,
      metadata: { error },
    });
  },
  
  paywallShown: (userId: string, reason: string, context: string) => {
    logStructured({
      severity: "INFO",
      message: "Paywall shown to user",
      userId,
      component: "paywall",
      action: "paywall_shown",
      metadata: { reason, context },
    });
  },
  
  subscriptionCreated: (userId: string, plan: string, amount: number) => {
    logStructured({
      severity: "INFO",
      message: "Subscription created",
      userId,
      component: "subscription",
      action: "subscription_created",
      metadata: { plan, amount },
    });
  },
  
  subscriptionCancelled: (userId: string, plan: string) => {
    logStructured({
      severity: "WARNING",
      message: "Subscription cancelled",
      userId,
      component: "subscription",
      action: "subscription_cancelled",
      metadata: { plan },
    });
  },
  
  exportPdf: (userId: string, carId: string, recordCount: number) => {
    logStructured({
      severity: "INFO",
      message: "PDF exported",
      userId,
      carId,
      component: "export",
      action: "pdf_exported",
      metadata: { recordCount },
    });
  },
  
  shareLinkCreated: (userId: string, carId: string, expiresInDays: number) => {
    logStructured({
      severity: "INFO",
      message: "Share link created",
      userId,
      carId,
      component: "share",
      action: "share_link_created",
      metadata: { expiresInDays },
    });
  },
  
  shareLinkAccessed: (carId: string, token: string, ipAddress?: string) => {
    logStructured({
      severity: "INFO",
      message: "Share link accessed",
      carId,
      component: "share",
      action: "share_link_accessed",
      metadata: { token: token.substring(0, 16), ipAddress },
    });
  },
};

