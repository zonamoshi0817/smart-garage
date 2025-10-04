import { db, auth } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  where,
  serverTimestamp,
  DocumentReference,
  getDoc,
  getDocs,
  Timestamp
} from 'firebase/firestore';

// 購入候補の型定義
export interface PurchaseCandidate {
  sku: string;
  title: string;
  store: "amazon" | "rakuten";
  url: string;
  price?: number;
  imageUrl?: string;
  category: "oil" | "filter";
  grade: "oem" | "value" | "premium";
}

// タイムスタンプを安全にDateオブジェクトに変換するヘルパー関数
function safeToDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  
  // 既にDateオブジェクトの場合
  if (timestamp instanceof Date) return timestamp;
  
  // FirestoreのTimestampオブジェクトの場合
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  // 文字列の場合
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }
  
  // 数値の場合（ミリ秒）
  if (typeof timestamp === 'number') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }
  
  return null;
}

// リマインダーの型定義
export interface Reminder {
  id?: string;
  carId: string;
  kind: 'time' | 'distance' | 'both';
  title: string;
  dueDate: Date | null;
  dueOdoKm: number | null;
  baseEntryRef: string | null; // 元になったエントリのID
  threshold: {
    months?: number;
    km?: number;
  };
  status: 'active' | 'snoozed' | 'done' | 'dismissed';
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  
  // オイルリマインダー専用フィールド（オプション）
  type?: "oil_change"; // オイル交換リマインダーの識別
  purchaseCandidates?: PurchaseCandidate[]; // 購入候補
  reservationUrl?: string; // 予約URL
  carName?: string; // 車名
  lastOilChangeAt?: Date; // 最終オイル交換日
  oilSpec?: { // オイル仕様
    viscosity: string;
    api: string;
    volumeL: number;
  };
}

// リマインダーの作成
export async function addReminder(reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');

  const reminderData = {
    ...reminder,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'users', user.uid, 'reminders'), reminderData);
  return docRef.id;
}

// リマインダーの更新
export async function updateReminder(
  reminderId: string, 
  updates: Partial<Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');

  const updateData = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, 'users', user.uid, 'reminders', reminderId), updateData);
}

// リマインダーの削除
export async function removeReminder(reminderId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');

  await deleteDoc(doc(db, 'users', user.uid, 'reminders', reminderId));
}

// リマインダーの監視
export function watchReminders(callback: (reminders: Reminder[]) => void): () => void {
  const user = auth.currentUser;
  if (!user) {
    console.log('No user found, cannot watch reminders');
    return () => {};
  }

  console.log('Setting up reminders watcher for user:', user.uid);
  
  const q = query(
    collection(db, 'users', user.uid, 'reminders'),
    orderBy('dueDate', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    console.log('Reminders snapshot received:', snapshot.size, 'reminders');
    
    const reminders: Reminder[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      
      // デバッグ情報を追加
      console.log('=== リマインダー読み込み ===');
      console.log('Document ID:', doc.id);
      console.log('Raw data.dueDate:', data.dueDate);
      console.log('data.dueDate type:', typeof data.dueDate);
      console.log('data.dueDate instanceof Timestamp:', data.dueDate instanceof Timestamp);
      console.log('data.title:', data.title);
      
      const processedDueDate = safeToDate(data.dueDate);
      console.log('Processed dueDate:', processedDueDate);
      console.log('========================');
      
      reminders.push({
        id: doc.id,
        ...data,
        dueDate: processedDueDate,
        dueOdoKm: data.dueOdoKm || null,
        lastOilChangeAt: safeToDate(data.lastOilChangeAt),
        createdAt: safeToDate(data.createdAt) || new Date(),
        updatedAt: safeToDate(data.updatedAt) || new Date(),
      } as Reminder);
    });
    
    console.log('Processed reminders:', reminders.length);
    callback(reminders);
  }, (error) => {
    console.error('Error watching reminders:', error);
  });
}

// 特定車両のリマインダーを取得
export function watchRemindersByCar(
  carId: string, 
  callback: (reminders: Reminder[]) => void
): () => void {
  const user = auth.currentUser;
  if (!user) {
    console.log('No user found, cannot watch reminders by car');
    return () => {};
  }

  console.log('Setting up reminders watcher for car:', carId);
  
  const q = query(
    collection(db, 'users', user.uid, 'reminders'),
    where('carId', '==', carId),
    orderBy('dueDate', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    console.log('Reminders by car snapshot received:', snapshot.size, 'reminders');
    
    const reminders: Reminder[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      reminders.push({
        id: doc.id,
        ...data,
        dueDate: safeToDate(data.dueDate),
        dueOdoKm: data.dueOdoKm || null,
        lastOilChangeAt: safeToDate(data.lastOilChangeAt),
        createdAt: safeToDate(data.createdAt) || new Date(),
        updatedAt: safeToDate(data.updatedAt) || new Date(),
      } as Reminder);
    });
    
    console.log('Processed reminders by car:', reminders.length);
    callback(reminders);
  }, (error) => {
    console.error('Error watching reminders by car:', error);
  });
}

// アクティブなリマインダーのみを取得
export function watchActiveReminders(callback: (reminders: Reminder[]) => void): () => void {
  const user = auth.currentUser;
  if (!user) {
    console.log('No user found, cannot watch active reminders');
    return () => {};
  }

  console.log('Setting up active reminders watcher for user:', user.uid);
  
  const q = query(
    collection(db, 'users', user.uid, 'reminders'),
    where('status', '==', 'active'),
    orderBy('dueDate', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    console.log('Active reminders snapshot received:', snapshot.size, 'reminders');
    
    const reminders: Reminder[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      reminders.push({
        id: doc.id,
        ...data,
        dueDate: safeToDate(data.dueDate),
        dueOdoKm: data.dueOdoKm || null,
        lastOilChangeAt: safeToDate(data.lastOilChangeAt),
        createdAt: safeToDate(data.createdAt) || new Date(),
        updatedAt: safeToDate(data.updatedAt) || new Date(),
      } as Reminder);
    });
    
    console.log('Processed active reminders:', reminders.length);
    callback(reminders);
  }, (error) => {
    console.error('Error watching active reminders:', error);
  });
}

// リマインダーのステータス更新
export async function updateReminderStatus(
  reminderId: string, 
  status: Reminder['status']
): Promise<void> {
  await updateReminder(reminderId, { status });
}

// リマインダーを完了としてマーク
export async function markReminderDone(reminderId: string): Promise<void> {
  await updateReminderStatus(reminderId, 'done');
}

// リマインダーをスヌーズ
export async function snoozeReminder(reminderId: string, days: number = 7): Promise<void> {
  const reminder = await getReminderById(reminderId);
  if (!reminder) return;

  const newDueDate = new Date();
  newDueDate.setDate(newDueDate.getDate() + days);

  await updateReminder(reminderId, {
    status: 'snoozed',
    dueDate: newDueDate
  });
}

// リマインダーを無視
export async function dismissReminder(reminderId: string): Promise<void> {
  await updateReminderStatus(reminderId, 'dismissed');
}

// リマインダーを取得（単体）
export async function getReminderById(reminderId: string): Promise<Reminder | null> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');

  try {
    const docRef = doc(db, 'users', user.uid, 'reminders', reminderId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        dueDate: safeToDate(data.dueDate),
        dueOdoKm: data.dueOdoKm || null,
        lastOilChangeAt: safeToDate(data.lastOilChangeAt),
        createdAt: safeToDate(data.createdAt) || new Date(),
        updatedAt: safeToDate(data.updatedAt) || new Date(),
      } as Reminder;
    }
    return null;
  } catch (error) {
    console.error('Error getting reminder:', error);
    return null;
  }
}

// 自動リマインダー提案ロジック
export function suggestReminders(
  maintenanceType: string,
  performedAt: Date,
  odoKm: number
): Partial<Reminder>[] {
  const suggestions: Partial<Reminder>[] = [];

  switch (maintenanceType.toLowerCase()) {
    case 'オイル交換':
      // オイル交換した日付から6ヶ月後を計算
      const oilDate = new Date(performedAt);
      oilDate.setMonth(oilDate.getMonth() + 6);
      
      // デバッグ情報を追加
      console.log('=== オイル交換リマインダー作成 ===');
      console.log('実施日 (performedAt):', performedAt);
      console.log('実施日 (ISO):', performedAt.toISOString());
      console.log('6ヶ月後の日付 (oilDate):', oilDate);
      console.log('6ヶ月後の日付 (ISO):', oilDate.toISOString());
      console.log('現在日時:', new Date());
      console.log('期限切れかどうか:', oilDate <= new Date());
      console.log('===========================');
      
      suggestions.push({
        kind: 'both',
        title: '次回オイル交換',
        threshold: { months: 6, km: 5000 },
        dueDate: oilDate,
        dueOdoKm: odoKm + 5000,
        status: 'active',
        type: 'oil_change' // オイルリマインダーとして識別
      });
      break;

    case 'ブレーキフルード':
      const brakeDate = new Date();
      brakeDate.setMonth(brakeDate.getMonth() + 24);
      suggestions.push({
        kind: 'time',
        title: '次回ブレーキフルード交換',
        threshold: { months: 24 },
        dueDate: brakeDate,
        dueOdoKm: null,
        status: 'active'
      });
      break;

    case 'タイヤローテーション':
      suggestions.push({
        kind: 'distance',
        title: '次回タイヤローテーション',
        threshold: { km: 10000 },
        dueDate: null,
        dueOdoKm: odoKm + 10000,
        status: 'active'
      });
      break;

    case 'エアフィルター':
      const filterDate = new Date();
      filterDate.setMonth(filterDate.getMonth() + 12);
      suggestions.push({
        kind: 'both',
        title: '次回エアフィルター交換',
        threshold: { months: 12, km: 20000 },
        dueDate: filterDate,
        dueOdoKm: odoKm + 20000,
        status: 'active'
      });
      break;



    default:
      // デフォルトではリマインダーを作成しない
      break;
  }

  return suggestions;
}

// リマインダーの期限チェック
export function checkReminderDue(reminder: Reminder, currentOdoKm?: number): boolean {
  const now = new Date();
  
  // デバッグ情報を追加
  console.log(`Checking reminder due: ${reminder.title}`, {
    kind: reminder.kind,
    dueDate: reminder.dueDate,
    dueDateType: typeof reminder.dueDate,
    now: now,
    dueOdoKm: reminder.dueOdoKm,
    currentOdoKm: currentOdoKm
  });
  
  // kindに基づいて適切にチェック
  if (reminder.kind === 'time') {
    // 日付ベースのみ
    if (reminder.dueDate) {
      const dueDate = reminder.dueDate instanceof Date ? reminder.dueDate : new Date(reminder.dueDate);
      console.log(`Date-only comparison: ${dueDate} <= ${now} = ${dueDate <= now}`);
      return dueDate <= now;
    }
    return false;
  } else if (reminder.kind === 'distance') {
    // 走行距離ベースのみ
    if (reminder.dueOdoKm && currentOdoKm && currentOdoKm >= reminder.dueOdoKm) {
      console.log(`Distance-only comparison: ${currentOdoKm} >= ${reminder.dueOdoKm} = true`);
      return true;
    }
    return false;
  } else if (reminder.kind === 'both') {
    // 両方チェック（どちらかが期限切れなら true）
    let isDateDue = false;
    let isDistanceDue = false;
    
    // 日付チェック（dueDateがnullでない場合のみ）
    if (reminder.dueDate) {
      const dueDate = reminder.dueDate instanceof Date ? reminder.dueDate : new Date(reminder.dueDate);
      isDateDue = dueDate <= now;
      console.log(`Both-Date comparison: ${dueDate} <= ${now} = ${isDateDue}`);
    }
    
    // 走行距離チェック
    if (reminder.dueOdoKm && currentOdoKm && currentOdoKm >= reminder.dueOdoKm) {
      isDistanceDue = true;
      console.log(`Both-Distance comparison: ${currentOdoKm} >= ${reminder.dueOdoKm} = true`);
    }
    
    const result = isDateDue || isDistanceDue;
    console.log(`Both result: datedue=${isDateDue}, distancedue=${isDistanceDue}, final=${result}`);
    return result;
  }
  
  return false;
}

// リマインダーの期限までの日数計算
export function getDaysUntilDue(reminder: Reminder): number | null {
  // 日付ベースでない場合はnullを返す
  if (reminder.kind === 'distance') return null;
  if (!reminder.dueDate) return null;
  
  const now = new Date();
  // FirestoreのTimestampオブジェクトの場合はDateに変換
  const dueDate = reminder.dueDate instanceof Date ? reminder.dueDate : new Date(reminder.dueDate);
  const diffTime = dueDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// リマインダーの期限までの走行距離計算
export function getKmUntilDue(reminder: Reminder, currentOdoKm: number): number | null {
  // 走行距離ベースでない場合はnullを返す
  if (reminder.kind === 'time') return null;
  if (!reminder.dueOdoKm) return null;
  
  return Math.max(0, reminder.dueOdoKm - currentOdoKm);
}

// リマインダーの優先度を取得
export function getReminderPriority(reminder: Reminder, currentOdoKm?: number): 'low' | 'medium' | 'high' | 'urgent' {
  const daysUntilDue = getDaysUntilDue(reminder);
  const kmUntilDue = currentOdoKm ? getKmUntilDue(reminder, currentOdoKm) : null;
  
  // 既に期限切れ
  if (daysUntilDue !== null && daysUntilDue < 0) return 'urgent';
  if (kmUntilDue !== null && kmUntilDue <= 0) return 'urgent';
  
  // 1週間以内または1000km以内
  if (daysUntilDue !== null && daysUntilDue <= 7) return 'high';
  if (kmUntilDue !== null && kmUntilDue <= 1000) return 'high';
  
  // 1ヶ月以内または5000km以内
  if (daysUntilDue !== null && daysUntilDue <= 30) return 'medium';
  if (kmUntilDue !== null && kmUntilDue <= 5000) return 'medium';
  
  return 'low';
}

// イベント駆動型リマインダー生成の型定義
export interface VehicleData {
  id: string;
  name: string;
  nextShakenDate?: Date;
  firstRegYm?: string;
  odoAtReg?: number;
  avgKmPerMonth?: number;
  currentOdoKm?: number;
}

export interface AutoReminderConfig {
  type: 'shaken' | 'auto_tax' | 'oil_time' | 'oil_km' | 'oil_filter' | 'brake_fluid' | 'coolant' | 'tire_check' | 'policy_renewal';
  title: string;
  fireAt: Date;
  recurringIso?: string; // ISO 8601 duration (e.g., 'P6M', 'P12M', 'P24M')
  channel: string[];
  status: 'scheduled' | 'sent' | 'snoozed' | 'done' | 'skipped';
  meta?: {
    distance?: boolean;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  };
}

// 車検満了日からの自動リマインダー生成
export function generateShakenReminders(nextShakenDate: Date): AutoReminderConfig[] {
  const reminders: AutoReminderConfig[] = [];
  
  // 車検リマインダーは1つだけ生成（カウントダウン表示）
  const now = new Date();
  const daysUntilShaken = Math.ceil((nextShakenDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  let title = '車検期限';
  let priority: 'low' | 'medium' | 'high' | 'urgent' = 'low';
  
  if (daysUntilShaken > 30) {
    priority = 'low';
  } else if (daysUntilShaken > 14) {
    priority = 'medium';
  } else if (daysUntilShaken > 7) {
    priority = 'high';
  } else if (daysUntilShaken > 0) {
    priority = 'urgent';
  } else if (daysUntilShaken === 0) {
    priority = 'urgent';
  } else {
    priority = 'urgent';
  }
  
  reminders.push({
    type: 'shaken',
    title,
    fireAt: nextShakenDate,
    channel: ['webpush'],
    status: 'scheduled',
    meta: { priority }
  });
  
  return reminders;
}

// 自動車税のリマインダー生成
export function generateAutoTaxReminders(): AutoReminderConfig[] {
  const reminders: AutoReminderConfig[] = [];
  const currentYear = new Date().getFullYear();
  const dueDate = new Date(`${currentYear}-05-31`); // 5月31日が期日
  
  // 今年の期日が過ぎている場合は来年
  if (dueDate < new Date()) {
    dueDate.setFullYear(currentYear + 1);
  }
  
  // 自動車税リマインダーは1つだけ生成（カウントダウン表示）
  const now = new Date();
  const daysUntilTax = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  let title = '';
  let priority: 'low' | 'medium' | 'high' | 'urgent' = 'low';
  
  if (daysUntilTax > 30) {
    title = `自動車税納付`;
    priority = 'low';
  } else if (daysUntilTax > 14) {
    title = `自動車税納付（準備推奨）`;
    priority = 'medium';
  } else if (daysUntilTax > 0) {
    title = `自動車税納付（緊急）`;
    priority = 'high';
  } else if (daysUntilTax === 0) {
    title = `自動車税納付期限日（本日）`;
    priority = 'urgent';
  } else {
    title = `自動車税納付期限切れ（${Math.abs(daysUntilTax)}日経過）`;
    priority = 'urgent';
  }
  
  reminders.push({
    type: 'auto_tax',
    title,
    fireAt: dueDate,
    channel: ['webpush'],
    status: 'scheduled',
    meta: { priority }
  });
  
  return reminders;
}

// メンテナンス系リマインダーの生成
export function generateMaintenanceReminders(vehicle: VehicleData): AutoReminderConfig[] {
  const reminders: AutoReminderConfig[] = [];
  const now = new Date();
  
  // エンジンオイル（6ヶ月）
  const oilTimeDate = new Date(now);
  oilTimeDate.setMonth(oilTimeDate.getMonth() + 6);
  
  reminders.push({
    type: 'oil_time',
    title: 'エンジンオイル交換（6ヶ月）',
    fireAt: oilTimeDate,
    recurringIso: 'P6M',
    channel: ['webpush'],
    status: 'scheduled',
    meta: { priority: 'medium' }
  });
  
  // エンジンオイル（距離ベース - 推定）
  if (vehicle.avgKmPerMonth && vehicle.currentOdoKm) {
    const estimatedKmDate = estimateDateByDistance(
      vehicle.currentOdoKm,
      vehicle.avgKmPerMonth,
      5000
    );
    
    if (estimatedKmDate) {
      reminders.push({
        type: 'oil_km',
        title: 'エンジンオイル交換（5,000km）',
        fireAt: estimatedKmDate,
        channel: ['webpush'],
        status: 'scheduled',
        meta: { distance: true, priority: 'medium' }
      });
    }
  }
  
  // オイルフィルター（12ヶ月）
  const filterDate = new Date(now);
  filterDate.setMonth(filterDate.getMonth() + 12);
  
  reminders.push({
    type: 'oil_filter',
    title: 'オイルフィルター交換（12ヶ月）',
    fireAt: filterDate,
    recurringIso: 'P12M',
    channel: ['webpush'],
    status: 'scheduled',
    meta: { priority: 'low' }
  });
  
  // ブレーキフルード（24ヶ月）
  const brakeFluidDate = new Date(now);
  brakeFluidDate.setMonth(brakeFluidDate.getMonth() + 24);
  
  reminders.push({
    type: 'brake_fluid',
    title: 'ブレーキフルード交換（24ヶ月）',
    fireAt: brakeFluidDate,
    recurringIso: 'P24M',
    channel: ['webpush'],
    status: 'scheduled',
    meta: { priority: 'low' }
  });
  
  // クーラント（24ヶ月）
  const coolantDate = new Date(now);
  coolantDate.setMonth(coolantDate.getMonth() + 24);
  
  reminders.push({
    type: 'coolant',
    title: 'クーラント交換（24ヶ月）',
    fireAt: coolantDate,
    recurringIso: 'P24M',
    channel: ['webpush'],
    status: 'scheduled',
    meta: { priority: 'low' }
  });
  
  // タイヤ点検（12ヶ月）
  const tireCheckDate = new Date(now);
  tireCheckDate.setMonth(tireCheckDate.getMonth() + 12);
  
  reminders.push({
    type: 'tire_check',
    title: 'タイヤ点検（12ヶ月）',
    fireAt: tireCheckDate,
    recurringIso: 'P12M',
    channel: ['webpush'],
    status: 'scheduled',
    meta: { priority: 'low' }
  });
  
  return reminders;
}

// 距離ベースの日付推定
function estimateDateByDistance(
  currentKm: number,
  avgKmPerMonth: number,
  targetKm: number
): Date | null {
  if (avgKmPerMonth <= 0) return null;
  
  const remainingKm = targetKm - currentKm;
  if (remainingKm <= 0) return null;
  
  const monthsNeeded = remainingKm / avgKmPerMonth;
  const estimatedDate = new Date();
  estimatedDate.setMonth(estimatedDate.getMonth() + monthsNeeded);
  
  return estimatedDate;
}

// 車両データから自動リマインダーを一括生成
export function generateInitialReminders(vehicle: VehicleData): AutoReminderConfig[] {
  const reminders: AutoReminderConfig[] = [];
  
  // 車検リマインダー
  if (vehicle.nextShakenDate) {
    reminders.push(...generateShakenReminders(vehicle.nextShakenDate));
  }
  
  // 自動車税リマインダー
  reminders.push(...generateAutoTaxReminders());
  
  // メンテナンスリマインダー
  reminders.push(...generateMaintenanceReminders(vehicle));
  
  return reminders;
}

// 自動リマインダーをFirestoreに保存
export async function saveAutoReminders(
  carId: string,
  reminders: AutoReminderConfig[]
): Promise<string[]> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');
  
  const reminderIds: string[] = [];
  
  for (const reminder of reminders) {
    const reminderData = {
      carId,
      kind: 'time' as const,
      title: reminder.title,
      dueDate: reminder.fireAt,
      dueOdoKm: null,
      baseEntryRef: null,
      threshold: {},
      status: 'active' as const,
      notes: `自動生成: ${reminder.type}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const docRef = await addDoc(collection(db, 'users', user.uid, 'reminders'), reminderData);
    reminderIds.push(docRef.id);
  }
  
  return reminderIds;
}

// 車検満了日更新時のリマインダー再生成
export async function updateShakenReminders(
  carId: string,
  newShakenDate: Date
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');
  
  // 既存の車検リマインダーを削除
  const q = query(
    collection(db, 'users', user.uid, 'reminders'),
    where('carId', '==', carId),
    where('notes', '==', '自動生成: shaken')
  );
  
  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
  
  // 新しい車検リマインダーを生成・保存
  const newReminders = generateShakenReminders(newShakenDate);
  await saveAutoReminders(carId, newReminders);
}

// 特定車両の全自動リマインダーをクリア
export async function clearAutoReminders(carId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');
  
  // 車両に関連するすべてのリマインダーを取得して、自動生成されたものをフィルタリング
  const q = query(
    collection(db, 'users', user.uid, 'reminders'),
    where('carId', '==', carId)
  );
  
  const snapshot = await getDocs(q);
  const autoReminders = snapshot.docs.filter(doc => {
    const data = doc.data();
    return data.notes && data.notes.startsWith('自動生成:');
  });
  
  const deletePromises = autoReminders.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
  
  console.log(`Cleared ${autoReminders.length} auto reminders for car ${carId}`);
}

// 特定車両の全リマインダーをクリア
export async function clearAllReminders(carId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');
  
  // 車両に関連するすべてのリマインダーを削除
  const q = query(
    collection(db, 'users', user.uid, 'reminders'),
    where('carId', '==', carId)
  );
  
  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
  
  console.log(`Cleared ${snapshot.docs.length} reminders for car ${carId}`);
}

// 特定車両のオイル交換リマインダーのみを削除
export async function clearOilChangeReminders(carId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');
  
  console.log('=== オイル交換リマインダー削除開始 ===');
  console.log('車両ID:', carId);
  
  // 車両に関連するすべてのリマインダーを取得
  const q = query(
    collection(db, 'users', user.uid, 'reminders'),
    where('carId', '==', carId)
  );
  
  const snapshot = await getDocs(q);
  console.log('取得したリマインダー数:', snapshot.docs.length);
  
  // オイル交換関連のリマインダーをフィルタリング
  const oilReminders = snapshot.docs.filter(doc => {
    const data = doc.data();
    const title = data.title || '';
    console.log('リマインダータイトル:', title);
    return title.includes('オイル交換') || title.includes('エンジンオイル');
  });
  
  console.log('削除対象のオイル交換リマインダー数:', oilReminders.length);
  
  // 削除実行
  const deletePromises = oilReminders.map(doc => {
    console.log('削除するリマインダー:', doc.id, doc.data().title);
    return deleteDoc(doc.ref);
  });
  await Promise.all(deletePromises);
  
  console.log(`削除完了: ${oilReminders.length}件のオイル交換リマインダーを削除しました`);
  console.log('================================');
}

// 車両IDから車両情報を取得
async function getCarInfo(carId: string): Promise<{ make: string; model: string; year?: number } | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const carDoc = await getDoc(doc(db, 'users', user.uid, 'cars', carId));
    if (carDoc.exists()) {
      const carData = carDoc.data();
      // 車両名からメーカーとモデルを推定（簡易版）
      const name = carData.name || '';
      const parts = name.split(' ');
      const make = parts[0] || 'Generic';
      const model = parts.slice(1).join(' ') || 'Generic';
      const year = carData.year;
      
      return { make, model, year };
    }
  } catch (error) {
    console.error("車両情報の取得に失敗:", error);
  }
  
  return null;
}

// オイルリマインダーの特別な機能を生成
async function generateOilReminderFeatures(carId: string): Promise<{
  purchaseCandidates: PurchaseCandidate[];
  reservationUrl: string;
  oilSpec: { viscosity: string; api: string; volumeL: number };
}> {
  try {
    // 車両情報を取得
    const carInfo = await getCarInfo(carId);
    if (!carInfo) {
      throw new Error("車両情報を取得できませんでした");
    }
    
    // オイル仕様を取得
    const { getOilSpecForCar } = await import("@/lib/carOilSpecs");
    const oilSpec = getOilSpecForCar(carInfo);
    
    if (!oilSpec) {
      throw new Error("オイル仕様を取得できませんでした");
    }
    
    // 購入候補を生成
    const { generatePurchaseCandidatesWithAffiliate } = await import("@/lib/affiliateLinks");
    const purchaseCandidates = generatePurchaseCandidatesWithAffiliate(carId, oilSpec, carInfo);
    
    // 予約URLを生成
    const { generateReservationUrl } = await import("@/lib/affiliateLinks");
    const reservationUrl = generateReservationUrl(carId);
    
    return {
      purchaseCandidates,
      reservationUrl,
      oilSpec: {
        viscosity: oilSpec.viscosity,
        api: oilSpec.api,
        volumeL: oilSpec.volumeL
      }
    };
  } catch (error) {
    console.error("オイルリマインダー機能の生成に失敗:", error);
    // フォールバック値を返す
    return {
      purchaseCandidates: [],
      reservationUrl: "",
      oilSpec: { viscosity: "0W-20", api: "SP", volumeL: 4.0 }
    };
  }
}

// メンテナンス記録からリマインダーを自動生成
export async function generateReminderFromMaintenance(
  carId: string,
  maintenanceType: string,
  performedAt: Date,
  odoKm: number,
  entryId: string
): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');

  // メンテナンスタイプに基づいてリマインダーを生成
  console.log('=== suggestReminders呼び出し ===');
  console.log('maintenanceType:', maintenanceType);
  console.log('performedAt:', performedAt);
  console.log('odoKm:', odoKm);
  
  const suggestions = suggestReminders(maintenanceType, performedAt, odoKm);
  
  console.log('suggestions結果:', suggestions);
  console.log('suggestions.length:', suggestions.length);
  
  if (suggestions.length === 0) {
    console.log('No reminder suggestions for maintenance type:', maintenanceType);
    return null;
  }

  // 最初の提案を使用（通常は1つ）
  const suggestion = suggestions[0];
  
  // 既存の同種リマインダーを削除（重複防止）
  await clearExistingRemindersByType(carId, maintenanceType);
  
  // オイル交換の場合は、既存のリマインダーをクリア（統合システムで処理済み）
  
  // undefinedの値を除外するヘルパー関数（再帰的、nullは保持）
  const removeUndefined = (obj: any): any => {
    if (obj === null) {
      return obj; // nullは保持
    }
    
    if (obj === undefined) {
      return undefined;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => removeUndefined(item)).filter(item => item !== undefined);
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          const cleanedValue = removeUndefined(value);
          if (cleanedValue !== undefined) {
            cleaned[key] = cleanedValue;
          }
        }
      }
      return cleaned;
    }
    
    return obj;
  };

  // デバッグ情報を追加
  console.log('リマインダーデータ作成前:', {
    suggestion: suggestion,
    performedAt: performedAt
  });

  // 新しいリマインダーを作成
  console.log('=== リマインダーデータ作成 ===');
  console.log('suggestion.dueDate:', suggestion.dueDate);
  console.log('suggestion.dueDate type:', typeof suggestion.dueDate);
  console.log('suggestion.dueDate instanceof Date:', suggestion.dueDate instanceof Date);
  console.log('suggestion.dueOdoKm:', suggestion.dueOdoKm);
  console.log('suggestion全体:', suggestion);
  
  const reminderData = removeUndefined({
    carId,
    kind: suggestion.kind || 'time',
    title: suggestion.title || `次回${maintenanceType}`,
    dueDate: suggestion.dueDate || null,
    dueOdoKm: suggestion.dueOdoKm || null,
    baseEntryRef: entryId,
    threshold: suggestion.threshold ? removeUndefined(suggestion.threshold) : {},
    status: 'active' as const,
    notes: `メンテナンス記録から自動生成: ${maintenanceType}`,
    type: suggestion.type || undefined,
    lastOilChangeAt: performedAt,
  });
  
  console.log('reminderData作成後:', reminderData);
  console.log('reminderData.dueDate:', reminderData.dueDate);
  console.log('========================');
  
  console.log('リマインダーデータ作成後:', reminderData);
  
  // オイル交換リマインダーの場合は特別な機能を追加
  if (maintenanceType === "オイル交換" && suggestion.type === "oil_change") {
    try {
      const oilFeatures = await generateOilReminderFeatures(carId);
      
      // 車両名を設定
      const carInfo = await getCarInfo(carId);
      
      // オイルリマインダーの特別な機能を追加（undefinedの値を除外）
      const oilReminderData = removeUndefined({
        purchaseCandidates: oilFeatures.purchaseCandidates,
        reservationUrl: oilFeatures.reservationUrl,
        oilSpec: oilFeatures.oilSpec,
        carName: carInfo ? `${carInfo.make} ${carInfo.model}` : undefined,
      });
      
      // リマインダーデータにマージ
      Object.assign(reminderData, oilReminderData);
    } catch (error) {
      console.error("オイルリマインダー機能の生成に失敗:", error);
    }
  }
  
  // 最終的なクリーンアップ
  const finalReminderData = removeUndefined(reminderData);
  
  // DateオブジェクトをTimestampに変換
  if (finalReminderData.dueDate && finalReminderData.dueDate instanceof Date) {
    finalReminderData.dueDate = Timestamp.fromDate(finalReminderData.dueDate);
  }
  if (finalReminderData.lastOilChangeAt && finalReminderData.lastOilChangeAt instanceof Date) {
    finalReminderData.lastOilChangeAt = Timestamp.fromDate(finalReminderData.lastOilChangeAt);
  }
  
  // createdAt, updatedAtを追加
  finalReminderData.createdAt = Timestamp.now();
  finalReminderData.updatedAt = Timestamp.now();
  
  console.log('Final reminder data (with Timestamps):', finalReminderData);
  console.log('Final dueDate type:', typeof finalReminderData.dueDate);
  
  const docRef = await addDoc(collection(db, 'users', user.uid, 'reminders'), finalReminderData);
  console.log(`Generated reminder from maintenance: ${maintenanceType} -> ${suggestion.title}`);
  
  return docRef.id;
}

// 特定のメンテナンスタイプの既存リマインダーをクリア
export async function clearExistingRemindersByType(carId: string, maintenanceType: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');
  
  // メンテナンスタイプに基づくタイトルパターンを定義
  const titlePatterns = getTitlePatternsForMaintenanceType(maintenanceType);
  
  // 空文字の場合は処理をスキップ
  if (titlePatterns.length === 0 || titlePatterns[0] === '') {
    return;
  }
  
  // 既存のリマインダーを検索
  const q = query(
    collection(db, 'users', user.uid, 'reminders'),
    where('carId', '==', carId)
  );
  
  const snapshot = await getDocs(q);
  const remindersToDelete = snapshot.docs.filter(doc => {
    const data = doc.data();
    const title = data.title || '';
    return titlePatterns.some(pattern => title.includes(pattern));
  });
  
  // 該当するリマインダーを完全に削除
  const deletePromises = remindersToDelete.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
  
  if (remindersToDelete.length > 0) {
    console.log(`Deleted ${remindersToDelete.length} existing reminders for ${maintenanceType}`);
  }
}

// メンテナンスタイプに基づくタイトルパターンを取得
function getTitlePatternsForMaintenanceType(maintenanceType: string): string[] {
  switch (maintenanceType.toLowerCase()) {
    case 'オイル交換':
      return ['オイル交換', 'エンジンオイル'];
    case 'ブレーキフルード':
      return ['ブレーキフルード'];
    case 'タイヤローテーション':
      return ['タイヤローテーション', 'タイヤ点検'];
    case 'エアフィルター':
      return ['エアフィルター'];
    default:
      return [maintenanceType];
  }
}

// メンテナンス記録のタイトルからメンテナンスタイプを推定
export function extractMaintenanceTypeFromTitle(title: string): string {
  const lowerTitle = title.toLowerCase();
  
  // オイル関連
  if (lowerTitle.includes('オイル') || lowerTitle.includes('oil') || 
      lowerTitle.includes('潤滑油') || lowerTitle.includes('lubricant')) {
    return 'オイル交換';
  }
  
  // ブレーキ関連
  if (lowerTitle.includes('ブレーキ') || lowerTitle.includes('brake') || 
      lowerTitle.includes('制動') || lowerTitle.includes('パッド')) {
    return 'ブレーキパッド交換';
  }
  
  // タイヤ関連
  if (lowerTitle.includes('タイヤ') || lowerTitle.includes('tire') || 
      lowerTitle.includes('ローテーション') || lowerTitle.includes('rotation')) {
    return 'タイヤ交換';
  }
  
  // フィルター関連
  if (lowerTitle.includes('エアフィルター') || lowerTitle.includes('air filter') || 
      lowerTitle.includes('フィルター') || lowerTitle.includes('filter')) {
    return 'エアフィルター交換';
  }
  
  // バッテリー関連
  if (lowerTitle.includes('バッテリー') || lowerTitle.includes('battery') || 
      lowerTitle.includes('電池')) {
    return 'バッテリー交換';
  }
  
  
  // クーラント関連
  if (lowerTitle.includes('クーラント') || lowerTitle.includes('coolant') || 
      lowerTitle.includes('冷却水') || lowerTitle.includes('ラジエーター')) {
    return 'クーラント';
  }
  
  // 車検関連
  if (lowerTitle.includes('車検') || lowerTitle.includes('検査') || 
      lowerTitle.includes('inspection')) {
    return '車検';
  }
  
  // デフォルトは空文字（リマインダーを作成しない）
  return '';
}

// 特定のメンテナンス記録に関連するリマインダーを削除
export async function deleteRemindersByMaintenanceRecord(
  carId: string,
  entryId: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');
  
  // 特定のメンテナンス記録に関連するリマインダーを検索
  const q = query(
    collection(db, 'users', user.uid, 'reminders'),
    where('carId', '==', carId),
    where('baseEntryRef', '==', entryId)
  );
  
  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
  
  if (snapshot.docs.length > 0) {
    console.log(`Deleted ${snapshot.docs.length} reminders related to maintenance record ${entryId}`);
  }
}

// リマインダー完了時に次のリマインダーを自動生成
export async function generateNextReminderOnComplete(
  reminder: Reminder
): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');

  // メンテナンス記録から生成されたリマインダーの場合のみ処理
  if (!reminder.baseEntryRef || !reminder.notes?.includes('メンテナンス記録から自動生成')) {
    return null;
  }

  // メンテナンス記録のタイトルからメンテナンスタイプを推定
  const maintenanceType = extractMaintenanceTypeFromTitle(reminder.title);
  
  // 現在の日付と走行距離を取得
  const now = new Date();
  const currentOdoKm = reminder.dueOdoKm || 0;
  
  // 次のリマインダーを生成
  const suggestions = suggestReminders(maintenanceType, now, currentOdoKm);
  
  if (suggestions.length === 0) {
    console.log('No next reminder suggestions for maintenance type:', maintenanceType);
    return null;
  }

  const suggestion = suggestions[0];
  
  // 新しいリマインダーを作成
  const reminderData = {
    carId: reminder.carId,
    kind: suggestion.kind || 'time',
    title: suggestion.title || `次回${maintenanceType}`,
    dueDate: suggestion.dueDate,
    dueOdoKm: suggestion.dueOdoKm,
    baseEntryRef: reminder.baseEntryRef,
    threshold: suggestion.threshold || {},
    status: 'active' as const,
    notes: `メンテナンス記録から自動生成: ${maintenanceType} (継続)`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  const docRef = await addDoc(collection(db, 'users', user.uid, 'reminders'), reminderData);
  console.log(`Generated next reminder from completed maintenance: ${maintenanceType} -> ${suggestion.title}`);
  
  return docRef.id;
}

// 既存のリマインダーの日付を修正（デバッグ用）
export async function fixReminderDates(carId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');
  
  // 車両に関連するすべてのリマインダーを取得
  const q = query(
    collection(db, 'users', user.uid, 'reminders'),
    where('carId', '==', carId)
  );
  
  const snapshot = await getDocs(q);
  const updatePromises = snapshot.docs.map(async (doc) => {
    const data = doc.data();
    const reminder = {
      id: doc.id,
      ...data,
      dueDate: data.dueDate?.toDate() || null,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Reminder;
    
    // メンテナンス記録から生成されたリマインダーの場合、日付を再計算
    if (reminder.baseEntryRef && reminder.notes?.includes('メンテナンス記録から自動生成')) {
      const maintenanceType = extractMaintenanceTypeFromTitle(reminder.title);
      
      // 現在の日付から正しい期日を計算
      const now = new Date();
      let newDueDate: Date | null = null;
      
      switch (maintenanceType.toLowerCase()) {
        case 'オイル交換':
          newDueDate = new Date(now);
          newDueDate.setMonth(newDueDate.getMonth() + 6);
          break;
        case 'ブレーキフルード':
        case 'ブレーキパッド交換':
          newDueDate = new Date(now);
          newDueDate.setMonth(newDueDate.getMonth() + 24);
          break;
        case 'エアフィルター':
        case 'エアフィルター交換':
          newDueDate = new Date(now);
          newDueDate.setMonth(newDueDate.getMonth() + 12);
          break;
        case 'タイヤ交換':
        case 'タイヤローテーション':
          newDueDate = new Date(now);
          newDueDate.setMonth(newDueDate.getMonth() + 12);
          break;
        case 'バッテリー交換':
          newDueDate = new Date(now);
          newDueDate.setMonth(newDueDate.getMonth() + 36);
          break;
        case '整備':
          newDueDate = new Date(now);
          newDueDate.setMonth(newDueDate.getMonth() + 6);
          break;
      }
      
      if (newDueDate) {
        console.log(`Fixing reminder date: ${reminder.title} from ${reminder.dueDate} to ${newDueDate}`);
        await updateDoc(doc.ref, {
          dueDate: newDueDate,
          updatedAt: serverTimestamp()
        });
      }
    }
  });
  
  await Promise.all(updatePromises);
  console.log(`Fixed ${snapshot.docs.length} reminders for car ${carId}`);
}

// 「次回整備」リマインダーを削除（デバッグ用）
export async function removeGenericMaintenanceReminders(carId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');
  
  // 「次回整備」のリマインダーを検索
  const q = query(
    collection(db, 'users', user.uid, 'reminders'),
    where('carId', '==', carId),
    where('title', '==', '次回整備')
  );
  
  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
  
  console.log(`Removed ${snapshot.docs.length} generic maintenance reminders for car ${carId}`);
}

// 古い形式の車検リマインダーを削除（デバッグ用）
export async function removeOldShakenReminders(carId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');
  
  // 古い形式の車検リマインダーを検索（タイトルに日数が含まれているもの）
  const q = query(
    collection(db, 'users', user.uid, 'reminders'),
    where('carId', '==', carId)
  );
  
  const snapshot = await getDocs(q);
  const oldShakenReminders = snapshot.docs.filter(doc => {
    const data = doc.data();
    const title = data.title || '';
    return title.includes('車検まであと') || title.includes('車検期限切れ');
  });
  
  const deletePromises = oldShakenReminders.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
  
  console.log(`Removed ${oldShakenReminders.length} old shaken reminders for car ${carId}`);
}
