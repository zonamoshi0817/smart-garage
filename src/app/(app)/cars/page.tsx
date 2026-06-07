"use client";

import "../home/home.css";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import { watchCars, updateCar } from "@/lib/cars";
import { watchAllMaintenanceRecords } from "@/lib/maintenance";
import { watchAllFuelLogs } from "@/lib/fuelLogs";
import { getCustomizations } from "@/lib/customizations";
import { auth, watchAuth } from "@/lib/firebase";
import { toDate, toMillis } from "@/lib/dateUtils";
import { isPremiumPlan } from "@/lib/plan";
import { usePremiumGuard } from "@/hooks/usePremium";
import { useSelectedCar } from "@/contexts/SelectedCarContext";
import type { Car, MaintenanceRecord, Customization, FuelLog } from "@/types";
import type { User } from "firebase/auth";
import AddCarModal from "@/components/modals/AddCarModal";
import { CollapsibleSidebar } from "@/components/common/CollapsibleSidebar";
import { SidebarLayout } from "@/components/common/SidebarLayout";
import SellCarModal from "@/components/modals/SellCarModal";
import CarModal from "@/components/modals/CarModal";
import FuelLogModal from "@/components/modals/FuelLogModal";
import CustomizationModal from "@/components/modals/CustomizationModal";
import { AppHeader } from "@/components/common/AppHeader";
import { AppLoading } from "@/components/common/AppLoading";
import { useToast, useConfirm } from "@/components/common/Feedback";

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

function GasNavLink() {
  const pathname = usePathname();
  const isActive = pathname === '/gas';
  
  return (
    <Link
      href="/gas"
      className={
        "w-full text-left px-3 py-2 rounded-xl transition block " +
        (isActive ? "bg-blue-600 text-white font-semibold" : "hover:bg-gray-100 text-gray-700")
      }
    >
      ガソリン
    </Link>
  );
}

function MaintenanceNavLink() {
  const pathname = usePathname();
  const isActive = pathname === '/maintenance';
  
  return (
    <Link
      href="/maintenance"
      className={
        "w-full text-left px-3 py-2 rounded-xl transition block " +
        (isActive ? "bg-blue-600 text-white font-semibold" : "hover:bg-gray-100 text-gray-700")
      }
    >
      メンテナンス
    </Link>
  );
}

function CustomizationsNavLink() {
  const pathname = usePathname();
  const isActive = pathname === '/customizations';
  
  return (
    <Link
      href="/customizations"
      className={
        "w-full text-left px-3 py-2 rounded-xl transition block " +
        (isActive ? "bg-blue-600 text-white font-semibold" : "hover:bg-gray-100 text-gray-700")
      }
    >
      カスタマイズ
    </Link>
  );
}

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

function CarManagementNavLink() {
  const pathname = usePathname();
  const isActive = pathname === '/cars';
  
  return (
    <Link
      href="/cars"
      className={
        "w-full text-left px-3 py-2 rounded-xl transition block " +
        (isActive ? "bg-blue-600 text-white font-semibold" : "hover:bg-gray-100 text-gray-700")
      }
    >
      車両管理
    </Link>
  );
}

// CarManagementContentコンポーネント
function CarManagementContent({ 
  cars, 
  activeCarId, 
  setActiveCarId, 
  setShowAddCarModal,
  setShowEditCarModal,
  setEditingCar,
  maintenanceRecords,
  fuelLogs,
  customizations,
  router,
  setShowFuelLogModal,
  setShowMaintenanceModal,
  setShowCustomizationModal,
  setShowSellCarModal,
  setCarToSell,
  userPlan,
  checkFeature
}: {
  cars: Car[];
  activeCarId?: string;
  setActiveCarId: (id: string) => void;
  setShowAddCarModal: (show: boolean) => void;
  setShowEditCarModal: (show: boolean) => void;
  setEditingCar: (car: Car | null) => void;
  maintenanceRecords: MaintenanceRecord[];
  fuelLogs: FuelLog[];
  customizations: Customization[];
  router: ReturnType<typeof useRouter>;
  setShowSellCarModal: (show: boolean) => void;
  setCarToSell: (car: Car | null) => void;
  setShowFuelLogModal: (show: boolean) => void;
  setShowMaintenanceModal: (show: boolean) => void;
  setShowCustomizationModal: (show: boolean) => void;
  userPlan: 'free' | 'premium' | 'premium_monthly' | 'premium_yearly';
  checkFeature: (feature: any, currentUsage?: any, variant?: any) => boolean;
}) {
  const confirm = useConfirm();
  const toast = useToast();

  const handleDeleteCar = async (carId: string, carName: string) => {
    const ok = await confirm({
      title: '車両を削除',
      message: `「${carName}」を削除しますか？この操作は取り消せません。`,
      confirmLabel: '削除',
      tone: 'danger',
    });
    if (!ok) return;

    try {
      const { removeCar } = await import("@/lib/cars");
      await removeCar(carId);
      console.log("Car deleted successfully:", carId);
      
      if (activeCarId === carId) {
        setActiveCarId("");
      }
    } catch (error) {
      console.error("Error deleting car:", error);
      toast("車両の削除に失敗しました。もう一度お試しください。", "error");
    }
  };

  const handleEditCar = (car: Car) => {
    setEditingCar(car);
    setShowEditCarModal(true);
  };

  const handleAddFuel = (carId: string) => {
    setActiveCarId(carId);
    setShowFuelLogModal(true);
  };

  const handleAddMaintenance = (carId: string) => {
    setActiveCarId(carId);
    setShowMaintenanceModal(true);
  };

  const handleAddCustomization = (carId: string) => {
    setActiveCarId(carId);
    setShowCustomizationModal(true);
  };

  const activeCars = cars.filter(car => !car.status || car.status === 'active');
  const soldCars = cars.filter(car => car.status === 'sold');
  const scrappedCars = cars.filter(car => car.status === 'scrapped');
  const downgradedCars = cars.filter(car => car.status === 'downgraded_premium');

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">車両管理</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!checkFeature('multiple_cars', { carCount: activeCars.length }, 'minimal')) {
                return;
              }
              setShowAddCarModal(true);
            }}
            className="rounded-xl bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-500 transition"
          >
            + 車を追加
          </button>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>🚗</span>
          <span>現在保有中</span>
          <span className="text-sm font-normal text-gray-500">({activeCars.length}台)</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeCars.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <div className="text-gray-500 mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">車が登録されていません</h3>
              <p className="text-gray-500 mb-4">まず車を追加して、メンテナンスを管理しましょう。</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => {
                    if (!checkFeature('multiple_cars', { carCount: cars.length }, 'minimal')) {
                      return;
                    }
                    setShowAddCarModal(true);
                  }}
                  className="rounded-xl bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-500 transition"
                >
                  車を追加
                </button>
              </div>
            </div>
          ) : (
            <>
              {activeCars.map((car) => (
                <CarCard
                  key={car.id}
                  car={car}
                  isActive={car.id === activeCarId}
                  onSelect={() => car.id && setActiveCarId(car.id)}
                  onDelete={() => car.id && handleDeleteCar(car.id, car.name)}
                  onEdit={() => handleEditCar(car)}
                  onMarkAsSold={() => {
                    setCarToSell(car);
                    setShowSellCarModal(true);
                  }}
                  maintenanceRecords={maintenanceRecords}
                  fuelLogs={fuelLogs}
                  onAddFuel={handleAddFuel}
                  onAddMaintenance={handleAddMaintenance}
                  onAddCustomization={handleAddCustomization}
                  checkFeature={checkFeature}
                />
              ))}
              {userPlan === 'free' && activeCars.length === 1 && (
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border-2 border-dashed border-blue-300 p-6 flex flex-col items-center justify-center text-center hover:border-blue-400 transition">
                  <div className="text-4xl mb-3">🚗✨</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    もう1台追加しませんか？
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    プレミアムプランなら、無制限に車両を登録できます。
                  </p>
                  <button
                    onClick={() => {
                      checkFeature('multiple_cars', { carCount: 999 }, 'hero');
                    }}
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 font-bold hover:shadow-lg transition"
                  >
                    プレミアムを見る
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {soldCars.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
            <span>📦</span>
            <span>売却済み</span>
            <span className="text-sm font-normal text-gray-500">({soldCars.length}台)</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {soldCars.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                isActive={false}
                isSold={true}
                onSelect={() => {
                  if (car.id) {
                    setActiveCarId(car.id);
                    router.push('/mycar');
                  }
                }}
                onDelete={() => car.id && handleDeleteCar(car.id, car.name)}
                onEdit={() => handleEditCar(car)}
                onMarkAsSold={() => {}}
                maintenanceRecords={maintenanceRecords}
                fuelLogs={fuelLogs}
                onAddFuel={handleAddFuel}
                onAddMaintenance={handleAddMaintenance}
                onAddCustomization={handleAddCustomization}
                checkFeature={checkFeature}
              />
            ))}
          </div>
        </div>
      )}

      {scrappedCars.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
            <span>🏭</span>
            <span>廃車済み</span>
            <span className="text-sm font-normal text-gray-500">({scrappedCars.length}台)</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scrappedCars.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                isActive={false}
                isScrapped={true}
                onSelect={() => {
                  if (car.id) {
                    setActiveCarId(car.id);
                    router.push('/mycar');
                  }
                }}
                onDelete={() => car.id && handleDeleteCar(car.id, car.name)}
                onEdit={() => handleEditCar(car)}
                onMarkAsSold={() => {}}
                maintenanceRecords={maintenanceRecords}
                fuelLogs={fuelLogs}
                onAddFuel={handleAddFuel}
                onAddMaintenance={handleAddMaintenance}
                onAddCustomization={handleAddCustomization}
                checkFeature={checkFeature}
              />
            ))}
          </div>
        </div>
      )}

      {downgradedCars.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
            <span>🔒</span>
            <span>閲覧専用（プラン制限）</span>
            <span className="text-sm font-normal text-gray-500">({downgradedCars.length}台)</span>
          </h2>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">無料プランでは1台のみ編集可能です</p>
                <p>
                  プレミアムプランに再登録すると、これらの車両もすぐに編集できるようになります。
                  過去データの閲覧・PDF出力は引き続き可能です。
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {downgradedCars.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                isActive={false}
                isDowngraded={true}
                onSelect={() => {
                  if (car.id) {
                    setActiveCarId(car.id);
                    router.push('/mycar');
                  }
                }}
                onDelete={() => car.id && handleDeleteCar(car.id, car.name)}
                onEdit={() => handleEditCar(car)}
                onMarkAsSold={() => {}}
                maintenanceRecords={maintenanceRecords}
                fuelLogs={fuelLogs}
                onAddFuel={handleAddFuel}
                onAddMaintenance={handleAddMaintenance}
                onAddCustomization={handleAddCustomization}
                checkFeature={checkFeature}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// CarCardコンポーネント
function CarCard({ 
  car, 
  isActive, 
  isSold = false,
  isScrapped = false,
  isDowngraded = false,
  onSelect,
  onDelete,
  onEdit,
  onMarkAsSold,
  maintenanceRecords,
  fuelLogs,
  onAddFuel,
  onAddMaintenance,
  onAddCustomization,
  checkFeature
}: { 
  car: Car; 
  isActive: boolean;
  isSold?: boolean;
  isScrapped?: boolean;
  isDowngraded?: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onMarkAsSold: () => void;
  maintenanceRecords: MaintenanceRecord[];
  fuelLogs: FuelLog[];
  onAddFuel: (carId: string) => void;
  onAddMaintenance: (carId: string) => void;
  onAddCustomization: (carId: string) => void;
  checkFeature: (feature: any, currentUsage?: any, variant?: any) => boolean;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(false);
    };
    
    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDropdown]);
  
  const getNextMaintenanceTask = () => {
    if (!car.id) return null;
    
    const carMaintenanceRecords = maintenanceRecords
      .filter(record => record.carId === car.id)
      .sort((a, b) => toMillis(b.date) - toMillis(a.date));
    
    if (carMaintenanceRecords.length === 0) return null;
    
    const latestRecord = carMaintenanceRecords[0];
    
    if (latestRecord.title.includes('オイル') || latestRecord.title.includes('オイル交換')) {
      const nextMileage = (latestRecord.mileage || 0) + 5000;
      const remainingKm = nextMileage - (car.odoKm || 0);
      
      if (remainingKm > 0) {
        let estimatedDays: number | null = null;
        if (car.avgKmPerMonth && car.avgKmPerMonth > 0) {
          estimatedDays = Math.round((remainingKm / car.avgKmPerMonth) * 30);
        }
        
        return {
          title: 'オイル交換',
          remainingKm,
          nextMileage,
          estimatedDays,
          type: 'mileage' as const
        };
      }
    }
    
    const nextDate = toDate(latestRecord.date) || new Date();
    nextDate.setMonth(nextDate.getMonth() + 3);
    const today = new Date();
    const daysUntilNext = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilNext > 0) {
      return {
        title: latestRecord.title,
        daysUntilNext,
        nextDate,
        type: 'date' as const
      };
    }
    
    return null;
  };
  
  const nextTask = getNextMaintenanceTask();
  
  const getDeadlineBadges = () => {
    const badges = [];
    
    if (car.inspectionExpiry) {
      const expiryDate = car.inspectionExpiry.toDate ? car.inspectionExpiry.toDate() : new Date(car.inspectionExpiry as any);
      const today = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry > 0) {
        let badgeColor = 'bg-gray-100 text-gray-700';
        if (daysUntilExpiry <= 30) {
          badgeColor = 'bg-red-100 text-red-700';
        } else if (daysUntilExpiry <= 60) {
          badgeColor = 'bg-yellow-100 text-yellow-700';
        }
        
        badges.push({
          type: 'inspection',
          text: `車検 ${daysUntilExpiry}日`,
          color: badgeColor
        });
      }
    }
    
    return badges;
  };
  
  const deadlineBadges = getDeadlineBadges();
  
  return (
    <div 
      className={`bg-white rounded-2xl border p-4 transition relative ${
        isSold || isScrapped || isDowngraded
          ? 'border-gray-300 opacity-75'
          : isActive 
          ? 'border-blue-500 ring-2 ring-blue-100' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {isSold && (
        <div className="absolute top-2 left-2 z-10">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-300">
            📦 売却済み
          </span>
        </div>
      )}
      {isScrapped && (
        <div className="absolute top-2 left-2 z-10">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300">
            🏭 廃車済み
          </span>
        </div>
      )}
      {isDowngraded && (
        <div className="absolute top-2 left-2 z-10">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-300">
            🔒 閲覧専用
          </span>
        </div>
      )}
    
      <div className="absolute top-3 right-3">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDropdown(!showDropdown);
            }}
            className="w-9 h-9 rounded-xl bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-all flex items-center justify-center shadow-md border border-gray-200 hover:border-gray-300 hover:shadow-lg"
            title="車両設定"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-20 overflow-hidden">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                  setShowDropdown(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>編集</span>
              </button>
              {!isSold && !isScrapped && !isDowngraded ? (
                <>
                  <div className="h-px bg-gray-200 my-1"></div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsSold();
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span>売却済みにする</span>
                  </button>
                </>
              ) : isSold || isScrapped ? (
                <>
                  <div className="h-px bg-gray-200 my-1"></div>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const ok = await confirm({
                        title: '現在保有中に戻す',
                        message: `「${car.name}」を現在保有中に戻しますか？`,
                        confirmLabel: '戻す',
                      });
                      if (ok) {
                        try {
                          const { restoreCarToActive } = await import("@/lib/cars");
                          await restoreCarToActive(car.id!);
                        } catch (error) {
                          console.error('Error restoring car:', error);
                          toast('復元に失敗しました', 'error');
                        }
                      }
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-green-600 hover:bg-green-50 transition-colors flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    <span>現在保有中に戻す</span>
                  </button>
                </>
              ) : isDowngraded ? (
                <>
                  <div className="h-px bg-gray-200 my-1"></div>
                  <div className="px-4 py-3 text-sm text-blue-700 bg-blue-50 rounded-lg mx-2">
                    <p className="font-semibold mb-1">🚀 編集するには</p>
                    <p className="text-xs text-blue-600 mb-2">
                      プレミアムプランに再登録すると、この車両を編集できるようになります。
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        checkFeature('multiple_cars', { carCount: 999 }, 'hero');
                        setShowDropdown(false);
                      }}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-800 underline"
                    >
                      プレミアムを見る →
                    </button>
                  </div>
                </>
              ) : null}
              <div className="h-px bg-gray-200 my-1"></div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  setShowDropdown(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>削除</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div 
        className="cursor-pointer"
        onClick={() => {
          console.log("Car card clicked:", car.name, car.id);
          onSelect();
        }}
      >
        {car.imagePath ? (
          <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 mb-4">
            <img
              src={car.imagePath}
              alt={car.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-video rounded-xl bg-gray-100 mb-4 flex items-center justify-center border border-gray-200">
            <div className="text-center text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">写真を追加しましょう</p>
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">
            {car.name}
            {car.modelCode && `（${car.modelCode}）`}
          </h3>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            {car.year && (
              <div>
                <span className="text-gray-500">年式:</span>
                <span className="ml-1 font-medium">{car.year}年</span>
              </div>
            )}
            {car.odoKm && (
              <div>
                <span className="text-gray-500">走行距離:</span>
                <span className="ml-1 font-medium">{car.odoKm.toLocaleString()} km</span>
              </div>
            )}
          </div>
          
          {nextTask && (
            <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-xs text-blue-700 font-medium">
                次: {nextTask.title}
                {nextTask.type === 'mileage' ? (
                  <>
                    <span className="ml-1">
                      {nextTask.remainingKm?.toLocaleString()}km後
                    </span>
                    {nextTask.estimatedDays && (
                      <span className="ml-1 text-blue-600">
                        （概ね{nextTask.estimatedDays}日後）
                      </span>
                    )}
                  </>
                ) : (
                  <span className="ml-1">
                    {nextTask.daysUntilNext}日後
                  </span>
                )}
              </div>
              {nextTask.type === 'date' && nextTask.nextDate && (
                <div className="text-xs text-blue-600 mt-1">
                  {(nextTask.nextDate instanceof Date ? nextTask.nextDate : new Date()).toLocaleDateString('ja-JP')}
                </div>
              )}
            </div>
          )}
          
          {deadlineBadges.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {deadlineBadges.map((badge, index) => (
                <span
                  key={index}
                  className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}
                >
                  {badge.text}
                </span>
              ))}
            </div>
          )}
          
          {isActive && !isSold && !isScrapped && (
            <div className="text-xs text-blue-600 font-medium">
              現在選択中
            </div>
          )}
          
          {isSold && car.soldDate && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-600 space-y-1">
                <div>
                  売却日: <span className="font-semibold text-gray-800">
                    {toDate(car.soldDate)?.toLocaleDateString('ja-JP') || '---'}
                  </span>
                </div>
                {car.soldPrice && (
                  <div>
                    売却価格: <span className="font-semibold text-orange-600">
                      ¥{car.soldPrice.toLocaleString()}
                    </span>
                  </div>
                )}
                {car.soldTo && (
                  <div>
                    売却先: <span className="font-semibold text-gray-800">{car.soldTo}</span>
                  </div>
                )}
                {car.soldNotes && (
                  <div className="text-gray-700 mt-2">{car.soldNotes}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CarsPageRouteContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedCarId, setSelectedCarId } = useSelectedCar();
  const urlCarId = searchParams?.get('car') || null;
  const { userPlan, checkFeature } = usePremiumGuard();

  // 状態管理
  const [cars, setCars] = useState<Car[]>([]);
  const [activeCarId, setActiveCarId] = useState<string | undefined>(undefined);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [customizations, setCustomizations] = useState<Customization[]>([]);
  const [loading, setLoading] = useState(true);
  const [authTrigger, setAuthTrigger] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAddCarModal, setShowAddCarModal] = useState(false);
  const [showEditCarModal, setShowEditCarModal] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [showFuelLogModal, setShowFuelLogModal] = useState(false);

  // activeCarIdを決定（優先順位: URLクエリ > グローバルコンテキスト > ローカル状態）
  const effectiveCarId = useMemo(() => {
    return urlCarId || selectedCarId || activeCarId;
  }, [urlCarId, selectedCarId, activeCarId]);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [showSellCarModal, setShowSellCarModal] = useState(false);
  const [carToSell, setCarToSell] = useState<Car | null>(null);

  // 認証状態を監視
  useEffect(() => {
    const unsubscribe = watchAuth((user) => {
      setCurrentUser(user);
      if (user) {
        setCars([]);
        setActiveCarId(undefined);
        setMaintenanceRecords([]);
        setFuelLogs([]);
        setCustomizations([]);
        setAuthTrigger(prev => prev + 1);
      } else {
        setCars([]);
        setActiveCarId(undefined);
        setMaintenanceRecords([]);
        setFuelLogs([]);
        setCustomizations([]);
        setAuthTrigger(0);
      }
    });
    return () => unsubscribe();
  }, []);

  // URLクエリとグローバルコンテキストの同期（無効化）
  // useEffect(() => {
  //   if (urlCarId && urlCarId !== selectedCarId) {
  //     setSelectedCarId(urlCarId);
  //   }
  // }, [urlCarId, selectedCarId, setSelectedCarId]);

  // 車両リストが変更されたときに自動選択（グローバルコンテキストを優先）
  useEffect(() => {
    if (cars.length === 0) {
      return;
    }

    const activeCarsList = cars.filter((c) => !c.status || c.status === 'active');
    
    if (activeCarsList.length === 0) {
      return;
    }

    // 優先順位: 1) URLクエリ 2) グローバルselectedCarId 3) 現在のactiveCarId 4) 最初の車
    let targetCarId: string | undefined = undefined;
    
    if (urlCarId && activeCarsList.some(car => car.id === urlCarId)) {
      targetCarId = urlCarId;
    } else if (selectedCarId && activeCarsList.some(car => car.id === selectedCarId)) {
      targetCarId = selectedCarId;
    } else if (activeCarId && activeCarsList.some(car => car.id === activeCarId)) {
      targetCarId = activeCarId;
    } else {
      targetCarId = activeCarsList[0].id;
    }
    
    if (targetCarId && targetCarId !== activeCarId) {
      setActiveCarId(targetCarId);
      if (!selectedCarId) {
        setSelectedCarId(targetCarId);
      }
      // URLの更新は行わない（URLクエリは別のuseEffectで処理）
    }
  }, [cars, activeCarId, selectedCarId, urlCarId, setSelectedCarId]);

  // 車両データの取得
  useEffect(() => {
    if (!auth.currentUser) {
      setCars([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const off = watchCars((list) => {
        setCars(list);
        setLoading(false);
        // 車両リスト変更時の処理は、別のuseEffectで処理する
      });
      return () => {
        off && off();
      };
    } catch (error) {
      console.error("Error watching cars:", error);
      setCars([]);
      setLoading(false);
    }
  }, [auth.currentUser, authTrigger]);

  // メンテナンス記録の取得
  useEffect(() => {
    if (!auth.currentUser) {
      setMaintenanceRecords([]);
      return;
    }

    try {
      const off = watchAllMaintenanceRecords((records) => {
        setMaintenanceRecords(records);
      });
      return () => {
        off && off();
      };
    } catch (error) {
      console.error("Error watching maintenance records:", error);
      setMaintenanceRecords([]);
    }
  }, [auth.currentUser, authTrigger]);

  // 燃料ログの取得
  useEffect(() => {
    if (!auth.currentUser) {
      setFuelLogs([]);
      return;
    }

    try {
      const off = watchAllFuelLogs((logs) => {
        setFuelLogs(logs);
      });
      return () => {
        off && off();
      };
    } catch (error) {
      console.error("Error watching fuel logs:", error);
      setFuelLogs([]);
    }
  }, [auth.currentUser, authTrigger]);

  // カスタマイズデータの取得
  useEffect(() => {
    if (!auth.currentUser) {
      setCustomizations([]);
      return;
    }

    const loadCustomizations = async () => {
      try {
        const allCustomizations: Customization[] = [];
        for (const car of cars) {
          if (car.id) {
            const carCustomizations = await getCustomizations(auth.currentUser!.uid, car.id);
            allCustomizations.push(...carCustomizations);
          }
        }
        setCustomizations(allCustomizations);
      } catch (error) {
        console.error("Error loading customizations:", error);
        setCustomizations([]);
      }
    };

    if (cars.length > 0) {
      loadCustomizations();
    } else {
      setCustomizations([]);
    }
  }, [auth.currentUser, cars, authTrigger]);

  // 現在保有中の車両のみ
  const activeCars = useMemo(
    () => cars.filter((c) => !c.status || c.status === 'active'),
    [cars]
  );

  if (loading) {
    return <AppLoading />;
  }

  return (
    <AuthGate>
      <div className="app-home min-h-screen">
        {/* ヘッダー */}
        <AppHeader
          cars={activeCars}
          activeCarId={effectiveCarId}
          onSelectCar={(id) => {
            setSelectedCarId(id);
            setActiveCarId(id);
            router.replace(`${pathname}?car=${id}`);
          }}
          onAddCar={() => setShowAddCarModal(true)}
        />

        {/* レイアウト */}
        <SidebarLayout>
          {/* サイドバー */}
          <CollapsibleSidebar
            activeCarId={activeCarId}
            currentUser={currentUser}
            userPlan={userPlan}
            isPremiumPlan={isPremiumPlan}
          />

          {/* メイン */}
          <main className="space-y-6">
            <CarManagementContent
              cars={cars}
              activeCarId={effectiveCarId}
              setActiveCarId={(id) => {
                setSelectedCarId(id);
                setActiveCarId(id);
                router.replace(`${pathname}?car=${id}`);
              }}
              setShowAddCarModal={setShowAddCarModal}
              setShowEditCarModal={setShowEditCarModal}
              setEditingCar={setEditingCar}
              maintenanceRecords={maintenanceRecords}
              fuelLogs={fuelLogs}
              customizations={customizations}
              router={router}
              setShowFuelLogModal={setShowFuelLogModal}
              setShowMaintenanceModal={setShowMaintenanceModal}
              setShowCustomizationModal={setShowCustomizationModal}
              setShowSellCarModal={setShowSellCarModal}
              setCarToSell={setCarToSell}
              userPlan={userPlan}
              checkFeature={checkFeature}
            />
          </main>
        </SidebarLayout>

        {/* モーダル */}
        {showAddCarModal && (
          <AddCarModal
            onClose={() => setShowAddCarModal(false)}
            onAdded={() => setShowAddCarModal(false)}
          />
        )}

        {showEditCarModal && editingCar && (
          <CarModal
            isOpen={showEditCarModal}
            editingCar={editingCar}
            title="車両を編集"
            onClose={() => {
              setShowEditCarModal(false);
              setEditingCar(null);
            }}
            onSave={async (carData) => {
              if (editingCar.id) {
                await updateCar(editingCar.id, carData);
              }
              setShowEditCarModal(false);
              setEditingCar(null);
            }}
          />
        )}

        {showSellCarModal && carToSell && (
          <SellCarModal
            car={carToSell}
            onClose={() => {
              setShowSellCarModal(false);
              setCarToSell(null);
            }}
            onSave={async (carId, soldData) => {
              await updateCar(carId, soldData);
              setShowSellCarModal(false);
              setCarToSell(null);
            }}
          />
        )}

        {showFuelLogModal && activeCarId && (() => {
          const car = cars.find(c => c.id === activeCarId);
          if (!car) return null;
          return (
            <FuelLogModal
              isOpen={showFuelLogModal}
              car={car}
              onClose={() => setShowFuelLogModal(false)}
              onSuccess={() => setShowFuelLogModal(false)}
            />
          );
        })()}

        {/* MaintenanceModalはCarCard内で直接使用されるため、ここでは使用しない */}

        {showCustomizationModal && activeCarId && (
          <CustomizationModal
            isOpen={showCustomizationModal}
            carId={activeCarId}
            onClose={() => setShowCustomizationModal(false)}
            onSave={() => setShowCustomizationModal(false)}
          />
        )}
      </div>
    </AuthGate>
  );
}

export default function CarsPageRoute() {
  return (
    <Suspense fallback={<AppLoading />}>
      <CarsPageRouteContent />
    </Suspense>
  );
}
