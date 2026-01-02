"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import { watchCars, addCar, updateCar } from "@/lib/cars";
import { watchMaintenanceRecords } from "@/lib/maintenance";
import { watchFuelLogs } from "@/lib/fuelLogs";
import { getCustomizations } from "@/lib/customizations";
import { auth, watchAuth } from "@/lib/firebase";
import { toDate } from "@/lib/dateUtils";
import { isPremiumPlan } from "@/lib/plan";
import { usePremiumGuard } from "@/hooks/usePremium";
import type { Car, MaintenanceRecord, Customization, User, FuelLog } from "@/types";
import MyCarPage from "@/components/mycar/MyCarPage";
import AddCarModal from "@/components/modals/AddCarModal";
import FuelLogModal from "@/components/modals/FuelLogModal";
import MaintenanceModal from "@/components/modals/MaintenanceModal";
import CustomizationModal from "@/components/modals/CustomizationModal";
import CarModal from "@/components/modals/CarModal";
import OCRModal from "@/components/modals/OCRModal";

// ヘッダー用車両ドロップダウン（share/page.tsxと同じ）
function CarHeaderDropdown({
  cars,
  activeCarId,
  onSelectCar,
  onAddCar
}: {
  cars: Car[];
  activeCarId?: string;
  onSelectCar: (id: string) => void;
  onAddCar: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  const handleImageError = (carId: string) => {
    setImageErrors(prev => new Set(prev).add(carId));
  };

  const activeCar = cars.find(c => c.id === activeCarId) || cars[0];

  return (
    <div className="relative flex-shrink-0" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-9 sm:h-10 px-2 sm:px-3 rounded-lg border border-gray-300 bg-white flex items-center gap-1.5 sm:gap-2 shadow-sm hover:bg-gray-50 min-w-0"
      >
        {activeCar && (
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200">
            {activeCar.imagePath && !imageErrors.has(activeCar.id!) ? (
              <img
                src={activeCar.imagePath}
                alt={activeCar.name}
                className="w-full h-full object-cover"
                onError={() => handleImageError(activeCar.id!)}
              />
            ) : (
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
        )}
        <span className="truncate max-w-[120px] sm:max-w-[180px] lg:max-w-[200px] text-xs sm:text-sm font-medium text-gray-900">
          {activeCar?.name}
          {activeCar?.modelCode && !isMobile ? ` (${activeCar.modelCode})` : ''}
        </span>
        <svg 
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div 
            className="fixed inset-0 z-30" 
            onClick={() => setOpen(false)}
          />
          <div className="fixed sm:absolute z-40 top-[3.5rem] sm:top-full right-2 sm:right-0 left-2 sm:left-auto mt-0 sm:mt-2 w-[calc(100vw-1rem)] sm:w-80 max-w-[calc(100vw-1rem)] sm:max-w-[320px] bg-white rounded-lg border border-gray-200 shadow-xl">
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900">車両を選択</h3>
                <span className="text-xs text-gray-500">{cars.length}台</span>
              </div>
            </div>
            
            <div className="max-h-80 overflow-auto py-1 sm:py-2">
            {cars.map((car) => (
              <button
                key={car.id}
                onClick={() => {
                  onSelectCar(car.id!);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 ${
                  car.id === activeCarId ? 'bg-gray-50' : ''
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 bg-gray-50">
                    {car.imagePath && !imageErrors.has(car.id!) ? (
                      <img
                        src={car.imagePath}
                        alt={car.name}
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(car.id!)}
                      />
                    ) : (
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium text-gray-900 truncate">
                        {car.name}
                      </div>
                      {car.id === activeCarId && (
                        <svg className="w-4 h-4 text-gray-900 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {car.modelCode && (
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded">
                          {car.modelCode}
                        </span>
                      )}
                      {car.year && <span>{car.year}年式</span>}
                      {car.odoKm && <span>• {car.odoKm.toLocaleString()}km</span>}
                    </div>
                  </div>
                </div>
              </button>
            ))}
            </div>
            
            <div className="px-3 sm:px-4 py-2 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => { 
                  setOpen(false); 
                  onAddCar(); 
                }}
                className="w-full text-left px-3 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                車両を追加
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ナビゲーションアイテム
function NavItem({ 
  label, 
  active = false, 
  onClick,
  href
}: { 
  label: string; 
  active?: boolean; 
  onClick?: () => void;
  href?: string;
}) {
  if (href) {
    return (
      <Link
        href={href}
        className={
          "w-full text-left px-3 py-2 rounded-xl transition block " +
          (active ? "bg-blue-600 text-white font-semibold" : "hover:bg-gray-100 text-gray-700")
        }
      >
        {label}
      </Link>
    );
  }
  return (
    <button
      onClick={onClick}
      className={
        "w-full text-left px-3 py-2 rounded-xl transition " +
        (active ? "bg-blue-600 text-white font-semibold" : "hover:bg-gray-100 text-gray-700")
      }
    >
      {label}
    </button>
  );
}

// URLベースのマイカーナビゲーションリンク
function MyCarNavLink() {
  const pathname = usePathname();
  const isActive = pathname === '/mycar';
  
  return (
    <Link
      href="/mycar"
      className={
        "w-full text-left px-3 py-2 rounded-xl transition block " +
        (isActive ? "bg-blue-600 text-white font-semibold" : "hover:bg-gray-100 text-gray-700")
      }
    >
      マイカー
    </Link>
  );
}

// URLベースの共有ナビゲーションリンク
function ShareNavLink() {
  const pathname = usePathname();
  const isActive = pathname === '/share';
  
  return (
    <Link
      href="/share"
      className={
        "w-full text-left px-3 py-2 rounded-xl transition block " +
        (isActive ? "bg-blue-600 text-white font-semibold" : "hover:bg-gray-100 text-gray-700")
      }
    >
      共有
    </Link>
  );
}

export default function MyCarPageRoute() {
  const router = useRouter();
  const pathname = usePathname();
  const [cars, setCars] = useState<Car[]>([]);
  const [activeCarId, setActiveCarId] = useState<string | undefined>(undefined);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [customizations, setCustomizations] = useState<Customization[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAddCarModal, setShowAddCarModal] = useState(false);
  const [showFuelLogModal, setShowFuelLogModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceTemplate, setMaintenanceTemplate] = useState<string | null>(null);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [showEditCarModal, setShowEditCarModal] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [authTrigger, setAuthTrigger] = useState(0);

  // プレミアムガード
  const { userPlan } = usePremiumGuard();

  // 認証状態を監視
  useEffect(() => {
    const unsubscribe = watchAuth((user) => {
      setCurrentUser(user);
      
      if (user) {
        setCars([]);
        setActiveCarId(undefined);
        setMaintenanceRecords([]);
        setFuelLogs([]);
        setAuthTrigger(prev => prev + 1);
      } else {
        setCars([]);
        setActiveCarId(undefined);
        setMaintenanceRecords([]);
        setFuelLogs([]);
        setAuthTrigger(0);
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  // 車両リストが変更されたときに自動選択
  useEffect(() => {
    if (cars.length === 0) {
      return;
    }

    const activeCarsList = cars.filter((c) => !c.status || c.status === 'active');
    
    if (activeCarsList.length === 0) {
      return;
    }

    const currentCarExists = activeCarId ? activeCarsList.some(car => car.id === activeCarId) : false;
    
    if (!activeCarId || !currentCarExists) {
      setActiveCarId(activeCarsList[0].id);
    }
  }, [cars, activeCarId]);

  // 車両データの取得
  useEffect(() => {
    if (!auth.currentUser) {
      return;
    }
    
    try {
      const off = watchCars((list) => {
        if (list.length > 0) {
          setCars(list);
          
          const currentCarExists = activeCarId ? list.some(car => car.id === activeCarId) : false;
          if (!activeCarId || !currentCarExists) {
            setActiveCarId(list[0].id);
          }
        } else {
          setCars([]);
        }
      });
      return () => {
        off && off();
      };
    } catch (error) {
      console.error("Error watching cars:", error);
      setCars([]);
    }
  }, [auth.currentUser, activeCarId, authTrigger]);

  // メンテナンス記録を取得
  useEffect(() => {
    if (!auth.currentUser || !activeCarId) {
      setMaintenanceRecords([]);
      return;
    }
    
    try {
      const off = watchMaintenanceRecords(activeCarId, (records) => {
        setMaintenanceRecords(records);
      });
      return () => {
        off && off();
      };
    } catch (error) {
      console.error("Error watching maintenance records:", error);
      setMaintenanceRecords([]);
    }
  }, [auth.currentUser, activeCarId, authTrigger]);

  // 給油ログの取得
  useEffect(() => {
    if (!auth.currentUser || !activeCarId) {
      setFuelLogs([]);
      return;
    }

    try {
      const off = watchFuelLogs(activeCarId, (logs) => {
        setFuelLogs(logs);
      });
      return () => {
        off && off();
      };
    } catch (error) {
      console.error("Error watching fuel logs:", error);
      setFuelLogs([]);
    }
  }, [auth.currentUser, activeCarId, authTrigger]);

  // カスタマイズ記録を取得
  useEffect(() => {
    if (!activeCarId || !auth.currentUser) {
      setCustomizations([]);
      setLoading(false);
      return;
    }
    getCustomizations(auth.currentUser.uid, activeCarId)
      .then((list) => {
        setCustomizations(list);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load customizations:", error);
        setCustomizations([]);
        setLoading(false);
      });
  }, [activeCarId, authTrigger]);

  // 現在保有中の車両のみ
  const activeCars = useMemo(
    () => cars.filter((c) => !c.status || c.status === 'active'),
    [cars]
  );

  const car = useMemo(() => {
    return cars.find((c) => c.id === activeCarId);
  }, [cars, activeCarId]);

  if (loading) {
    return (
      <AuthGate>
        <div className="min-h-screen bg-gray-50 text-gray-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="rounded-xl border border-gray-200 p-6 text-gray-600 bg-white">読み込み中...</div>
          </div>
        </div>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        {/* ヘッダー */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
            <button
              onClick={() => router.push('/home')}
              className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink hover:opacity-80 transition-opacity"
            >
              <img src="/icon.png" alt="garage log" className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg shadow-sm ring-1 ring-black/5 flex-shrink-0" />
              <span className="text-lg sm:text-xl lg:text-2xl font-semibold tracking-tight text-gray-900 truncate">garage log</span>
            </button>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {activeCars.length > 0 && (
                <div className="relative">
                  <CarHeaderDropdown 
                    cars={activeCars}
                    activeCarId={activeCarId}
                    onSelectCar={(id) => setActiveCarId(id)}
                    onAddCar={() => setShowAddCarModal(true)}
                  />
                </div>
              )}
              <button
                onClick={() => {
                  if (confirm('ログアウトしますか？')) {
                    auth.signOut();
                  }
                }}
                className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors whitespace-nowrap"
              >
                ログアウト
              </button>
            </div>
          </div>
        </header>

        {/* 軽量アラート（車検期限など） */}
        {(() => {
          const alerts: Array<React.ReactNode> = [];
          if (car?.inspectionExpiry) {
            const expiryDate = toDate(car.inspectionExpiry) || new Date();
            const today = new Date();
            const diffMs = expiryDate.getTime() - today.getTime();
            const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            if (days < 0) {
              alerts.push(
                <div key="inspection-overdue" className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                  <div className="text-sm text-red-800">
                    車検期限が過ぎています（{Math.abs(days)}日前）。早めに更新手続きを行ってください。
                  </div>
                  <Link
                    href="/home"
                    className="text-xs px-2 py-1 rounded-md bg-white border border-red-200 text-red-700 hover:bg-red-100"
                  >
                    対応する
                  </Link>
                </div>
              );
            } else if (days <= 60) {
              alerts.push(
                <div key="inspection-soon" className="flex items-center justify-between rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2">
                  <div className="text-sm text-yellow-900">
                    車検期限まで残り {days}日です。点検や準備を進めましょう。
                  </div>
                  <Link
                    href="/home"
                    className="text-xs px-2 py-1 rounded-md bg-white border border-yellow-200 text-yellow-800 hover:bg-yellow-100"
                  >
                    対応する
                  </Link>
                </div>
              );
            }
          }
          if (alerts.length === 0) return null;
          return (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-3">
              <div className="space-y-2">{alerts}</div>
            </div>
          );
        })()}

        {/* レイアウト */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
          {/* サイドバー */}
          <aside className="lg:sticky lg:top-20 h-fit">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
              {currentUser?.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt={currentUser.displayName || currentUser.email || 'User'} 
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className={`h-8 w-8 rounded-full grid place-items-center font-semibold text-sm ${
                  isPremiumPlan(userPlan) ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' : 'bg-blue-100 text-blue-600'
                }`}>
                  {currentUser?.displayName?.[0] || currentUser?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="text-sm">
                <div className="font-semibold">
                  {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'ユーザー'}
                </div>
                <div className={`text-xs ${isPremiumPlan(userPlan) ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                  {isPremiumPlan(userPlan) ? '✨ Premium プラン' : 'Free プラン'}
                </div>
              </div>
            </div>

            <nav className="mt-4 bg-white rounded-2xl border border-gray-200 p-2 space-y-1 text-[15px]">
              <NavItem 
                label="ホーム" 
                active={false}
                href="/home"
              />
              <MyCarNavLink />
              <NavItem 
                label="ガソリン" 
                active={false}
                href="/home"
              />
              <NavItem 
                label="メンテナンス" 
                active={false}
                href="/home"
              />
              <NavItem 
                label="カスタマイズ" 
                active={false}
                href="/home"
              />
              <ShareNavLink />
              <NavItem 
                label="車両管理" 
                active={false}
                href="/home"
              />
              <NavItem 
                label="データ" 
                active={false}
                href="/home"
              />
            </nav>

            {/* 設定リンク */}
            <div className="mt-4 bg-white rounded-2xl border border-gray-200 p-2">
              <a
                href="/settings/account"
                className="flex items-center gap-2 px-3 py-2 text-[15px] text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                アカウント設定
              </a>
            </div>

            {/* プレミアムアップグレード（無料ユーザーのみ表示） */}
            {!isPremiumPlan(userPlan) && (
              <div className="mt-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl border border-yellow-300 p-4 text-white">
                <div className="text-sm font-semibold mb-1">✨ Premium プラン</div>
                <div className="text-xs opacity-90 mb-3">より多くの機能を利用できます</div>
                <Link
                  href="/settings/account"
                  className="block w-full text-center px-4 py-2 bg-white text-orange-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  アップグレード
                </Link>
              </div>
            )}
          </aside>

          {/* メインコンテンツ */}
          <main>
            {car ? (
              <MyCarPage
                car={car}
                maintenanceRecords={maintenanceRecords}
                fuelLogs={fuelLogs}
                customizations={customizations}
                readOnly={car.status === 'sold' || car.status === 'scrapped' || car.status === 'downgraded_premium'}
                onOpenModal={(modalType, data) => {
                  switch (modalType) {
                    case 'fuel':
                      setShowFuelLogModal(true);
                      break;
                    case 'maintenance':
                      setMaintenanceTemplate(data?.template || null);
                      setShowMaintenanceModal(true);
                      break;
                    case 'customization':
                      setShowCustomizationModal(true);
                      break;
                    case 'change-car-image':
                      setShowEditCarModal(true);
                      setEditingCar(car);
                      break;
                    case 'edit-car':
                      setShowEditCarModal(true);
                      setEditingCar(car);
                      break;
                    case 'ocr':
                      setShowOCRModal(true);
                      break;
                    default:
                      console.log('Modal not implemented:', modalType, data);
                  }
                }}
              />
            ) : activeCars.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                <p className="text-gray-500 mb-4">現在保有中の車両がありません</p>
                <button
                  onClick={() => setShowAddCarModal(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  車両を追加
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                <p className="text-gray-500 mb-4">車両を選択してください</p>
                <p className="text-xs text-gray-400 mb-4">右上のドロップダウンから車両を選択できます</p>
                <button
                  onClick={() => setShowAddCarModal(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  車両を追加
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* モーダル */}
      {showAddCarModal && (
        <AddCarModal
          onClose={() => setShowAddCarModal(false)}
          onAdded={async (carData) => {
            try {
              const newCar = await addCar(carData);
              setShowAddCarModal(false);
              if (newCar?.id) {
                setActiveCarId(newCar.id);
              }
            } catch (error) {
              console.error("Failed to add car:", error);
              alert("車両の追加に失敗しました");
            }
          }}
        />
      )}

      {car && (
        <>
          {showFuelLogModal && (
            <FuelLogModal
              isOpen={showFuelLogModal}
              onClose={() => setShowFuelLogModal(false)}
              car={car}
              onSuccess={() => {
                console.log("Fuel log added successfully");
              }}
            />
          )}

          {showMaintenanceModal && (
            <MaintenanceModal
              carId={car.id!}
              carName={car.name}
              currentMileage={car.odoKm}
              initialTitle={maintenanceTemplate || undefined}
              onClose={() => {
                setShowMaintenanceModal(false);
                setMaintenanceTemplate(null);
              }}
              onAdded={() => {
                setShowMaintenanceModal(false);
                setMaintenanceTemplate(null);
              }}
            />
          )}

          {showCustomizationModal && (
            <CustomizationModal
              isOpen={showCustomizationModal}
              onClose={() => setShowCustomizationModal(false)}
              carId={car.id!}
              carName={car.name}
            />
          )}

          {showEditCarModal && editingCar && (
            <CarModal
              isOpen={showEditCarModal}
              onClose={() => {
                setShowEditCarModal(false);
                setEditingCar(null);
              }}
              onSave={async (carData) => {
                if (!editingCar?.id) return;
                try {
                  await updateCar(editingCar.id, carData);
                  setShowEditCarModal(false);
                  setEditingCar(null);
                  // データを再取得
                  setAuthTrigger(prev => prev + 1);
                } catch (error) {
                  console.error("Failed to update car:", error);
                  alert("車両の更新に失敗しました");
                }
              }}
              editingCar={editingCar}
              title="車両情報を編集"
            />
          )}

          {showOCRModal && (
            <OCRModal
              isOpen={showOCRModal}
              onClose={() => setShowOCRModal(false)}
              carId={car.id!}
              carName={car.name}
            />
          )}
        </>
      )}
    </AuthGate>
  );
}
