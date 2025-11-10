'use client';

import { Car, MaintenanceRecord } from '@/types';
import { generateMaintenanceSuggestions, MaintenanceSuggestion } from '@/lib/maintenanceSuggestions';

interface NextMaintenanceSuggestionProps {
  car: Car;
  maintenanceRecords: MaintenanceRecord[];
  onCreateFromTemplate: (templateId: string) => void;
}

/**
 * ステータスバッジを取得
 */
function getStatusBadge(status: 'critical' | 'soon' | 'upcoming' | 'ok'): {
  emoji: string;
  label: string;
  colorClass: string;
} {
  switch (status) {
    case 'critical':
      return {
        emoji: '🔴',
        label: '緊急',
        colorClass: 'from-red-50 to-red-100 border-red-300'
      };
    case 'soon':
      return {
        emoji: '🟠',
        label: 'まもなく',
        colorClass: 'from-orange-50 to-orange-100 border-orange-300'
      };
    case 'upcoming':
      return {
        emoji: '🟡',
        label: '近日',
        colorClass: 'from-yellow-50 to-yellow-100 border-yellow-300'
      };
    case 'ok':
      return {
        emoji: '🟢',
        label: '余裕あり',
        colorClass: 'from-green-50 to-green-100 border-green-300'
      };
  }
}

/**
 * 信頼度バッジを取得
 */
function getConfidenceBadge(confidence: 'high' | 'medium' | 'low'): {
  stars: string;
  label: string;
  tooltip: string;
} {
  switch (confidence) {
    case 'high':
      return {
        stars: '★★★',
        label: '高精度',
        tooltip: '履歴+ODOあり：最も正確な提案です'
      };
    case 'medium':
      return {
        stars: '★★☆',
        label: '中精度',
        tooltip: '履歴のみ：ODOを登録するとより正確になります'
      };
    case 'low':
      return {
        stars: '★☆☆',
        label: '低精度',
        tooltip: '履歴なし：時間ベースの推定です'
      };
  }
}

/**
 * メンテナンス提案カード
 */
function SuggestionCard({
  suggestion,
  onCreateFromTemplate
}: {
  suggestion: MaintenanceSuggestion;
  onCreateFromTemplate: (templateId: string) => void;
}) {
  const statusBadge = getStatusBadge(suggestion.status);
  const confidenceBadge = getConfidenceBadge(suggestion.confidence);

  return (
    <div
      className={`flex items-start gap-4 p-4 bg-gradient-to-r rounded-lg border-2 ${statusBadge.colorClass}`}
    >
      {/* アイコン＋ステータス */}
      <div className="flex-shrink-0 text-center">
        <div className="text-3xl mb-1">{suggestion.icon}</div>
        <div className="text-xs font-semibold whitespace-nowrap">
          {statusBadge.emoji} {statusBadge.label}
        </div>
      </div>

      {/* 情報 */}
      <div className="flex-1 min-w-0">
        {/* タイトル */}
        <div className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          {suggestion.title}
          
          {/* 信頼度バッジ */}
          <span
            className="text-xs text-gray-500 cursor-help"
            title={confidenceBadge.tooltip}
          >
            {confidenceBadge.stars}
          </span>
        </div>

        {/* メッセージ */}
        <div className="text-sm text-gray-700 mb-2">
          {suggestion.message}
        </div>

        {/* 詳細情報（期限超過の場合は強調） */}
        {suggestion.dueInfo.isOverdue && (
          <div className="text-xs text-red-700 font-semibold mb-1">
            ⚠️ 期限超過：早めの実施を推奨します
          </div>
        )}

        {/* 進捗バー */}
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>進捗</span>
            <span>{suggestion.score}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                suggestion.score >= 85
                  ? 'bg-red-500'
                  : suggestion.score >= 70
                  ? 'bg-orange-500'
                  : 'bg-yellow-500'
              }`}
              style={{ width: `${Math.min(suggestion.score, 100)}%` }}
            />
          </div>
        </div>

        {/* 距離と時間の詳細 */}
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
          {suggestion.dueInfo.remainKm !== Infinity && (
            <div className="flex items-center gap-1">
              <span>🚗</span>
              <span>
                残り <strong>{Math.round(suggestion.dueInfo.remainKm).toLocaleString()}</strong> km
              </span>
            </div>
          )}
          {suggestion.dueInfo.remainDays !== Infinity && (
            <div className="flex items-center gap-1">
              <span>📅</span>
              <span>
                残り <strong>{suggestion.dueInfo.remainDays}</strong> 日
              </span>
            </div>
          )}
        </div>

        {/* 注記 */}
        <div className="text-xs text-gray-500 italic mt-2">
          ※部品・費用は車種により異なります
        </div>
      </div>

      {/* アクションボタン */}
      <button
        onClick={() => onCreateFromTemplate(suggestion.templateId)}
        className="flex-shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-md whitespace-nowrap"
      >
        📝 テンプレから作成
      </button>
    </div>
  );
}

/**
 * 次回メンテナンス提案コンポーネント
 */
export default function NextMaintenanceSuggestion({
  car,
  maintenanceRecords,
  onCreateFromTemplate
}: NextMaintenanceSuggestionProps) {
  // メンテナンス提案を生成
  const suggestions = generateMaintenanceSuggestions(car, maintenanceRecords);

  // 表示する提案をフィルタリング（最大6件、スコア50以上）
  const displaySuggestions = suggestions.slice(0, 6);

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span>💡</span>
        <span>次回メンテナンス提案</span>
      </h2>

      {/* ODO未登録の警告 */}
      {(!car.odoKm || car.odoKm === 0) && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            ⚠️ <strong>走行距離（ODO）未登録</strong>：時間ベースで提案しています。ODOを登録すると、より正確なメンテナンス提案ができます。
          </p>
        </div>
      )}

      {/* 平均走行距離未登録の警告 */}
      {(!car.avgKmPerMonth || car.avgKmPerMonth === 0) && car.odoKm && car.odoKm > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            💡 <strong>平均走行距離未登録</strong>：車両設定で月間走行距離を登録すると、残り日数の推定精度が向上します。
          </p>
        </div>
      )}

      {/* 提案カード */}
      {displaySuggestions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-2">✨ すべて良好です！</p>
          <p className="text-sm">近いうちに必要なメンテナンスはありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displaySuggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onCreateFromTemplate={onCreateFromTemplate}
            />
          ))}
        </div>
      )}

      {/* 信頼度の説明（ツールチップ用の凡例） */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <details className="text-xs text-gray-600">
          <summary className="cursor-pointer hover:text-gray-900 font-medium">
            精度について
          </summary>
          <div className="mt-2 space-y-1 ml-4">
            <div>★★★ 高精度：履歴+ODOあり（最も正確）</div>
            <div>★★☆ 中精度：履歴のみ（時間ベース）</div>
            <div>★☆☆ 低精度：履歴なし（推定値）</div>
          </div>
        </details>
      </div>
    </div>
  );
}
