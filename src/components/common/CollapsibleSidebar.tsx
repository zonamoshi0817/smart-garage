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
import PaywallModal from "@/components/modals/PaywallModal";

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
      className={`flex items-center gap-3 px-3 py-2 transition ${
        active ? "font-semibold" : "hover:bg-[#e8e6e0] text-[#6a6a60]"
      } ${isCollapsed ? "justify-center" : ""}`}
      style={active ? { background: '#1a1a18', color: '#f7f5f0' } : {}}
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
  const [showPaywall, setShowPaywall] = useState(false);
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
      <div className={`p-4 flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`} style={{ background: "#ffffff", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: "8px" }}>
        {currentUser?.photoURL ? (
          <img 
            src={currentUser.photoURL} 
            alt={currentUser.displayName || currentUser.email || 'User'} 
            className="h-8 w-8 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className={`h-8 w-8 rounded-full grid place-items-center font-semibold text-sm flex-shrink-0 ${
            isPremiumPlan?.(userPlan) ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' : 'bg-[#e8e6e0] text-[#1a1a18]'
          }`}>
            {currentUser?.displayName?.[0] || currentUser?.email?.[0]?.toUpperCase() || 'U'}
          </div>
        )}
        {!isCollapsed && (
          <div className="text-sm min-w-0">
            <div className="font-semibold truncate">
              {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'ユーザー'}
            </div>
            </div>
        )}
      </div>

      {/* 折りたたみトグルボタン（デスクトップのみ） */}
      <button
        onClick={toggleCollapse}
        className="hidden lg:block mt-2 w-full p-2 flex items-center justify-center transition-colors" style={{ background: "#ffffff", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: "8px" }} onMouseEnter={(e) => (e.currentTarget.style.background = "#f2f0eb")} onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
        aria-label={isCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-5 w-5" style={{ color: "#6a6a60" }} />
        ) : (
          <ChevronLeft className="h-5 w-5" style={{ color: "#6a6a60" }} />
        )}
      </button>

      {/* ナビゲーションメニュー */}
      <nav className={`mt-4 p-2 space-y-1 text-[15px] ${isCollapsed ? "px-2" : ""}`} style={{ background: "#ffffff", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: "8px" }}>
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
          <div className={`flex items-center gap-3 px-3 py-2 font-semibold ${isCollapsed ? "justify-center" : ""}`} style={{ background: "#1a1a18", color: "#f7f5f0" }}>
            <BarChart3 className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-[15px]">データ</span>}
          </div>
        ) : (
          <Link
            href="/data"
            className={`flex items-center gap-3 px-3 py-2 transition hover:bg-[#e8e6e0] text-[#6a6a60] cursor-not-allowed ${isCollapsed ? "justify-center" : ""}`}
            title={isCollapsed ? "データ" : undefined}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <BarChart3 className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-[15px]">データ</span>}
          </Link>
        )}
      </nav>

      {/* 設定リンク */}
      <div className={`mt-4 p-2 ${isCollapsed ? "px-2" : ""}`} style={{ background: "#ffffff", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: "8px" }}>
        <Link
          href="/settings/account"
          className={`flex items-center gap-2 px-3 py-2 text-[15px] hover:bg-[#e8e6e0] transition-colors ${isCollapsed ? "justify-center" : ""}`} style={{ color: "#6a6a60" }}
          title={isCollapsed ? "アカウント設定" : undefined}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span>アカウント設定</span>}
        </Link>
      </div>

    </>
  );

  return (
    <>
      {/* モバイル: ハンバーガーメニューボタン */}
      <button
        onClick={toggleMobileMenu}
        className="lg:hidden fixed top-20 left-4 z-50 p-2 shadow-lg transition-colors" style={{ background: "#f7f5f0", border: "0.5px solid rgba(0,0,0,0.15)", borderRadius: "6px" }}
        aria-label="メニューを開く"
      >
        <Menu className="h-6 w-6" style={{ color: "#1a1a18" }} />
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
          <aside className="lg:hidden fixed top-0 left-0 h-full w-72 overflow-y-auto z-50 shadow-2xl animate-slide-in-left" style={{ background: "#f7f5f0" }}>
            <div className="p-4 space-y-4">
              {/* ヘッダー */}
              <div className="flex items-center justify-between mb-6 pb-4" style={{ borderBottom: "0.5px solid rgba(0,0,0,0.1)" }}>
                <h2 className="text-sm" style={{ fontFamily: "Space Mono, monospace", letterSpacing: "0.1em", color: "#1a1a18" }}>メニュー</h2>
                <button
                  onClick={toggleMobileMenu}
                  className="p-2 transition-colors" style={{ background: "rgba(0,0,0,0.06)", borderRadius: "4px" }}
                  aria-label="メニューを閉じる"
                >
                  <X className="h-5 w-5" style={{ color: "#1a1a18" }} />
                </button>
              </div>
              
              {/* ユーザー情報カード */}
              <div className="p-4 flex items-center gap-3" style={{ background: "#ffffff", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: "8px" }}>
                {currentUser?.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt={currentUser.displayName || currentUser.email || 'User'} 
                    className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className={`h-10 w-10 rounded-full grid place-items-center font-semibold text-base flex-shrink-0 ${
                    isPremiumPlan?.(userPlan) ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' : 'bg-[#e8e6e0] text-[#1a1a18]'
                  }`}>
                    {currentUser?.displayName?.[0] || currentUser?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="text-sm min-w-0 flex-1">
                  <div className="font-semibold truncate" style={{ color: "#1a1a18" }}>
                    {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'ユーザー'}
                  </div>
                </div>
              </div>

              {/* ナビゲーションメニュー */}
              <nav className="p-2 space-y-1" style={{ background: "#ffffff", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: "8px" }}>
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
                  <div className="flex items-center gap-3 px-3 py-2 font-semibold" style={{ background: "#1a1a18", color: "#f7f5f0" }}>
                    <BarChart3 className="h-5 w-5 flex-shrink-0" />
                    <span className="text-[15px]">データ</span>
                  </div>
                ) : (
                  <Link
                    href="/data"
                    className="flex items-center gap-3 px-3 py-2 transition hover:bg-[#e8e6e0] cursor-not-allowed" style={{ color: "#6a6a60" }}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <BarChart3 className="h-5 w-5 flex-shrink-0" />
                    <span className="text-[15px]">データ</span>
                  </Link>
                )}
              </nav>

              {/* 設定リンク */}
              <div className="p-2" style={{ background: "#ffffff", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: "8px" }}>
                <Link
                  href="/settings/account"
                  className="flex items-center gap-2 px-3 py-2 text-[15px] hover:bg-[#e8e6e0] transition-colors" style={{ color: "#6a6a60" }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Settings className="h-5 w-5 flex-shrink-0" />
                  <span>アカウント設定</span>
                </Link>
              </div>

              {/* プレミアムアップグレード（無料ユーザーのみ表示） */}
            </div>
          </aside>
        </>
      )}

      {/* デスクトップ: 通常のサイドバー */}
      <aside className="hidden lg:block lg:sticky lg:top-20 h-fit transition-all duration-300">
        {sidebarContent}
      </aside>

      {/* PaywallModal */}
      {showPaywall && (
        <PaywallModal
          onClose={() => setShowPaywall(false)}
          variant="hero"
        />
      )}
    </>
  );
}
