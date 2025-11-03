// src/components/common/EmptyState.tsx
"use client";

import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  illustration?: "car" | "document" | "search" | "error" | "offline";
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  illustration = "car",
}: EmptyStateProps) {
  const illustrations = {
    car: "🚗",
    document: "📄",
    search: "🔍",
    error: "⚠️",
    offline: "📡",
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* イラストまたはアイコン */}
      <div className="text-6xl mb-6">
        {icon || illustrations[illustration]}
      </div>

      {/* タイトル */}
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>

      {/* 説明 */}
      {description && (
        <p className="text-gray-600 mb-6 max-w-md">{description}</p>
      )}

      {/* アクションボタン */}
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/**
 * データが空の状態を表示
 */
export function EmptyCarState({ onAddCar }: { onAddCar: () => void }) {
  return (
    <EmptyState
      illustration="car"
      title="車両が登録されていません"
      description="まずは愛車を登録して、メンテナンス管理を始めましょう。"
      action={{
        label: "最初の車両を登録",
        onClick: onAddCar,
      }}
    />
  );
}

/**
 * メンテナンス記録が空の状態を表示
 */
export function EmptyMaintenanceState({ onAddRecord }: { onAddRecord: () => void }) {
  return (
    <EmptyState
      illustration="document"
      title="メンテナンス記録がありません"
      description="車両のメンテナンス履歴を記録して、愛車の価値を保ちましょう。"
      action={{
        label: "最初の記録を追加",
        onClick: onAddRecord,
      }}
    />
  );
}

/**
 * 検索結果が空の状態を表示
 */
export function EmptySearchState({ onClearSearch }: { onClearSearch: () => void }) {
  return (
    <EmptyState
      illustration="search"
      title="検索結果が見つかりません"
      description="別のキーワードで検索するか、フィルターを変更してみてください。"
      action={{
        label: "検索をクリア",
        onClick: onClearSearch,
      }}
    />
  );
}

/**
 * オフライン状態を表示
 */
export function OfflineState() {
  return (
    <div className="fixed bottom-4 right-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 shadow-lg max-w-md">
      <div className="flex items-start gap-3">
        <div className="text-2xl">📡</div>
        <div>
          <h4 className="font-semibold text-yellow-900 mb-1">
            オフラインモード
          </h4>
          <p className="text-sm text-yellow-800">
            インターネット接続がありません。オンラインになると自動的に同期されます。
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * ネットワークエラー状態を表示
 */
export function NetworkErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      illustration="error"
      title="接続エラー"
      description="サーバーに接続できませんでした。インターネット接続を確認してください。"
      action={{
        label: "再試行",
        onClick: onRetry,
      }}
    />
  );
}
