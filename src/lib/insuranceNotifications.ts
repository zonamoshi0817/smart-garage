// src/lib/insuranceNotifications.ts
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
  getDocs,
  Timestamp
} from 'firebase/firestore';
import type { InsurancePolicy } from './insurance';

// 保険通知の型定義
export interface InsuranceNotification {
  id?: string;
  policyId: string;
  type: 'policy_expiry';
  daysBeforeExpiry: number; // 満期何日前の通知か
  sendAt: Date; // 送信予定日時
  sent: boolean; // 送信済みかどうか
  sentAt?: Date; // 送信日時
  createdAt: Date;
  updatedAt: Date;
}

// 通知設定の型定義
export interface NotificationSettings {
  id?: string;
  userId: string;
  policyExpiryNotifications: {
    enabled: boolean;
    daysBefore: number[]; // [30, 14, 7, 1] など
    emailEnabled: boolean;
    pushEnabled: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

// 通知の作成
export async function createInsuranceNotification(
  notification: Omit<InsuranceNotification, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');

  const notificationData = {
    ...notification,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'users', user.uid, 'insuranceNotifications'), notificationData);
  return docRef.id;
}

// 通知の更新
export async function updateInsuranceNotification(
  notificationId: string,
  updates: Partial<Omit<InsuranceNotification, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');

  const updateData = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, 'users', user.uid, 'insuranceNotifications', notificationId), updateData);
}

// 通知の削除
export async function deleteInsuranceNotification(notificationId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');

  await deleteDoc(doc(db, 'users', user.uid, 'insuranceNotifications', notificationId));
}

// 通知の監視
export function watchInsuranceNotifications(callback: (notifications: InsuranceNotification[]) => void): () => void {
  const user = auth.currentUser;
  if (!user) {
    console.log('No user found, cannot watch insurance notifications');
    return () => {};
  }

  console.log('Setting up insurance notifications watcher for user:', user.uid);
  
  const q = query(
    collection(db, 'users', user.uid, 'insuranceNotifications'),
    orderBy('sendAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    console.log('Insurance notifications snapshot received:', snapshot.size, 'notifications');
    
    const notifications: InsuranceNotification[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        ...data,
        sendAt: data.sendAt?.toDate() || new Date(),
        sentAt: data.sentAt?.toDate() || undefined,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as InsuranceNotification);
    });
    
    console.log('Processed insurance notifications:', notifications.length);
    callback(notifications);
  }, (error) => {
    console.error('Error watching insurance notifications:', error);
  });
}

// 通知設定の取得
export async function getNotificationSettings(): Promise<NotificationSettings | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const settingsDoc = await getDocs(collection(db, 'users', user.uid, 'notificationSettings'));
    
    if (settingsDoc.empty) {
      // デフォルト設定を作成
      const defaultSettings: NotificationSettings = {
        userId: user.uid,
        policyExpiryNotifications: {
          enabled: true,
          daysBefore: [30, 14, 7, 1],
          emailEnabled: true,
          pushEnabled: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const docRef = await addDoc(collection(db, 'users', user.uid, 'notificationSettings'), {
        ...defaultSettings,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      return { ...defaultSettings, id: docRef.id };
    }

    const data = settingsDoc.docs[0].data();
    return {
      id: settingsDoc.docs[0].id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as NotificationSettings;
  } catch (error) {
    console.error('Error getting notification settings:', error);
    return null;
  }
}

// 通知設定の更新
export async function updateNotificationSettings(
  settings: Partial<Omit<NotificationSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');

  const settingsDoc = await getDocs(collection(db, 'users', user.uid, 'notificationSettings'));
  
  if (settingsDoc.empty) {
    // 新規作成
    const newSettings: NotificationSettings = {
      userId: user.uid,
      policyExpiryNotifications: {
        enabled: true,
        daysBefore: [30, 14, 7, 1],
        emailEnabled: true,
        pushEnabled: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...settings,
    };
    
    await addDoc(collection(db, 'users', user.uid, 'notificationSettings'), {
      ...newSettings,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    // 更新
    const updateData = {
      ...settings,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(settingsDoc.docs[0].ref, updateData);
  }
}

// 保険契約の満期通知を生成
export async function generatePolicyExpiryNotifications(policy: InsurancePolicy): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  try {
    // 既存の通知を削除
    const existingNotifications = await getDocs(
      query(
        collection(db, 'users', user.uid, 'insuranceNotifications'),
        where('policyId', '==', policy.id)
      )
    );
    
    const deletePromises = existingNotifications.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // 通知設定を取得
    const settings = await getNotificationSettings();
    if (!settings || !settings.policyExpiryNotifications.enabled) return;

    // 各通知日を計算して作成
    const notifications = settings.policyExpiryNotifications.daysBefore.map(daysBefore => {
      const sendAt = new Date(policy.endDate);
      sendAt.setDate(sendAt.getDate() - daysBefore);
      
      return {
        policyId: policy.id!,
        type: 'policy_expiry' as const,
        daysBeforeExpiry: daysBefore,
        sendAt,
        sent: false,
      };
    });

    // 通知を作成
    const createPromises = notifications.map(notification => 
      createInsuranceNotification(notification)
    );
    
    await Promise.all(createPromises);
    console.log(`Generated ${notifications.length} expiry notifications for policy ${policy.id}`);
  } catch (error) {
    console.error('Error generating policy expiry notifications:', error);
  }
}

// 送信待ちの通知を取得
export async function getPendingNotifications(): Promise<InsuranceNotification[]> {
  const user = auth.currentUser;
  if (!user) return [];

  try {
    const now = new Date();
    const q = query(
      collection(db, 'users', user.uid, 'insuranceNotifications'),
      where('sent', '==', false),
      where('sendAt', '<=', Timestamp.fromDate(now)),
      orderBy('sendAt', 'asc')
    );

    const snapshot = await getDocs(q);
    const notifications: InsuranceNotification[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        ...data,
        sendAt: data.sendAt?.toDate() || new Date(),
        sentAt: data.sentAt?.toDate() || undefined,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as InsuranceNotification);
    });
    
    return notifications;
  } catch (error) {
    console.error('Error getting pending notifications:', error);
    return [];
  }
}

// 通知を送信済みとしてマーク
export async function markNotificationAsSent(notificationId: string): Promise<void> {
  await updateInsuranceNotification(notificationId, {
    sent: true,
    sentAt: new Date(),
  });
}

// 保険契約が更新された時に通知を再生成
export async function updatePolicyNotifications(policy: InsurancePolicy): Promise<void> {
  await generatePolicyExpiryNotifications(policy);
}

// 保険契約が削除された時に通知を削除
export async function deletePolicyNotifications(policyId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const notifications = await getDocs(
      query(
        collection(db, 'users', user.uid, 'insuranceNotifications'),
        where('policyId', '==', policyId)
      )
    );
    
    const deletePromises = notifications.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log(`Deleted ${notifications.docs.length} notifications for policy ${policyId}`);
  } catch (error) {
    console.error('Error deleting policy notifications:', error);
  }
}
