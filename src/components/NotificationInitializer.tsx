"use client";

import { useEffect } from 'react';
import { startNotificationScheduler, registerServiceWorker } from '@/lib/notifications';

export default function NotificationInitializer() {
  useEffect(() => {
    // Service Workerを登録
    registerServiceWorker();
    
    // 通知スケジューラーを開始
    startNotificationScheduler();
    
    console.log('通知システムを初期化しました');
  }, []);

  return null; // このコンポーネントはUIを表示しない
}
