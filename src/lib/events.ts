/**
 * KPI計測用イベント定義
 * Firebase Analytics または自前collection で計測
 */

// ===== イベントタイプ定義 =====

export type EventType = 
  // ユーザーアクティビティ
  | 'app_open'
  | 'dashboard_view'
  | 'car_management_view'
  | 'maintenance_history_view'
  | 'insurance_view'
  | 'data_management_view'
  | 'notifications_view'
  | 'reminders_view'
  
  // 車両関連
  | 'car_add'
  | 'car_edit'
  | 'car_delete'
  | 'car_select'
  
  // メンテナンス関連
  | 'maintenance_add'
  | 'maintenance_edit'
  | 'maintenance_delete'
  | 'maintenance_add_abandon'
  
  // リマインダー関連
  | 'reminder_add'
  | 'reminder_edit'
  | 'reminder_delete'
  | 'reminder_done'
  | 'reminder_snooze'
  | 'reminder_dismiss'
  | 'reminder_auto_created'
  
  // 課金関連
  | 'paywall_view'
  | 'premium_start'
  | 'premium_cancel'
  
  // データ出力関連
  | 'pdf_exported'
  | 'csv_exported'
  | 'share_link_view'
  | 'share_link_created'
  
  // 通知関連
  | 'notification_received'
  | 'notification_clicked'
  | 'notification_dismissed'
  
  // アフィリエイト関連
  | 'affiliate_link_clicked'
  | 'purchase_candidate_viewed'
  | 'reservation_link_clicked';

// ===== イベントパラメータ定義 =====

export interface BaseEventParams {
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  carId?: string;
  shareId?: string;
  planType?: string;
}

export interface CarEventParams extends BaseEventParams {
  carId: string;
  carName?: string;
  carMake?: string;
  carModel?: string;
  carYear?: number;
}

export interface MaintenanceEventParams extends BaseEventParams {
  carId: string;
  maintenanceId: string;
  title: string;
  cost?: number;
  mileage: number;
  date: Date;
}

export interface ReminderEventParams extends BaseEventParams {
  carId: string;
  reminderId: string;
  title: string;
  type?: string;
  dueDate?: Date;
  dueOdoKm?: number;
}

export interface ExportEventParams extends BaseEventParams {
  format: 'pdf' | 'csv';
  recordCount: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface AffiliateEventParams extends BaseEventParams {
  carId: string;
  productType: 'oil' | 'filter' | 'other';
  store: 'amazon' | 'rakuten' | 'other';
  sku?: string;
  price?: number;
}

// ===== イベント送信関数 =====

/**
 * イベント送信の共通関数
 */
export async function trackEvent(
  eventType: EventType,
  params: BaseEventParams
): Promise<void> {
  try {
    // Firebase Analytics への送信
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventType, {
        event_category: 'smart_garage',
        event_label: params.userId,
        value: 1,
        custom_parameters: params
      });
    }

    // 自前のFirestore collection への記録（バックアップ）
    const { db } = await import('@/lib/firebase');
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    await addDoc(collection(db, 'analytics_events'), {
      eventType,
      ...params,
      timestamp: serverTimestamp(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    });

    console.log('Event tracked:', eventType, params);
  } catch (error) {
    console.error('Failed to track event:', eventType, error);
    // イベント送信の失敗はアプリの動作を阻害しない
  }
}

// ===== 具体的なイベント送信関数 =====

/**
 * アプリ起動
 */
export async function trackAppOpen(): Promise<void> {
  await trackEvent('app_open', {
    timestamp: new Date(),
    sessionId: generateSessionId()
  });
}

/**
 * ダッシュボード表示
 */
export async function trackDashboardView(): Promise<void> {
  await trackEvent('dashboard_view', {
    timestamp: new Date(),
    sessionId: getCurrentSessionId()
  });
}

/**
 * 車両追加
 */
export async function trackCarAdd(params: CarEventParams): Promise<void> {
  await trackEvent('car_add', params);
}

/**
 * メンテナンス記録追加
 */
export async function trackMaintenanceAdd(params: MaintenanceEventParams): Promise<void> {
  await trackEvent('maintenance_add', params);
}

/**
 * メンテナンス記録追加中断
 */
export async function trackMaintenanceAddAbandon(carId: string): Promise<void> {
  await trackEvent('maintenance_add_abandon', {
    timestamp: new Date(),
    carId
  });
}

/**
 * リマインダー完了
 */
export async function trackReminderDone(params: ReminderEventParams): Promise<void> {
  await trackEvent('reminder_done', params);
}

/**
 * 自動リマインダー生成
 */
export async function trackReminderAutoCreated(params: ReminderEventParams): Promise<void> {
  await trackEvent('reminder_auto_created', params);
}

/**
 * PDF出力
 */
export async function trackPdfExported(params: ExportEventParams): Promise<void> {
  await trackEvent('pdf_exported', params);
}

/**
 * 共有リンク表示
 */
export async function trackShareLinkView(shareId: string): Promise<void> {
  await trackEvent('share_link_view', {
    timestamp: new Date(),
    shareId
  });
}

/**
 * プレミアム開始
 */
export async function trackPremiumStart(planType: string): Promise<void> {
  await trackEvent('premium_start', {
    timestamp: new Date(),
    planType
  });
}

/**
 * アフィリエイトリンククリック
 */
export async function trackAffiliateLinkClick(params: AffiliateEventParams): Promise<void> {
  await trackEvent('affiliate_link_clicked', params);
}

// ===== ユーティリティ関数 =====

/**
 * セッションID生成
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 現在のセッションID取得
 */
function getCurrentSessionId(): string {
  if (typeof window === 'undefined') return generateSessionId();
  
  let sessionId = sessionStorage.getItem('smart_garage_session_id');
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('smart_garage_session_id', sessionId);
  }
  return sessionId;
}

// ===== KPI計算用のヘルパー関数 =====

/**
 * MAU計算用のイベント
 */
export const MAU_EVENTS: EventType[] = [
  'app_open',
  'dashboard_view'
];

/**
 * 転換率計算用のイベント
 */
export const CONVERSION_EVENTS: EventType[] = [
  'paywall_view',
  'premium_start'
];

/**
 * 継続の核となるイベント
 */
export const RETENTION_EVENTS: EventType[] = [
  'maintenance_add',
  'reminder_auto_created',
  'reminder_done',
  'pdf_exported',
  'share_link_view'
];

/**
 * 離脱サインとなるイベント
 */
export const CHURN_EVENTS: EventType[] = [
  'reminder_dismiss',
  'maintenance_add_abandon'
];

// ===== 型定義のエクスポート =====
export type EventParams = 
  | BaseEventParams
  | CarEventParams
  | MaintenanceEventParams
  | ReminderEventParams
  | ExportEventParams
  | AffiliateEventParams;
