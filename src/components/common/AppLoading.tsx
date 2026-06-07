"use client";

import AuthGate from "@/components/AuthGate";

/** アプリ内ページ共通のローディング表示（モノトーン）。 */
export function AppLoading({ text = "読み込み中..." }: { text?: string }) {
  return (
    <AuthGate>
      <div className="app-home min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="app-card p-6 flex items-center gap-3" style={{ color: "var(--text-muted)" }}>
            <span
              className="animate-spin rounded-full border-2 w-5 h-5"
              style={{ borderColor: "var(--border-bright)", borderTopColor: "var(--accent)" }}
            />
            <span className="text-sm">{text}</span>
          </div>
        </div>
      </div>
    </AuthGate>
  );
}

/** カード内インラインのローディング表示（中央寄せ・モノトーン）。 */
export function InlineLoading({ text = "読み込み中..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div
        className="animate-spin rounded-full border-2 w-8 h-8 mb-4"
        style={{ borderColor: "var(--border-bright)", borderTopColor: "var(--accent)" }}
      />
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>{text}</p>
    </div>
  );
}
