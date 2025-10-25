// src/lib/notifications.ts
"use client";

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

// テスト通知を送信
export async function sendTestNotification(): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.log('通知許可がありません');
    return;
  }

  const notificationData: NotificationData = {
    title: 'Smart Garage',
    body: 'テスト通知です',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'test-notification',
    data: {},
    actions: []
  };

  try {
    const notification = new Notification(notificationData.title, notificationData);
    
    // 通知クリック時の処理
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      notification.close();
    };

    // 通知を閉じるタイマー（5秒後）
    setTimeout(() => {
      notification.close();
    }, 5000);

    console.log('テスト通知を送信しました');
  } catch (error) {
    console.error('通知送信に失敗しました:', error);
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
