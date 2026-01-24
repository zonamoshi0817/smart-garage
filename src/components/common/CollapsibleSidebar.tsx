"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Car, 
  Fuel, 
  Wrench, 
  Sparkles, 
  Share2, 
  Car as CarManagement, 
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from "lucide-react";

const SIDEBAR_COLLAPSED_KEY = "sidebar_collapsed";

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isCollapsed: boolean;
  isActive?: boolean;
  onClick?: () => void;
}

function SidebarLink({ href, icon, label, isCollapsed, isActive, onClick }: SidebarLinkProps) {
  const pathname = usePathname();
  const active = isActive !== undefined ? isActive : pathname === href;
  
  const content = (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition ${
        active ? "bg-blue-600 text-white font-semibold" : "hover:bg-gray-100 text-gray-700"
      } ${isCollapsed ? "justify-center" : ""}`}
      title={isCollapsed ? label : undefined}
    >
      <div className="flex-shrink-0">{icon}</div>
      {!isCollapsed && <span className="text-[15px]">{label}</span>}
    </div>
  );

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    }
  };
  
  return (
    <Link 
      href={href} 
      className="block w-full text-left"
      onClick={handleClick}
    >
      {content}
    </Link>
  );
}

interface CollapsibleSidebarProps {
  activeCarId?: string;
  currentUser?: {
    photoURL?: string | null;
    displayName?: string | null;
    email?: string | null;
  } | null;
  userPlan?: string;
  isPremiumPlan?: (plan: string | undefined) => boolean;
  onHomeClick?: () => void;
  isHomeActive?: boolean;
}

export function CollapsibleSidebar({
  activeCarId,
  currentUser,
  userPlan,
  isPremiumPlan,
  onHomeClick,
  isHomeActive,
}: CollapsibleSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // localStorageから折りたたみ状態を読み込む（デスクトップのみ）
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved !== null && window.innerWidth >= 1024) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newState));
    // カスタムイベントを発火して他のコンポーネントに通知
    window.dispatchEvent(new Event("sidebarCollapseChange"));
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // サイドバーコンテンツ（デスクトップとモバイルドロワーで共通）
  const sidebarContent = (
    <>
      {/* ユーザー情報カード */}
      <div className={`bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
        {currentUser?.photoURL ? (
          <img 
            src={currentUser.photoURL} 
            alt={currentUser.displayName || currentUser.email || 'User'} 
            className="h-8 w-8 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className={`h-8 w-8 rounded-full grid place-items-center font-semibold text-sm flex-shrink-0 ${
            isPremiumPlan?.(userPlan) ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' : 'bg-blue-100 text-blue-600'
          }`}>
            {currentUser?.displayName?.[0] || currentUser?.email?.[0]?.toUpperCase() || 'U'}
          </div>
        )}
        {!isCollapsed && (
          <div className="text-sm min-w-0">
            <div className="font-semibold truncate">
              {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'ユーザー'}
            </div>
            <div className={`text-xs ${isPremiumPlan?.(userPlan) ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
              {isPremiumPlan?.(userPlan) ? '✨ Premium プラン' : 'Free プラン'}
            </div>
          </div>
        )}
      </div>

      {/* 折りたたみトグルボタン（デスクトップのみ） */}
      <button
        onClick={toggleCollapse}
        className="hidden lg:block mt-2 w-full bg-white rounded-2xl border border-gray-200 p-2 flex items-center justify-center hover:bg-gray-50 transition-colors"
        aria-label={isCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-5 w-5 text-gray-600" />
        ) : (
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        )}
      </button>

      {/* ナビゲーションメニュー */}
      <nav className={`mt-4 bg-white rounded-2xl border border-gray-200 p-2 space-y-1 text-[15px] ${isCollapsed ? "px-2" : ""}`}>
        <SidebarLink
          href="/home"
          icon={<Home className="h-5 w-5" />}
          label="ホーム"
          isCollapsed={isCollapsed}
          isActive={isHomeActive}
          onClick={() => {
            if (onHomeClick) onHomeClick();
            setIsMobileMenuOpen(false);
          }}
        />
        <SidebarLink
          href="/mycar"
          icon={<Car className="h-5 w-5" />}
          label="マイカー"
          isCollapsed={isCollapsed}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <SidebarLink
          href="/gas"
          icon={<Fuel className="h-5 w-5" />}
          label="ガソリン"
          isCollapsed={isCollapsed}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <SidebarLink
          href="/maintenance"
          icon={<Wrench className="h-5 w-5" />}
          label="メンテナンス"
          isCollapsed={isCollapsed}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <SidebarLink
          href="/customizations"
          icon={<Sparkles className="h-5 w-5" />}
          label="カスタマイズ"
          isCollapsed={isCollapsed}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <SidebarLink
          href="/share"
          icon={<Share2 className="h-5 w-5" />}
          label="共有"
          isCollapsed={isCollapsed}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <SidebarLink
          href="/cars"
          icon={<CarManagement className="h-5 w-5" />}
          label="車両管理"
          isCollapsed={isCollapsed}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        {pathname === '/data' ? (
          <div className={`flex items-center gap-3 px-3 py-2 rounded-xl bg-blue-600 text-white font-semibold ${isCollapsed ? "justify-center" : ""}`}>
            <BarChart3 className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-[15px]">データ</span>}
          </div>
        ) : (
          <Link
            href="/data"
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition hover:bg-gray-100 text-gray-700 cursor-not-allowed ${isCollapsed ? "justify-center" : ""}`}
            title={isCollapsed ? "データ" : undefined}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <BarChart3 className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-[15px]">データ</span>}
          </Link>
        )}
      </nav>

      {/* 設定リンク */}
      <div className={`mt-4 bg-white rounded-2xl border border-gray-200 p-2 ${isCollapsed ? "px-2" : ""}`}>
        <Link
          href="/settings/account"
          className={`flex items-center gap-2 px-3 py-2 text-[15px] text-gray-700 hover:bg-gray-50 rounded-lg transition-colors ${isCollapsed ? "justify-center" : ""}`}
          title={isCollapsed ? "アカウント設定" : undefined}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span>アカウント設定</span>}
        </Link>
      </div>

      {/* プレミアムアップグレード（無料ユーザーのみ表示、折りたたみ時は非表示） */}
      {!isPremiumPlan?.(userPlan) && !isCollapsed && (
        <div className="mt-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl border border-yellow-300 p-4 text-white">
          <div className="text-sm font-semibold mb-1">✨ Premium プラン</div>
          <div className="text-xs opacity-90 mb-3">より多くの機能を利用できます</div>
          <Link
            href="/settings/account"
            className="block w-full text-center px-4 py-2 bg-white text-orange-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            アップグレード
          </Link>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* モバイル: ハンバーガーメニューボタン */}
      <button
        onClick={toggleMobileMenu}
        className="lg:hidden fixed top-20 left-4 z-50 bg-white rounded-xl border border-gray-200 p-2 shadow-lg hover:bg-gray-50 transition-colors"
        aria-label="メニューを開く"
      >
        <Menu className="h-6 w-6 text-gray-700" />
      </button>

      {/* モバイル: ドロワーメニュー */}
      {isMobileMenuOpen && (
        <>
          {/* オーバーレイ */}
          <div
            className="lg:hidden fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
            onClick={toggleMobileMenu}
          />
          {/* ドロワー */}
          <aside className="lg:hidden fixed top-0 left-0 h-full w-72 bg-white overflow-y-auto z-50 shadow-2xl animate-slide-in-left">
            <div className="p-4 space-y-4">
              {/* ヘッダー */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">メニュー</h2>
                <button
                  onClick={toggleMobileMenu}
                  className="bg-gray-100 rounded-lg p-2 hover:bg-gray-200 transition-colors"
                  aria-label="メニューを閉じる"
                >
                  <X className="h-5 w-5 text-gray-700" />
                </button>
              </div>
              
              {/* ユーザー情報カード */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
                {currentUser?.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt={currentUser.displayName || currentUser.email || 'User'} 
                    className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className={`h-10 w-10 rounded-full grid place-items-center font-semibold text-base flex-shrink-0 ${
                    isPremiumPlan?.(userPlan) ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {currentUser?.displayName?.[0] || currentUser?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="text-sm min-w-0 flex-1">
                  <div className="font-semibold truncate text-gray-900">
                    {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'ユーザー'}
                  </div>
                  <div className={`text-xs ${isPremiumPlan?.(userPlan) ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                    {isPremiumPlan?.(userPlan) ? '✨ Premium プラン' : 'Free プラン'}
                  </div>
                </div>
              </div>

              {/* ナビゲーションメニュー */}
              <nav className="bg-white rounded-2xl border border-gray-200 p-2 space-y-1">
                <SidebarLink
                  href="/home"
                  icon={<Home className="h-5 w-5" />}
                  label="ホーム"
                  isCollapsed={false}
                  isActive={isHomeActive}
                  onClick={() => {
                    if (onHomeClick) onHomeClick();
                    setIsMobileMenuOpen(false);
                  }}
                />
                <SidebarLink
                  href="/mycar"
                  icon={<Car className="h-5 w-5" />}
                  label="マイカー"
                  isCollapsed={false}
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                <SidebarLink
                  href="/gas"
                  icon={<Fuel className="h-5 w-5" />}
                  label="ガソリン"
                  isCollapsed={false}
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                <SidebarLink
                  href="/maintenance"
                  icon={<Wrench className="h-5 w-5" />}
                  label="メンテナンス"
                  isCollapsed={false}
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                <SidebarLink
                  href="/customizations"
                  icon={<Sparkles className="h-5 w-5" />}
                  label="カスタマイズ"
                  isCollapsed={false}
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                <SidebarLink
                  href="/share"
                  icon={<Share2 className="h-5 w-5" />}
                  label="共有"
                  isCollapsed={false}
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                <SidebarLink
                  href="/cars"
                  icon={<CarManagement className="h-5 w-5" />}
                  label="車両管理"
                  isCollapsed={false}
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                {pathname === '/data' ? (
                  <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-blue-600 text-white font-semibold">
                    <BarChart3 className="h-5 w-5 flex-shrink-0" />
                    <span className="text-[15px]">データ</span>
                  </div>
                ) : (
                  <Link
                    href="/data"
                    className="flex items-center gap-3 px-3 py-2 rounded-xl transition hover:bg-gray-100 text-gray-700 cursor-not-allowed"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <BarChart3 className="h-5 w-5 flex-shrink-0" />
                    <span className="text-[15px]">データ</span>
                  </Link>
                )}
              </nav>

              {/* 設定リンク */}
              <div className="bg-white rounded-2xl border border-gray-200 p-2">
                <Link
                  href="/settings/account"
                  className="flex items-center gap-2 px-3 py-2 text-[15px] text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Settings className="h-5 w-5 flex-shrink-0" />
                  <span>アカウント設定</span>
                </Link>
              </div>

              {/* プレミアムアップグレード（無料ユーザーのみ表示） */}
              {!isPremiumPlan?.(userPlan) && (
                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl border border-yellow-300 p-4 text-white">
                  <div className="text-sm font-semibold mb-1">✨ Premium プラン</div>
                  <div className="text-xs opacity-90 mb-3">より多くの機能を利用できます</div>
                  <Link
                    href="/settings/account"
                    className="block w-full text-center px-4 py-2 bg-white text-orange-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    アップグレード
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      {/* デスクトップ: 通常のサイドバー */}
      <aside className="hidden lg:block lg:sticky lg:top-20 h-fit transition-all duration-300">
        {sidebarContent}
      </aside>
    </>
  );
}
