"use client";

import { useRouter } from "next/navigation";
import React from "react";

type BackButtonProps = {
  className?: string;
  fallback?: string; // 履歴がない場合の遷移先
  label?: string;
};

export function BackButton({
  className,
  fallback = "/",
  label = "← 戻る",
}: BackButtonProps) {
  const router = useRouter();

  const onBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  };

  return (
    <button
      type="button"
      onClick={onBack}
      className={
        className ||
        "inline-flex items-center rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      }
      aria-label="戻る"
    >
      {label}
    </button>
  );
}



