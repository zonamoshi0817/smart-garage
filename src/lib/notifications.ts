// src/lib/notifications.ts
"use client";
import { getDueOilReminders, updateOilReminderStatus } from './oilReminders';

// 通知の型定義
export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

// 通知許可をリクエスト
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('このブラウザは通知をサポートしていません');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.log('通知が拒否されています');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// オイル交換リマインド通知を送信
export async function sendOilReminderNotification(reminder: any): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.log('通知許可がありません');
    return;
  }

  const notificationData: NotificationData = {
    title: reminder.title,
    body: reminder.message,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: `oil-reminder-${reminder.id}`,
    data: {
      reminderId: reminder.id,
      carId: reminder.carId,
      deeplink: reminder.deeplink
    },
    actions: [
      {
        action: 'reservation',
        title: '予約する',
        icon: '/icons/calendar.svg'
      },
      {
        action: 'purchase',
        title: 'オイルを買う',
        icon: '/icons/shopping.svg'
      },
      {
        action: 'snooze',
        title: 'あとで',
        icon: '/icons/clock.svg'
      }
    ]
  };

  try {
    const notification = new Notification(notificationData.title, notificationData);
    
    // 通知クリック時の処理
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      
      // ディープリンクを処理（実際の実装ではルーティング処理）
      if (reminder.deeplink) {
        handleDeepLink(reminder.deeplink);
      }
      
      notification.close();
    };

    // アクションボタンクリック時の処理
    notification.onactionclick = (event) => {
      const action = event.action;
      handleNotificationAction(action, reminder);
      notification.close();
    };

    // 通知を閉じるタイマー（10秒後）
    setTimeout(() => {
      notification.close();
    }, 10000);

    // 通知送信ステータスを更新
    await updateOilReminderStatus(reminder.id, 'sent');
    
    console.log('オイル交換リマインド通知を送信しました:', reminder.id);
  } catch (error) {
    console.error('通知送信に失敗しました:', error);
  }
}

// 期限切れのオイル交換リマインドをチェックして通知送信
export async function checkAndSendOilReminderNotifications(): Promise<void> {
  try {
    const dueReminders = await getDueOilReminders();
    
    for (const reminder of dueReminders) {
      await sendOilReminderNotification(reminder);
    }
    
    if (dueReminders.length > 0) {
      console.log(`${dueReminders.length}件のオイル交換リマインド通知を送信しました`);
    }
  } catch (error) {
    console.error('オイル交換リマインド通知のチェックに失敗しました:', error);
  }
}

// ディープリンクを処理
function handleDeepLink(deeplink: string): void {
  // ディープリンクの形式: app://reminder/oil_change/{carId}
  const match = deeplink.match(/app:\/\/reminder\/oil_change\/(.+)/);
  if (match) {
    const carId = match[1];
    // 実際の実装では、ルーティング処理を行う
    console.log('ディープリンク処理:', carId);
    
    // 例: リマインドモーダルを表示
    // showOilReminderModal(carId);
  }
}

// 通知アクションを処理
function handleNotificationAction(action: string, reminder: any): void {
  switch (action) {
    case 'reservation':
      // 予約URLを新しいタブで開く
      window.open(reminder.reservationUrl, '_blank');
      break;
    case 'purchase':
      // 購入ページを新しいタブで開く（最初の候補）
      if (reminder.purchaseCandidates && reminder.purchaseCandidates.length > 0) {
        window.open(reminder.purchaseCandidates[0].url, '_blank');
      }
      break;
    case 'snooze':
      // スヌーズ処理
      snoozeReminder(reminder.id);
      break;
    default:
      console.log('未知のアクション:', action);
  }
}

// リマインドをスヌーズ
async function snoozeReminder(reminderId: string): Promise<void> {
  try {
    await updateOilReminderStatus(reminderId, 'snoozed');
    console.log('リマインドをスヌーズしました:', reminderId);
  } catch (error) {
    console.error('スヌーズに失敗しました:', error);
  }
}

// 定期的な通知チェックを開始
export function startNotificationScheduler(): void {
  // 初回チェック
  checkAndSendOilReminderNotifications();
  
  // 1時間ごとにチェック
  setInterval(() => {
    checkAndSendOilReminderNotifications();
  }, 60 * 60 * 1000); // 1時間 = 60分 * 60秒 * 1000ms
}

// 通知スケジューラーを停止
let notificationInterval: NodeJS.Timeout | null = null;

export function stopNotificationScheduler(): void {
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
  }
}

// プッシュ通知の設定（Service Worker用）
export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker登録成功:', registration);
      })
      .catch((error) => {
        console.log('Service Worker登録失敗:', error);
      });
  }
}

// プッシュ通知の購読
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('プッシュ通知をサポートしていません');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    });

    console.log('プッシュ通知の購読に成功しました');
    return subscription;
  } catch (error) {
    console.error('プッシュ通知の購読に失敗しました:', error);
    return null;
  }
}

// プッシュ通知の購読を解除
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('プッシュ通知の購読を解除しました');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('プッシュ通知の購読解除に失敗しました:', error);
    return false;
  }
}
