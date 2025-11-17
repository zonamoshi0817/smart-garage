'use client';

import { Customization } from '@/types';
import { useMemo, useState } from 'react';

interface CustomPartsPanelProps {
  customizations: Customization[];
  onAddCustomization?: (category: string) => void;
}

export default function CustomPartsPanel({ 
  customizations,
  onAddCustomization 
}: CustomPartsPanelProps) {
  
  // カスタマイズをカテゴリ別に集計
  const customizationsByCategory = useMemo(() => {
    const categories = {
      engine: [] as Customization[],
      exhaust: [] as Customization[],
      intake: [] as Customization[],
      suspension: [] as Customization[],
      brake: [] as Customization[],
      tire_wheel: [] as Customization[],
      exterior: [] as Customization[],
      interior: [] as Customization[],
      electrical: [] as Customization[],
      ecu: [] as Customization[],
      drivetrain: [] as Customization[],
      other: [] as Customization[]
    };
    
    customizations
      .filter(c => c.status === 'installed') // インストール済みのみ
      .forEach(custom => {
        custom.categories.forEach(cat => {
          if (cat in categories) {
            categories[cat as keyof typeof categories].push(custom);
          }
        });
      });
    
    return categories;
  }, [customizations]);
  
  // カテゴリ別の表示名
  const categoryLabels = {
    engine: { name: 'エンジン', subcategories: ['ピストン', 'カムシャフト', 'ターボ', 'インタークーラー'] },
    exhaust: { name: '排気系', subcategories: ['マフラー', 'エキマニ', '触媒'] },
    intake: { name: '吸気系', subcategories: ['エアクリーナー', 'インテークパイプ', 'スロットル'] },
    suspension: { name: 'サスペンション', subcategories: ['ショック', 'スプリング', 'アーム', 'スタビライザー'] },
    brake: { name: 'ブレーキ', subcategories: ['パッド', 'ローター', 'キャリパー', 'ブレーキライン'] },
    tire_wheel: { name: 'ホイール・タイヤ', subcategories: ['ホイール', 'タイヤ', 'ナット'] },
    exterior: { name: 'エクステリア', subcategories: ['エアロ', 'ウィング', 'ボンネット', 'ライト'] },
    interior: { name: 'インテリア', subcategories: ['シート', 'ハンドル', 'シフトノブ', 'メーター'] },
    electrical: { name: '電装系', subcategories: ['バッテリー', 'オルタネーター', 'イグニッション'] },
    ecu: { name: 'ECU', subcategories: ['ECU', 'サブコン', 'ハーネス'] },
    drivetrain: { name: '駆動系', subcategories: ['クラッチ', 'LSD', 'デフ', 'ドライブシャフト'] },
    other: { name: 'その他', subcategories: [] }
  };
  
  // 開閉状態を管理
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const installedCount = customizations.filter(c => c.status === 'installed').length;

  return (
    <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-5 lg:p-6 border border-gray-200">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="flex-shrink-0">🔧</span>
          <span className="break-words">カスタムパーツ一覧</span>
          {installedCount > 0 && (
            <span className="text-xs sm:text-sm font-normal text-gray-500 flex-shrink-0 hidden sm:inline">
              ({installedCount}件のカスタマイズ)
            </span>
          )}
        </h2>
        {installedCount > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-0">
            <span className="text-xs text-gray-500 sm:hidden">
              ({installedCount}件のカスタマイズ)
            </span>
            <button
              onClick={() => {
                if (expandedCategories.size > 0) {
                  setExpandedCategories(new Set());
                } else {
                  setExpandedCategories(new Set(Object.keys(customizationsByCategory)));
                }
              }}
              className="text-xs sm:text-sm text-cyan-600 hover:text-cyan-800 font-semibold transition-colors whitespace-nowrap"
            >
              {expandedCategories.size > 0 ? '全て閉じる' : '全て開く'}
            </button>
          </div>
        )}
      </div>
      
      {/* パーツリスト */}
      <div className="space-y-1">
        {installedCount === 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-dashed border-blue-300 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="text-2xl sm:text-3xl flex-shrink-0">💡</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-blue-700 mb-0.5 sm:mb-1 break-words">
                  カスタマイズを記録してみましょう！
                </p>
                <p className="text-[10px] sm:text-xs text-gray-600 break-words leading-relaxed">
                  パーツ交換や改造の履歴を記録すると、車両の詳細データとして一覧表示されます
                </p>
              </div>
            </div>
          </div>
        )}
        {Object.entries(customizationsByCategory).map(([category, items]) => {
          const hasCustom = items.length > 0;
          const categoryInfo = categoryLabels[category as keyof typeof categoryLabels];
          const isExpanded = expandedCategories.has(category);
          
          if (!categoryInfo) return null;
          
          return (
            <PartAccordion
              key={category}
              category={category}
              categoryInfo={categoryInfo}
              parts={items}
              isStock={!hasCustom}
              isExpanded={isExpanded}
              onToggle={() => toggleCategory(category)}
              onAdd={onAddCustomization ? () => onAddCustomization(category) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

// パーツアコーディオンコンポーネント
function PartAccordion({
  category,
  categoryInfo,
  parts,
  isStock,
  isExpanded,
  onToggle,
  onAdd
}: {
  category: string;
  categoryInfo: { name: string; subcategories: string[] };
  parts: Customization[];
  isStock: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onAdd?: () => void;
}) {
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      {/* ヘッダー（クリック可能） */}
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center py-2.5 sm:py-3 px-3 sm:px-2 hover:bg-gray-50 transition-colors rounded-lg min-w-0"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xs sm:text-sm font-bold text-gray-900 break-words">{categoryInfo.name}</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ml-2">
          {isStock ? (
            <span className="text-xs sm:text-sm text-gray-500 italic whitespace-nowrap">純正</span>
          ) : (
            <span className="text-[10px] sm:text-xs bg-cyan-600 text-white px-1.5 sm:px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
              カスタム {parts.length}
            </span>
          )}
          <svg 
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      {/* 展開コンテンツ */}
      {isExpanded && (
        <div className="pb-2.5 sm:pb-3 px-2 sm:px-2 space-y-2">
          {isStock ? (
            <div className="ml-4 sm:ml-6 py-2.5 sm:py-3">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 sm:p-3">
                <p className="text-xs sm:text-sm text-gray-600 mb-1.5 sm:mb-2">
                  このカテゴリは全て純正パーツです
                </p>
                {categoryInfo.subcategories.length > 0 && (
                  <div className="text-xs text-gray-500 mb-2 sm:mb-3">
                    <span className="font-medium">例: </span>
                    {categoryInfo.subcategories.join('、')}
                  </div>
                )}
                {onAdd && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAdd();
                    }}
                    className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
                  >
                    + カスタマイズを登録
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="ml-4 sm:ml-6 space-y-2 sm:space-y-3">
              {parts.map((part, index) => (
                <div key={part.id || index} className="bg-cyan-50 rounded-lg p-2.5 sm:p-3 border border-cyan-200">
                  {/* パーツ名 */}
                  <div className="flex items-start gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <span className="text-cyan-600 mt-0.5 font-bold text-xs sm:text-sm">▸</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-cyan-700 mb-0.5 sm:mb-1 break-words">
                        {part.brand ? `${part.brand} ${part.modelCode || ''}` : part.title}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-700 font-semibold mb-0.5 sm:mb-1 break-words">
                        {part.title}
                      </div>
                    </div>
                  </div>
                  
                  {/* 詳細情報 */}
                  <div className="ml-4 sm:ml-6 space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs text-gray-600">
                    {part.odoKm && (
                      <div>装着時走行距離: <span className="font-semibold text-gray-800">{part.odoKm.toLocaleString()} km</span></div>
                    )}
                    {part.vendorName && (
                      <div>施工: <span className="font-semibold text-gray-800">{part.vendorName}</span></div>
                    )}
                    {(part.partsCostJpy || part.laborCostJpy) && (
                      <div>
                        費用: <span className="font-semibold text-cyan-700">
                          ¥{((part.partsCostJpy || 0) + (part.laborCostJpy || 0)).toLocaleString()}
                        </span>
                        {part.partsCostJpy && part.laborCostJpy && (
                          <span className="text-gray-500"> (部品: ¥{part.partsCostJpy.toLocaleString()} / 工賃: ¥{part.laborCostJpy.toLocaleString()})</span>
                        )}
                      </div>
                    )}
                    {part.memo && (
                      <div className="mt-2 pt-2 border-t border-cyan-200">
                        <span className="text-gray-700">{part.memo}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

