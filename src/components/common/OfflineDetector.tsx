"use client";

import { useEffect, useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { OfflineState } from "./EmptyState";

export function OfflineDetector() {
  const [isMounted, setIsMounted] = useState(false);
  const isOnline = useOnlineStatus();
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // サーバーサイドレンダリング時は何も表示しない
  if (!isMounted) {
    return null;
  }
  
  if (isOnline) {
    return null;
  }
  
  return <OfflineState />;
}
