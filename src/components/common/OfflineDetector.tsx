"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { OfflineState } from "./EmptyState";

export function OfflineDetector() {
  const isOnline = useOnlineStatus();
  
  if (isOnline) {
    return null;
  }
  
  return <OfflineState />;
}
