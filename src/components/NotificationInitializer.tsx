"use client";

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/notifications';

export default function NotificationInitializer() {
  useEffect(() => {
    // Service Workerを登録
    registerServiceWorker();
    
    console.log('通知システムを初期化しました');
  }, []);

  return null; // このコンポーネントはUIを表示しない
}
