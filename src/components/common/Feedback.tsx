"use client";

/**
 * アプリ全体で共通のフィードバック UI（トースト / 確認ダイアログ）。
 * ネイティブの alert() / confirm() を置き換え、モノトーンの世界観に統一する。
 *
 * 使い方:
 *   const toast = useToast();
 *   toast("保存しました");
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ message: "ログアウトしますか？" })) { ... }
 */

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastTone = "default" | "error";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ConfirmOptions {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
}

type ToastFn = (message: string, tone?: ToastTone) => void;
type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ToastContext = createContext<ToastFn | null>(null);
const ConfirmContext = createContext<ConfirmFn | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const toast = useCallback<ToastFn>((message, tone = "default") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  const [confirmState, setConfirmState] = useState<
    (ConfirmOptions & { resolve: (v: boolean) => void }) | null
  >(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  const closeConfirm = (result: boolean) => {
    setConfirmState((prev) => {
      prev?.resolve(result);
      return null;
    });
  };

  return (
    <ToastContext.Provider value={toast}>
      <ConfirmContext.Provider value={confirm}>
        {children}

        {/* トースト（右下） */}
        {toasts.length > 0 && (
          <div className="fixed bottom-4 right-4 z-[80] flex flex-col items-end gap-2">
            {toasts.map((t) => (
              <div
                key={t.id}
                role="status"
                className="rounded-lg px-4 py-2.5 text-sm shadow-lg animate-[fadeIn_0.15s_ease-out]"
                style={{
                  background: t.tone === "error" ? "#b91c1c" : "#1a1a18",
                  color: "#f7f5f0",
                  fontFamily: "var(--font-body, sans-serif)",
                  maxWidth: "min(90vw, 360px)",
                }}
              >
                {t.message}
              </div>
            ))}
          </div>
        )}

        {/* 確認ダイアログ */}
        {confirmState && (
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={() => closeConfirm(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-sm rounded-xl p-5 shadow-2xl"
              style={{ background: "#ffffff", border: "0.5px solid rgba(0,0,0,0.15)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {confirmState.title && (
                <h2
                  className="text-base font-semibold mb-1.5"
                  style={{ color: "#1a1a18" }}
                >
                  {confirmState.title}
                </h2>
              )}
              <p className="text-sm mb-5" style={{ color: "#4a4a44" }}>
                {confirmState.message}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => closeConfirm(false)}
                  className="px-4 py-2 text-sm rounded-md transition-colors"
                  style={{ background: "#f2f0eb", color: "#1a1a18" }}
                >
                  {confirmState.cancelLabel ?? "キャンセル"}
                </button>
                <button
                  onClick={() => closeConfirm(true)}
                  className="px-4 py-2 text-sm rounded-md text-white transition-colors"
                  style={{
                    background: confirmState.tone === "danger" ? "#b91c1c" : "#1a1a18",
                  }}
                >
                  {confirmState.confirmLabel ?? "OK"}
                </button>
              </div>
            </div>
          </div>
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastFn {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // プロバイダ外で呼ばれた場合のフォールバック（クラッシュさせない）
    return () => {};
  }
  return ctx;
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    return async (opts) =>
      typeof window !== "undefined" ? window.confirm(opts.message) : false;
  }
  return ctx;
}
