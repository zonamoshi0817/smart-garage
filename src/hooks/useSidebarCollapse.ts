"use client";

import { useState, useEffect } from "react";

const SIDEBAR_COLLAPSED_KEY = "sidebar_collapsed";

export function useSidebarCollapse() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // localStorageから折りたたみ状態を読み込む
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }

    // localStorageの変更を監視
    const handleStorageChange = () => {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    // カスタムイベントを監視（同じウィンドウ内での変更を検知）
    window.addEventListener("sidebarCollapseChange", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("sidebarCollapseChange", handleStorageChange);
    };
  }, []);

  return isCollapsed;
}
