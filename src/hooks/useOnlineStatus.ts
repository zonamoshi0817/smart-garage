// src/hooks/useOnlineStatus.ts
"use client";

import { useEffect, useState } from "react";

/**
 * オンライン/オフライン状態を監視するカスタムフック
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // クライアントサイドでのみ実行
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    // 初期状態を設定
    setIsOnline(navigator.onLine);

    // オンライン/オフラインイベントリスナー
    const handleOnline = () => {
      console.log("Network: Online");
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log("Network: Offline");
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // マウント前は常にtrueを返す（サーバーサイドでは常にオンラインとみなす）
  if (!isMounted) {
    return true;
  }

  return isOnline;
}

