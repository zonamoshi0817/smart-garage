"use client";

import { useState, useEffect } from 'react';
import { isDevMode, enableDevMode, disableDevMode } from '@/lib/devMode';

export default function DevModeToggle() {
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    setDevMode(isDevMode());
  }, []);

  const handleToggle = () => {
    if (devMode) {
      disableDevMode();
    } else {
      enableDevMode();
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="dev-mode"
            checked={devMode}
            onChange={handleToggle}
            className="rounded"
          />
          <label htmlFor="dev-mode" className="text-sm font-medium text-yellow-800">
            開発モード
          </label>
        </div>
        <p className="text-xs text-yellow-700 mt-1">
          {devMode ? 'ダミーデータで動作中' : 'Firebase接続が必要'}
        </p>
      </div>
    </div>
  );
}
