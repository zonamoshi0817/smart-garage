import React from 'react';

interface SpecificActionButtonsProps {
  onReserve?: () => void;
  onFindWorkshop?: () => void;
  onOnlineReserve?: () => void;
  onBuyOil?: () => void;
  onViewOil?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onBackup?: () => void;
  className?: string;
}

export default function SpecificActionButtons({
  onReserve,
  onFindWorkshop,
  onOnlineReserve,
  onBuyOil,
  onViewOil,
  onExport,
  onShare,
  onBackup,
  className = ""
}: SpecificActionButtonsProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* 予約関連 */}
      {(onReserve || onFindWorkshop || onOnlineReserve) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">予約・工場探し</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {onFindWorkshop && (
              <SpecificButton
                icon="🔍"
                label="近くの工場を探す"
                description="最寄りのメンテナンス工場を検索"
                onClick={onFindWorkshop}
                variant="primary"
              />
            )}
            {onOnlineReserve && (
              <SpecificButton
                icon="🌐"
                label="ネット予約へ"
                description="オンラインで予約手続き"
                onClick={onOnlineReserve}
                variant="secondary"
                external={true}
              />
            )}
            {onReserve && (
              <SpecificButton
                icon="📅"
                label="予約する"
                description="工場に直接予約"
                onClick={onReserve}
                variant="secondary"
              />
            )}
          </div>
        </div>
      )}

      {/* オイル関連 */}
      {(onBuyOil || onViewOil) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">オイル・部品</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {onViewOil && (
              <SpecificButton
                icon="🛢️"
                label="適合オイルを見る"
                description="グレード・粘度をサブ表示"
                onClick={onViewOil}
                variant="primary"
              />
            )}
            {onBuyOil && (
              <SpecificButton
                icon="🛒"
                label="オイルを買う"
                description="オンラインショップへ"
                onClick={onBuyOil}
                variant="secondary"
                external={true}
              />
            )}
          </div>
        </div>
      )}

      {/* データ管理 */}
      {(onExport || onShare || onBackup) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">データ管理</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {onExport && (
              <SpecificButton
                icon="📊"
                label="データをエクスポート"
                description="CSV/Excel形式でダウンロード"
                onClick={onExport}
                variant="secondary"
              />
            )}
            {onShare && (
              <SpecificButton
                icon="🔗"
                label="共有リンクを生成"
                description="安全なリンクでデータ共有"
                onClick={onShare}
                variant="secondary"
              />
            )}
            {onBackup && (
              <SpecificButton
                icon="💾"
                label="バックアップを作成"
                description="データの安全な保存"
                onClick={onBackup}
                variant="secondary"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface SpecificButtonProps {
  icon: string;
  label: string;
  description: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  external?: boolean;
  disabled?: boolean;
}

function SpecificButton({
  icon,
  label,
  description,
  onClick,
  variant = 'primary',
  external = false,
  disabled = false
}: SpecificButtonProps) {
  const baseClasses = "w-full p-3 rounded-lg border text-left transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";
  
  const variantClasses = variant === 'primary' 
    ? "bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-900" 
    : "bg-white border-gray-200 hover:bg-gray-50 text-gray-900";
  
  const disabledClasses = disabled 
    ? "opacity-50 cursor-not-allowed hover:shadow-none" 
    : "";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${disabledClasses}`}
    >
      <div className="flex items-start space-x-3">
        <span className="text-lg flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-1">
            <span className="font-medium text-sm">{label}</span>
            {external && (
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-1">{description}</p>
        </div>
      </div>
    </button>
  );
}

// オイル適合性表示コンポーネント
interface OilCompatibilityProps {
  carModel: string;
  recommendedOil: {
    grade: string;
    viscosity: string;
    brand?: string;
    capacity: number;
  };
  onBuyOil?: () => void;
  className?: string;
}

export function OilCompatibility({
  carModel,
  recommendedOil,
  onBuyOil,
  className = ""
}: OilCompatibilityProps) {
  return (
    <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900 mb-1">推奨オイル</h4>
          <p className="text-sm text-gray-600">{carModel}</p>
        </div>
        <span className="text-2xl">🛢️</span>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">グレード</div>
          <div className="font-medium text-gray-900">{recommendedOil.grade}</div>
        </div>
        <div className="bg-white rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">粘度</div>
          <div className="font-medium text-gray-900">{recommendedOil.viscosity}</div>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
        <span>容量: {recommendedOil.capacity}L</span>
        {recommendedOil.brand && <span>{recommendedOil.brand}</span>}
      </div>
      
      {onBuyOil && (
        <button
          onClick={onBuyOil}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          適合オイルを購入
        </button>
      )}
    </div>
  );
}

// 工場検索結果コンポーネント
interface WorkshopSearchResultProps {
  workshops: {
    name: string;
    distance: number;
    rating: number;
    services: string[];
    phone?: string;
    onReserve: () => void;
  }[];
  className?: string;
}

export function WorkshopSearchResult({
  workshops,
  className = ""
}: WorkshopSearchResultProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <h4 className="text-sm font-medium text-gray-700">近くの工場</h4>
      {workshops.map((workshop, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h5 className="font-medium text-gray-900">{workshop.name}</h5>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>📍 {workshop.distance}km</span>
                <span>⭐ {workshop.rating}</span>
                {workshop.phone && <span>📞 {workshop.phone}</span>}
              </div>
            </div>
            <button
              onClick={workshop.onReserve}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              予約
            </button>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {workshop.services.map((service, serviceIndex) => (
              <span
                key={serviceIndex}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                {service}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

