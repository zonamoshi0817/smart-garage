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
  getDocs
} from 'firebase/firestore';

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
      reminders.push({
        id: doc.id,
        ...data,
        dueDate: data.dueDate?.toDate() || null,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
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
        dueDate: data.dueDate?.toDate() || null,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
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
        dueDate: data.dueDate?.toDate() || null,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
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
        dueDate: data.dueDate?.toDate() || null,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
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
      suggestions.push({
        kind: 'both',
        title: '次回オイル交換',
        threshold: { months: 6, km: 5000 },
        dueDate: new Date(performedAt.getTime() + 6 * 30 * 24 * 60 * 60 * 1000),
        dueOdoKm: odoKm + 5000,
        status: 'active'
      });
      break;

    case 'ブレーキフルード':
      suggestions.push({
        kind: 'time',
        title: '次回ブレーキフルード交換',
        threshold: { months: 24 },
        dueDate: new Date(performedAt.getTime() + 24 * 30 * 24 * 60 * 60 * 1000),
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
      suggestions.push({
        kind: 'both',
        title: '次回エアフィルター交換',
        threshold: { months: 12, km: 20000 },
        dueDate: new Date(performedAt.getTime() + 12 * 30 * 24 * 60 * 60 * 1000),
        dueOdoKm: odoKm + 20000,
        status: 'active'
      });
      break;

    case 'スパークプラグ':
      suggestions.push({
        kind: 'distance',
        title: '次回スパークプラグ交換',
        threshold: { km: 100000 },
        dueDate: null,
        dueOdoKm: odoKm + 100000,
        status: 'active'
      });
      break;

    default:
      // デフォルトの提案
      suggestions.push({
        kind: 'time',
        title: '次回整備',
        threshold: { months: 6 },
        dueDate: new Date(performedAt.getTime() + 6 * 30 * 24 * 60 * 60 * 1000),
        dueOdoKm: null,
        status: 'active'
      });
  }

  return suggestions;
}

// リマインダーの期限チェック
export function checkReminderDue(reminder: Reminder, currentOdoKm?: number): boolean {
  const now = new Date();
  
  // 日付ベースのチェック
  if (reminder.dueDate && reminder.dueDate <= now) {
    return true;
  }
  
  // 走行距離ベースのチェック
  if (reminder.dueOdoKm && currentOdoKm && currentOdoKm >= reminder.dueOdoKm) {
    return true;
  }
  
  return false;
}

// リマインダーの期限までの日数計算
export function getDaysUntilDue(reminder: Reminder): number | null {
  if (!reminder.dueDate) return null;
  
  const now = new Date();
  const diffTime = reminder.dueDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// リマインダーの期限までの走行距離計算
export function getKmUntilDue(reminder: Reminder, currentOdoKm: number): number | null {
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
  
  let title = '';
  let priority: 'low' | 'medium' | 'high' | 'urgent' = 'low';
  
  if (daysUntilShaken > 30) {
    title = `車検まであと${daysUntilShaken}日`;
    priority = 'low';
  } else if (daysUntilShaken > 14) {
    title = `車検まであと${daysUntilShaken}日（準備開始）`;
    priority = 'medium';
  } else if (daysUntilShaken > 7) {
    title = `車検まであと${daysUntilShaken}日（予約推奨）`;
    priority = 'high';
  } else if (daysUntilShaken > 0) {
    title = `車検まであと${daysUntilShaken}日（緊急）`;
    priority = 'urgent';
  } else if (daysUntilShaken === 0) {
    title = `車検期限日（本日）`;
    priority = 'urgent';
  } else {
    title = `車検期限切れ（${Math.abs(daysUntilShaken)}日経過）`;
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
