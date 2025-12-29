// src/app/page.tsx
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Timestamp } from "firebase/firestore";
import AuthGate from "@/components/AuthGate";
import { addCar, watchCars, updateCar } from "@/lib/cars";
import type { Car, CarInput } from "@/types";
import { auth, watchAuth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { User } from "firebase/auth";
import { addMaintenanceRecord, watchMaintenanceRecords, watchAllMaintenanceRecords, updateMaintenanceRecord, deleteMaintenanceRecord, deleteMultipleMaintenanceRecords } from "@/lib/maintenance";
import type { MaintenanceRecord } from "@/types";
import { downloadMaintenancePDF, type PDFExportOptions } from "@/lib/pdfExport";
import { uploadCarImageWithProgress, isImageFile } from "@/lib/storage";
import { compressImage, getCompressionInfo } from "@/lib/imageCompression";
import { addCustomization, getCustomizations, updateCustomization, deleteCustomization, CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS } from "@/lib/customizations";
import type { Customization } from "@/types";
import { watchFuelLogs, calculateFuelEfficiency, calculateAverageFuelEfficiency, getDisplayAmount, getDisplayCost } from "@/lib/fuelLogs";
import type { FuelLog } from "@/types";
import { Bar as RechartsBar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import { Car as CarIcon } from 'lucide-react';
import FuelLogModal from "@/components/modals/FuelLogModal";
import AddCarModal from "@/components/modals/AddCarModal";
import FuelLogCard from "@/components/dashboard/FuelLogCard";
import CustomizationModal from "@/components/modals/CustomizationModal";
import PaywallModal from "@/components/modals/PaywallModal";
import SellCarModal from "@/components/modals/SellCarModal";
import ShareAndPDFModal from "@/components/modals/ShareAndPDFModal";
import OCRModal from "@/components/modals/OCRModal";
import { usePremiumGuard } from "@/hooks/usePremium";
import MyCarPage from "@/components/mycar/MyCarPage";
import NextMaintenanceSuggestion from "@/components/mycar/NextMaintenanceSuggestion";
import { generateMaintenanceSuggestions } from "@/lib/maintenanceSuggestions";
import UnifiedCTA from "@/components/UnifiedCTA";
import { toDate, toMillis, toTimestamp } from "@/lib/dateUtils";
import { isPremiumPlan } from "@/lib/plan";

// セクション見出しの統一コンポーネント
function SectionHeader({ title, subtitle, size = 'md', right }: { title: string; subtitle?: string; size?: 'sm' | 'md'; right?: React.ReactNode }) {
  const titleClass = size === 'sm'
    ? "text-sm font-medium text-gray-700"
    : "text-lg font-semibold text-gray-900";
  const subClass = size === 'sm'
    ? "text-xs text-gray-500"
    : "text-sm text-gray-500";
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <div className={titleClass}>{title}</div>
        {subtitle && <div className={subClass}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

/* -------------------- ページ本体 -------------------- */
export default function Home() {
  const router = useRouter();
  const [cars, setCars] = useState<Car[]>([]);
  const [activeCarId, setActiveCarId] = useState<string | undefined>(undefined);
  const [showAddCarModal, setShowAddCarModal] = useState(false);
  const [showEditCarModal, setShowEditCarModal] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceTemplate, setMaintenanceTemplate] = useState<string | null>(null);
  const [showEditMaintenanceModal, setShowEditMaintenanceModal] = useState(false);
  const [editingMaintenanceRecord, setEditingMaintenanceRecord] = useState<MaintenanceRecord | null>(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [allMaintenanceRecords, setAllMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [customizations, setCustomizations] = useState<Customization[]>([]);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [showSellCarModal, setShowSellCarModal] = useState(false);
  const [carToSell, setCarToSell] = useState<Car | null>(null);
  const [editingCustomization, setEditingCustomization] = useState<Customization | null>(null);
  const [showFuelLogModal, setShowFuelLogModal] = useState(false);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [showShareAndPDFModal, setShowShareAndPDFModal] = useState(false);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [authTrigger, setAuthTrigger] = useState(0); // 認証状態変更のトリガー
  const [currentUser, setCurrentUser] = useState<User | null>(null); // 現在のユーザー情報
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'car-management' | 'my-car' | 'maintenance-history' | 'fuel-logs' | 'customizations' | 'data-management' | 'notifications' | 'share'>('dashboard');
  // 軽量トースト（成功フィードバック）
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 1800);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // プレミアムガード
  const { userPlan, checkFeature, showPaywall, closePaywall, paywallFeature, paywallVariant } = usePremiumGuard();

  // 認証状態を監視
  useEffect(() => {
    console.log("Setting up auth watcher...");
    const unsubscribe = watchAuth((user) => {
      console.log("Auth state changed:", user ? `User: ${user.email}` : "No user");
      // ユーザー情報をstateに保存
      setCurrentUser(user);
      
      if (user) {
        console.log("User authenticated, forcing data refresh");
        // 認証されたらデータをクリアして再取得を促す
        setCars([]);
        setActiveCarId(undefined);
        setMaintenanceRecords([]);
        setAllMaintenanceRecords([]);
        setFuelLogs([]);
        
        // 認証トリガーを更新してデータ取得を促す
        setAuthTrigger(prev => prev + 1);
      } else {
        console.log("User not authenticated, clearing all data");
        setCars([]);
        setActiveCarId(undefined);
        setMaintenanceRecords([]);
        setAllMaintenanceRecords([]);
        setFuelLogs([]);
        setAuthTrigger(0);
      }
    });
    
    return () => {
      console.log("Cleaning up auth watcher");
      unsubscribe();
    };
  }, []);

  // 車両リストが変更されたときに自動選択
  useEffect(() => {
    if (cars.length === 0) {
      console.log("No cars available, clearing activeCarId");
      return;
    }

    // アクティブな車両のみを取得
    const activeCarsList = cars.filter((c) => !c.status || c.status === 'active');
    
    if (activeCarsList.length === 0) {
      console.log("No active cars available");
      return;
    }

    // activeCarIdが未設定、または選択されている車両が存在しない、またはアクティブでない場合は最初のアクティブ車両を選択
    const currentCarExists = activeCarId ? activeCarsList.some(car => car.id === activeCarId) : false;
    
    if (!activeCarId || !currentCarExists) {
      console.log("Auto-selecting first active car:", activeCarsList[0].id, activeCarsList[0].name);
      setActiveCarId(activeCarsList[0].id);
    }
  }, [cars, activeCarId]);


  // 車両データの取得（認証状態に依存）
  useEffect(() => {
    // 認証されていない場合は何もしない
    if (!auth.currentUser) {
      console.log("No user authenticated, skipping cars watcher setup");
      return;
    }
    
    console.log("Setting up cars watcher...");
    console.log("Current activeCarId:", activeCarId);
    console.log("Current user:", auth.currentUser.email);
    
    try {
    const off = watchCars((list) => {
        console.log("Cars received in component:", list.length, "cars");
        console.log("Current activeCarId when cars received:", activeCarId);
        console.log("Cars data:", list.map(car => ({ id: car.id, name: car.name, imagePath: car.imagePath })));
        console.log("Previous cars state:", cars.map(car => ({ id: car.id, name: car.name, imagePath: car.imagePath })));
        
        
        // 実際のデータがある場合はそれを使用
        if (list.length > 0) {
          console.log("Using real cars from Firestore");
          setCars(list);
          
          // activeCarIdが未設定、または選択されている車両が存在しない場合は最初の車両を選択
          const currentCarExists = activeCarId ? list.some(car => car.id === activeCarId) : false;
          if (!activeCarId || !currentCarExists) {
            console.log("Auto-selecting first car:", list[0].id);
            setActiveCarId(list[0].id);
          }
        } else {
          // データがない場合は空の配列を設定
          console.log("No cars found, setting empty array");
          setCars([]);
        }
      });
      return () => {
        console.log("Cleaning up cars watcher");
        off && off();
      };
    } catch (error) {
      console.error("Error watching cars:", error);
      // エラーの場合は空の配列を設定
      console.log("Error occurred, setting empty array");
      setCars([]);
    }
  }, [auth.currentUser, activeCarId, authTrigger]); // 認証状態、activeCarId、認証トリガーの変更に反応

  // activeCarIdの設定を別途処理
  useEffect(() => {
    if (cars.length > 0 && !activeCarId) {
      console.log("Setting activeCarId to first car:", cars[0].id);
      setActiveCarId(cars[0].id);
    }
  }, [cars, activeCarId]);

  // メンテナンスの監視（認証状態とactiveCarIdに依存）
  useEffect(() => {
    // 認証されていない場合は何もしない
    if (!auth.currentUser) {
      console.log("No user authenticated, skipping maintenance records watch");
      setMaintenanceRecords([]);
      return;
    }
    
    if (!activeCarId) {
      console.log("No activeCarId, skipping maintenance records watch");
      setMaintenanceRecords([]);
      return;
    }
    
    console.log("Setting up maintenance records watcher for car:", activeCarId);
    console.log("Current user:", auth.currentUser.email);
    
    try {
      const off = watchMaintenanceRecords(activeCarId, (records) => {
        console.log("Maintenance records received for car", activeCarId, ":", records.length, "records");
        setMaintenanceRecords(records);
        
      });
      return () => {
        console.log("Cleaning up maintenance records watcher");
        off && off();
      };
    } catch (error) {
      console.error("Error watching maintenance records:", error);
      setMaintenanceRecords([]);
    }
  }, [auth.currentUser, activeCarId, authTrigger]);

  // 全メンテナンスを監視（メンテナンスページ用）
  useEffect(() => {
    // 認証されていない場合は何もしない
    if (!auth.currentUser) {
      console.log("No user authenticated, skipping all maintenance records watch");
      setAllMaintenanceRecords([]);
      return;
    }
    
    console.log("Setting up all maintenance records watcher");
    console.log("Current user:", auth.currentUser.email);
    
    try {
      const off = watchAllMaintenanceRecords((records) => {
        console.log("All maintenance records received:", records.length, "records");
        console.log("Records data:", records.map(r => ({ id: r.id, title: r.title, carId: r.carId })));
        setAllMaintenanceRecords(records);
      });
      console.log("All maintenance records watcher set up successfully");
      return () => {
        console.log("Cleaning up all maintenance records watcher");
        off && off();
      };
    } catch (error) {
      console.error("Error watching all maintenance records:", error);
      setAllMaintenanceRecords([]);
    }
  }, [auth.currentUser, authTrigger]);

  // 給油ログの監視
  useEffect(() => {
    if (!auth.currentUser || !activeCarId) {
      setFuelLogs([]);
      return;
    }

    console.log("Setting up fuel logs watcher for car:", activeCarId);
    const unsubscribe = watchFuelLogs(activeCarId, (logs) => {
      console.log("Fuel logs updated:", logs.length);
      setFuelLogs(logs);
    });

    return () => {
      console.log("Cleaning up fuel logs watcher");
      unsubscribe();
    };
  }, [auth.currentUser, activeCarId, authTrigger]);

  // カスタマイズデータの監視
  useEffect(() => {
    if (!auth.currentUser || !activeCarId) {
      console.log("No user or active car, skipping customizations watch");
      setCustomizations([]);
      return;
    }

    console.log("Setting up customizations watcher for car:", activeCarId);
    const loadCustomizations = async () => {
      try {
        console.log("Loading customizations...");
        const customizations = await getCustomizations(auth.currentUser!.uid, activeCarId);
        console.log("Customizations loaded successfully:", customizations.length);
        setCustomizations(customizations);
      } catch (error) {
        console.error("Error loading customizations:", error);
        console.error("Error details:", {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: (error as any)?.code,
          stack: error instanceof Error ? error.stack : undefined
        });
        setCustomizations([]);
      }
    };

    // タイムアウトを設定して無限読み込みを防ぐ
    const timeoutId = setTimeout(() => {
      console.warn("Customizations loading timeout, setting empty array");
      setCustomizations([]);
    }, 10000); // 10秒でタイムアウト

    loadCustomizations().finally(() => {
      clearTimeout(timeoutId);
    });
  }, [auth.currentUser, activeCarId, authTrigger]);

  // 現在保有中の車両のみ（売却済み・廃車済みを除外）
  const activeCars = useMemo(
    () => cars.filter((c) => !c.status || c.status === 'active'),
    [cars]
  );

  const car = useMemo(() => {
    // 売却/廃車含む全車から選択中IDを解決（READ ONLYはMyCarPage側で制御）
    const foundCar = cars.find((c) => c.id === activeCarId);
    console.log("Finding car:", {
      activeCarId,
      carsCount: cars.length,
      activeCarsCount: activeCars.length,
      foundCar: foundCar ? { id: foundCar.id, name: foundCar.name } : null
    });
    return foundCar;
  }, [cars, activeCars.length, activeCarId]);


  // デバッグ情報
  console.log("Dashboard state:", {
    activeCarId,
    carName: car?.name,
    maintenanceRecordsCount: maintenanceRecords.length,
    allMaintenanceRecordsCount: allMaintenanceRecords.length,
    fuelLogsCount: fuelLogs.length,
    carsCount: cars.length
  });

  // テスト用のメンテナンス記録を追加（開発時のみ）- 一時的に有効化
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && activeCarId && allMaintenanceRecords.length === 0) {
      console.log("Adding test maintenance record for debugging");
      const testRecord = {
        id: 'test-record-1',
        carId: activeCarId,
        title: 'テスト記録',
        description: 'これはテスト用のメンテナンス記録です',
        cost: 5000,
        mileage: 50000,
        date: Timestamp.now(),
        location: 'テスト工場',
        deletedAt: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      } as MaintenanceRecord;
      setAllMaintenanceRecords([testRecord]);
    }
  }, [activeCarId, allMaintenanceRecords.length]);



  // 簡単なテスト用のFirestore直接アクセス
  const testFirestoreAccess = async () => {
    try {
      console.log("Testing direct Firestore access...");
      const { collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const { auth } = await import('@/lib/firebase');
      
      if (!auth.currentUser) {
        console.log("No user authenticated");
        return;
      }
      
      console.log("Current user:", auth.currentUser.uid, auth.currentUser.email);
      
      // 車両データのテスト
      console.log("Testing cars collection...");
      const carsRef = collection(db, "users", auth.currentUser.uid, "cars");
      const carsSnapshot = await getDocs(carsRef);
      console.log("Cars collection result:", carsSnapshot.docs.length, "documents");
      carsSnapshot.docs.forEach(doc => {
        console.log("Car document:", doc.id, doc.data());
      });
      
      // メンテナンスデータのテスト
      console.log("Testing maintenance collection...");
      const maintenanceRef = collection(db, "users", auth.currentUser.uid, "maintenance");
      const maintenanceSnapshot = await getDocs(maintenanceRef);
      console.log("Maintenance collection result:", maintenanceSnapshot.docs.length, "documents");
      maintenanceSnapshot.docs.forEach(doc => {
        console.log("Maintenance document:", doc.id, doc.data());
      });
      
    } catch (error) {
      console.error("Direct Firestore access error:", error);
      if (error instanceof Error) {
        console.error("Error code:", (error as any).code);
        console.error("Error message:", error.message);
      }
    }
  };

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
              {/* ヘッダー車両セレクター（右上に配置） */}
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
                  <button
                    onClick={() => setCurrentPage('maintenance-history')}
                    className="text-xs px-2 py-1 rounded-md bg-white border border-red-200 text-red-700 hover:bg-red-100"
                  >
                    対応する
                  </button>
                </div>
              );
            } else if (days <= 60) {
              alerts.push(
                <div key="inspection-soon" className="flex items-center justify-between rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2">
                  <div className="text-sm text-yellow-900">
                    車検期限まで残り {days}日です。点検や準備を進めましょう。
                  </div>
                  <button
                    onClick={() => setCurrentPage('maintenance-history')}
                    className="text-xs px-2 py-1 rounded-md bg-white border border-yellow-200 text-yellow-800 hover:bg-yellow-100"
                  >
                    対応する
                  </button>
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

            {/* 車両切り替えはヘッダーのドロップダウンに統一 */}


            <nav className="mt-4 bg-white rounded-2xl border border-gray-200 p-2 space-y-1 text-[15px]">
            <NavItem 
              label="ホーム" 
              active={currentPage === 'dashboard'} 
              onClick={() => setCurrentPage('dashboard')}
            />
            <NavItem 
              label="マイカー" 
              active={currentPage === 'my-car'} 
              onClick={() => setCurrentPage('my-car')}
            />
            <NavItem 
              label="ガソリン" 
              active={currentPage === 'fuel-logs'} 
              onClick={() => setCurrentPage('fuel-logs')}
            />
            <NavItem 
              label="メンテナンス" 
              active={currentPage === 'maintenance-history'} 
              onClick={() => setCurrentPage('maintenance-history')}
            />
            <NavItem 
              label="カスタマイズ" 
              active={currentPage === 'customizations'} 
              onClick={() => setCurrentPage('customizations')}
            />
            <NavItem 
              label="共有" 
              active={currentPage === 'share'} 
              onClick={() => setCurrentPage('share')}
            />
            <NavItem 
              label="車両管理" 
              active={currentPage === 'car-management'} 
              onClick={() => setCurrentPage('car-management')}
            />
            <NavItem 
              label="データ" 
              active={currentPage === 'data-management'} 
              onClick={() => setCurrentPage('data-management')}
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
            {userPlan === 'free' && (
              <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div className="text-sm font-semibold">プレミアムにアップグレード</div>
                <p className="text-xs text-gray-600 mt-1">
                  無制限の車両登録と高度な分析機能を利用できます
                </p>
                <button 
                  onClick={() => {
                    checkFeature('multiple_cars', { carCount: 999 }, 'hero');
                  }}
                  className="mt-3 w-full rounded-xl bg-white border border-blue-300 py-2 text-sm font-medium hover:bg-blue-100"
                >
                  詳細を見る
                </button>
              </div>
            )}
          </aside>

          {/* メイン */}
          <main className="space-y-6">
            {currentPage === 'dashboard' ? (
              <DashboardContent 
                cars={cars}
                activeCarId={activeCarId}
                car={car}
                maintenanceRecords={maintenanceRecords}
                fuelLogs={fuelLogs}
                customizations={customizations}
                setCurrentPage={setCurrentPage}
                setActiveCarId={setActiveCarId}
                setShowMaintenanceModal={setShowMaintenanceModal}
                setShowFuelLogModal={setShowFuelLogModal}
                setShowCustomizationModal={setShowCustomizationModal}
                setShowAddCarModal={setShowAddCarModal}
              />
            ) : currentPage === 'my-car' ? (
              // 新しいマイカーページ（全車両を表示、売却済み・廃車済みはREAD ONLYモード）
              car ? (
                <MyCarPage
                  car={car}
                  maintenanceRecords={maintenanceRecords}
                  fuelLogs={fuelLogs}
                  customizations={customizations}
                  readOnly={car.status === 'sold' || car.status === 'scrapped' || car.status === 'downgraded_premium'} // READ ONLYモード
                  onOpenModal={(modalType, data) => {
                    // モーダル表示ハンドラー
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
                        // 車両情報編集
                        setShowEditCarModal(true);
                        setEditingCar(car);
                        break;
                      case 'share':
                        // PDF出力機能
                        setShowShareAndPDFModal(true);
                        break;
                      case 'ocr':
                        // OCR機能
                        setShowOCRModal(true);
                        break;
                      // その他のモーダルは今後実装
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
              )
            ) : currentPage === 'car-management' ? (
              <CarManagementContent 
                cars={cars}
                activeCarId={activeCarId}
                setActiveCarId={setActiveCarId}
                setShowAddCarModal={setShowAddCarModal}
                setShowEditCarModal={setShowEditCarModal}
                setEditingCar={setEditingCar}
                maintenanceRecords={maintenanceRecords}
                fuelLogs={fuelLogs}
                customizations={customizations}
                setCurrentPage={setCurrentPage}
                setShowFuelLogModal={setShowFuelLogModal}
                setShowMaintenanceModal={setShowMaintenanceModal}
                setShowCustomizationModal={setShowCustomizationModal}
                setShowSellCarModal={setShowSellCarModal}
                setCarToSell={setCarToSell}
                userPlan={userPlan}
                checkFeature={checkFeature}
              />
            ) : currentPage === 'maintenance-history' ? (
              <MaintenanceHistoryContent 
                cars={cars}
                activeCarId={activeCarId}
                maintenanceRecords={allMaintenanceRecords}
                setShowMaintenanceModal={setShowMaintenanceModal}
                setShowEditMaintenanceModal={setShowEditMaintenanceModal}
                setEditingMaintenanceRecord={setEditingMaintenanceRecord}
              />
            ) : currentPage === 'fuel-logs' ? (
              <FuelLogsContent 
                cars={cars}
                activeCarId={activeCarId}
                fuelLogs={fuelLogs}
                setShowFuelLogModal={setShowFuelLogModal}
              />
            ) : currentPage === 'customizations' ? (
              <CustomizationsContent 
                cars={cars}
                activeCarId={activeCarId}
                customizations={customizations}
                setShowCustomizationModal={setShowCustomizationModal}
                setEditingCustomization={setEditingCustomization}
                setCustomizations={setCustomizations}
              />
            ) : currentPage === 'share' ? (
              <ShareContent
                cars={cars}
                activeCarId={activeCarId}
                car={car}
                maintenanceRecords={maintenanceRecords}
                customizations={customizations}
                setShowShareAndPDFModal={setShowShareAndPDFModal}
              />
            ) : currentPage === 'data-management' ? (
              <DataManagementContent 
                cars={cars}
                maintenanceRecords={allMaintenanceRecords}
                customizations={customizations}
                activeCarId={activeCarId}
              />
            ) : (
              <NotificationsContent 
                cars={cars}
                maintenanceRecords={allMaintenanceRecords}
              />
            )}
          </main>
        </div>
      </div>

      {/* 車を追加モーダル */}
      {showAddCarModal && (
        <AddCarModal
          onClose={() => {
            console.log("Closing add car modal");
            setShowAddCarModal(false);
          }}
          onAdded={() => {
            console.log("Car added, closing modal");
            setShowAddCarModal(false);
          }}
        />
      )}

      {/* 車両編集モーダル */}
      {showEditCarModal && editingCar && (
        <EditCarModal
          car={editingCar}
          onClose={() => {
            setShowEditCarModal(false);
            setEditingCar(null);
          }}
          onUpdated={() => {
            setShowEditCarModal(false);
            setEditingCar(null);
            // 車両データを再取得してUIを更新
            console.log("Car updated, refreshing data...");
            // 強制的に再レンダリングをトリガー
            setAuthTrigger(prev => prev + 1);
          }}
        />
      )}

      {/* メンテナンス記録モーダル */}
      {showMaintenanceModal && activeCarId && (
        <MaintenanceModal
          carId={activeCarId}
          carName={car?.name || "車"}
          currentMileage={car?.odoKm}
          initialTitle={maintenanceTemplate || undefined}
          onClose={() => {
            setShowMaintenanceModal(false);
            setMaintenanceTemplate(null);
          }}
          onAdded={() => {
            console.log("Maintenance record added, closing modal");
            console.log("Current allMaintenanceRecords count:", allMaintenanceRecords.length);
            setShowMaintenanceModal(false);
            setMaintenanceTemplate(null);
            setToastMessage("メンテナンス記録を追加しました");
            // 少し待ってから再度確認
            setTimeout(() => {
              console.log("After timeout - allMaintenanceRecords count:", allMaintenanceRecords.length);
              console.log("After timeout - allMaintenanceRecords data:", allMaintenanceRecords.map(r => ({ id: r.id, title: r.title })));
            }, 2000);
          }}
        />
      )}

      {/* メンテナンス編集モーダル */}
      {showEditMaintenanceModal && editingMaintenanceRecord && (
        <EditMaintenanceModal
          record={editingMaintenanceRecord}
          cars={cars}
          onClose={() => {
            setShowEditMaintenanceModal(false);
            setEditingMaintenanceRecord(null);
          }}
          onUpdated={() => {
            setShowEditMaintenanceModal(false);
            setEditingMaintenanceRecord(null);
          }}
        />
      )}

      {/* 給油ログモーダル */}
      {showFuelLogModal && car && (
        <FuelLogModal
          isOpen={showFuelLogModal}
          onClose={() => setShowFuelLogModal(false)}
          car={car}
          onSuccess={() => {
            console.log("Fuel log added successfully");
            setToastMessage("給油を記録しました");
          }}
        />
      )}

      {/* カスタマイズモーダル */}
      {showCustomizationModal && activeCarId && auth.currentUser && (
        <CustomizationModal
          isOpen={showCustomizationModal}
          onClose={() => {
            setShowCustomizationModal(false);
            setEditingCustomization(null);
          }}
          carId={`${auth.currentUser.uid}/cars/${activeCarId}`}
          editingCustomization={editingCustomization}
          onSave={async () => {
            // カスタマイズ一覧を再取得
            if (auth.currentUser && activeCarId) {
              const updatedCustomizations = await getCustomizations(auth.currentUser.uid, activeCarId);
              setCustomizations(updatedCustomizations);
            }
          }}
        />
      )}

      {/* トースト（右下） */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-[60]">
          <div className="rounded-xl bg-gray-900 text-white shadow-lg px-4 py-2 text-sm">
            {toastMessage}
          </div>
        </div>
      )}

      {/* 車両売却モーダル */}
      {showSellCarModal && carToSell && (
        <SellCarModal
          car={carToSell}
          onClose={() => {
            setShowSellCarModal(false);
            setCarToSell(null);
          }}
          onSave={async (carId, soldData) => {
            const { markCarAsSold } = await import("@/lib/cars");
            await markCarAsSold(carId, soldData);
            setShowSellCarModal(false);
            setCarToSell(null);
          }}
        />
      )}

      {/* PDF出力モーダル */}
      {showShareAndPDFModal && car && (
        <ShareAndPDFModal
          car={car}
          maintenanceRecords={maintenanceRecords}
          customizations={customizations}
          onClose={() => setShowShareAndPDFModal(false)}
          onCarUpdated={() => {
            // 車両データを再読み込み
            if (activeCarId) {
              const activeCar = cars.find(c => c.id === activeCarId);
              if (activeCar) {
                // 車両リストを更新（watchCarsが自動的に更新するはず）
              }
            }
          }}
        />
      )}

      {/* OCRモーダル */}
      {showOCRModal && car && (
        <OCRModal
          car={car}
          onClose={() => setShowOCRModal(false)}
          onRecordCreated={() => {
            // OCRで記録が作成されたらモーダルを閉じる
            setShowOCRModal(false);
          }}
        />
      )}

      {/* ペイウォールモーダル */}
      {showPaywall && (
        <PaywallModal
          onClose={closePaywall}
          feature={paywallFeature}
          variant={paywallVariant}
        />
      )}

    </AuthGate>
  );
}

/* -------------------- ページコンテンツ -------------------- */
function DashboardContent({ 
  cars, 
  activeCarId, 
  car, 
  maintenanceRecords,
  fuelLogs,
  customizations,
  setCurrentPage,
  setActiveCarId,
  setShowMaintenanceModal,
  setShowFuelLogModal,
  setShowCustomizationModal,
  setShowAddCarModal
}: {
  cars: Car[];
  activeCarId?: string;
  car?: Car;
  maintenanceRecords: MaintenanceRecord[];
  fuelLogs: FuelLog[];
  customizations: Customization[];
  setCurrentPage: (page: 'dashboard' | 'car-management' | 'maintenance-history' | 'fuel-logs' | 'customizations' | 'data-management' | 'notifications' | 'my-car') => void;
  setActiveCarId: (id: string) => void;
  setShowMaintenanceModal: (show: boolean) => void;
  setShowFuelLogModal: (show: boolean) => void;
  setShowCustomizationModal: (show: boolean) => void;
  setShowAddCarModal: (show: boolean) => void;
}) {
  // SEO/アクセシビリティ用のh1タグ（非表示）
  const pageTitle = `ホーム${car ? ' - ' + car.name : ' - garage log'}`;

  // 期間選択の状態管理
  const [expensePeriod, setExpensePeriod] = useState<'monthly' | 'yearly' | 'all'>('monthly');

  // 費用データの計算（期間に応じて）
  const expenseData = useMemo(() => {
    const now = new Date();
    
    if (expensePeriod === 'monthly') {
      // 月次: 過去6ヶ月のデータ
      const months = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('ja-JP', { month: 'long' });
        
        // その月のメンテナンス費用を計算
        const maintenanceCost = maintenanceRecords
          .filter(record => {
            const recordDate = toDate(record.date) || new Date();
            return recordDate.getFullYear() === date.getFullYear() && 
                   recordDate.getMonth() === date.getMonth();
          })
          .reduce((sum, record) => sum + (record.cost || 0), 0);
        
        // その月の給油費用を計算
        const fuelCost = fuelLogs
          .filter(log => {
            const logDate = toDate(log.date) || new Date();
            return logDate.getFullYear() === date.getFullYear() && 
                   logDate.getMonth() === date.getMonth();
          })
          .reduce((sum, log) => sum + (log.totalCostJpy || log.cost || 0), 0);
        
        // その月のカスタマイズ費用を計算
        const customizationCost = customizations
          .filter(custom => {
            const customDate = toDate(custom.date) || new Date();
            return customDate.getFullYear() === date.getFullYear() && 
                   customDate.getMonth() === date.getMonth();
          })
          .reduce((sum, custom) => {
            const partsCost = custom.partsCostJpy || 0;
            const laborCost = custom.laborCostJpy || 0;
            const otherCost = custom.otherCostJpy || 0;
            return sum + partsCost + laborCost + otherCost;
          }, 0);
        
        const totalCost = maintenanceCost + fuelCost + customizationCost;
        
        months.push({
          month: monthName,
          monthKey,
          maintenanceCost,
          fuelCost,
          customizationCost,
          cost: totalCost,
          cumulativeCost: 0
        });
      }
      
      // 累積費用を計算
      let cumulative = 0;
      months.forEach(month => {
        cumulative += month.cost;
        month.cumulativeCost = cumulative;
      });
      
      return months;
    } else if (expensePeriod === 'yearly') {
      // 年次: 過去3年のデータ
      const years = [];
      
      for (let i = 2; i >= 0; i--) {
        const year = now.getFullYear() - i;
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);
        
        // その年のメンテナンス費用を計算
        const maintenanceCost = maintenanceRecords
          .filter(record => {
            const recordDate = toDate(record.date) || new Date();
            return recordDate >= yearStart && recordDate <= yearEnd;
          })
          .reduce((sum, record) => sum + (record.cost || 0), 0);
        
        // その年の給油費用を計算
        const fuelCost = fuelLogs
          .filter(log => {
            const logDate = toDate(log.date) || new Date();
            return logDate >= yearStart && logDate <= yearEnd;
          })
          .reduce((sum, log) => sum + (log.totalCostJpy || log.cost || 0), 0);
        
        // その年のカスタマイズ費用を計算
        const customizationCost = customizations
          .filter(custom => {
            const customDate = toDate(custom.date) || new Date();
            return customDate >= yearStart && customDate <= yearEnd;
          })
          .reduce((sum, custom) => {
            const partsCost = custom.partsCostJpy || 0;
            const laborCost = custom.laborCostJpy || 0;
            const otherCost = custom.otherCostJpy || 0;
            return sum + partsCost + laborCost + otherCost;
          }, 0);
        
        const totalCost = maintenanceCost + fuelCost + customizationCost;
        
        years.push({
          month: `${year}年`,
          monthKey: `${year}`,
          maintenanceCost,
          fuelCost,
          customizationCost,
          cost: totalCost,
          cumulativeCost: 0
        });
      }
      
      // 累積費用を計算
      let cumulative = 0;
      years.forEach(year => {
        cumulative += year.cost;
        year.cumulativeCost = cumulative;
      });
      
      return years;
    } else {
      // 全期間: 全データを月次で集計
      const allMonths = new Map<string, {
        month: string;
        monthKey: string;
        maintenanceCost: number;
        fuelCost: number;
        customizationCost: number;
        cost: number;
        cumulativeCost: number;
        date: Date;
      }>();
      
      // 全データから年月を抽出
      [...maintenanceRecords, ...fuelLogs, ...customizations].forEach(item => {
        const itemDate = toDate((item as any).date) || new Date();
        const monthKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!allMonths.has(monthKey)) {
          const date = new Date(itemDate.getFullYear(), itemDate.getMonth(), 1);
          allMonths.set(monthKey, {
            month: date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' }),
            monthKey,
            maintenanceCost: 0,
            fuelCost: 0,
            customizationCost: 0,
            cost: 0,
            cumulativeCost: 0,
            date
          });
        }
      });
      
      // 各月の費用を計算
      allMonths.forEach((monthData, monthKey) => {
        const date = monthData.date;
        
        // メンテナンス費用
        monthData.maintenanceCost = maintenanceRecords
          .filter(record => {
            const recordDate = toDate(record.date) || new Date();
            return recordDate.getFullYear() === date.getFullYear() && 
                   recordDate.getMonth() === date.getMonth();
          })
          .reduce((sum, record) => sum + (record.cost || 0), 0);
        
        // 給油費用
        monthData.fuelCost = fuelLogs
          .filter(log => {
            const logDate = toDate(log.date) || new Date();
            return logDate.getFullYear() === date.getFullYear() && 
                   logDate.getMonth() === date.getMonth();
          })
          .reduce((sum, log) => sum + (log.totalCostJpy || log.cost || 0), 0);
        
        // カスタマイズ費用
        monthData.customizationCost = customizations
          .filter(custom => {
            const customDate = toDate(custom.date) || new Date();
            return customDate.getFullYear() === date.getFullYear() && 
                   customDate.getMonth() === date.getMonth();
          })
          .reduce((sum, custom) => {
            const partsCost = custom.partsCostJpy || 0;
            const laborCost = custom.laborCostJpy || 0;
            const otherCost = custom.otherCostJpy || 0;
            return sum + partsCost + laborCost + otherCost;
          }, 0);
        
        monthData.cost = monthData.maintenanceCost + monthData.fuelCost + monthData.customizationCost;
      });
      
      // 日付順にソート
      const sortedMonths = Array.from(allMonths.values()).sort((a, b) => 
        a.date.getTime() - b.date.getTime()
      );
      
      // 累積費用を計算
      let cumulative = 0;
      sortedMonths.forEach(month => {
        cumulative += month.cost;
        month.cumulativeCost = cumulative;
      });
      
      return sortedMonths;
    }
  }, [expensePeriod, maintenanceRecords, fuelLogs, customizations]);

  // 後方互換性のため、monthlyExpenseDataを維持
  const monthlyExpenseData = expenseData;





  return (
    <>
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">ホーム</h1>
          {/* Primaryアクション: 記録を追加 */}
          {car && (
            <UnifiedCTA
              onMaintenance={() => setShowMaintenanceModal(true)}
              onFuel={() => setShowFuelLogModal(true)}
              onCustom={() => setShowCustomizationModal(true)}
            />
          )}
        </div>
        {/* クイックアクション */}
        {car && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowFuelLogModal(true)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              給油
            </button>
            <button
              onClick={() => setShowMaintenanceModal(true)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              整備
            </button>
            <button
              onClick={() => setShowCustomizationModal(true)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              カスタム
            </button>
          </div>
        )}
      </div>




      {/* 車検期限リマインダー */}
      {car?.inspectionExpiry && (() => {
        const expiryDate = car.inspectionExpiry.toDate ? car.inspectionExpiry.toDate() : new Date(car.inspectionExpiry as any);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // 走行ペースから推定走行距離を計算
        let estimatedKmUntilExpiry: number | null = null;
        if (car.avgKmPerMonth && car.avgKmPerMonth > 0) {
          estimatedKmUntilExpiry = Math.round((daysUntilExpiry / 30) * car.avgKmPerMonth);
        }
        
        if (daysUntilExpiry <= 30) {
          return (
            <div className={`rounded-2xl border p-6 mb-6 ${
              daysUntilExpiry <= 7 ? 'border-red-200 bg-red-50' :
              daysUntilExpiry <= 14 ? 'border-yellow-200 bg-yellow-50' :
              'border-blue-200 bg-blue-50'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">車検期限リマインダー</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {car.name}の車検期限まで <span className="font-bold">{daysUntilExpiry}日</span> です
                    {estimatedKmUntilExpiry && (
                      <span className="ml-1 text-sm">
                        （概ね{estimatedKmUntilExpiry.toLocaleString()}km）
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    期限: {expiryDate.toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  daysUntilExpiry <= 7 ? 'bg-red-100 text-red-800' :
                  daysUntilExpiry <= 14 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {daysUntilExpiry <= 7 ? '緊急' : daysUntilExpiry <= 14 ? '注意' : '情報'}
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}



            {/* 車カード（選択中の車を表示 / なければダミー） */}
            <section className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
        {/* 車選択ヘッダー */}
        {cars.length > 1 && (
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              現在の車: {car?.name || "未選択"}
              {car?.modelCode && `（${car.modelCode}）`}
            </div>
            <div className="text-xs text-gray-500">
              {cars.length}台登録済み
            </div>
          </div>
        )}
        
              {car ? (
                <>
                  {/* 上：サマリー */}
                  <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 mb-4">
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                      <img
                        src={car.imagePath || "/car.jpg"}
                        alt={car.name || "My Car"}
                        className="w-full h-44 md:h-full object-cover rounded-xl"
                        onLoad={() => {
                          // 画像読み込み完了時の処理
                        }}
                        onError={() => {
                          // 画像読み込みエラー時の処理
                        }}
                      />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold mb-3">
                        {car.name}
                        {car.modelCode ? `（${car.modelCode}）` : ""}
                      </h2>
                      {/* 主要KPI: 走行距離・車検期限を強調 */}
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">走行距離</div>
                          <div className="text-lg font-bold text-gray-900">
                            {car.odoKm
                              ? `${car.odoKm.toLocaleString()} km`
                              : "未設定"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">車検期限</div>
                          {car.inspectionExpiry ? (() => {
                            const expiryDate = car.inspectionExpiry.toDate ? car.inspectionExpiry.toDate() : new Date(car.inspectionExpiry as any);
                            const today = new Date();
                            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                            const isNearExpiry = daysUntilExpiry <= 30;
                            return (
                              <div>
                                <div className={`text-lg font-bold ${isNearExpiry ? daysUntilExpiry <= 7 ? 'text-red-600' : daysUntilExpiry <= 14 ? 'text-orange-600' : 'text-yellow-600' : 'text-gray-900'}`}>
                                  {expiryDate.toLocaleDateString('ja-JP', {
                                    year: 'numeric',
                                    month: 'numeric',
                                    day: 'numeric'
                                  })}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  あと{daysUntilExpiry}日
                                </div>
                              </div>
                            );
                          })() : (
                            <div className="text-lg font-bold text-gray-900">未設定</div>
                          )}
                        </div>
                      </div>
                      {/* 履歴の充実度 */}
                      {(() => {
                        const maintenanceCount = maintenanceRecords.length;
                        const latestMaintenance = maintenanceRecords.length > 0 ? maintenanceRecords.sort((a, b) => toMillis(b.date) - toMillis(a.date))[0] : null;
                        const evidenceCount = maintenanceRecords.filter(r => r.attachments && r.attachments.length > 0).length;
                        const evidenceRate = maintenanceCount > 0 ? Math.round((evidenceCount / maintenanceCount) * 100) : 0;
                        return (
                          <div className="flex items-center gap-4 text-xs text-gray-600 pt-3 border-t border-gray-200">
                            <span>記録: {maintenanceCount}件</span>
                            <span>証憑: {evidenceCount}件（{evidenceRate}%）</span>
                            <span>直近整備: {latestMaintenance ? (latestMaintenance.date?.toDate ? latestMaintenance.date.toDate() : toDate(latestMaintenance.date) || new Date()).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : 'なし'}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  {/* 下：アクション */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <button 
                      onClick={() => {
                        console.log("Navigate to vehicle data, activeCarId:", activeCarId);
                        setCurrentPage('my-car');
                      }}
                      className="px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      マイカーを見る →
                    </button>
                    {/* Primary CTA: 記録を追加 */}
                    <UnifiedCTA
                      onMaintenance={() => setShowMaintenanceModal(true)}
                      onFuel={() => setShowFuelLogModal(true)}
                      onCustom={() => setShowCustomizationModal(true)}
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="text-gray-400 mb-4">
                    <CarIcon className="h-16 w-16 mx-auto" />
                  </div>
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    {cars.length === 0 ? "まず車を追加してください" : "車を選択してください"}
                  </p>
                  {cars.length === 0 && (
                    <button
                      onClick={() => setShowAddCarModal(true)}
                      className="mt-4 rounded-xl bg-blue-600 text-white px-6 py-3 text-sm font-medium hover:bg-blue-500"
                    >
                      車を追加する
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* メンテナンス、給油情報、カスタマイズ情報を3列に配置 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* メンテナンス */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
                <SectionHeader
                  title="最近のメンテナンス"
                  size="md"
                  right={
                    <button
                      onClick={() => setCurrentPage('maintenance-history')}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      すべて見る →
                    </button>
                  }
                />
              
              {maintenanceRecords.length > 0 ? (
                <div className="space-y-3">
                  {/* 最新1件 */}
                  {(() => {
                    const latest = maintenanceRecords.sort((a, b) => toMillis(b.date) - toMillis(a.date))[0];
                    return (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">最新の整備</div>
                            <div className="text-sm font-medium text-gray-900">{latest.title}</div>
                          </div>
                          <div className="text-right">
                            {latest.cost && (
                              <div className="text-sm font-bold text-gray-900">
                                ¥{latest.cost.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ミニ統計（2つまで） */}
                  {(() => {
                    const totalCost = maintenanceRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
                    const recentCount = maintenanceRecords.filter(r => {
                      const recordDate = toDate(r.date) || new Date();
                      const threeMonthsAgo = new Date();
                      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                      return recordDate >= threeMonthsAgo;
                    }).length;
                    return (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-2 bg-gray-50 rounded-lg">
                          <div className="text-xs font-bold text-blue-600">
                            ¥{totalCost.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">総費用</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded-lg">
                          <div className="text-xs font-bold text-green-600">
                            {recentCount}件
                          </div>
                          <div className="text-xs text-gray-500 mt-1">直近3ヶ月</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 最近の履歴（直近3件） */}
                  <div className="space-y-2">
                    {maintenanceRecords
                      .sort((a, b) => toMillis(b.date) - toMillis(a.date))
                      .slice(0, 3)
                      .map((record) => (
                      <div key={record.id} className="border border-gray-200 rounded-lg p-2 hover:bg-gray-50 transition">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{record.title}</div>
                            <div className="text-xs text-gray-600 mt-0.5">
                              {(record.date?.toDate ? record.date.toDate() : toDate(record.date) || new Date()).toLocaleDateString('ja-JP')} • {record.mileage?.toLocaleString()}km
                            </div>
                          </div>
                          {record.cost && (
                            <div className="text-sm font-medium text-gray-900">
                              ¥{record.cost.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {maintenanceRecords.length > 3 && (
                    <div className="pt-2 text-center border-t border-gray-200">
                      <button
                        onClick={() => setCurrentPage('maintenance-history')}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        もっと見る ({maintenanceRecords.length}件) →
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">最初の整備を1件追加しましょう</h4>
                  <p className="text-gray-500 mb-4 text-sm">オイル交換や車検の記録からでOKです</p>
                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => activeCarId ? setShowMaintenanceModal(true) : setCurrentPage('my-car')}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    >
                      整備を追加
                    </button>
                  </div>
                </div>
              )}
            </div>

              {/* 最近の給油 */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
                <SectionHeader
                  title="最近の給油"
                  right={
                    <button
                      onClick={() => setCurrentPage('fuel-logs')}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      すべて見る →
                    </button>
                  }
                />
                
                {!car ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">給油記録がありません</h4>
                    <p className="text-gray-500 mb-4">まず車を追加してください</p>
                    <button
                      onClick={() => setShowAddCarModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      車を追加する
                    </button>
                  </div>
                ) : car && fuelLogs.length > 0 ? (
                    <div className="space-y-3">
                      {/* 最新1件 */}
                      {(() => {
                        const latest = fuelLogs.sort((a, b) => {
                          const aSeconds = a.date?.seconds || 0;
                          const bSeconds = b.date?.seconds || 0;
                          return bSeconds - aSeconds;
                        })[0];
                        const amt = getDisplayAmount(latest);
                        return (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-xs text-gray-500 mb-1">最新の給油</div>
                                <div className="text-sm font-medium text-gray-900">
                                  {(latest.date?.toDate ? latest.date.toDate() : new Date()).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })} • {((latest.quantity || 0) / 1000 || latest.fuelAmount || 0).toLocaleString()}L
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-gray-900">
                                  ¥{getDisplayCost(latest).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* ミニ統計（2つまで） */}
                      {(() => {
                        const currentEfficiency = calculateFuelEfficiency(fuelLogs);
                        // 前回からの走行距離を計算
                        const sortedLogs = fuelLogs.sort((a, b) => {
                          const aSeconds = a.date?.seconds || 0;
                          const bSeconds = b.date?.seconds || 0;
                          return bSeconds - aSeconds;
                        });
                        const latestKm = sortedLogs[0]?.odoKm || 0;
                        const previousKm = sortedLogs[1]?.odoKm || 0;
                        const distanceSinceLastRefuel = latestKm > 0 && previousKm > 0 ? latestKm - previousKm : null;
                        return (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-2 bg-gray-50 rounded-lg">
                              <div className="text-xs font-bold text-blue-600">
                                {currentEfficiency ? `${currentEfficiency} km/L` : '--'}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">現在の燃費</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded-lg">
                              <div className="text-xs font-bold text-indigo-600">
                                {distanceSinceLastRefuel !== null ? `${distanceSinceLastRefuel.toLocaleString()} km` : '--'}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">前回からの走行</div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 最近の給油履歴（直近3件） */}
                      <div className="space-y-2">
                        {fuelLogs
                          .sort((a, b) => {
                            const aSeconds = a.date?.seconds || 0;
                            const bSeconds = b.date?.seconds || 0;
                            return bSeconds - aSeconds;
                          })
                          .slice(0, 3)
                          .map((log) => (
                          <div key={log.id} className="border border-gray-200 rounded-lg p-2 hover:bg-gray-50 transition">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">
                                  {(log.date?.toDate ? log.date.toDate() : new Date()).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                                </span>
                                <span className="text-gray-900">
                                  {((log.quantity || 0) / 1000 || log.fuelAmount || 0).toLocaleString()}L
                                </span>
                                <span className="text-gray-900 font-medium">
                                  ¥{(log.totalCostJpy || log.cost || 0).toLocaleString()}
                                </span>
                              </div>
                              {log.isFullTank && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                  満タン
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {fuelLogs.length > 3 && (
                        <div className="pt-2 text-center border-t border-gray-200">
                          <button
                            onClick={() => setCurrentPage('fuel-logs')}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            もっと見る ({fuelLogs.length}件) →
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">給油記録がありません</h4>
                      <p className="text-gray-500 mb-4">1件目の給油を記録しましょう</p>
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => activeCarId ? setShowFuelLogModal(true) : setCurrentPage('my-car')}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                        >
                          給油を記録
                        </button>
                      </div>
                    </div>
                  )}
              </div>

              {/* カスタマイズ履歴 */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">最近のカスタマイズ</h3>
                  <button
                    onClick={() => setCurrentPage('customizations')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    すべて見る →
                  </button>
                </div>
                
                {customizations.length > 0 ? (
                  <div className="space-y-3">
                    {/* 最新1件 */}
                    {(() => {
                      const latest = customizations.sort((a, b) => toMillis(b.date) - toMillis(a.date))[0];
                      const totalCost = (latest.partsCostJpy || 0) + (latest.laborCostJpy || 0) + (latest.otherCostJpy || 0);
                      return (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">最新のカスタマイズ</div>
                              <div className="text-sm font-medium text-gray-900">{latest.title}</div>
                            </div>
                            <div className="text-right">
                              {totalCost > 0 && (
                                <div className="text-sm font-bold text-gray-900">
                                  ¥{totalCost.toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* ミニ統計（2つまで） */}
                    {(() => {
                      const totalCost = customizations.reduce((sum, c) => 
                        sum + (c.partsCostJpy || 0) + (c.laborCostJpy || 0) + (c.otherCostJpy || 0), 0);
                      const categoryCount = new Set(customizations.flatMap(c => c.categories)).size;
                      return (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center p-2 bg-gray-50 rounded-lg">
                            <div className="text-xs font-bold text-purple-600">
                              ¥{totalCost.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">総費用</div>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded-lg">
                            <div className="text-xs font-bold text-indigo-600">
                              {categoryCount}種類
                            </div>
                            <div className="text-xs text-gray-500 mt-1">カテゴリ</div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 最近の履歴（直近3件） */}
                    <div className="space-y-2">
                      {customizations
                        .sort((a, b) => toMillis(b.date) - toMillis(a.date))
                        .slice(0, 3)
                        .map((customization) => {
                          const totalCost = (customization.partsCostJpy || 0) + (customization.laborCostJpy || 0) + (customization.otherCostJpy || 0);
                          return (
                            <div key={customization.id} className="border border-gray-200 rounded-lg p-2 hover:bg-gray-50 transition">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{customization.title}</div>
                                  <div className="text-xs text-gray-600 mt-0.5">
                                    {(customization.date?.toDate ? customization.date.toDate() : toDate(customization.date) || new Date()).toLocaleDateString('ja-JP')}
                                    {customization.categories.length > 0 && (
                                      <span className="ml-2">
                                        {CATEGORY_LABELS[customization.categories[0]]}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {totalCost > 0 && (
                                  <div className="text-sm font-medium text-gray-900">
                                    ¥{totalCost.toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    {customizations.length > 3 && (
                      <div className="pt-2 text-center border-t border-gray-200">
                        <button
                          onClick={() => setCurrentPage('customizations')}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          もっと見る ({customizations.length}件) →
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">最初のカスタマイズを追加しましょう</h4>
                    <p className="text-gray-500 mb-4 text-sm">タイヤ/ホイール/足回りなどからでOKです</p>
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => (activeCarId && auth.currentUser) ? setShowCustomizationModal(true) : setCurrentPage('my-car')}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                      >
                        カスタマイズを追加
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 下段：月別費用推移 */}
            <section className="w-full">
              <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">
                    {expensePeriod === 'monthly' ? '月別費用推移' : 
                     expensePeriod === 'yearly' ? '年別費用推移' : 
                     '費用推移（全期間）'}
                  </h3>
                  <div className="flex gap-2 text-sm">
                    <button 
                      onClick={() => setExpensePeriod('monthly')}
                      className={`px-3 py-1 rounded-full transition-colors ${
                        expensePeriod === 'monthly'
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      月次
                    </button>
                    <button 
                      onClick={() => setExpensePeriod('yearly')}
                      className={`px-3 py-1 rounded-full transition-colors ${
                        expensePeriod === 'yearly'
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      年次
                    </button>
                    <button 
                      onClick={() => setExpensePeriod('all')}
                      className={`px-3 py-1 rounded-full transition-colors ${
                        expensePeriod === 'all'
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      全期間
                    </button>
                </div>
                </div>
                {/* 要約値チップ（月次表示時のみ） */}
                {expensePeriod === 'monthly' && monthlyExpenseData.length > 0 && (() => {
                  const now = new Date();
                  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                  const currentMonthData = monthlyExpenseData.find(m => m.monthKey === currentMonthKey) || monthlyExpenseData[monthlyExpenseData.length - 1];
                  const previousMonthData = monthlyExpenseData[monthlyExpenseData.length - 2] || null;
                  const totalCost = currentMonthData.cost;
                  const diff = previousMonthData ? totalCost - previousMonthData.cost : 0;
                  return (
                    <div className="mb-4 flex flex-wrap gap-2">
                      <div className="px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-xs text-gray-600 mb-0.5">今月の総費用</div>
                        <div className="text-lg font-bold text-gray-900">¥{totalCost.toLocaleString()}</div>
                      </div>
                      <div className="px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-xs text-gray-600 mb-0.5">内訳</div>
                        <div className="text-sm text-gray-900">
                          整備: ¥{currentMonthData.maintenanceCost.toLocaleString()} / 給油: ¥{currentMonthData.fuelCost.toLocaleString()} / カスタム: ¥{currentMonthData.customizationCost.toLocaleString()}
                        </div>
                      </div>
                      {previousMonthData && (
                        <div className={`px-3 py-1.5 rounded-lg border ${
                          diff >= 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                        }`}>
                          <div className="text-xs text-gray-600 mb-0.5">前月比</div>
                          <div className={`text-sm font-bold ${diff >= 0 ? 'text-red-700' : 'text-green-700'}`}>
                            {diff >= 0 ? '+' : ''}¥{Math.abs(diff).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            前月: ¥{previousMonthData.cost.toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlyExpenseData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        axisLine={{ stroke: '#e0e0e0' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        axisLine={{ stroke: '#e0e0e0' }}
                        tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          const nameMap: { [key: string]: string } = {
                            'maintenanceCost': 'メンテナンス費用',
                            'fuelCost': '給油費用',
                            'customizationCost': 'カスタマイズ費用',
                            'cumulativeCost': '累積費用'
                          };
                          return [`¥${value.toLocaleString()}`, nameMap[name] || name];
                        }}
                        labelFormatter={(label) => `${label}`}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        // 累積費用の重複を防ぐため、Areaは非表示にする
                        filterNull={false}
                      />
                      <RechartsBar 
                        dataKey="maintenanceCost" 
                        fill="#3b82f6" 
                        radius={[2, 2, 0, 0]}
                        name="maintenanceCost"
                      />
                      <RechartsBar 
                        dataKey="fuelCost" 
                        fill="#10b981" 
                        radius={[2, 2, 0, 0]}
                        name="fuelCost"
                      />
                      <RechartsBar 
                        dataKey="customizationCost" 
                        fill="#8b5cf6" 
                        radius={[2, 2, 0, 0]}
                        name="customizationCost"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cumulativeCost" 
                        stroke="#f59e0b" 
                        strokeWidth={3}
                        dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                        name="cumulativeCost"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                
                {/* 凡例 */}
                <div className="mt-4 flex justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>メンテナンス費用</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>給油費用</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded"></div>
                    <span>カスタマイズ費用</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                    <span>累積費用</span>
                  </div>
                </div>
              </div>

            </section>

      {/* フッター */}
      <footer className="border-t border-gray-200 bg-gray-50 mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 text-sm text-gray-600">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img 
                src="/icon.png" 
                alt="GarageLog" 
                className="h-10 w-10 rounded-xl shadow-md"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <div>
                <p className="font-bold text-gray-900 text-base">GarageLog</p>
                <p className="text-xs text-gray-500">© {new Date().getFullYear()} GarageLog</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 md:gap-6 text-xs md:text-sm">
              <a className="hover:text-blue-600 font-medium transition-colors" href="/legal/privacy">プライバシーポリシー</a>
              <a className="hover:text-blue-600 font-medium transition-colors" href="/legal/terms">利用規約</a>
              <a className="hover:text-blue-600 font-medium transition-colors" href="/support">サポート</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

// ヘッダー用車両ドロップダウン
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
  const activeCar = cars.find(c => c.id === activeCarId) || cars[0];

  // モバイル判定
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // クリックアウトサイドで閉じる
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

  // ESCキーで閉じる
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

  return (
    <div className="relative flex-shrink-0" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-9 sm:h-10 px-2 sm:px-3 rounded-lg border border-gray-300 bg-white flex items-center gap-1.5 sm:gap-2 shadow-sm hover:bg-gray-50 min-w-0"
      >
        {/* アクティブ車両のサムネイル */}
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
            {/* ヘッダー */}
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900">車両を選択</h3>
                <span className="text-xs text-gray-500">{cars.length}台</span>
              </div>
            </div>
            
            {/* 車両リスト */}
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
                  {/* 車両画像サムネイル */}
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
            
            {/* フッター */}
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

// コンパクトな提案カードコンポーネント
function CompactSuggestionCard({
  suggestion,
  onCreateFromTemplate
}: {
  suggestion: any;
  onCreateFromTemplate: (templateId: string) => void;
}) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return '🔴';
      case 'soon': return '🟠';
      case 'upcoming': return '🟡';
      case 'ok': return '🟢';
      default: return '⚪';
    }
  };

  const getConfidenceStars = (confidence: string) => {
    switch (confidence) {
      case 'high': return '★★★';
      case 'medium': return '★★☆';
      case 'low': return '★☆☆';
      default: return '☆☆☆';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow group">
      {/* ヘッダー行 */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-gray-900 text-sm truncate">
              {suggestion.title}
            </div>
            <div className="text-xs text-gray-500">
              {getConfidenceStars(suggestion.confidence)}
            </div>
          </div>
        </div>
      </div>

      {/* 情報行 */}
      <div className="text-xs text-gray-700 mb-2 space-y-1">
        {suggestion.dueInfo.remainKm !== Infinity && suggestion.dueInfo.remainDays !== Infinity ? (
          <div className="flex items-center gap-2">
            <span>残り {Math.round(suggestion.dueInfo.remainKm).toLocaleString()}km</span>
            <span className="text-gray-400">•</span>
            <span>{suggestion.dueInfo.remainDays}日</span>
          </div>
        ) : suggestion.dueInfo.remainKm !== Infinity ? (
          <div>残り {Math.round(suggestion.dueInfo.remainKm).toLocaleString()}km</div>
        ) : (
          <div>残り {suggestion.dueInfo.remainDays}日</div>
        )}
        
        {suggestion.dueInfo.isOverdue && (
          <div className="text-red-600 font-semibold">期限超過</div>
        )}
      </div>

      {/* 進捗バー＋ボタン */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                suggestion.status === 'critical'
                  ? 'bg-red-500 animate-pulse'
                  : suggestion.status === 'soon'
                  ? 'bg-orange-500'
                  : suggestion.status === 'upcoming'
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(suggestion.score, 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{suggestion.score}%</div>
        </div>
        <button
          onClick={() => onCreateFromTemplate(suggestion.templateId)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          作成
        </button>
      </div>
    </div>
  );
}

function MaintenanceHistoryContent({
  cars,
  activeCarId,
  maintenanceRecords,
  setShowMaintenanceModal,
  setShowEditMaintenanceModal,
  setEditingMaintenanceRecord
}: {
  cars: Car[];
  activeCarId?: string;
  maintenanceRecords: MaintenanceRecord[];
  setShowMaintenanceModal: (show: boolean) => void;
  setShowEditMaintenanceModal: (show: boolean) => void;
  setEditingMaintenanceRecord: (record: MaintenanceRecord | null) => void;
}) {
  const [activeTab, setActiveTab] = useState<'suggestions' | 'history'>('history');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // ヘッダーで選択された車両を使用
  const selectedCar = activeCarId ? cars.find(c => c.id === activeCarId) : null;
  
  // 選択されている車両のメンテナンス記録のみを取得
  const selectedCarMaintenanceRecords = activeCarId 
    ? maintenanceRecords.filter(r => r.carId === activeCarId)
    : maintenanceRecords;

  // 提案を取得（車両が選択されている場合のみ）
  const suggestions = selectedCar 
    ? generateMaintenanceSuggestions(selectedCar, selectedCarMaintenanceRecords)
    : [];

  // 優先度別に提案を分類
  const criticalSuggestions = suggestions.filter(s => s.status === 'critical');
  const soonSuggestions = suggestions.filter(s => s.status === 'soon');
  const upcomingSuggestions = suggestions.filter(s => s.status === 'upcoming');
  const okSuggestions = suggestions.filter(s => s.status === 'ok');

  // メンテナンスカテゴリの定義
  const MAINTENANCE_CATEGORIES = {
    'all': 'すべてのカテゴリ',
    'engine': 'エンジン',
    'transmission': 'トランスミッション',
    'brake': 'ブレーキ',
    'suspension': 'サスペンション',
    'exhaust': '排気系',
    'electrical': '電気系',
    'body': 'ボディ',
    'interior': '内装',
    'tire': 'タイヤ',
    'battery': 'バッテリー',
    'air_conditioner': 'エアコン',
    'other': 'その他'
  };

  // メンテナンスステータスの定義
  const MAINTENANCE_STATUS = {
    'all': 'すべてのステータス',
    'completed': '完了',
    'scheduled': '予定',
    'in_progress': '進行中',
    'cancelled': 'キャンセル'
  };

  // フィルタリングされたメンテナンス
  const filteredRecords = useMemo(() => {
    console.log("Filtering maintenance records:", {
      totalRecords: maintenanceRecords.length,
      activeCarId,
      searchTerm,
      selectedCategory,
      selectedStatus,
      sortBy,
      sortOrder,
      records: maintenanceRecords.map(r => ({ id: r.id, title: r.title, carId: r.carId }))
    });
    
    let filtered = maintenanceRecords;

    // ヘッダーで選択された車両でフィルタリング
    if (activeCarId) {
      console.log("Filtering by car ID:", activeCarId);
      const beforeCount = filtered.length;
      filtered = filtered.filter(record => record.carId === activeCarId);
      console.log(`Car filter: ${beforeCount} -> ${filtered.length} records`);
    }

    // 検索でフィルタリング
    if (searchTerm) {
      console.log("Filtering by search term:", searchTerm);
      const beforeCount = filtered.length;
      filtered = filtered.filter(record => 
        record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.description && record.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (record.location && record.location.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      console.log(`Search filter: ${beforeCount} -> ${filtered.length} records`);
    }

    // カテゴリでフィルタリング（タイトルから推測）
    if (selectedCategory !== 'all') {
      console.log("Filtering by category:", selectedCategory);
      const beforeCount = filtered.length;
      filtered = filtered.filter(record => {
        const title = record.title.toLowerCase();
        switch (selectedCategory) {
          case 'engine':
            return title.includes('エンジン') || title.includes('オイル') || title.includes('オイル交換') || title.includes('エンジンオイル');
          case 'brake':
            return title.includes('ブレーキ') || title.includes('ブレーキパッド') || title.includes('ブレーキフルード');
          case 'tire':
            return title.includes('タイヤ') || title.includes('ホイール') || title.includes('バランス');
          case 'battery':
            return title.includes('バッテリー') || title.includes('バッテリ');
          case 'air_conditioner':
            return title.includes('エアコン') || title.includes('冷媒') || title.includes('ガス');
          case 'electrical':
            return title.includes('電気') || title.includes('配線') || title.includes('ランプ') || title.includes('バルブ');
          case 'suspension':
            return title.includes('サスペンション') || title.includes('ショック') || title.includes('ストラット');
          case 'transmission':
            return title.includes('トランスミッション') || title.includes('ATF') || title.includes('MTF');
          case 'exhaust':
            return title.includes('排気') || title.includes('マフラー') || title.includes('触媒');
          case 'body':
            return title.includes('ボディ') || title.includes('塗装') || title.includes('板金');
          case 'interior':
            return title.includes('内装') || title.includes('シート') || title.includes('ダッシュボード');
          default:
            return true;
        }
      });
      console.log(`Category filter: ${beforeCount} -> ${filtered.length} records`);
    }

    // ステータスでフィルタリング（現在はすべて完了として扱う）
    if (selectedStatus !== 'all') {
      console.log("Filtering by status:", selectedStatus);
      const beforeCount = filtered.length;
      // 現在の実装ではすべてのメンテナンス記録は完了済みとして扱う
      if (selectedStatus === 'completed') {
        // すべての記録を表示
      } else {
        // 他のステータスは現在未実装
        filtered = [];
      }
      console.log(`Status filter: ${beforeCount} -> ${filtered.length} records`);
    }

    // 並び替え
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = toMillis(a.date) - toMillis(b.date);
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'cost':
          comparison = (a.cost || 0) - (b.cost || 0);
          break;
        case 'mileage':
          comparison = (a.mileage || 0) - (b.mileage || 0);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    console.log("Final filtered records:", filtered.length);
    return filtered;
  }, [maintenanceRecords, activeCarId, searchTerm, selectedCategory, selectedStatus, sortBy, sortOrder]);

  // 車両名を取得する関数
  const getCarName = (carId: string) => {
    const car = cars.find(c => c.id === carId);
    return car ? car.name : '不明な車両';
  };

  // 編集ボタンのハンドラー
  const handleEditRecord = (record: MaintenanceRecord) => {
    setEditingMaintenanceRecord(record);
    setShowEditMaintenanceModal(true);
  };

  // 削除ボタンのハンドラー
  const handleDeleteRecord = async (record: MaintenanceRecord) => {
    if (!record.id) return;
    
    if (confirm(`「${record.title}」を削除しますか？`)) {
      try {
        await deleteMaintenanceRecord(record.id);
        console.log("Maintenance record deleted successfully");
      } catch (error) {
        console.error("Error deleting maintenance record:", error);
        alert("削除に失敗しました。");
      }
    }
  };

  // 一括削除のハンドラー
  const handleBulkDelete = async () => {
    if (selectedRecords.length === 0) {
      alert("削除する記録を選択してください");
      return;
    }
    
    if (!confirm(`選択した${selectedRecords.length}件の記録を削除しますか？この操作は取り消せません。`)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      await deleteMultipleMaintenanceRecords(selectedRecords);
      
      
      setSelectedRecords([]);
      alert(`${selectedRecords.length}件の記録を削除しました`);
    } catch (error) {
      console.error("Error deleting multiple records:", error);
      alert("一括削除に失敗しました");
    } finally {
      setIsDeleting(false);
    }
  };

  // 個別選択のハンドラー
  const handleSelectRecord = (recordId: string) => {
    setSelectedRecords(prev => 
      prev.includes(recordId) 
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    );
  };

  // 全選択のハンドラー
  const handleSelectAll = () => {
    if (selectedRecords.length === filteredRecords.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(filteredRecords.map(record => record.id!));
    }
  };


  return (
    <>
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">メンテナンス</h1>
        <div className="flex gap-3">
          {/* 一括削除機能を一時的に無効化 */}
          {/* {selectedRecords.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="rounded-xl bg-red-600 text-white px-4 py-2 font-medium hover:bg-red-500 transition disabled:opacity-50"
            >
              {isDeleting ? '削除中...' : `選択した${selectedRecords.length}件を削除`}
            </button>
          )} */}
          <button
            onClick={() => setShowMaintenanceModal(true)}
            className="rounded-xl bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-500 transition"
          >
            ＋ メンテナンスを記録
                  </button>
                </div>
      </div>

      {/* 統計カード */}
      {(() => {
        const totalRecords = maintenanceRecords.length;
        const totalCost = maintenanceRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
        const avgCost = totalRecords > 0 ? Math.round(totalCost / totalRecords) : 0;
        const lastMaintenance = maintenanceRecords
          .sort((a, b) => toMillis(b.date) - toMillis(a.date))[0];
        const lastMaintenanceDate = lastMaintenance 
          ? (lastMaintenance.date?.toDate ? lastMaintenance.date.toDate() : new Date())
          : null;

        const summaryCards = [
          {
            title: '総メンテナンス回数',
            value: `${totalRecords} 回`,
            description: '保存済みの記録',
            icon: '🔧',
          },
          {
            title: '累計費用',
            value: `¥${totalCost.toLocaleString()}`,
            description: '税込み合計',
            icon: '💴',
          },
          {
            title: '平均費用',
            value: avgCost > 0 ? `¥${avgCost.toLocaleString()}` : '---',
            description: '1回あたり平均',
            icon: '📊',
          },
          {
            title: '直近メンテナンス',
            value: lastMaintenanceDate 
              ? lastMaintenanceDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
              : '記録なし',
            description: '最新の実施日',
            icon: '📅',
          },
        ];

        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map((card) => (
              <div
                key={card.title}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.title}</span>
                  <span className="text-xl">{card.icon}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                <p className="mt-1 text-xs text-gray-500">{card.description}</p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* フィルター・検索 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 検索 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              検索
            </label>
            <input
              type="text"
              placeholder="タイトル、説明、場所で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
            />
          </div>

          {/* カテゴリフィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              カテゴリ
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
            >
              {Object.entries(MAINTENANCE_CATEGORIES).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          {/* ステータスフィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ステータス
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
            >
              {Object.entries(MAINTENANCE_STATUS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ソートオプション */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">並び順:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="date">実施日</option>
              <option value="title">タイトル</option>
              <option value="cost">費用</option>
              <option value="mileage">走行距離</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 rounded hover:bg-gray-100 transition"
              title={sortOrder === 'asc' ? '昇順' : '降順'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            {filteredRecords.length}件のメンテナンス記録
          </div>
        </div>
      </div>

      {/* 履歴一覧 */}
      <div className="bg-white rounded-2xl border border-gray-200">
        {filteredRecords.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {maintenanceRecords.length === 0 
                ? "メンテナンス記録がありません" 
                : "フィルター条件に一致するメンテナンス記録がありません"
              }
            </h3>
            <p className="text-gray-500 mb-4">
              {maintenanceRecords.length === 0 
                ? "最初のメンテナンスを記録しましょう。" 
                : "フィルター条件を変更して再度お試しください。"
              }
            </p>
            {maintenanceRecords.length === 0 && (
              <button
                onClick={() => setShowMaintenanceModal(true)}
                className="rounded-xl bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-500 transition"
              >
                メンテナンスを記録
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredRecords.map((record) => (
              <div key={record.id} className="p-6 hover:bg-gray-50 transition">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {/* チェックボックスを一時的に無効化 */}
                    {/* <input
                      type="checkbox"
                      checked={selectedRecords.includes(record.id!)}
                      onChange={() => handleSelectRecord(record.id!)}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    /> */}
                    <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {record.title}
                      </span>
                      <span className="text-sm text-gray-500">
                        {getCarName(record.carId)}
                      </span>
              </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {record.title}
                    </h3>
                    {record.description && (
                      <p className="text-gray-600 mb-2">{record.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{(record.date?.toDate ? record.date.toDate() : new Date()).toLocaleDateString('ja-JP')}</span>
                      {record.cost && (
                        <span>¥{record.cost.toLocaleString()}</span>
                      )}
                      {record.mileage && (
                        <span>{record.mileage.toLocaleString()} km</span>
                      )}
                      {record.location && (
                        <span>{record.location}</span>
                      )}
                    </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button 
                      onClick={() => handleEditRecord(record)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      編集
                    </button>
                    <button 
                      onClick={() => handleDeleteRecord(record)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function DataManagementContent({
  cars,
  maintenanceRecords,
  customizations,
  activeCarId
}: {
  cars: Car[];
  maintenanceRecords: MaintenanceRecord[];
  customizations: Customization[];
  activeCarId: string | undefined;
}) {
  // プレミアムガード（このコンポーネント内で使用）
  const { checkFeature } = usePremiumGuard();
  
  // CSVエクスポート機能
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      alert('エクスポートするデータがありません。');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value instanceof Date) {
            return value.toISOString().split('T')[0];
          }
          return `"${String(value || '').replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCars = () => {
    const carsData = cars.map(car => ({
      id: car.id,
      name: car.name,
      modelCode: car.modelCode || '',
      year: car.year || '',
      odoKm: car.odoKm || '',
      inspectionExpiry: car.inspectionExpiry instanceof Date ? 
                       car.inspectionExpiry.toISOString().split('T')[0] : '',
      createdAt: car.createdAt || new Date(),
      updatedAt: car.updatedAt || new Date()
    }));
    exportToCSV(carsData, `cars_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportMaintenance = () => {
    const maintenanceData = maintenanceRecords.map(record => ({
      id: record.id,
      carId: record.carId,
      carName: cars.find(c => c.id === record.carId)?.name || '不明',
      title: record.title,
      description: record.description || '',
      cost: record.cost || '',
      mileage: record.mileage || '',
      date: record.date,
      location: record.location || '',
      createdAt: record.createdAt || new Date(),
      updatedAt: record.updatedAt || new Date()
    }));
    exportToCSV(maintenanceData, `maintenance_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportCustomizations = () => {
    if (!activeCarId) {
      alert('車両を選択してください。');
      return;
    }
    
    const customizationData = customizations.map((custom: Customization) => ({
      id: custom.id,
      carId: activeCarId,
      carName: cars.find(c => c.id === activeCarId)?.name || '不明',
      title: custom.title,
      brand: custom.brand || '',
      modelCode: custom.modelCode || '',
      categories: custom.categories.join(', '),
      status: custom.status,
      date: custom.date,
      odoKm: custom.odoKm || '',
      vendorType: custom.vendorType || '',
      vendorName: custom.vendorName || '',
      partsCostJpy: custom.partsCostJpy || '',
      laborCostJpy: custom.laborCostJpy || '',
      otherCostJpy: custom.otherCostJpy || '',
      totalCost: (custom.partsCostJpy || 0) + (custom.laborCostJpy || 0) + (custom.otherCostJpy || 0),
      currency: custom.currency,
      link: custom.link || '',
      memo: custom.memo || '',
      isPublic: custom.isPublic,
      createdAt: custom.createdAt,
      updatedAt: custom.updatedAt
    }));
    exportToCSV(customizationData, `customizations_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportAll = () => {
    const allData = {
      cars: cars.map(car => ({
        id: car.id,
        name: car.name,
        modelCode: car.modelCode || '',
        year: car.year || '',
        odoKm: car.odoKm || '',
        inspectionExpiry: car.inspectionExpiry instanceof Date ? 
                         car.inspectionExpiry.toISOString().split('T')[0] : '',
        createdAt: car.createdAt || new Date(),
        updatedAt: car.updatedAt || new Date()
      })),
      maintenance: maintenanceRecords.map(record => ({
        id: record.id,
        carId: record.carId,
        carName: cars.find(c => c.id === record.carId)?.name || '不明',
        title: record.title,
        description: record.description || '',
        cost: record.cost || '',
        mileage: record.mileage || '',
        date: record.date,
        location: record.location || '',
        createdAt: record.createdAt || new Date(),
        updatedAt: record.updatedAt || new Date()
      })),
      customizations: customizations.map((custom: Customization) => ({
        id: custom.id,
        carId: activeCarId || '',
        carName: cars.find(c => c.id === activeCarId)?.name || '不明',
        title: custom.title,
        brand: custom.brand || '',
        modelCode: custom.modelCode || '',
        categories: custom.categories,
        status: custom.status,
        date: custom.date,
        odoKm: custom.odoKm || '',
        vendorType: custom.vendorType || '',
        vendorName: custom.vendorName || '',
        partsCostJpy: custom.partsCostJpy || '',
        laborCostJpy: custom.laborCostJpy || '',
        otherCostJpy: custom.otherCostJpy || '',
        currency: custom.currency,
        link: custom.link || '',
        memo: custom.memo || '',
        isPublic: custom.isPublic,
        createdAt: custom.createdAt,
        updatedAt: custom.updatedAt
      }))
    };

    const jsonContent = JSON.stringify(allData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `smart_garage_backup_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF出力機能
  const handleExportPDF = async (carId?: string) => {
    // プレミアム機能チェック
    if (!checkFeature('pdf_export', undefined, 'default')) {
      return;
    }

    try {
      if (carId) {
        // 特定の車両のPDFを生成
        const car = cars.find(c => c.id === carId);
        if (!car) {
          alert('車両が見つかりません。');
          return;
        }
        
        const carMaintenanceRecords = maintenanceRecords.filter(record => record.carId === carId);
        const options: PDFExportOptions = {
          car,
          maintenanceRecords: carMaintenanceRecords
        };
        
        await downloadMaintenancePDF(options);
      } else {
        // 全車両のPDFを生成
        for (const car of cars) {
          const carMaintenanceRecords = maintenanceRecords.filter(record => record.carId === car.id);
          if (carMaintenanceRecords.length > 0) {
            const options: PDFExportOptions = {
              car,
              maintenanceRecords: carMaintenanceRecords
            };
            await downloadMaintenancePDF(options);
          }
        }
      }
    } catch (error) {
      console.error('PDF出力エラー:', error);
      alert('PDFの生成に失敗しました。');
    }
  };

  // URL共有機能
  // handleGenerateURL関数は削除（共有URL機能削除のため）

  return (
    <>
      {/* ヘッダー */}
                <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">エクスポート</h1>
                </div>

      {/* データ統計 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">登録車両数</p>
              <p className="text-2xl font-bold text-gray-900">{cars.length}台</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
                </div>
              </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">メンテナンス記録数</p>
              <p className="text-2xl font-bold text-gray-900">{maintenanceRecords.length}件</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">総データサイズ</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round((JSON.stringify(cars).length + JSON.stringify(maintenanceRecords).length) / 1024)} KB
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* エクスポート機能 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">データエクスポート</h3>
        
        {/* 基本エクスポート */}
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-700 mb-3">基本エクスポート</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleExportCars}
              className="flex items-center justify-center gap-2 p-4 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
            >
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-medium">車両データ (CSV)</span>
            </button>

            <button
              onClick={handleExportMaintenance}
              className="flex items-center justify-center gap-2 p-4 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
            >
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-medium">メンテナンス (CSV)</span>
            </button>

            <button
              onClick={handleExportCustomizations}
              className="flex items-center justify-center gap-2 p-4 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
            >
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-medium">カスタマイズ (CSV)</span>
            </button>

            <button
              onClick={handleExportAll}
              className="flex items-center justify-center gap-2 p-4 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
            >
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-medium">全データ (JSON)</span>
            </button>
          </div>
        </div>

        {/* 履歴証明書（PDF出力） */}
        <div>
          <h4 className="text-md font-medium text-gray-700 mb-3">履歴証明書 (PDF)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleExportPDF()}
              className="flex items-center justify-center gap-2 p-4 border border-red-300 bg-red-50 rounded-xl hover:bg-red-100 transition"
            >
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="font-medium text-red-700">全車両履歴書 (PDF)</span>
            </button>
          </div>
        </div>

        {/* 車両別PDF出力 */}
        {cars.length > 0 && (
          <div className="mt-6">
            <h4 className="text-md font-medium text-gray-700 mb-3">車両別履歴書 (PDF)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {cars.map(car => {
                const carMaintenanceCount = maintenanceRecords.filter(record => record.carId === car.id).length;
                return (
                  <button
                    key={car.id}
                    onClick={() => handleExportPDF(car.id)}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="text-left">
                      <div className="font-medium text-gray-900">{car.name}</div>
                      <div className="text-sm text-gray-500">{carMaintenanceCount}件の記録</div>
                    </div>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </>
  );
}

function NotificationsContent({
  cars,
  maintenanceRecords
}: {
  cars: Car[];
  maintenanceRecords: MaintenanceRecord[];
}) {
  // 通知設定の状態
  const [notificationSettings, setNotificationSettings] = useState({
    maintenanceReminders: true,
    inspectionReminders: true,
    mileageAlerts: true,
    emailNotifications: false,
    pushNotifications: true
  });



  // 通知設定の更新
  const updateNotificationSetting = (key: string, value: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 通知のテスト送信
  const testNotification = () => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('garage log', {
          body: 'これはテスト通知です。通知機能が正常に動作しています。',
          icon: '/favicon.ico'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('garage log', {
              body: 'これはテスト通知です。通知機能が正常に動作しています。',
              icon: '/favicon.ico'
            });
          }
        });
      }
    }
  };

  return (
    <>
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">通知設定</h1>
        <button
          onClick={testNotification}
          className="rounded-xl bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-500 transition"
        >
          テスト通知
        </button>
        </div>



      {/* 通知設定 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">通知設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">メンテナンスリマインダー</h4>
              <p className="text-sm text-gray-600">メンテナンス時期の通知</p>
      </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.maintenanceReminders}
                onChange={(e) => updateNotificationSetting('maintenanceReminders', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">車検リマインダー</h4>
              <p className="text-sm text-gray-600">車検期限の通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.inspectionReminders}
                onChange={(e) => updateNotificationSetting('inspectionReminders', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">走行距離アラート</h4>
              <p className="text-sm text-gray-600">走行距離に基づく通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.mileageAlerts}
                onChange={(e) => updateNotificationSetting('mileageAlerts', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">プッシュ通知</h4>
              <p className="text-sm text-gray-600">ブラウザのプッシュ通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.pushNotifications}
                onChange={(e) => updateNotificationSetting('pushNotifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* 通知のヒント */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">通知について</h3>
        <ul className="text-blue-800 space-y-2">
          <li>• ブラウザの通知許可が必要です</li>
          <li>• 車検期限は30日前から通知されます</li>
          <li>• メンテナンスは2,000km前から通知されます</li>
          <li>• 通知設定はブラウザに保存されます</li>
        </ul>
      </div>
    </>
  );
}

function EditMaintenanceModal({
  record,
  cars,
  onClose,
  onUpdated
}: {
  record: MaintenanceRecord;
  cars: Car[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [title, setTitle] = useState(record.title);
  const [description, setDescription] = useState(record.description || '');
  const [cost, setCost] = useState(record.cost?.toString() || '');
  const [mileage, setMileage] = useState(record.mileage?.toString() || '');
  const [date, setDate] = useState((toDate(record.date) || new Date()).toISOString().split('T')[0]);
  const [location, setLocation] = useState(record.location || '');
  const [carId, setCarId] = useState(record.carId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 選択された車両の現在の走行距離を取得
  const selectedCar = cars.find(car => car.id === carId);
  const currentMileage = selectedCar?.odoKm;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record.id) return;
    
    // 走行距離のバリデーション
    if (mileage) {
      const inputMileage = Number(mileage);
      if (currentMileage && inputMileage < currentMileage) {
        alert(`走行距離は現在の値（${currentMileage.toLocaleString()} km）以上である必要があります`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const updateData = {
        carId,
        title,
        description: description || undefined,
        cost: cost ? Number(cost) : undefined,
        mileage: mileage ? Number(mileage) : undefined,
        date: Timestamp.fromDate(new Date(date)),
        location: location || undefined,
      };

      await updateMaintenanceRecord(record.id, updateData);
      
      
      onUpdated();
    } catch (error) {
      console.error("Error updating maintenance record:", error);
      if (error instanceof Error) {
        alert(`更新に失敗しました: ${error.message}`);
      } else {
        alert("更新に失敗しました。");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">メンテナンスを編集</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          {/* 車両選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              車両
            </label>
            <select
              value={carId}
              onChange={(e) => setCarId(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
              required
            >
              {cars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.name}
                </option>
              ))}
            </select>
          </div>


          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              タイトル
            </label>
            <select
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
              required
            >
              <option value="">選択してください</option>
              {['メンテナンス', '法定点検', 'その他'].map((category) => (
                <optgroup key={category} label={category}>
                  {MAINTENANCE_TITLE_OPTIONS
                    .filter(option => option.category === category)
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* 説明 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              説明
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
              placeholder="詳細な説明（任意）"
              rows={3}
            />
          </div>

          {/* 費用と走行距離 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                費用（円）
              </label>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
                placeholder="例: 5000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                走行距離（km）
              </label>
              <input
                type="number"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 placeholder:text-gray-600 text-gray-900 ${
                  currentMileage && Number(mileage) < currentMileage && mileage !== ""
                    ? "border-red-300 focus:ring-red-100 bg-red-50"
                    : "border-gray-300 focus:ring-blue-100"
                }`}
                placeholder={currentMileage ? `現在: ${currentMileage.toLocaleString()} km` : "例: 50000"}
                min={currentMileage || 0}
              />
              {currentMileage && Number(mileage) < currentMileage && mileage !== "" && (
                <p className="text-red-600 text-sm mt-1">
                  現在の走行距離（{currentMileage.toLocaleString()} km）以上を入力してください
                </p>
              )}
            </div>
          </div>

          {/* 日付と場所 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                日付
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                作業場所
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
                placeholder="例: ガソリンスタンド"
              />
            </div>
          </div>

          {/* ボタン */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 transition text-gray-900"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-500 transition disabled:opacity-50"
            >
              {isSubmitting ? "更新中..." : "更新"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
  setCurrentPage,
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
  setShowSellCarModal: (show: boolean) => void;
  setCarToSell: (car: Car | null) => void;
  setCurrentPage: (page: 'dashboard' | 'car-management' | 'maintenance-history' | 'fuel-logs' | 'customizations' | 'data-management' | 'notifications') => void;
  setShowFuelLogModal: (show: boolean) => void;
  setShowMaintenanceModal: (show: boolean) => void;
  setShowCustomizationModal: (show: boolean) => void;
  userPlan: 'free' | 'premium' | 'premium_monthly' | 'premium_yearly';
  checkFeature: (feature: any, currentUsage?: any, variant?: any) => boolean;
}) {

  const handleDeleteCar = async (carId: string, carName: string) => {
    if (!confirm(`「${carName}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }
    
    try {
      const { removeCar } = await import("@/lib/cars");
      await removeCar(carId);
      console.log("Car deleted successfully:", carId);
      
      // 削除された車が現在選択中の車の場合、選択を解除
      if (activeCarId === carId) {
        setActiveCarId("");
      }
    } catch (error) {
      console.error("Error deleting car:", error);
      alert("車両の削除に失敗しました。もう一度お試しください。");
    }
  };

  const handleEditCar = (car: Car) => {
    setEditingCar(car);
    setShowEditCarModal(true);
  };

  // クイックアクションハンドラー
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

  // 車両をステータスで分類
  const activeCars = cars.filter(car => !car.status || car.status === 'active');
  const soldCars = cars.filter(car => car.status === 'sold');
  const scrappedCars = cars.filter(car => car.status === 'scrapped');
  const downgradedCars = cars.filter(car => car.status === 'downgraded_premium');

  return (
    <>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">車両管理</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              // 車両数制限をチェック
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

      {/* 現在保有中の車両 */}
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
                  // 車両数制限をチェック
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
              
              {/* 無料プランユーザー向けのアップグレード訴求 */}
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

      {/* 売却済み車両 */}
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
                    setCurrentPage('my-car' as any);
                  }
                } }
                onDelete={() => car.id && handleDeleteCar(car.id, car.name)}
                onEdit={() => handleEditCar(car)}
                onMarkAsSold={() => { } }
                maintenanceRecords={maintenanceRecords}
                fuelLogs={fuelLogs}
                onAddFuel={handleAddFuel}
                onAddMaintenance={handleAddMaintenance}
                onAddCustomization={handleAddCustomization} checkFeature={function (feature: any, currentUsage?: any, variant?: any): boolean {
                  throw new Error("Function not implemented.");
                } }              />
            ))}
          </div>
        </div>
      )}

      {/* 廃車済み車両 */}
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
                    setCurrentPage('my-car' as any);
                  }
                } }
                onDelete={() => car.id && handleDeleteCar(car.id, car.name)}
                onEdit={() => handleEditCar(car)}
                onMarkAsSold={() => { } }
                maintenanceRecords={maintenanceRecords}
                fuelLogs={fuelLogs}
                onAddFuel={handleAddFuel}
                onAddMaintenance={handleAddMaintenance}
                onAddCustomization={handleAddCustomization} checkFeature={function (feature: any, currentUsage?: any, variant?: any): boolean {
                  throw new Error("Function not implemented.");
                } }              />
            ))}
          </div>
        </div>
      )}

      {/* ダウングレード車両（プラン制限） */}
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
                    setCurrentPage('my-car' as any);
                  }
                } }
                onDelete={() => car.id && handleDeleteCar(car.id, car.name)}
                onEdit={() => handleEditCar(car)}
                onMarkAsSold={() => { } }
                maintenanceRecords={maintenanceRecords}
                fuelLogs={fuelLogs}
                onAddFuel={handleAddFuel}
                onAddMaintenance={handleAddMaintenance}
                onAddCustomization={handleAddCustomization} checkFeature={function (feature: any, currentUsage?: any, variant?: any): boolean {
                  throw new Error("Function not implemented.");
                } }              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

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
  // テスト車両でも編集・削除を許可（デバッグ用）
  const isTestCar = false; // car.id?.startsWith('test');
  
  // ドロップダウンメニューの状態
  const [showDropdown, setShowDropdown] = useState(false);
  
  // ドロップダウンメニューを閉じる
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(false);
    };
    
    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDropdown]);
  
  // 次のメンテナンスタスクを計算
  const getNextMaintenanceTask = () => {
    if (!car.id) return null;
    
    // この車のメンテナンス記録を取得
    const carMaintenanceRecords = maintenanceRecords
      .filter(record => record.carId === car.id)
      .sort((a, b) => toMillis(b.date) - toMillis(a.date));
    
    if (carMaintenanceRecords.length === 0) return null;
    
    // 最新のメンテナンス記録を取得
    const latestRecord = carMaintenanceRecords[0];
    
    // オイル交換の場合は5,000km後を想定
    if (latestRecord.title.includes('オイル') || latestRecord.title.includes('オイル交換')) {
      const nextMileage = (latestRecord.mileage || 0) + 5000;
      const remainingKm = nextMileage - (car.odoKm || 0);
      
      if (remainingKm > 0) {
        // avgKmPerMonthを使って期限日を推定
        let estimatedDays: number | null = null;
        if (car.avgKmPerMonth && car.avgKmPerMonth > 0) {
          estimatedDays = Math.round((remainingKm / car.avgKmPerMonth) * 30);
        }
        
        return {
          title: 'オイル交換',
          remainingKm,
          nextMileage,
          estimatedDays,
          type: 'mileage'
        };
      }
    }
    
    // その他のメンテナンスの場合は3ヶ月後を想定
    const nextDate = toDate(latestRecord.date) || new Date();
    nextDate.setMonth(nextDate.getMonth() + 3);
    const today = new Date();
    const daysUntilNext = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilNext > 0) {
      return {
        title: latestRecord.title,
        daysUntilNext,
        nextDate,
        type: 'date'
      };
    }
    
    return null;
  };
  
  const nextTask = getNextMaintenanceTask();
  
  // 期限バッジの計算
  const getDeadlineBadges = () => {
    const badges = [];
    
    // 車検期限
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
    
    // 保険期限（現在は未実装のため、ダミーデータ）
    // TODO: 保険データが実装されたら実際の期限を計算
    
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
      {/* ステータスバッジ（売却済み・廃車済み・ダウングレード） */}
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
    
      {/* 編集・削除ボタン（テスト車両以外） - 右上に1つだけ */}
      {!isTestCar && (
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
            
            {/* ドロップダウンメニュー */}
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
                        if (confirm(`「${car.name}」を現在保有中に戻しますか？`)) {
                          try {
                            const { restoreCarToActive } = await import("@/lib/cars");
                            await restoreCarToActive(car.id!);
                          } catch (error) {
                            console.error('Error restoring car:', error);
                            alert('復元に失敗しました');
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
                          // ペイウォール表示（将来実装）
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
      )}
      
      {/* 車両情報（クリック可能） */}
      <div 
        className="cursor-pointer"
        onClick={() => {
          console.log("Car card clicked:", car.name, car.id);
          onSelect();
        }}
      >
        <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 mb-4">
          <img
            src={car.imagePath || "/car.jpg"}
            alt={car.name}
            className="w-full h-full object-cover"
            onLoad={() => {
              // 画像読み込み完了時の処理（必要に応じて）
            }}
            onError={() => {
              // 画像読み込みエラー時の処理（必要に応じて）
            }}
          />
        </div>
        
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
          
          {/* 次にやること */}
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
          
          {/* 期限バッジ */}
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
          
          {/* 売却情報 */}
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

/* -------------------- 小さなUI部品 -------------------- */
function NavItem({ 
  label, 
  active = false, 
  onClick 
}: { 
  label: string; 
  active?: boolean; 
  onClick?: () => void; 
}) {
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

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 px-3 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}


/* -------------------- モーダルコンポーネント -------------------- */
function MaintenanceModal({ 
  carId, 
  carName, 
  currentMileage,
  initialTitle,
  onClose, 
  onAdded 
}: { 
  carId: string; 
  carName: string; 
  currentMileage?: number;
  initialTitle?: string;
  onClose: () => void; 
  onAdded: () => void; 
}) {
  const [title, setTitle] = useState(initialTitle || "");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState<string>("");
  const [mileage, setMileage] = useState<string>(currentMileage ? currentMileage.toString() : "");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState("");

  // initialTitleが変更されたときにtitleを更新
  useEffect(() => {
    if (initialTitle) {
      setTitle(initialTitle);
    }
  }, [initialTitle]);

  async function handleAdd() {
    if (!title) return alert("タイトルを入力してください");
    if (!carId) return alert("車両が選択されていません");
    if (!mileage) return alert("走行距離を入力してください");
    
    // 走行距離のバリデーション
    const inputMileage = Number(mileage);
    if (currentMileage && inputMileage < currentMileage) {
      return alert(`走行距離は現在の値（${currentMileage.toLocaleString()} km）以上である必要があります`);
    }
    
    try {
      console.log("Adding maintenance record with data:", {
        carId,
        title,
        description,
        cost,
        mileage,
        date,
        location
      });
      
      const newRecord = await addMaintenanceRecord({
        carId,
        title,
        description: description || undefined,
        cost: cost ? Number(cost) : undefined,
        mileage: Number(mileage), // 必須項目なので必ず数値
        date: Timestamp.fromDate(new Date(date)),
        location: location || undefined,
      });
      
      
      // フォームをリセット
      setTitle("");
      setDescription("");
      setCost("");
      setMileage("");
      setLocation("");
      onAdded?.();
    } catch (error) {
      console.error("Error adding maintenance record:", error);
      alert(`履歴の追加に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">メンテナンスを記録 - {carName}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              日付
            </label>
            <input
              type="date"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル *
            </label>
            <select
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
              required
            >
              <option value="">選択してください</option>
              {['メンテナンス', '法定点検', 'その他'].map((category) => (
                <optgroup key={category} label={category}>
                  {MAINTENANCE_TITLE_OPTIONS
                    .filter(option => option.category === category)
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              詳細・メモ
            </label>
            <textarea
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
              placeholder="作業内容やメモを入力..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                費用 (円)
              </label>
              <input
                type="number"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
                placeholder="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                走行距離 (km) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                className={`w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 placeholder:text-gray-600 text-gray-900 ${
                  currentMileage && Number(mileage) < currentMileage && mileage !== ""
                    ? "border-red-300 focus:ring-red-100 bg-red-50"
                    : "border-gray-300 focus:ring-blue-100"
                }`}
                placeholder={currentMileage ? `現在: ${currentMileage.toLocaleString()} km` : "例: 50000"}
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                min={currentMileage || 0}
                required
              />
              {currentMileage && Number(mileage) < currentMileage && mileage !== "" && (
                <p className="text-red-600 text-sm mt-1">
                  現在の走行距離（{currentMileage.toLocaleString()} km）以上を入力してください
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                作業場所
              </label>
              <input
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
                placeholder="例：ガソリンスタンド"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50 transition text-gray-900"
          >
            キャンセル
          </button>
          <button
            onClick={handleAdd}
            className="flex-1 rounded-xl bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-500 transition"
          >
            記録
          </button>
        </div>
      </div>
    </div>
  );
}

function EditCarModal({
  car,
  onClose,
  onUpdated,
}: {
  car: Car;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [name, setName] = useState(car.name || "");
  const [modelCode, setModelCode] = useState(car.modelCode || "");
  const [year, setYear] = useState(car.year?.toString() || "");
  const [odoKm, setOdoKm] = useState(car.odoKm?.toString() || "");
  const [inspectionExpiry, setInspectionExpiry] = useState(
    car.inspectionExpiry instanceof Date ? car.inspectionExpiry.toISOString().split('T')[0] : ""
  );
  const [firstRegYm, setFirstRegYm] = useState(car.firstRegYm || "");
  const [avgKmPerMonth, setAvgKmPerMonth] = useState(car.avgKmPerMonth?.toString() || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: string;
    compressedSize: string;
    compressionRatio: string;
  } | null>(null);

  // ファイル選択ハンドラー
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイルタイプをチェック
    if (!isImageFile(file)) {
      alert("画像ファイルを選択してください。");
      return;
    }

    // ファイルサイズをチェック（圧縮前の制限を緩和）
    if (file.size > 50 * 1024 * 1024) { // 50MB
      alert("ファイルサイズが大きすぎます。50MB以下の画像を選択してください。");
      return;
    }

    try {
      // 画像を圧縮
      const compressedFile = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8,
        maxSizeKB: 500
      });

      setSelectedFile(compressedFile);
      
      // 圧縮情報を設定
      const info = getCompressionInfo(file, compressedFile);
      setCompressionInfo({
        originalSize: info.originalSize,
        compressedSize: info.compressedSize,
        compressionRatio: info.compressionRatio
      });
      
      // プレビュー用のURLを生成
      const previewUrl = URL.createObjectURL(compressedFile);
      setImagePreview(previewUrl);
    } catch (error) {
      console.error("Image compression failed:", error);
      alert("画像の圧縮に失敗しました。");
    }
  };

  // 画像削除処理
  const handleImageDelete = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setCompressionInfo(null);
  };


  // 画像アップロード処理
  const handleImageUpload = async (): Promise<string> => {
    if (!selectedFile) return car.imagePath || "/car.jpg"; // 既存の画像またはデフォルト

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // 実際の進捗監視付きアップロード
      const downloadURL = await uploadCarImageWithProgress(
        selectedFile,
        car.id,
        (progress) => {
          setUploadProgress(progress);
        }
      );
      
      // 完了表示を少し表示
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return downloadURL;
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("画像のアップロードに失敗しました。");
      return car.imagePath || "/car.jpg"; // 既存の画像またはデフォルト
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  async function handleUpdate() {
    if (!name) return alert("車名を入力してください");
    if (!car.id) return alert("車両IDが見つかりません");
    
    try {
      // 画像をアップロード
      const uploadedImagePath = await handleImageUpload();
      
      const carData: Partial<CarInput> = {
        name,
        imagePath: uploadedImagePath,
      };
      if (modelCode && modelCode.trim()) {
        carData.modelCode = modelCode.trim();
      }
      if (year && year.trim()) {
        carData.year = Number(year);
      }
      if (odoKm && odoKm.trim()) {
        carData.odoKm = Number(odoKm);
      }
      if (inspectionExpiry && inspectionExpiry.trim()) {
        // string (YYYY-MM-DD) → Timestamp変換
        carData.inspectionExpiry = Timestamp.fromDate(new Date(inspectionExpiry.trim()));
      }
      if (firstRegYm && firstRegYm.trim()) {
        carData.firstRegYm = firstRegYm.trim();
      }
      if (avgKmPerMonth && avgKmPerMonth.trim()) {
        carData.avgKmPerMonth = Number(avgKmPerMonth);
      }
      
      console.log("Updating car with data:", carData);
      await updateCar(car.id, carData);
      console.log("Car updated successfully");
      setName(""); setModelCode(""); setYear(""); setOdoKm(""); setInspectionExpiry(""); setFirstRegYm(""); setAvgKmPerMonth(""); setSelectedFile(null); setImagePreview(null); setCompressionInfo(null);
      onUpdated?.();
    } catch (error) {
      console.error("Error updating car:", error);
      alert("車両情報の更新に失敗しました。もう一度お試しください。");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-2xl relative">
        {/* アップロード中のオーバーレイ */}
        {isUploading && (
          <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">画像をアップロード中...</p>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">車両情報を編集</h2>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="text-gray-400 hover:text-gray-600 text-2xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ×
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              車名 *
            </label>
            <input
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
              placeholder="車名 (例: シビック Type R)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              型式
            </label>
            <input
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
              placeholder="型式 (例: FL5)"
              value={modelCode}
              onChange={(e) => setModelCode(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              年式
            </label>
            <input
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
              placeholder="年式 (例: 2023)"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              走行距離 (km)
            </label>
            <input
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
              placeholder="走行距離 km"
              value={odoKm}
              onChange={(e) => setOdoKm(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              車両画像
            </label>
            
            {/* 現在の画像またはプレビュー */}
            {(imagePreview || car.imagePath) && (
              <div className="mb-3">
                <img
                  src={imagePreview || car.imagePath}
                  alt="プレビュー"
                  className="w-full h-32 object-cover rounded-xl border border-gray-200"
                />
              </div>
            )}
            
            {/* ファイル選択 */}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="edit-car-image-upload"
            />
            <div className="flex gap-2">
              <label
                htmlFor="edit-car-image-upload"
              className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-center cursor-pointer hover:bg-gray-50 transition text-gray-900 font-medium"
              >
                {selectedFile ? "画像を変更" : "画像を選択"}
              </label>
            </div>
            
            {selectedFile && (
              <div className="text-xs text-gray-500 mt-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p>選択中: {selectedFile.name}</p>
                  <button
                    onClick={handleImageDelete}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    削除
                  </button>
                </div>
                {compressionInfo && (
                  <div className="bg-green-50 p-2 rounded border border-green-200">
                    <p className="text-green-700">
                      <span className="font-medium">圧縮完了:</span> {compressionInfo.originalSize} → {compressionInfo.compressedSize}
                    </p>
                    <p className="text-green-600">
                      サイズ削減: {compressionInfo.compressionRatio}
                    </p>
                  </div>
                )}
                {isUploading && (
                  <div className="bg-blue-50 p-2 rounded border border-blue-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-blue-700 text-xs">
                        {uploadProgress === 100 ? "アップロード完了！" : "アップロード中..."}
                      </span>
                      <span className="text-blue-600 text-xs">{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          uploadProgress === 100 ? 'bg-green-600' : 'bg-blue-600'
                        }`}
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              車検期限
            </label>
            <input
              type="date"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
              value={inspectionExpiry}
              onChange={(e) => setInspectionExpiry(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              初度登録年月（任意）
            </label>
            <input
              type="month"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
              value={firstRegYm}
              onChange={(e) => setFirstRegYm(e.target.value)}
              placeholder="例: 2020-03"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              平均月間走行距離（任意）
            </label>
            <select
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
              value={avgKmPerMonth}
              onChange={(e) => setAvgKmPerMonth(e.target.value)}
            >
              <option value="">選択してください</option>
              <option value="300">300km/月（低使用）</option>
              <option value="500">500km/月（普通）</option>
              <option value="800">800km/月（高使用）</option>
              <option value="1000">1000km/月（超高使用）</option>
            </select>
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50 transition text-gray-900"
          >
            キャンセル
          </button>
          <button
            onClick={handleUpdate}
            disabled={isUploading}
            className="flex-1 rounded-xl bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? "アップロード中..." : "更新"}
          </button>
        </div>
      </div>
      
    </div>
  );
}

// サイドバー用車両切り替えコンポーネント
// SidebarCarSwitcher はヘッダー統一のため削除

// ダッシュボード用車両切り替えコンポーネント
function CarSwitcher({ 
  cars, 
  activeCarId, 
  onSelectCar 
}: { 
  cars: Car[]; 
  activeCarId?: string; 
  onSelectCar: (carId: string) => void; 
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center space-x-4 overflow-x-auto">
        {cars.map((car) => (
          <button
            key={car.id}
            onClick={() => onSelectCar(car.id!)}
            className={`flex-shrink-0 flex items-center space-x-3 p-3 rounded-lg transition-all ${
              car.id === activeCarId
                ? 'bg-blue-50 border-2 border-blue-200'
                : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
            }`}
          >
            {/* 車両画像 */}
            {car.imagePath ? (
              <img
                src={car.imagePath}
                alt={car.name}
                className="w-12 h-12 object-cover rounded-lg"
                onLoad={() => {
                  // 画像読み込み完了時の処理
                }}
                onError={() => {
                  // 画像読み込みエラー時の処理
                }}
              />
            ) : (
              <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
            )}
            
            {/* 車両情報 */}
            <div className="text-left">
              <p className={`text-sm font-medium ${
                car.id === activeCarId ? 'text-blue-900' : 'text-gray-900'
              }`}>
                {car.name}
              </p>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                {car.modelCode && (
                  <span className="bg-gray-100 px-2 py-0.5 rounded">
                    {car.modelCode}
                  </span>
                )}
                {car.year && (
                  <span>{car.year}年式</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// 給油ログコンテンツ
function FuelLogsContent({
  cars,
  activeCarId,
  fuelLogs,
  setShowFuelLogModal
}: {
  cars: Car[];
  activeCarId?: string;
  fuelLogs: FuelLog[];
  setShowFuelLogModal: (show: boolean) => void;
}) {
  // 安全のため、fuelLogsがundefinedの場合は空配列を使用
  const safeFuelLogs = fuelLogs || [];
  const activeCar = cars.find(car => car.id === activeCarId);
  
  // フィルター状態
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterFullTank, setFilterFullTank] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'cost' | 'odo'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // 利用可能な年月のリスト
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    safeFuelLogs.forEach(log => {
      const date = log.date?.toDate ? log.date.toDate() : new Date();
      months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(months).sort().reverse();
  }, [safeFuelLogs]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    safeFuelLogs.forEach(log => {
      const date = log.date?.toDate ? log.date.toDate() : new Date();
      years.add(date.getFullYear().toString());
    });
    return Array.from(years).sort().reverse();
  }, [safeFuelLogs]);
  
  // フィルター適用後の給油ログ
  const filteredFuelLogs = useMemo(() => {
    let filtered = safeFuelLogs;
    
    // 検索フィルター
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log => {
        const date = log.date?.toDate ? log.date.toDate() : new Date();
        const dateStr = date.toLocaleDateString('ja-JP');
        const { value: fuelAmount } = getDisplayAmount(log);
        const cost = getDisplayCost(log);
        const odoKm = log.odoKm?.toString() || '';
        
        return dateStr.includes(term) ||
               fuelAmount.toString().includes(term) ||
               cost.toString().includes(term) ||
               odoKm.includes(term);
      });
    }
    
    // 年フィルター
    if (filterYear !== 'all') {
      filtered = filtered.filter(log => {
        const date = log.date?.toDate ? log.date.toDate() : new Date();
        return date.getFullYear().toString() === filterYear;
      });
    }
    
    // 月フィルター
    if (filterMonth !== 'all' && filterYear !== 'all') {
      filtered = filtered.filter(log => {
        const date = log.date?.toDate ? log.date.toDate() : new Date();
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return monthKey === filterMonth;
      });
    }
    
    // 満タン/部分給油フィルター
    if (filterFullTank !== 'all') {
      filtered = filtered.filter(log => {
        if (filterFullTank === 'full') return log.isFullTank === true;
        if (filterFullTank === 'partial') return log.isFullTank === false;
        return true;
      });
    }
    
    // ソート
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          const dateA = a.date?.toDate ? a.date.toDate() : new Date();
          const dateB = b.date?.toDate ? b.date.toDate() : new Date();
          comparison = dateA.getTime() - dateB.getTime();
          break;
        case 'amount':
          const amountA = getDisplayAmount(a).value;
          const amountB = getDisplayAmount(b).value;
          comparison = amountA - amountB;
          break;
        case 'cost':
          const costA = getDisplayCost(a);
          const costB = getDisplayCost(b);
          comparison = costA - costB;
          break;
        case 'odo':
          const odoA = a.odoKm || 0;
          const odoB = b.odoKm || 0;
          comparison = odoA - odoB;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [safeFuelLogs, searchTerm, filterYear, filterMonth, filterFullTank, sortBy, sortOrder]);

  const summary = useMemo(() => {
    if (!safeFuelLogs || !Array.isArray(safeFuelLogs) || safeFuelLogs.length === 0) {
      return {
        totalLogs: 0,
        totalVolume: 0,
        totalCost: 0,
        avgPricePerLiter: null as number | null,
        lastLog: null as FuelLog | null,
        lastRefuelDate: null as Date | null,
        lastPricePerLiter: null as number | null,
        fullTankCount: 0,
        averageFillSize: null as number | null,
      };
    }

    let totalCost = 0;
    let totalVolume = 0;
    let volumeSamples = 0;

    try {
      safeFuelLogs.forEach((log) => {
        if (!log) return;
        try {
          const { value, unit } = getDisplayAmount(log);
          const cost = getDisplayCost(log);
          totalCost += cost || 0;

          if (unit === 'L' && value && value > 0) {
            totalVolume += value;
            volumeSamples += 1;
          }
        } catch (error) {
          console.error('Error processing fuel log:', error, log);
        }
      });
    } catch (error) {
      console.error('Error processing fuel logs:', error);
    }

    const lastLog = safeFuelLogs[0] ?? null;
    let lastRefuelDate: Date | null = null;
    if (lastLog && lastLog.date) {
      try {
        const dateValue: any = lastLog.date;
        if (dateValue && typeof dateValue === 'object' && 'toDate' in dateValue) {
          lastRefuelDate = dateValue.toDate();
        } else if (dateValue instanceof Date) {
          lastRefuelDate = dateValue;
        } else if (dateValue) {
          lastRefuelDate = new Date(dateValue);
        }
      } catch (error) {
        console.error('Error converting date:', error);
        lastRefuelDate = null;
      }
    }

    let lastPricePerLiter: number | null = null;
    if (lastLog) {
      try {
        const { value, unit } = getDisplayAmount(lastLog);
        const cost = getDisplayCost(lastLog);
        if (unit === 'L' && value > 0 && cost > 0) {
          lastPricePerLiter = cost / value;
        }
      } catch (error) {
        console.error('Error calculating last price per liter:', error);
        lastPricePerLiter = null;
      }
    }

    const avgPricePerLiter = totalVolume > 0 ? totalCost / totalVolume : null;
    const averageFillSize = volumeSamples > 0 ? totalVolume / volumeSamples : null;

    return {
      totalLogs: safeFuelLogs.length,
      totalVolume,
      totalCost,
      avgPricePerLiter,
      lastLog,
      lastRefuelDate,
      lastPricePerLiter,
      fullTankCount: safeFuelLogs.filter((log) => log && log.isFullTank).length,
      averageFillSize,
    };
  }, [safeFuelLogs]);

  const formatNumber = (num: number): string => {
    if (typeof window === 'undefined') {
      // サーバーサイドではシンプルな形式を使用
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    return num.toLocaleString('ja-JP');
  };

  const totalCostLabel = summary.totalCost > 0 ? `¥${formatNumber(summary.totalCost)}` : '¥0';
  const totalVolumeLabel = summary.totalVolume > 0
    ? `${formatNumber(summary.totalVolume >= 100 ? Math.round(summary.totalVolume) : Math.round(summary.totalVolume * 10) / 10)} L`
    : '0 L';
  const avgPriceLabel = summary.avgPricePerLiter
    ? `¥${formatNumber(Math.round(summary.avgPricePerLiter))} / L`
    : '---';
  const lastRefuelLabel = summary.lastRefuelDate
    ? (() => {
        try {
          if (typeof window === 'undefined') {
            // サーバーサイドではシンプルな形式を使用
            const date = summary.lastRefuelDate;
            return `${date.getMonth() + 1}月${date.getDate()}日`;
          }
          return summary.lastRefuelDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });
        } catch (error) {
          console.error('Error formatting date:', error);
          if (summary.lastRefuelDate) {
            const date = summary.lastRefuelDate;
            return `${date.getMonth() + 1}月${date.getDate()}日`;
          }
          return '記録なし';
        }
      })()
    : '記録なし';
  const lastPriceLabel = summary.lastPricePerLiter
    ? `¥${formatNumber(Math.round(summary.lastPricePerLiter))} / L`
    : '---';
  const averageFillSizeLabel = summary.averageFillSize
    ? `${formatNumber(summary.averageFillSize >= 100 ? Math.round(summary.averageFillSize) : Math.round(summary.averageFillSize * 10) / 10)} L`
    : '---';

  const summaryCards = useMemo(() => ([
    {
      title: '総給油回数',
      value: summary.totalLogs ? `${formatNumber(summary.totalLogs)} 回` : '0 回',
      description: '保存済みの記録',
      icon: '🧾',
    },
    {
      title: '累計給油量',
      value: totalVolumeLabel,
      description: 'レギュラー/ハイオクを含む',
      icon: '⛽',
    },
    {
      title: '累計ガソリン代',
      value: totalCostLabel,
      description: '税込み合計',
      icon: '💴',
    },
    {
      title: '平均単価',
      value: avgPriceLabel,
      description: '全期間平均',
      icon: '📈',
    },
  ]), [summary.totalLogs, totalVolumeLabel, totalCostLabel, avgPriceLabel]);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">給油ログ</h1>
          <p className="mt-1 text-sm text-gray-600">
            {activeCar ? `${activeCar.name} の給油記録` : '車両を選択してください'}
          </p>
        </div>
        <button
          onClick={() => setShowFuelLogModal(true)}
          className="rounded-xl bg-emerald-600 text-white px-5 py-2.5 font-medium hover:bg-emerald-500 transition-colors shadow-sm"
        >
          ＋ 給油を記録
        </button>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.title}</span>
              <span className="text-xl">{card.icon}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            <p className="mt-1 text-xs text-gray-500">{card.description}</p>
          </div>
        ))}
      </div>

      {/* フィルター・検索 */}
      {safeFuelLogs.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 検索 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                検索
              </label>
              <input
                type="text"
                placeholder="日付、給油量、金額、走行距離で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
              />
            </div>

            {/* 年フィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                年
              </label>
              <select
                value={filterYear}
                onChange={(e) => {
                  setFilterYear(e.target.value);
                  setFilterMonth('all');
                }}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
              >
                <option value="all">すべての年</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}年</option>
                ))}
              </select>
            </div>

            {/* 月フィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                月
              </label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
                disabled={filterYear === 'all'}
              >
                <option value="all">すべての月</option>
                {filterYear !== 'all' && availableMonths
                  .filter(m => m.startsWith(filterYear))
                  .map(month => {
                    const [, m] = month.split('-');
                    return (
                      <option key={month} value={month}>
                        {parseInt(m)}月
                      </option>
                    );
                  })}
              </select>
            </div>

            {/* 給油タイプフィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                給油タイプ
              </label>
              <select
                value={filterFullTank}
                onChange={(e) => setFilterFullTank(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
              >
                <option value="all">すべて</option>
                <option value="full">満タンのみ</option>
                <option value="partial">部分給油のみ</option>
              </select>
            </div>
          </div>

          {/* ソートオプション */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">並び順:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'cost' | 'odo')}
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="date">実施日</option>
                <option value="amount">給油量</option>
                <option value="cost">金額</option>
                <option value="odo">走行距離</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1 rounded hover:bg-gray-100 transition"
                title={sortOrder === 'asc' ? '昇順' : '降順'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
            
            <div className="text-sm text-gray-600">
              {filteredFuelLogs.length}件の給油記録
            </div>
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      {activeCar ? (
        <FuelLogCard 
          car={activeCar} 
          fuelLogs={filteredFuelLogs}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">表示できる給油データがありません</h3>
          <p className="mt-2 text-sm text-gray-500">サイドバーから車両を選択するか、新しく車両を追加してください。</p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setShowFuelLogModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-5 py-2.5 font-medium hover:bg-emerald-500 transition-colors shadow-sm"
            >
              ⛽ 給油を記録
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 保険管理コンテンツ
// リマインダータイトルの選択肢
const REMINDER_TITLE_OPTIONS = [
  { value: 'オイル交換', label: 'オイル交換', category: 'メンテナンス' },
  { value: 'タイヤ交換', label: 'タイヤ交換', category: 'メンテナンス' },
  { value: 'ブレーキパッド交換', label: 'ブレーキパッド交換', category: 'メンテナンス' },
  { value: 'エアフィルター交換', label: 'エアフィルター交換', category: 'メンテナンス' },
  { value: 'バッテリー交換', label: 'バッテリー交換', category: 'メンテナンス' },
  { value: '車検', label: '車検', category: '法定点検' },
  { value: '自動車税納付', label: '自動車税納付', category: '税金' },
  { value: '自賠責保険更新', label: '自賠責保険更新', category: '保険' },
  { value: '任意保険更新', label: '任意保険更新', category: '保険' },
  { value: 'タイヤローテーション', label: 'タイヤローテーション', category: 'メンテナンス' },
  { value: 'ブレーキフルード交換', label: 'ブレーキフルード交換', category: 'メンテナンス' },
  { value: 'クーラント交換', label: 'クーラント交換', category: 'メンテナンス' },
  { value: 'スパークプラグ交換', label: 'スパークプラグ交換', category: 'メンテナンス' },
  { value: 'ベルト交換', label: 'ベルト交換', category: 'メンテナンス' },
  { value: 'その他', label: 'その他', category: 'その他' }
];

// メンテナンス記録タイトルの選択肢
const MAINTENANCE_TITLE_OPTIONS = [
  { value: 'オイル交換', label: 'オイル交換', category: 'メンテナンス' },
  { value: 'タイヤ交換', label: 'タイヤ交換', category: 'メンテナンス' },
  { value: 'ブレーキパッド交換', label: 'ブレーキパッド交換', category: 'メンテナンス' },
  { value: 'エアフィルター交換', label: 'エアフィルター交換', category: 'メンテナンス' },
  { value: 'バッテリー交換', label: 'バッテリー交換', category: 'メンテナンス' },
  { value: '車検', label: '車検', category: '法定点検' },
  { value: 'タイヤローテーション', label: 'タイヤローテーション', category: 'メンテナンス' },
  { value: 'ブレーキフルード交換', label: 'ブレーキフルード交換', category: 'メンテナンス' },
  { value: 'クーラント交換', label: 'クーラント交換', category: 'メンテナンス' },
  { value: 'スパークプラグ交換', label: 'スパークプラグ交換', category: 'メンテナンス' },
  { value: 'ベルト交換', label: 'ベルト交換', category: 'メンテナンス' },
  { value: 'ワイパー交換', label: 'ワイパー交換', category: 'メンテナンス' },
  { value: '電球交換', label: '電球交換', category: 'メンテナンス' },
  { value: 'エンジン点検', label: 'エンジン点検', category: 'メンテナンス' },
  { value: 'トランスミッションオイル交換', label: 'トランスミッションオイル交換', category: 'メンテナンス' },
  { value: 'ディファレンシャルオイル交換', label: 'ディファレンシャルオイル交換', category: 'メンテナンス' },
  { value: 'ブレーキディスク交換', label: 'ブレーキディスク交換', category: 'メンテナンス' },
  { value: 'サスペンション点検', label: 'サスペンション点検', category: 'メンテナンス' },
  { value: 'エアコン点検', label: 'エアコン点検', category: 'メンテナンス' },
  { value: 'その他', label: 'その他', category: 'その他' }
];

// カスタマイズ一覧コンポーネント
function ShareContent({
  cars,
  activeCarId,
  car,
  maintenanceRecords,
  customizations,
  setShowShareAndPDFModal
}: {
  cars: Car[];
  activeCarId?: string;
  car?: Car;
  maintenanceRecords: MaintenanceRecord[];
  customizations: Customization[];
  setShowShareAndPDFModal: (show: boolean) => void;
}) {
  const router = useRouter();
  const [purpose, setPurpose] = useState<'normal' | 'sale' | 'assess'>('normal');
  const [saleProfile, setSaleProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [updatingLink, setUpdatingLink] = useState(false);
  const [pageViewCount, setPageViewCount] = useState<number | null>(null);

  // saleProfileを取得
  useEffect(() => {
    if (!activeCarId || !auth.currentUser) return;
    
    const loadSaleProfile = async () => {
      setLoadingProfile(true);
      try {
        const carDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid, 'cars', activeCarId));
        if (carDoc.exists()) {
          const carData = carDoc.data();
          if (carData.activeSaleProfileId) {
            const saleProfileDoc = await getDoc(doc(db, 'saleProfiles', carData.activeSaleProfileId));
            if (saleProfileDoc.exists()) {
              const profileData = { id: saleProfileDoc.id, ...saleProfileDoc.data() };
              setSaleProfile(profileData);
              
              // 閲覧回数を取得（簡易版）
              try {
                const pageViewsQuery = query(
                  collection(db, 'salePageViews'),
                  where('saleProfileId', '==', profileData.id),
                  where('event', '==', 'page_view')
                );
                const pageViewsSnapshot = await getDocs(pageViewsQuery);
                setPageViewCount(pageViewsSnapshot.size);
              } catch (error) {
                console.error('Failed to load page views:', error);
                setPageViewCount(null);
              }
            } else {
              setSaleProfile(null);
              setPageViewCount(null);
            }
          } else {
            setSaleProfile(null);
            setPageViewCount(null);
          }
        }
      } catch (error) {
        console.error('Failed to load sale profile:', error);
        setSaleProfile(null);
        setPageViewCount(null);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadSaleProfile();
  }, [activeCarId]);

  // 共有リンクを作成
  const handleCreateLink = async () => {
    if (!activeCarId || !auth.currentUser) return;
    
    try {
      setUpdatingLink(true);
      const { enableSaleMode } = await import('@/lib/saleProfileManager');
      const saleProfileId = await enableSaleMode(activeCarId, {
        visibility: purpose === 'normal' ? 'unlisted' : 'unlisted',
        includeEvidence: purpose !== 'normal',
        includeAmounts: false,
        highlightTopN: 10,
        analyticsEnabled: true,
      });

      // saleProfileを再取得
      const saleProfileDoc = await getDoc(doc(db, 'saleProfiles', saleProfileId));
      if (saleProfileDoc.exists()) {
        setSaleProfile({ id: saleProfileDoc.id, ...saleProfileDoc.data() });
      }
    } catch (error: any) {
      console.error('Failed to create share link:', error);
      alert(`共有リンクの作成に失敗しました: ${error.message}`);
    } finally {
      setUpdatingLink(false);
    }
  };

  // リンクをコピー
  const handleCopyLink = async () => {
    if (!saleProfile?.slug) return;
    
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${saleProfile.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      // 3秒後に元に戻す（フィードバックを長めに）
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      alert('リンクのコピーに失敗しました');
    }
  };

  // リンクを停止
  const handleDisableLink = async () => {
    if (!saleProfile || !activeCarId || !auth.currentUser) return;
    
    if (!confirm('リンクを無効化するとURLは閲覧できません。再開するまで有効になりません。よろしいですか？')) {
      return;
    }

    try {
      setUpdatingLink(true);
      const { updateSaleProfileVisibility } = await import('@/lib/saleProfileManager');
      await updateSaleProfileVisibility(saleProfile.id, 'disabled');
      
      // saleProfileを再取得
        const user = auth.currentUser;
        if (!user) return;
        const carDoc = await getDoc(doc(db, 'users', user.uid, 'cars', activeCarId));
      if (carDoc.exists()) {
        const carData = carDoc.data();
        if (carData.activeSaleProfileId) {
          const saleProfileDoc = await getDoc(doc(db, 'saleProfiles', carData.activeSaleProfileId));
          if (saleProfileDoc.exists()) {
            setSaleProfile({ id: saleProfileDoc.id, ...saleProfileDoc.data() });
          } else {
            setSaleProfile(null);
          }
        } else {
          setSaleProfile(null);
        }
      }
    } catch (error: any) {
      console.error('Failed to disable link:', error);
      alert(`リンクの停止に失敗しました: ${error.message}`);
    } finally {
      setUpdatingLink(false);
    }
  };

  // ステータスを判定
  const linkStatus = saleProfile?.visibility === 'disabled' ? 'stopped' : saleProfile ? 'active' : 'not_created';
  const shareUrl = saleProfile?.slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${saleProfile.slug}` : null;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">共有</h1>
        <p className="text-sm text-gray-600">履歴をURLまたはPDFで渡せます</p>
      </div>

      {!car ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500 mb-4">車両を選択してください</p>
          <p className="text-xs text-gray-400">右上のドロップダウンから車両を選択できます</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 用途テンプレ（共通） */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-sm font-medium text-gray-700 mb-3">共有の用途</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setPurpose('normal')}
                className={`flex-1 px-4 py-2 rounded-lg border transition-colors text-sm font-medium ${
                  purpose === 'normal'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                通常
              </button>
              <button
                onClick={() => setPurpose('sale')}
                className={`flex-1 px-4 py-2 rounded-lg border transition-colors text-sm font-medium ${
                  purpose === 'sale'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                売却
              </button>
              <button
                onClick={() => setPurpose('assess')}
                className={`flex-1 px-4 py-2 rounded-lg border transition-colors text-sm font-medium ${
                  purpose === 'assess'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                査定
              </button>
            </div>
            {(purpose === 'sale' || purpose === 'assess') && (
              <p className="mt-3 text-xs text-gray-500">
                ※個人情報を含む証跡は自動でマスクされます（設定で変更可）
              </p>
            )}
          </div>

          {/* セクションA：共有リンク（公開ページ） */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">共有リンク（公開）</h2>
            
            {/* ステータス表示 */}
            <div className="mb-4">
              {linkStatus === 'not_created' && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                  <span>未作成</span>
                </div>
              )}
              {linkStatus === 'active' && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span>公開中</span>
                    {pageViewCount !== null && (
                      <span className="text-xs text-gray-500 ml-2">（閲覧回数: {pageViewCount}）</span>
                    )}
                  </div>
                  {saleProfile?.updatedAt && (
                    <div className="text-xs text-gray-500 ml-4">
                      最終更新: {new Date(saleProfile.updatedAt.toMillis?.() || saleProfile.updatedAt._seconds * 1000).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      })}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 ml-4">
                    このリンクは「{purpose === 'normal' ? '通常' : purpose === 'sale' ? '売却' : '査定'}」表示です
                  </div>
                </div>
              )}
              {linkStatus === 'stopped' && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span>停止中</span>
                </div>
              )}
            </div>

            {/* Primary Action */}
            {linkStatus === 'not_created' ? (
              <div className="mb-4">
                <button
                  onClick={handleCreateLink}
                  disabled={updatingLink || loadingProfile}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {updatingLink ? '作成中...' : '共有リンクを作成'}
                </button>
              </div>
            ) : linkStatus === 'active' && shareUrl ? (
              <div className="mb-4">
                {/* 共有リンク表示とコピーボタン */}
                <div 
                  className={`flex items-center gap-2 mb-3 p-3 rounded-lg border transition-colors ${
                    copiedLink 
                      ? 'bg-blue-50 border-blue-300' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">共有リンク</p>
                    <p className="text-sm text-gray-900 truncate font-mono">
                      {shareUrl}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className={`flex-shrink-0 px-3 py-1.5 rounded text-sm transition-colors ${
                      copiedLink
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {copiedLink ? '✓ コピー済み' : 'コピー'}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Secondary Actions */}
            {linkStatus === 'active' && shareUrl && (
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => window.open(shareUrl, '_blank')}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  公開ページを見る
                </button>
                <button
                  onClick={() => router.push(`/vehicles/${activeCarId}/sale-mode`)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  共有設定
                </button>
              </div>
            )}

            {/* Danger Action（小さく、右寄せ、通常文字＋アイコン） */}
            {linkStatus === 'active' && (
              <div className="pt-3 border-t border-gray-200 flex justify-end">
                <button
                  onClick={handleDisableLink}
                  disabled={updatingLink}
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  リンクを無効化
                </button>
              </div>
            )}
          </div>

          {/* セクションB：PDFレポート */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">PDFレポート</h2>
            
            {/* 状態に応じたPrimary Action */}
            {/* TODO: PDF生成状態を管理する必要がある（現時点では常に「作成前」として扱う） */}
            <button
              onClick={() => setShowShareAndPDFModal(true)}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium mb-4"
            >
              PDFを作成
            </button>

            {/* Secondary Actions（作成前はdisabled） */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setShowShareAndPDFModal(true)}
                disabled
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-400 rounded-lg cursor-not-allowed transition-colors text-sm"
              >
                プレビュー
              </button>
              <button
                onClick={() => setShowShareAndPDFModal(true)}
                disabled
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-400 rounded-lg cursor-not-allowed transition-colors text-sm"
              >
                ダウンロード
              </button>
            </div>

            {/* 直近生成履歴 */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-1">直近生成履歴</p>
              <p className="text-xs text-gray-400">（実装予定: 最終生成：YYYY/MM/DD（用途：{purpose === 'normal' ? '通常' : purpose === 'sale' ? '売却' : '査定'}））</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomizationsContent({ 
  cars, 
  activeCarId, 
  customizations, 
  setShowCustomizationModal, 
  setEditingCustomization,
  setCustomizations
}: {
  cars: Car[];
  activeCarId: string | undefined;
  customizations: Customization[];
  setShowCustomizationModal: (show: boolean) => void;
  setEditingCustomization: (customization: Customization | null) => void;
  setCustomizations: (customizations: Customization[]) => void;
}) {
  const activeCar = cars.find(car => car.id === activeCarId);
  
  // フィルタリングと検索の状態
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'cost'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // フィルタリングとソートのロジック
  const filteredCustomizations = useMemo(() => {
    let filtered = customizations;

    // 車両でフィルタ（ヘッダーで選択された車両のみ表示）
    if (activeCarId) {
      filtered = filtered.filter(customization => customization.carId === activeCarId);
    }

    // 検索語でフィルタ
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(customization => 
        customization.title.toLowerCase().includes(term) ||
        customization.brand?.toLowerCase().includes(term) ||
        customization.modelCode?.toLowerCase().includes(term) ||
        customization.memo?.toLowerCase().includes(term) ||
        customization.vendorName?.toLowerCase().includes(term)
      );
    }

    // カテゴリでフィルタ
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(customization => 
        customization.categories.includes(selectedCategory as any)
      );
    }

    // ステータスでフィルタ
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(customization => customization.status === selectedStatus);
    }

    // ソート
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = toMillis(a.date) - toMillis(b.date);
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'cost':
          const costA = (a.partsCostJpy || 0) + (a.laborCostJpy || 0) + (a.otherCostJpy || 0);
          const costB = (b.partsCostJpy || 0) + (b.laborCostJpy || 0) + (b.otherCostJpy || 0);
          comparison = costA - costB;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [customizations, activeCarId, searchTerm, selectedCategory, selectedStatus, sortBy, sortOrder]);

  const handleEdit = (customization: Customization) => {
    setEditingCustomization(customization);
    setShowCustomizationModal(true);
  };

  const handleDelete = async (customizationId: string) => {
    if (!activeCarId || !auth.currentUser) return;
    
    if (confirm('このカスタマイズ記録を削除しますか？')) {
      try {
        console.log('Deleting customization:', customizationId);
        await deleteCustomization(auth.currentUser.uid, activeCarId, customizationId);
        console.log('Customization deleted successfully');
        
        // カスタマイズ一覧を再取得
        console.log('Reloading customizations...');
        const updatedCustomizations = await getCustomizations(auth.currentUser.uid, activeCarId);
        console.log('Customizations reloaded:', updatedCustomizations.length);
        setCustomizations(updatedCustomizations);
      } catch (error) {
        console.error('Error deleting customization:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: (error as any)?.code,
          stack: error instanceof Error ? error.stack : undefined
        });
        alert(`削除に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">カスタマイズ</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCustomizationModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + カスタマイズを追加
          </button>
        </div>
      </div>

      {/* 統計カード */}
      {(() => {
        const totalCustomizations = customizations.length;
        const totalCost = customizations.reduce((sum, c) => {
          return sum + ((c.partsCostJpy || 0) + (c.laborCostJpy || 0) + (c.otherCostJpy || 0));
        }, 0);
        const avgCost = totalCustomizations > 0 ? Math.round(totalCost / totalCustomizations) : 0;
        const lastCustomization = customizations
          .sort((a, b) => toMillis(b.date) - toMillis(a.date))[0];
        const lastCustomizationDate = lastCustomization 
          ? (lastCustomization.date?.toDate ? lastCustomization.date.toDate() : new Date())
          : null;

        const summaryCards = [
          {
            title: '総カスタマイズ数',
            value: `${totalCustomizations} 件`,
            description: '保存済みの記録',
            icon: '✨',
          },
          {
            title: '累計費用',
            value: `¥${totalCost.toLocaleString()}`,
            description: '税込み合計',
            icon: '💴',
          },
          {
            title: '平均費用',
            value: avgCost > 0 ? `¥${avgCost.toLocaleString()}` : '---',
            description: '1件あたり平均',
            icon: '📊',
          },
          {
            title: '最新カスタマイズ',
            value: lastCustomizationDate 
              ? lastCustomizationDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
              : '記録なし',
            description: '最新の登録日',
            icon: '📅',
          },
        ];

        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map((card) => (
              <div
                key={card.title}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.title}</span>
                  <span className="text-xl">{card.icon}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                <p className="mt-1 text-xs text-gray-500">{card.description}</p>
              </div>
            ))}
          </div>
        );
      })()}

      {!activeCarId ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            {cars.length === 0 ? "まず車を追加してください" : "車を選択してください"}
          </div>
        </div>
      ) : (
        <>
          {/* フィルター・検索 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 検索 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  検索
                </label>
                <input
                  type="text"
                  placeholder="タイトル、ブランド、メモで検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
                />
              </div>

              {/* カテゴリフィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  カテゴリ
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
                >
                  <option value="all">すべてのカテゴリ</option>
                  <option value="エンジン">エンジン</option>
                  <option value="サスペンション">サスペンション</option>
                  <option value="ブレーキ">ブレーキ</option>
                  <option value="ホイール・タイヤ">ホイール・タイヤ</option>
                  <option value="エクステリア">エクステリア</option>
                  <option value="インテリア">インテリア</option>
                  <option value="電装">電装</option>
                  <option value="その他">その他</option>
                </select>
              </div>

              {/* ステータスフィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ステータス
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
                >
                  <option value="all">すべてのステータス</option>
                  <option value="planning">計画中</option>
                  <option value="in_progress">進行中</option>
                  <option value="completed">完了</option>
                  <option value="cancelled">キャンセル</option>
                </select>
              </div>
            </div>

            {/* ソートオプション */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">並び順:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'cost')}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="date">実施日</option>
                  <option value="title">タイトル</option>
                  <option value="cost">費用</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-1 rounded hover:bg-gray-100 transition"
                  title={sortOrder === 'asc' ? '昇順' : '降順'}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
              
              <div className="text-sm text-gray-600">
                {filteredCustomizations.length}件のカスタマイズ記録
              </div>
            </div>
          </div>

          {/* カスタマイズ一覧 */}
          {filteredCustomizations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                {customizations.length === 0 
                  ? "カスタマイズ記録がありません" 
                  : "フィルター条件に一致するカスタマイズ記録がありません"
                }
              </div>
              {customizations.length === 0 && (
                <button
                  onClick={() => setShowCustomizationModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  最初のカスタマイズを追加
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredCustomizations.map((customization) => (
            <div key={customization.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{customization.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[customization.status]}`}>
                      {STATUS_LABELS[customization.status]}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {customization.categories.map((category) => (
                      <span key={category} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {CATEGORY_LABELS[category]}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">実施日:</span>
                      <div>{(customization.date?.toDate ? customization.date.toDate() : new Date()).toLocaleDateString('ja-JP')}</div>
                    </div>
                    {customization.odoKm && (
                      <div>
                        <span className="font-medium">走行距離:</span>
                        <div>{customization.odoKm.toLocaleString()} km</div>
                      </div>
                    )}
                    {customization.brand && (
                      <div>
                        <span className="font-medium">ブランド:</span>
                        <div>{customization.brand}</div>
                      </div>
                    )}
                    {(customization.partsCostJpy || customization.laborCostJpy || customization.otherCostJpy) && (
                      <div>
                        <span className="font-medium">総費用:</span>
                        <div className="font-semibold text-green-600">
                          ¥{((customization.partsCostJpy || 0) + (customization.laborCostJpy || 0) + (customization.otherCostJpy || 0)).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {customization.memo && (
                    <div className="mt-3">
                      <span className="font-medium text-sm">メモ:</span>
                      <p className="text-sm text-gray-600 mt-1">{customization.memo}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(customization)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => customization.id && handleDelete(customization.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
