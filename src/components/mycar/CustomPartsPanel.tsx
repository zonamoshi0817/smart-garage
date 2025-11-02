'use client';

import { Customization } from '@/types';
import { useMemo, useState } from 'react';

interface CustomPartsPanelProps {
  customizations: Customization[];
}

export default function CustomPartsPanel({ customizations }: CustomPartsPanelProps) {
  
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
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span>🔧</span>
          <span>カスタムパーツ一覧</span>
          {installedCount > 0 && (
            <span className="text-sm font-normal text-gray-500">
              ({installedCount}件のカスタマイズ)
            </span>
          )}
        </h2>
        {installedCount > 0 && (
          <button
            onClick={() => {
              if (expandedCategories.size > 0) {
                setExpandedCategories(new Set());
              } else {
                setExpandedCategories(new Set(Object.keys(customizationsByCategory)));
              }
            }}
            className="text-sm text-cyan-600 hover:text-cyan-800 font-semibold transition-colors"
          >
            {expandedCategories.size > 0 ? '全て閉じる' : '全て開く'}
          </button>
        )}
      </div>
      
      {/* パーツリスト */}
      {installedCount === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-3">🏭</div>
          <p className="text-base mb-2 font-medium">カスタムパーツなし</p>
          <p className="text-sm text-gray-400">全て純正パーツです</p>
        </div>
      ) : (
        <div className="space-y-1">
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
              />
            );
          })}
        </div>
      )}
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
  onToggle
}: {
  category: string;
  categoryInfo: { name: string; subcategories: string[] };
  parts: Customization[];
  isStock: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      {/* ヘッダー（クリック可能） */}
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center py-3 px-2 hover:bg-gray-50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">{categoryInfo.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {isStock ? (
            <span className="text-sm text-gray-500 italic">純正</span>
          ) : (
            <span className="text-xs bg-cyan-600 text-white px-2 py-0.5 rounded-full font-semibold">
              カスタム {parts.length}
            </span>
          )}
          <svg 
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
        <div className="pb-3 px-2 space-y-2">
          {isStock ? (
            <div className="ml-6 text-sm text-gray-600 py-2">
              このカテゴリは全て純正パーツです
            </div>
          ) : (
            <div className="ml-6 space-y-3">
              {parts.map((part, index) => (
                <div key={part.id || index} className="bg-cyan-50 rounded-lg p-3 border border-cyan-200">
                  {/* パーツ名 */}
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-cyan-600 mt-0.5 font-bold">▸</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-cyan-700 mb-1">
                        {part.brand ? `${part.brand} ${part.modelCode || ''}` : part.title}
                      </div>
                      <div className="text-sm text-gray-700 font-semibold mb-1">
                        {part.title}
                      </div>
                    </div>
                  </div>
                  
                  {/* 詳細情報 */}
                  <div className="ml-6 space-y-1 text-xs text-gray-600">
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

