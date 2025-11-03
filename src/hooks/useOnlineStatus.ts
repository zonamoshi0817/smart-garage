// src/hooks/useOnlineStatus.ts
"use client";

import { useEffect, useState } from "react";

/**
 * オンライン/オフライン状態を監視するカスタムフック
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
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

  return isOnline;
}

