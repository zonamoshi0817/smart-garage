// src/lib/analytics.ts
"use client";

import { logEvent as firebaseLogEvent } from 'firebase/analytics';
import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * アナリティクスイベント定義
 * 課金転換ファネルを追跡
 */

// イベント型定義
export type AnalyticsEventType = 
  // 機能利用
  | 'ocr_used'
  | 'fuel_created'
  | 'maintenance_created'
  | 'customization_created'
  | 'pdf_exported'
  | 'share_link_created'
  | 'csv_exported'
  
  // OCRファネル（精度と体験のボトルネック可視化）
  | 'ocr_started'           // OCRスキャン開始
  | 'ocr_autofill_done'     // 自動入力完了
  | 'ocr_field_edited'      // ユーザーがフィールドを手動編集
  
  // 課金フロー
  | 'paywall_shown'
  | 'paywall_click'
  | 'subscribe_started'
  | 'subscribe_success'
  | 'subscribe_failed'
  | 'subscribe_cancelled'
  
  // ユーザー行動
  | 'page_view'
  | 'car_added'
  | 'car_deleted'
  | 'feature_discovered';

export interface AnalyticsEvent {
  eventType: AnalyticsEventType;
  properties?: Record<string, any>;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

/**
 * セッションIDを生成・取得（ブラウザセッション単位）
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

/**
 * アナリティクスイベントを記録
 */
export async function logAnalyticsEvent(
  eventType: AnalyticsEventType,
  properties?: Record<string, any>
): Promise<void> {
  const user = auth.currentUser;
  
  try {
    // Firestoreにイベントを記録
    if (user) {
      await addDoc(collection(db, 'users', user.uid, 'analyticsEvents'), {
        eventType,
        properties: properties || null,
        timestamp: serverTimestamp(),
        userId: user.uid,
        sessionId: getSessionId(),
      });
    }
    
    // コンソールログ（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics] ${eventType}`, properties);
    }
  } catch (error) {
    console.error('Analytics event logging failed:', error);
    // アナリティクスの失敗はユーザー体験を阻害しない
  }
}

/**
 * OCR使用イベント
 */
export function logOcrUsed(type: 'fuel' | 'maintenance' | 'insurance', success: boolean): void {
  logAnalyticsEvent('ocr_used', { type, success });
}

/**
 * OCRスキャン開始イベント（ファネル開始地点）
 */
export function logOcrStarted(type: 'fuel' | 'maintenance' | 'insurance', imageSize: number): void {
  logAnalyticsEvent('ocr_started', { type, imageSize });
}

/**
 * OCR自動入力完了イベント（成功時のみ）
 */
export function logOcrAutofillDone(
  type: 'fuel' | 'maintenance' | 'insurance',
  fieldsPopulated: string[],
  confidenceScores?: Record<string, number>
): void {
  const properties: any = { 
    type, 
    fieldsPopulated,
    fieldCount: fieldsPopulated.length,
  };
  
  // avgConfidenceがundefinedの場合は省略（Firestoreエラー回避）
  if (confidenceScores && Object.values(confidenceScores).length > 0) {
    properties.avgConfidence = Object.values(confidenceScores).reduce((a, b) => a + b, 0) / Object.values(confidenceScores).length;
  }
  
  logAnalyticsEvent('ocr_autofill_done', properties);
}

/**
 * OCRフィールド手動編集イベント（精度問題の指標）
 */
export function logOcrFieldEdited(
  type: 'fuel' | 'maintenance' | 'insurance',
  fieldName: string,
  originalValue: string,
  newValue: string
): void {
  logAnalyticsEvent('ocr_field_edited', { 
    type, 
    fieldName,
    wasEmpty: !originalValue,
    lengthDiff: Math.abs(newValue.length - originalValue.length)
  });
}

/**
 * 給油記録作成イベント
 */
export function logFuelCreated(carId: string, withOcr: boolean = false): void {
  logAnalyticsEvent('fuel_created', { carId, withOcr });
}

/**
 * メンテナンス記録作成イベント
 */
export function logMaintenanceCreated(carId: string, title: string): void {
  logAnalyticsEvent('maintenance_created', { carId, title });
}

/**
 * カスタマイズ記録作成イベント
 */
export function logCustomizationCreated(carId: string, categories: string[]): void {
  logAnalyticsEvent('customization_created', { carId, categories });
}

/**
 * PDFエクスポートイベント
 */
export function logPdfExported(carId: string, recordCount: number): void {
  logAnalyticsEvent('pdf_exported', { carId, recordCount });
}

/**
 * 共有リンク作成イベント
 */
export function logShareLinkCreated(carId: string): void {
  logAnalyticsEvent('share_link_created', { carId });
}

/**
 * CSVエクスポートイベント
 */
export function logCsvExported(dataType: string, recordCount: number): void {
  logAnalyticsEvent('csv_exported', { dataType, recordCount });
}

/**
 * ペイウォール表示イベント
 */
export function logPaywallShown(trigger: string, plan: string = 'premium'): void {
  logAnalyticsEvent('paywall_shown', { trigger, plan });
}

/**
 * ペイウォールクリックイベント
 */
export function logPaywallClick(trigger: string, plan: string = 'premium'): void {
  logAnalyticsEvent('paywall_click', { trigger, plan });
}

/**
 * 購読開始イベント
 */
export function logSubscribeStarted(plan: string, billingCycle: 'monthly' | 'annual'): void {
  logAnalyticsEvent('subscribe_started', { plan, billingCycle });
}

/**
 * 購読成功イベント
 */
export function logSubscribeSuccess(plan: string, amount: number): void {
  logAnalyticsEvent('subscribe_success', { plan, amount });
}

/**
 * 購読失敗イベント
 */
export function logSubscribeFailed(plan: string, reason: string): void {
  logAnalyticsEvent('subscribe_failed', { plan, reason });
}

/**
 * 車両追加イベント
 */
export function logCarAdded(carCount: number, isFirstCar: boolean): void {
  logAnalyticsEvent('car_added', { carCount, isFirstCar });
}

/**
 * 車両削除イベント
 */
export function logCarDeleted(carCount: number): void {
  logAnalyticsEvent('car_deleted', { carCount });
}

/**
 * ページビューイベント
 */
export function logPageView(page: string): void {
  logAnalyticsEvent('page_view', { page });
}

/**
 * 機能発見イベント（ユーザーが新機能を発見した時）
 */
export function logFeatureDiscovered(feature: string): void {
  logAnalyticsEvent('feature_discovered', { feature });
}

// ============================================
// 情報アーキテクチャ v2.1: ナビゲーション計測
// ============================================

/**
 * ページ遷移計測（混線率の測定用）
 * 目標: vehicle→dashboard直帰率 < 10%
 */
export function logPageNavigation(
  from: 'dashboard' | 'vehicle' | 'other',
  to: 'dashboard' | 'vehicle' | 'other',
  carId?: string
) {
  logEvent('page_navigation', {
    from,
    to,
    car_id: carId,
    timestamp: Date.now()
  });
}

/**
 * アラート解決計測
 * 目標: ダッシュボード主導で解決時間を30%短縮
 */
export function logAlertResolved(
  alertType: 'inspection' | 'insurance' | 'maintenance' | 'fuel' | 'ocr',
  minutesToResolve: number,
  resolvedFrom: 'dashboard' | 'vehicle'
) {
  logEvent('alert_resolved', {
    alert_type: alertType,
    minutes_to_resolve: minutesToResolve,
    resolved_from: resolvedFrom,
    timestamp: Date.now()
  });
}

/**
 * 深リンククリック計測
 * 目標: クリック率 > 60%
 */
export function logDeepLinkClicked(
  from: 'dashboard',
  targetPage: 'vehicle',
  tab?: string,
  action?: string,
  carId?: string
) {
  logEvent('deeplink_clicked', {
    from,
    target_page: targetPage,
    tab,
    action,
    car_id: carId,
    timestamp: Date.now()
  });
}

/**
 * テンプレート使用計測
 * 目標: 保存率 > 80%
 */
export function logTemplateUsed(
  template: string,
  saved: boolean,
  carId?: string
) {
  logEvent('template_used', {
    template,
    saved,
    car_id: carId,
    timestamp: Date.now()
  });
}

/**
 * 車両データページ直接アクセス計測
 */
export function logVehicleDataAccessed(
  source: 'dashboard' | 'navigation' | 'direct',
  carId: string
) {
  logEvent('vehicle_data_accessed', {
    source,
    car_id: carId,
    timestamp: Date.now()
  });
}

