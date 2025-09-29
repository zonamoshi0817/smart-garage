// public/sw.js - Service Worker for Push Notifications
const CACHE_NAME = 'smart-garage-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/favicon.ico'
];

// Service Workerのインストール
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Service Workerのアクティベート
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// プッシュ通知の受信
self.addEventListener('push', (event) => {
  console.log('プッシュ通知を受信しました:', event);
  
  let notificationData = {
    title: 'Smart Garage',
    body: '新しい通知があります',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'smart-garage-notification'
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data
      };
    } catch (error) {
      console.error('プッシュ通知データの解析に失敗しました:', error);
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    data: notificationData.data,
    actions: notificationData.actions || [
      {
        action: 'open',
        title: '開く'
      },
      {
        action: 'close',
        title: '閉じる'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// 通知クリックの処理
self.addEventListener('notificationclick', (event) => {
  console.log('通知がクリックされました:', event);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // アプリを開く
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // 既に開いているウィンドウがあるかチェック
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      
      // 新しいウィンドウを開く
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// 通知アクションクリックの処理
self.addEventListener('notificationactionclick', (event) => {
  console.log('通知アクションがクリックされました:', event);
  
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // 既に開いているウィンドウがあるかチェック
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          // アクション情報をクライアントに送信
          client.postMessage({
            type: 'NOTIFICATION_ACTION',
            action: action,
            data: data
          });
          return client.focus();
        }
      }
      
      // 新しいウィンドウを開く
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// バックグラウンド同期
self.addEventListener('sync', (event) => {
  console.log('バックグラウンド同期:', event);
  
  if (event.tag === 'oil-reminder-sync') {
    event.waitUntil(
      // オイル交換リマインドの同期処理
      syncOilReminders()
    );
  }
});

// オイル交換リマインドの同期処理
async function syncOilReminders() {
  try {
    // ここで期限切れのリマインドをチェックして通知送信
    // 実際の実装では、Firebase Cloud Functionsからプッシュ通知を送信
    console.log('オイル交換リマインドの同期を実行しました');
  } catch (error) {
    console.error('オイル交換リマインドの同期に失敗しました:', error);
  }
}

// メッセージの処理
self.addEventListener('message', (event) => {
  console.log('Service Workerがメッセージを受信しました:', event);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
