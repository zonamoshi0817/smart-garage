// src/app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import AuthGate from "@/components/AuthGate";
import { addCar, watchCars, updateCar } from "@/lib/cars";
import type { Car, CarInput } from "@/types";
import { auth, watchAuth } from "@/lib/firebase";
import { addMaintenanceRecord, watchMaintenanceRecords, watchAllMaintenanceRecords, updateMaintenanceRecord, deleteMaintenanceRecord, deleteMultipleMaintenanceRecords } from "@/lib/maintenance";
import type { MaintenanceRecord } from "@/types";
import { downloadMaintenancePDF, generateMaintenanceURL, type PDFExportOptions } from "@/lib/pdfExport";
import { uploadCarImageWithProgress, isImageFile } from "@/lib/storage";
import { compressImage, getCompressionInfo } from "@/lib/imageCompression";
import { addInsurancePolicy, watchInsurancePolicies, updateInsurancePolicy, removeInsurancePolicy, watchInsuranceClaims, type InsurancePolicy, type InsuranceClaim, getDaysUntilExpiry, getExpiryStatus } from "@/lib/insurance";
import { addCustomization, getCustomizations, updateCustomization, deleteCustomization, CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS } from "@/lib/customizations";
import type { Customization } from "@/types";
import { watchInsuranceNotifications, type InsuranceNotification } from "@/lib/insuranceNotifications";
import InsuranceNotificationSettings from "@/components/InsuranceNotificationSettings";
import { watchFuelLogs, calculateFuelEfficiency, calculateAverageFuelEfficiency, getDisplayAmount, getDisplayCost } from "@/lib/fuelLogs";
import type { FuelLog } from "@/types";
import { Bar as RechartsBar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import FuelLogModal from "@/components/modals/FuelLogModal";
import AddCarModal from "@/components/modals/AddCarModal";
import FuelLogCard from "@/components/dashboard/FuelLogCard";
import CustomizationModal from "@/components/modals/CustomizationModal";
import PaywallModal from "@/components/modals/PaywallModal";
import InsuranceModal from "@/components/modals/InsuranceModal";
import SellCarModal from "@/components/modals/SellCarModal";
import ShareAndPDFModal from "@/components/modals/ShareAndPDFModal";
import OCRModal from "@/components/modals/OCRModal";
import { usePremiumGuard } from "@/hooks/usePremium";
import MyCarPage from "@/components/mycar/MyCarPage";
import NextMaintenanceSuggestion from "@/components/mycar/NextMaintenanceSuggestion";
import { generateMaintenanceSuggestions } from "@/lib/maintenanceSuggestions";
import { toDate, toMillis, toTimestamp } from "@/lib/dateUtils";
import { isPremiumPlan } from "@/lib/plan";

/* -------------------- ページ本体 -------------------- */
export default function Home() {
  const [cars, setCars] = useState<Car[]>([]);
  const [activeCarId, setActiveCarId] = useState<string | undefined>(undefined);
  const [showAddCarModal, setShowAddCarModal] = useState(false);
  const [showEditCarModal, setShowEditCarModal] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showEditMaintenanceModal, setShowEditMaintenanceModal] = useState(false);
  const [editingMaintenanceRecord, setEditingMaintenanceRecord] = useState<MaintenanceRecord | null>(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [allMaintenanceRecords, setAllMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [insurancePolicies, setInsurancePolicies] = useState<InsurancePolicy[]>([]);
  const [insuranceClaims, setInsuranceClaims] = useState<InsuranceClaim[]>([]);
  const [insuranceNotifications, setInsuranceNotifications] = useState<InsuranceNotification[]>([]);
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [customizations, setCustomizations] = useState<Customization[]>([]);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [showSellCarModal, setShowSellCarModal] = useState(false);
  const [carToSell, setCarToSell] = useState<Car | null>(null);
  const [editingCustomization, setEditingCustomization] = useState<Customization | null>(null);
  const [showEditInsuranceModal, setShowEditInsuranceModal] = useState(false);
  const [editingInsurancePolicy, setEditingInsurancePolicy] = useState<InsurancePolicy | null>(null);
  const [showInsuranceNotificationSettings, setShowInsuranceNotificationSettings] = useState(false);
  const [showFuelLogModal, setShowFuelLogModal] = useState(false);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [showShareAndPDFModal, setShowShareAndPDFModal] = useState(false);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [authTrigger, setAuthTrigger] = useState(0); // 認証状態変更のトリガー
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'car-management' | 'my-car' | 'maintenance-history' | 'fuel-logs' | 'customizations' | 'data-management' | 'notifications' | 'insurance'>('dashboard');

  // プレミアムガード
  const { userPlan, checkFeature, showPaywall, closePaywall, paywallFeature, paywallVariant } = usePremiumGuard();

  // テスト用の車両データ（開発時のみ）
  const testCars: Car[] = [
    {
      id: 'test1',
      name: 'シビック（FL5）',
      modelCode: 'RS200',
      year: 2023,
      odoKm: 10000,
      imagePath: '/car.jpg',
      deletedAt: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
  ];

  // 認証状態を監視
  useEffect(() => {
    console.log("Setting up auth watcher...");
    const unsubscribe = watchAuth((user) => {
      console.log("Auth state changed:", user ? `User: ${user.email}` : "No user");
      if (user) {
        console.log("User authenticated, forcing data refresh");
        // 認証されたらデータをクリアして再取得を促す
        setCars([]);
        setActiveCarId(undefined);
        setMaintenanceRecords([]);
        setAllMaintenanceRecords([]);
        setInsurancePolicies([]);
        setInsuranceClaims([]);
        setFuelLogs([]);
        
        // 認証トリガーを更新してデータ取得を促す
        setAuthTrigger(prev => prev + 1);
        
        // 少し待ってからデータを再取得（認証状態が完全に確立されるまで待つ）
        setTimeout(() => {
          console.log("Triggering data refresh after authentication");
          setAuthTrigger(prev => prev + 1);
        }, 500);
      } else {
        console.log("User not authenticated, clearing all data");
        setCars([]);
        setActiveCarId(undefined);
        setMaintenanceRecords([]);
        setAllMaintenanceRecords([]);
        setInsurancePolicies([]);
        setInsuranceClaims([]);
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
          // データがない場合はテストデータを使用（開発時のみ）
          if (process.env.NODE_ENV === 'development') {
            console.log("No real cars found, using test cars for development");
            setCars(testCars);
            if (!activeCarId && testCars[0]?.id) {
              setActiveCarId(testCars[0].id);
            }
          } else {
            console.log("No cars found, setting empty array");
            setCars([]);
          }
        }
      });
      return () => {
        console.log("Cleaning up cars watcher");
        off && off();
      };
    } catch (error) {
      console.error("Error watching cars:", error);
      // エラーの場合はテストデータを使用（開発時のみ）
      if (process.env.NODE_ENV === 'development') {
        console.log("Error occurred, using test cars for development");
        setCars(testCars);
        if (!activeCarId && testCars[0]?.id) {
          setActiveCarId(testCars[0].id);
        }
      } else {
        console.log("Error occurred, setting empty array");
        setCars([]);
      }
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

  // 保険契約の監視
  useEffect(() => {
    // 認証されていない場合は何もしない
    if (!auth.currentUser) {
      console.log("No user authenticated, skipping insurance policies watch");
      setInsurancePolicies([]);
      return;
    }
    
    console.log("Setting up insurance policies watcher");
    console.log("Current user:", auth.currentUser.email);
    
    try {
      const off = watchInsurancePolicies((policies) => {
        console.log("Insurance policies received:", policies.length, "policies");
        setInsurancePolicies(policies);
      });
      console.log("Insurance policies watcher set up successfully");
      return () => {
        console.log("Cleaning up insurance policies watcher");
        off && off();
      };
    } catch (error) {
      console.error("Error watching insurance policies:", error);
      setInsurancePolicies([]);
    }
  }, [auth.currentUser, authTrigger]);

  // 事故記録の監視
  useEffect(() => {
    // 認証されていない場合は何もしない
    if (!auth.currentUser) {
      console.log("No user authenticated, skipping insurance claims watch");
      setInsuranceClaims([]);
      return;
    }
    
    console.log("Setting up insurance claims watcher");
    console.log("Current user:", auth.currentUser.email);
    
    try {
      const off = watchInsuranceClaims((claims) => {
        console.log("Insurance claims received:", claims.length, "claims");
        setInsuranceClaims(claims);
      });
      console.log("Insurance claims watcher set up successfully");
      return () => {
        console.log("Cleaning up insurance claims watcher");
        off && off();
      };
    } catch (error) {
      console.error("Error watching insurance claims:", error);
      setInsuranceClaims([]);
    }
  }, [auth.currentUser, authTrigger]);

  // 保険通知の監視
  useEffect(() => {
    // 認証されていない場合は何もしない
    if (!auth.currentUser) {
      console.log("No user authenticated, skipping insurance notifications watch");
      setInsuranceNotifications([]);
      return;
    }
    
    console.log("Setting up insurance notifications watcher");
    console.log("Current user:", auth.currentUser.email);
    
    try {
      const off = watchInsuranceNotifications((notifications) => {
        console.log("Insurance notifications received:", notifications.length, "notifications");
        setInsuranceNotifications(notifications);
      });
      console.log("Insurance notifications watcher set up successfully");
      return () => {
        console.log("Cleaning up insurance notifications watcher");
        off && off();
      };
    } catch (error) {
      console.error("Error watching insurance notifications:", error);
      setInsuranceNotifications([]);
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
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-extrabold tracking-tight text-blue-600">
                garage log
              </span>
            </div>
            <div className="flex items-center gap-4">
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
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        </header>

        {/* レイアウト */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
          {/* サイドバー */}
          <aside className="lg:sticky lg:top-20 h-fit">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
              <div className={`h-8 w-8 rounded-full grid place-items-center font-semibold text-sm ${
                isPremiumPlan(userPlan) ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' : 'bg-blue-100 text-blue-600'
              }`}>
                小
              </div>
              <div className="text-sm">
                <div className="font-semibold">小林 健太</div>
                <div className={`text-xs ${isPremiumPlan(userPlan) ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                  {isPremiumPlan(userPlan) ? '✨ Premium プラン' : 'Free プラン'}
                </div>
              </div>
            </div>

            {/* 車両切り替えはヘッダーのドロップダウンに統一 */}


            <nav className="mt-4 bg-white rounded-2xl border border-gray-200 p-2 space-y-1 text-[15px]">
            <NavItem 
              label="ダッシュボード" 
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
              label="車両管理" 
              active={currentPage === 'car-management'} 
              onClick={() => setCurrentPage('car-management')}
            />
            <NavItem 
              label="自動車保険" 
              active={currentPage === 'insurance'} 
              onClick={() => setCurrentPage('insurance')}
            />
            <NavItem 
              label="データ" 
              active={currentPage === 'data-management'} 
              onClick={() => setCurrentPage('data-management')}
            />
            </nav>

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
              />
            ) : currentPage === 'my-car' ? (
              // 新しいマイカーページ（全車両を表示、売却済み・廃車済みはREAD ONLYモード）
              car ? (
                <MyCarPage
                  car={car}
                  maintenanceRecords={maintenanceRecords}
                  fuelLogs={fuelLogs}
                  customizations={customizations}
                  insurancePolicies={insurancePolicies}
                  readOnly={car.status === 'sold' || car.status === 'scrapped' || car.status === 'downgraded_premium'} // READ ONLYモード
                  onOpenModal={(modalType, data) => {
                    // モーダル表示ハンドラー
                    switch (modalType) {
                      case 'fuel':
                        setShowFuelLogModal(true);
                        break;
                      case 'maintenance':
                        setShowMaintenanceModal(true);
                        break;
                      case 'insurance':
                        setShowInsuranceModal(true);
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
                        // PDF/共有機能
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
            ) : currentPage === 'insurance' ? (
            <InsuranceContent
              cars={cars}
              insurancePolicies={insurancePolicies}
              insuranceClaims={insuranceClaims}
              setShowInsuranceModal={setShowInsuranceModal}
              setShowEditInsuranceModal={setShowEditInsuranceModal}
              setEditingInsurancePolicy={setEditingInsurancePolicy}
              setShowInsuranceNotificationSettings={setShowInsuranceNotificationSettings}
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
          onClose={() => setShowMaintenanceModal(false)}
          onAdded={() => {
            console.log("Maintenance record added, closing modal");
            console.log("Current allMaintenanceRecords count:", allMaintenanceRecords.length);
            setShowMaintenanceModal(false);
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

      {/* 保険契約追加モーダル */}
      {showInsuranceModal && activeCarId && (
        <InsuranceModal
          carId={activeCarId}
          carName={car?.name || "車"}
          onClose={() => setShowInsuranceModal(false)}
          onAdded={() => {
            console.log("Insurance policy added, closing modal");
            setShowInsuranceModal(false);
          }}
        />
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

      {/* 保険契約編集モーダル */}
      {showEditInsuranceModal && editingInsurancePolicy && (
        <EditInsuranceModal
          policy={editingInsurancePolicy}
          cars={cars}
          onClose={() => {
            setShowEditInsuranceModal(false);
            setEditingInsurancePolicy(null);
          }}
          onUpdated={() => {
            setShowEditInsuranceModal(false);
            setEditingInsurancePolicy(null);
          }}
        />
      )}

      {/* 保険通知設定モーダル */}
      {showInsuranceNotificationSettings && (
        <InsuranceNotificationSettings
          onClose={() => setShowInsuranceNotificationSettings(false)}
        />
      )}

      {/* PDF/共有モーダル */}
      {showShareAndPDFModal && car && (
        <ShareAndPDFModal
          car={car}
          maintenanceRecords={maintenanceRecords}
          onClose={() => setShowShareAndPDFModal(false)}
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
  setShowCustomizationModal
}: {
  cars: Car[];
  activeCarId?: string;
  car?: Car;
  maintenanceRecords: MaintenanceRecord[];
  fuelLogs: FuelLog[];
  customizations: Customization[];
  setCurrentPage: (page: 'dashboard' | 'car-management' | 'maintenance-history' | 'fuel-logs' | 'customizations' | 'data-management' | 'notifications' | 'insurance' | 'my-car') => void;
  setActiveCarId: (id: string) => void;
  setShowMaintenanceModal: (show: boolean) => void;
  setShowFuelLogModal: (show: boolean) => void;
  setShowCustomizationModal: (show: boolean) => void;
}) {
  // SEO/アクセシビリティ用のh1タグ（非表示）
  const pageTitle = `ダッシュボード${car ? ' - ' + car.name : ' - garage log'}`;

  // 月別費用データの計算
  const monthlyExpenseData = useMemo(() => {
    const now = new Date();
    const months = [];
    
    // 過去6ヶ月のデータを生成
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('ja-JP', { month: 'long' });
      
      // その月のメンテナンス費用を計算
      const maintenanceCost = maintenanceRecords
        .filter(record => {
          const recordDate = record.date?.toDate ? record.date.toDate() : new Date();
          return recordDate.getFullYear() === date.getFullYear() && 
                 recordDate.getMonth() === date.getMonth();
        })
        .reduce((sum, record) => sum + (record.cost || 0), 0);
      
      // その月の給油費用を計算
      const fuelCost = fuelLogs
        .filter(log => {
          const logDate = log.date?.toDate ? log.date.toDate() : new Date();
          return logDate.getFullYear() === date.getFullYear() && 
                 logDate.getMonth() === date.getMonth();
        })
        .reduce((sum, log) => sum + (log.cost || 0), 0);
      
      // その月のカスタマイズ費用を計算
      const customizationCost = customizations
        .filter(custom => {
          const customDate = custom.date?.toDate ? custom.date.toDate() : new Date();
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
        cost: totalCost, // 互換性のため
        cumulativeCost: 0 // 後で計算
      });
    }
    
    // 累積費用を計算
    let cumulative = 0;
    months.forEach(month => {
      cumulative += month.cost;
      month.cumulativeCost = cumulative;
    });
    
    return months;
  }, [maintenanceRecords, fuelLogs]);





  return (
    <>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
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
        
              <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                  <img
                    src={car?.imagePath || "/car.jpg"}
                    alt={car?.name || "My Car"}
                    className="w-full h-44 md:h-full object-cover rounded-xl"
                    onLoad={() => {
                      // 画像読み込み完了時の処理
                    }}
                    onError={() => {
                      // 画像読み込みエラー時の処理
                    }}
                  />
                </div>
                <div className="flex flex-col justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">
                      {car?.name || "シビック（FL5）"}
                      {car?.modelCode ? `（${car.modelCode}）` : ""}
                    </h2>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <Spec label="グレード" value={car?.modelCode || "RS200"} />
                      <Spec
                        label="年式"
                        value={car?.year ? `${car.year}年` : "2001年（平成13年）"}
                      />
                      <Spec
                        label="走行距離"
                        value={
                          car?.odoKm
                            ? `${car.odoKm.toLocaleString()} km`
                            : "未設定"
                        }
                      />
                      <Spec 
                        label="車検期限" 
                        value={
                          car?.inspectionExpiry
                            ? (car.inspectionExpiry.toDate ? car.inspectionExpiry.toDate() : new Date(car.inspectionExpiry as any)).toLocaleDateString('ja-JP', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                            : "未設定"
                        } 
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
              {!activeCarId ? (
                <div className="text-sm text-gray-500 px-4 py-2">
                  {cars.length === 0 ? "まず車を追加してください" : "車を選択してください"}
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => {
                      console.log("Navigate to vehicle data, activeCarId:", activeCarId);
                      setCurrentPage('my-car');
                    }}
                    className="rounded-xl bg-blue-600 text-white px-3 py-2 text-sm font-medium hover:bg-blue-500"
                  >
                    📊 マイカーを見る
                  </button>
                </>
              )}
                  </div>
                </div>
              </div>
            </section>

            {/* メンテナンス、給油情報、カスタマイズ情報を3列に配置 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* メンテナンス */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">最近のメンテナンス</h3>
                  <button
                    onClick={() => setCurrentPage('maintenance-history')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    すべて見る →
                  </button>
                  </div>
              
              {maintenanceRecords.length > 0 ? (
                <div className="space-y-3">
                  {maintenanceRecords
                    .sort((a, b) => toMillis(b.date) - toMillis(a.date))
                    .slice(0, 3)
                    .map((record) => (
                    <div key={record.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">{record.title}</h4>
                </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {(record.date?.toDate ? record.date.toDate() : new Date()).toLocaleDateString('ja-JP')} • {record.mileage?.toLocaleString()}km
                            {record.cost && (
                              <span className="ml-2 font-medium text-gray-900">
                                ¥{record.cost.toLocaleString()}
                              </span>
                            )}
                          </p>
                          {record.description && (
                            <p className="text-sm text-gray-500 line-clamp-2">
                              {record.description}
                            </p>
                          )}
              </div>
                        {/* 詳細ボタンは削除 - クリックでマイカーページへ */}
                      </div>
                    </div>
                  ))}
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
                  <h4 className="text-lg font-medium text-gray-900 mb-2">メンテナンスがありません</h4>
                  <p className="text-gray-500 mb-4">最初の記録を追加してみましょう</p>
                  <button
                    onClick={() => setShowMaintenanceModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 mx-auto"
                  >
                    <span>+</span>
                    <span>メンテナンスを追加</span>
                  </button>
                </div>
              )}
            </div>

              {/* 給油情報 */}
              {car && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">給油情報</h3>
                    <button
                      onClick={() => setCurrentPage('fuel-logs')}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      詳細を見る →
                    </button>
                  </div>
                  
                  {fuelLogs.length > 0 ? (
                    <div className="space-y-4">
                      {/* 最新の給油情報 */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">最新の給油</h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                              <div className="text-lg font-bold text-gray-900">
                            {(toDate(fuelLogs[0].date) || new Date()).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                          </div>
                          <div className="text-xs text-gray-500">日時</div>
                        </div>
                        <div className="text-center">
                              <div className="text-lg font-bold text-gray-900">{((fuelLogs[0].quantity || 0) / 1000 || fuelLogs[0].fuelAmount || 0)}L</div>
                              <div className="text-xs text-gray-500">給油量</div>
                        </div>
                        <div className="text-center">
                              <div className="text-lg font-bold text-gray-900">¥{(fuelLogs[0].totalCostJpy || fuelLogs[0].cost || 0).toLocaleString()}</div>
                          <div className="text-xs text-gray-500">金額</div>
                        </div>
                      </div>
                      <div className="text-right">
                            <div className="text-sm font-bold text-gray-900">
                          ¥{Math.round((fuelLogs[0].totalCostJpy || fuelLogs[0].cost || 0) / ((fuelLogs[0].quantity || 0) / 1000 || fuelLogs[0].fuelAmount || 1)).toLocaleString()}
                        </div>
                            <div className="text-xs text-gray-500">単価</div>
                      </div>
                        </div>
                      </div>

                      {/* 給油統計 */}
                      {(() => {
                        const currentEfficiency = calculateFuelEfficiency(fuelLogs);
                        const averageEfficiency = calculateAverageFuelEfficiency(fuelLogs);
                        const totalFuelCost = fuelLogs.reduce((sum, log) => sum + (log.totalCostJpy || log.cost || 0), 0);
                        const totalFuelAmount = fuelLogs.reduce((sum, log) => sum + ((log.quantity || 0) / 1000 || log.fuelAmount || 0), 0);
                        const avgPricePerLiter = totalFuelAmount > 0 ? totalFuelCost / totalFuelAmount : 0;

                        return (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">統計情報</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="text-center">
                                <div className="text-sm font-bold text-blue-600">
                                  {currentEfficiency ? `${currentEfficiency} km/L` : '--'}
                                </div>
                                <div className="text-xs text-gray-500">現在の燃費</div>
                              </div>
                              <div className="text-center">
                                <div className="text-sm font-bold text-green-600">
                                  {averageEfficiency ? `${averageEfficiency} km/L` : '--'}
                                </div>
                                <div className="text-xs text-gray-500">平均燃費</div>
                              </div>
                              <div className="text-center">
                                <div className="text-sm font-bold text-orange-600">
                                  ¥{Math.round(avgPricePerLiter).toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500">平均単価</div>
                              </div>
                              <div className="text-center">
                                <div className="text-sm font-bold text-purple-600">
                                  ¥{totalFuelCost.toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500">総給油費</div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 最近の給油履歴 */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">最近の給油履歴（上位3件）</h4>
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
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="text-center">
                                    <div className="text-sm font-medium text-gray-900">
                                      {(log.date?.toDate ? log.date.toDate() : new Date()).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                                    </div>
                                    <div className="text-xs text-gray-500">日付</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-sm font-medium text-gray-900">{((log.quantity || 0) / 1000 || log.fuelAmount || 0)}L</div>
                                    <div className="text-xs text-gray-500">給油量</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-sm font-medium text-gray-900">¥{(log.totalCostJpy || log.cost || 0).toLocaleString()}</div>
                                    <div className="text-xs text-gray-500">金額</div>
                                  </div>
                                  {log.isFullTank && (
                                    <div className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                      満タン
                    </div>
                  )}
                </div>
                                <div className="text-right">
                                  <div className="text-sm text-gray-600">{log.odoKm.toLocaleString()}km</div>
                                  <div className="text-xs text-gray-500">走行距離</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {fuelLogs.length > 3 && (
                          <div className="pt-3 text-center border-t border-gray-200">
                            <button
                              onClick={() => setCurrentPage('fuel-logs')}
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                              もっと見る ({fuelLogs.length}件) →
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                        </svg>
                      </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">給油記録がありません</h4>
                  <p className="text-gray-500 mb-4">最初の給油を記録してみましょう</p>
                  <button
                    onClick={() => setShowFuelLogModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 mx-auto"
                  >
                    <span>+</span>
                    <span>給油を記録</span>
                  </button>
              </div>
            )}
                </div>
              )}

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
                    {customizations
                      .sort((a, b) => toMillis(b.date) - toMillis(a.date))
                      .slice(0, 3)
                      .map((customization) => (
                      <div key={customization.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900">{customization.title}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[customization.status]}`}>
                                {STATUS_LABELS[customization.status]}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {customization.categories.slice(0, 2).map((category) => (
                                <span key={category} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                  {CATEGORY_LABELS[category]}
                                </span>
                              ))}
                              {customization.categories.length > 2 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                  +{customization.categories.length - 2}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>{(customization.date?.toDate ? customization.date.toDate() : new Date()).toLocaleDateString('ja-JP')}</span>
                              {(customization.partsCostJpy || customization.laborCostJpy || customization.otherCostJpy) && (
                                <span className="font-medium text-green-600">
                                  ¥{((customization.partsCostJpy || 0) + (customization.laborCostJpy || 0) + (customization.otherCostJpy || 0)).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {customizations.length > 3 && (
                      <div className="text-center">
                        <button
                          onClick={() => setCurrentPage('customizations')}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          すべてのカスタマイズを見る ({customizations.length}件)
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
                    <h4 className="text-lg font-medium text-gray-900 mb-2">カスタマイズ記録がありません</h4>
                    <p className="text-gray-500 mb-4">最初のカスタムを記録してみましょう</p>
                    <button
                      onClick={() => setShowCustomizationModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 mx-auto"
                    >
                      <span>+</span>
                      <span>カスタムを追加</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 下段：月別費用推移 */}
            <section className="w-full">
              <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">月別費用推移</h3>
                  <div className="flex gap-2 text-sm">
                    <button className="px-3 py-1 rounded-full bg-blue-100 text-blue-700">月次</button>
                    <button className="px-3 py-1 rounded-full text-gray-600 hover:bg-gray-100">年次</button>
                    <button className="px-3 py-1 rounded-full text-gray-600 hover:bg-gray-100">全期間</button>
                </div>
                </div>
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
  const activeCar = cars.find(c => c.id === activeCarId) || cars[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-10 px-3 rounded-lg border border-gray-300 bg-white flex items-center gap-2 shadow-sm hover:bg-gray-50"
      >
        <span className="truncate max-w-[200px] text-sm font-medium text-gray-900">
          {activeCar?.name}
          {activeCar?.modelCode ? ` (${activeCar.modelCode})` : ''}
        </span>
        <span className="text-gray-400">▾</span>
      </button>
      {open && (
        <div className="absolute z-40 mt-2 w-[320px] rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="max-h-80 overflow-auto py-2">
            {cars.map((car) => (
              <button
                key={car.id}
                onClick={() => {
                  onSelectCar(car.id!);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${car.id === activeCarId ? 'bg-gray-100' : ''}`}
              >
                <div className="font-medium text-gray-900">
                  {car.name}
                  {car.modelCode && <span className="ml-1 text-gray-500">{car.modelCode}</span>}
                </div>
                <div className="text-sm text-gray-500">
                  {car.year ? `${car.year}年式` : ''}
                  {car.odoKm ? `${car.year ? '・' : ''}${car.odoKm.toLocaleString()}km` : ''}
                </div>
              </button>
            ))}
            <div className="my-2 mx-4 h-px bg-gray-200" />
            <button
              onClick={() => { setOpen(false); onAddCar(); }}
              className="w-full text-left px-4 py-3 text-blue-600 hover:bg-blue-50 rounded-b-xl"
            >
              ＋ 車両を追加
            </button>
          </div>
        </div>
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
          <span className="text-xl flex-shrink-0">{suggestion.icon}</span>
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
            <span>🚗 {Math.round(suggestion.dueInfo.remainKm).toLocaleString()}km</span>
            <span className="text-gray-400">•</span>
            <span>📅 {suggestion.dueInfo.remainDays}日</span>
          </div>
        ) : suggestion.dueInfo.remainKm !== Infinity ? (
          <div>🚗 残り {Math.round(suggestion.dueInfo.remainKm).toLocaleString()}km</div>
        ) : (
          <div>📅 残り {suggestion.dueInfo.remainDays}日</div>
        )}
        
        {suggestion.dueInfo.isOverdue && (
          <div className="text-red-600 font-semibold">⚠️ 期限超過</div>
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
  maintenanceRecords,
  setShowMaintenanceModal,
  setShowEditMaintenanceModal,
  setEditingMaintenanceRecord
}: {
  cars: Car[];
  maintenanceRecords: MaintenanceRecord[];
  setShowMaintenanceModal: (show: boolean) => void;
  setShowEditMaintenanceModal: (show: boolean) => void;
  setEditingMaintenanceRecord: (record: MaintenanceRecord | null) => void;
}) {
  const [activeTab, setActiveTab] = useState<'suggestions' | 'history'>('suggestions');
  const [selectedCarId, setSelectedCarId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // 選択されている車両を取得
  const selectedCar = selectedCarId !== 'all' ? cars.find(c => c.id === selectedCarId) : null;
  
  // 選択されている車両のメンテナンス記録のみを取得（提案用）
  const selectedCarMaintenanceRecords = selectedCarId !== 'all' 
    ? maintenanceRecords.filter(r => r.carId === selectedCarId)
    : [];

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
      selectedCarId,
      searchTerm,
      selectedCategory,
      selectedStatus,
      sortBy,
      sortOrder,
      records: maintenanceRecords.map(r => ({ id: r.id, title: r.title, carId: r.carId }))
    });
    
    let filtered = maintenanceRecords;

    // 車両でフィルタリング
    if (selectedCarId !== 'all') {
      console.log("Filtering by car ID:", selectedCarId);
      const beforeCount = filtered.length;
      filtered = filtered.filter(record => record.carId === selectedCarId);
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
  }, [maintenanceRecords, selectedCarId, searchTerm, selectedCategory, selectedStatus, sortBy, sortOrder]);

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

      {/* タブナビゲーション */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`flex-1 px-6 py-4 font-medium transition-colors relative ${
              activeTab === 'suggestions'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              💡 提案
              {selectedCar && suggestions.length > 0 && (
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  criticalSuggestions.length > 0
                    ? 'bg-red-500 text-white'
                    : soonSuggestions.length > 0
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {suggestions.length}
                </span>
              )}
            </span>
            {activeTab === 'suggestions' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-6 py-4 font-medium transition-colors relative ${
              activeTab === 'history'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              📋 履歴
              {filteredRecords.length > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200 text-gray-700">
                  {filteredRecords.length}
                </span>
              )}
            </span>
            {activeTab === 'history' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        </div>
      </div>

      {/* フィルター・検索 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 車両選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              車両でフィルター
            </label>
            <select
              value={selectedCarId}
              onChange={(e) => setSelectedCarId(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
            >
              <option value="all">すべての車両</option>
              {cars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.name}
                </option>
              ))}
            </select>
          </div>

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

      {/* タブコンテンツ */}
      {activeTab === 'suggestions' ? (
        // 提案タブ：カンバン風レイアウト
        <div className="space-y-4">
          {/* ODO/平均走行距離の警告バナー */}
          {selectedCar && (
            <>
              {(!selectedCar.odoKm || selectedCar.odoKm === 0) && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-blue-500 text-xl">ℹ️</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 text-sm mb-1">走行距離（ODO）未登録</h4>
                      <p className="text-xs text-blue-700">
                        時間ベースで提案しています。ODOを登録すると、より正確なメンテナンス提案ができます。
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {selectedCar.odoKm && selectedCar.odoKm > 0 && (!selectedCar.avgKmPerMonth || selectedCar.avgKmPerMonth === 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-amber-500 text-xl">💡</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-amber-900 text-sm mb-1">平均走行距離未登録</h4>
                      <p className="text-xs text-amber-700">
                        車両設定で月間走行距離を登録すると、残り日数の推定精度が向上します。
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!selectedCar ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                車両を選択してください
              </h3>
              <p className="text-gray-500">
                フィルターから車両を選択すると、メンテナンス提案が表示されます
              </p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <div className="text-green-400 mb-4">
                <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ✨ すべて良好です！
              </h3>
              <p className="text-gray-500">
                近いうちに必要なメンテナンスはありません
              </p>
            </div>
          ) : (
            // カンバン風レイアウト
            <div className="grid gap-4 md:grid-cols-3">
              {/* 🔴 緊急 */}
              <div className="bg-white rounded-2xl border-2 border-red-200 overflow-hidden">
                <div className="bg-gradient-to-r from-red-50 to-red-100 px-4 py-3 border-b border-red-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-red-900 flex items-center gap-2">
                      🔴 緊急
                    </h3>
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                      {criticalSuggestions.length}
                    </span>
                  </div>
                </div>
                <div className="p-3 space-y-2 min-h-[200px]">
                  {criticalSuggestions.map((suggestion) => (
                    <CompactSuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      onCreateFromTemplate={(id) => {
                        console.log('Create from template:', id);
                        setShowMaintenanceModal(true);
                      }}
                    />
                  ))}
                  {criticalSuggestions.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-8">該当なし</p>
                  )}
                </div>
              </div>

              {/* 🟡 近日 */}
              <div className="bg-white rounded-2xl border-2 border-yellow-200 overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 px-4 py-3 border-b border-yellow-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-yellow-900 flex items-center gap-2">
                      🟡 近日
                    </h3>
                    <span className="px-2 py-0.5 bg-yellow-500 text-white text-xs font-bold rounded-full">
                      {[...soonSuggestions, ...upcomingSuggestions].length}
                    </span>
                  </div>
                </div>
                <div className="p-3 space-y-2 min-h-[200px]">
                  {[...soonSuggestions, ...upcomingSuggestions].map((suggestion) => (
                    <CompactSuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      onCreateFromTemplate={(id) => {
                        console.log('Create from template:', id);
                        setShowMaintenanceModal(true);
                      }}
                    />
                  ))}
                  {[...soonSuggestions, ...upcomingSuggestions].length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-8">該当なし</p>
                  )}
                </div>
              </div>

              {/* 🟢 余裕あり */}
              <div className="bg-white rounded-2xl border-2 border-green-200 overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-green-100 px-4 py-3 border-b border-green-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-green-900 flex items-center gap-2">
                      🟢 余裕あり
                    </h3>
                    <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
                      {okSuggestions.length}
                    </span>
                  </div>
                </div>
                <div className="p-3 space-y-2 min-h-[200px]">
                  {okSuggestions.map((suggestion) => (
                    <CompactSuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      onCreateFromTemplate={(id) => {
                        console.log('Create from template:', id);
                        setShowMaintenanceModal(true);
                      }}
                    />
                  ))}
                  {okSuggestions.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-8">該当なし</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // 履歴タブ：既存の履歴一覧
        <>
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
                      <span>📅 {(record.date?.toDate ? record.date.toDate() : new Date()).toLocaleDateString('ja-JP')}</span>
                      {record.cost && (
                        <span>💰 ¥{record.cost.toLocaleString()}</span>
                      )}
                      {record.mileage && (
                        <span>🛣️ {record.mileage.toLocaleString()} km</span>
                      )}
                      {record.location && (
                        <span>📍 {record.location}</span>
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
      )}
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
  const handleGenerateURL = async (carId?: string) => {
    // プレミアム機能チェック
    if (!checkFeature('share_links', undefined, 'default')) {
      return;
    }

    try {
      if (carId) {
        const car = cars.find(c => c.id === carId);
        if (!car) {
          alert('車両が見つかりません。');
          return;
        }
        
        const carMaintenanceRecords = maintenanceRecords.filter(record => record.carId === carId);
        const url = await generateMaintenanceURL(car, carMaintenanceRecords);
        
        navigator.clipboard.writeText(url).then(() => {
          alert('URLをクリップボードにコピーしました。');
        }).catch(() => {
          alert(`共有URL: ${url}`);
        });
      } else {
        alert('車両を選択してください。');
      }
    } catch (error) {
      console.error('URL生成エラー:', error);
      alert('URLの生成に失敗しました。');
    }
  };

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

        {/* 履歴証明書・共有機能 */}
        <div>
          <h4 className="text-md font-medium text-gray-700 mb-3">履歴証明書・共有</h4>
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

            <button
              onClick={() => handleGenerateURL()}
              className="flex items-center justify-center gap-2 p-4 border border-orange-300 bg-orange-50 rounded-xl hover:bg-orange-100 transition"
            >
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="font-medium text-orange-700">履歴共有URL生成</span>
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

      {/* データ管理のヒント */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">データ管理のヒント</h3>
        <ul className="text-blue-800 space-y-2">
          <li>• 定期的にデータをエクスポートしてバックアップを取ることをお勧めします</li>
          <li>• CSVファイルはExcelやGoogleスプレッドシートで開くことができます</li>
          <li>• JSONファイルは完全なバックアップとして使用できます</li>
          <li>• <strong>PDF履歴書</strong>は売却時や整備工場への提示に最適です</li>
          <li>• <strong>共有URL</strong>で第三者に履歴を簡単に共有できます</li>
          <li>• データは暗号化されてFirebaseに保存されています</li>
                </ul>
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
  setCurrentPage: (page: 'dashboard' | 'car-management' | 'maintenance-history' | 'fuel-logs' | 'customizations' | 'data-management' | 'notifications' | 'insurance') => void;
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
                }}
                onDelete={() => car.id && handleDeleteCar(car.id, car.name)}
                onEdit={() => handleEditCar(car)}
                onMarkAsSold={() => {}}
                maintenanceRecords={maintenanceRecords}
                fuelLogs={fuelLogs}
                onAddFuel={handleAddFuel}
                onAddMaintenance={handleAddMaintenance}
                onAddCustomization={handleAddCustomization}
              />
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
                }}
                onDelete={() => car.id && handleDeleteCar(car.id, car.name)}
                onEdit={() => handleEditCar(car)}
                onMarkAsSold={() => {}}
                maintenanceRecords={maintenanceRecords}
                fuelLogs={fuelLogs}
                onAddFuel={handleAddFuel}
                onAddMaintenance={handleAddMaintenance}
                onAddCustomization={handleAddCustomization}
              />
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
                }}
                onDelete={() => car.id && handleDeleteCar(car.id, car.name)}
                onEdit={() => handleEditCar(car)}
                onMarkAsSold={() => {}}
                maintenanceRecords={maintenanceRecords}
                fuelLogs={fuelLogs}
                onAddFuel={handleAddFuel}
                onAddMaintenance={handleAddMaintenance}
                onAddCustomization={handleAddCustomization}
              />
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
  onClose, 
  onAdded 
}: { 
  carId: string; 
  carName: string; 
  currentMileage?: number;
  onClose: () => void; 
  onAdded: () => void; 
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState<string>("");
  const [mileage, setMileage] = useState<string>(currentMileage ? currentMileage.toString() : "");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState("");

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

      {/* 情報バー */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-3.5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">表示範囲:</span>
            <span className="font-medium text-gray-900">全期間</span>
            <span className="text-gray-400 text-xs">(フィルター機能は近日追加予定)</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">直近単価:</span>
              <span className="font-semibold text-gray-900">{lastPriceLabel}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">平均給油量:</span>
              <span className="font-semibold text-gray-900">{averageFillSizeLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      {activeCar ? (
        <FuelLogCard car={activeCar} />
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
function InsuranceContent({
  cars,
  insurancePolicies,
  insuranceClaims,
  setShowInsuranceModal,
  setShowEditInsuranceModal,
  setEditingInsurancePolicy,
  setShowInsuranceNotificationSettings
}: {
  cars: Car[];
  insurancePolicies: InsurancePolicy[];
  insuranceClaims: InsuranceClaim[];
  setShowInsuranceModal: (show: boolean) => void;
  setShowEditInsuranceModal: (show: boolean) => void;
  setEditingInsurancePolicy: (policy: InsurancePolicy | null) => void;
  setShowInsuranceNotificationSettings: (show: boolean) => void;
}) {
  const [selectedCarId, setSelectedCarId] = useState<string>('all');

  // フィルタリングされた保険契約
  const filteredPolicies = useMemo(() => {
    let filtered = insurancePolicies;
    
    if (selectedCarId !== 'all') {
      filtered = filtered.filter(policy => policy.carId === selectedCarId);
    }
    
    return filtered.sort((a, b) => toMillis(a.endDate) - toMillis(b.endDate));
  }, [insurancePolicies, selectedCarId]);

  // 編集ボタンのハンドラー
  const handleEditPolicy = (policy: InsurancePolicy) => {
    setEditingInsurancePolicy(policy);
    setShowEditInsuranceModal(true);
  };

  // 削除ボタンのハンドラー
  const handleDeletePolicy = async (policy: InsurancePolicy) => {
    if (!policy.id) return;
    
    if (confirm(`「${policy.provider}」の保険契約を削除しますか？`)) {
      try {
        await removeInsurancePolicy(policy.id);
        console.log("Insurance policy deleted successfully");
      } catch (error) {
        console.error("Error deleting insurance policy:", error);
        alert('保険契約の削除に失敗しました。');
      }
    }
  };

  return (
    <>
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">保険</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowInsuranceNotificationSettings(true)}
            className="rounded-xl border border-gray-300 text-gray-700 px-4 py-2 font-medium hover:bg-gray-50 transition"
          >
            🔔 通知設定
          </button>
          <button
            onClick={() => setShowInsuranceModal(true)}
            className="rounded-xl bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-500 transition"
          >
            ＋ 保険契約を追加
          </button>
        </div>
      </div>

      {/* フィルター */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">車両:</label>
            <select
              value={selectedCarId}
              onChange={(e) => setSelectedCarId(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">全ての車両</option>
              {cars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 保険契約一覧 */}
      <div className="mt-6">
        {filteredPolicies.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <div className="text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">保険契約がありません</h3>
            <p className="text-gray-500 mb-4">最初の保険契約を登録しましょう。</p>
            <button
              onClick={() => setShowInsuranceModal(true)}
              className="rounded-xl bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-500 transition"
            >
              保険契約を追加
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPolicies.map((policy) => {
              const car = cars.find(c => c.id === policy.carId);
              const daysUntilExpiry = getDaysUntilExpiry(toDate(policy.endDate) || new Date());
              const expiryStatus = getExpiryStatus(toDate(policy.endDate) || new Date());
              
              return (
                <div key={policy.id} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{policy.provider}</h3>
                      <p className="text-sm text-gray-500">{car?.name || '不明な車両'}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditPolicy(policy)}
                        className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs"
                        aria-label="Edit policy"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeletePolicy(policy)}
                        className="p-1 rounded-full bg-red-100 hover:bg-red-200 text-red-600 text-xs"
                        aria-label="Delete policy"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">証券番号:</span>
                      <span className="font-medium">{policy.policyNumber}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">保険料:</span>
                      <span className="font-medium">¥{policy.premiumAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">支払い周期:</span>
                      <span className="font-medium">{policy.paymentCycle === 'annual' ? '年払い' : '月払い'}</span>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">満期日:</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                          expiryStatus === 'expired' ? 'bg-red-100 text-red-700' :
                          expiryStatus === 'danger' ? 'bg-red-100 text-red-700' :
                          expiryStatus === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {daysUntilExpiry < 0 ? '期限切れ' : 
                           daysUntilExpiry === 0 ? '今日' :
                           `D-${daysUntilExpiry}`}
                        </span>
                        <span className="text-sm text-gray-500">
                          {(policy.endDate?.toDate ? policy.endDate.toDate() : new Date()).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// 保険契約編集モーダル
function EditInsuranceModal({
  policy,
  cars,
  onClose,
  onUpdated
}: {
  policy: InsurancePolicy;
  cars: Car[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [provider, setProvider] = useState(policy.provider);
  const [policyNumber, setPolicyNumber] = useState(policy.policyNumber);
  const [startDate, setStartDate] = useState((toDate(policy.startDate) || new Date()).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState((toDate(policy.endDate) || new Date()).toISOString().split('T')[0]);
  const [paymentCycle, setPaymentCycle] = useState(policy.paymentCycle);
  const [premiumAmount, setPremiumAmount] = useState(policy.premiumAmount.toString());
  const [bodilyInjuryLimit, setBodilyInjuryLimit] = useState(policy.coverages?.bodilyInjury?.limit || '無制限');
  const [propertyDamageLimit, setPropertyDamageLimit] = useState(policy.coverages?.propertyDamage?.limit || '無制限');
  const [personalInjuryLimit, setPersonalInjuryLimit] = useState(policy.coverages?.personalInjury?.limit || '');
  const [vehicleType, setVehicleType] = useState<'general' | 'economy' | 'none'>(policy.coverages?.vehicle?.type || 'none');
  const [deductible, setDeductible] = useState(policy.coverages?.vehicle?.deductible || '');
  const [riders, setRiders] = useState(policy.coverages?.riders?.join(', ') || '');
  const [ageLimit, setAgeLimit] = useState(policy.drivers?.ageLimit || '');
  const [familyOnly, setFamilyOnly] = useState(policy.drivers?.familyOnly || false);
  const [purpose, setPurpose] = useState<'private' | 'business' | 'commute'>(policy.usage?.purpose || 'private');
  const [annualMileageKm, setAnnualMileageKm] = useState((policy.usage?.annualMileageKm || 0).toString());
  const [notes, setNotes] = useState(policy.notes);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!provider || !policyNumber || !startDate || !endDate || !premiumAmount) {
      alert('必須項目を入力してください。');
      return;
    }

    try {
      const updateData = {
        provider,
        policyNumber,
        startDate: Timestamp.fromDate(new Date(startDate)),
        endDate: Timestamp.fromDate(new Date(endDate)),
        paymentCycle,
        premiumAmount: parseInt(premiumAmount),
        coverages: {
          bodilyInjury: { limit: bodilyInjuryLimit },
          propertyDamage: { limit: propertyDamageLimit },
          personalInjury: { limit: personalInjuryLimit },
          vehicle: { type: vehicleType, deductible },
          riders: riders.split(',').map(r => r.trim()).filter(r => r)
        },
        drivers: {
          ageLimit,
          familyOnly
        },
        usage: {
          purpose,
          annualMileageKm: parseInt(annualMileageKm) || 0
        },
        notes
      };

      if (!policy.id) return;
      await updateInsurancePolicy(policy.id, updateData);
      onUpdated();
    } catch (error) {
      console.error('Error updating insurance policy:', error);
      alert('保険契約の更新に失敗しました。');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">保険契約を編集</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          {/* 基本情報 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">保険会社 *</label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="例: 東京海上日動火災保険"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">証券番号 *</label>
              <input
                type="text"
                value={policyNumber}
                onChange={(e) => setPolicyNumber(e.target.value)}
                placeholder="例: ABC123456789"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">契約開始日 *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">満期日 *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">支払い周期</label>
              <select
                value={paymentCycle}
                onChange={(e) => setPaymentCycle(e.target.value as 'annual' | 'monthly')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="annual">年払い</option>
                <option value="monthly">月払い</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">保険料（円） *</label>
              <input
                type="number"
                value={premiumAmount}
                onChange={(e) => setPremiumAmount(e.target.value)}
                placeholder="例: 50000"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
          </div>

          {/* 補償内容 */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">補償内容</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">対人無制限</label>
                <input
                  type="text"
                  value={bodilyInjuryLimit}
                  onChange={(e) => setBodilyInjuryLimit(e.target.value)}
                  placeholder="例: 無制限"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">対物無制限</label>
                <input
                  type="text"
                  value={propertyDamageLimit}
                  onChange={(e) => setPropertyDamageLimit(e.target.value)}
                  placeholder="例: 無制限"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">人身傷害</label>
                <input
                  type="text"
                  value={personalInjuryLimit}
                  onChange={(e) => setPersonalInjuryLimit(e.target.value)}
                  placeholder="例: 3000万円"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">車両保険</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as 'general' | 'economy' | 'none')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="none">なし</option>
                  <option value="general">一般型</option>
                  <option value="economy">エコノミー型</option>
                </select>
              </div>
            </div>
            {vehicleType !== 'none' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">免責金額</label>
                <input
                  type="text"
                  value={deductible}
                  onChange={(e) => setDeductible(e.target.value)}
                  placeholder="例: 5万円"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">特約</label>
              <input
                type="text"
                value={riders}
                onChange={(e) => setRiders(e.target.value)}
                placeholder="例: 弁護士特約, ファミリーバイク特約（カンマ区切り）"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* 使用条件 */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">使用条件</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">年齢制限</label>
                <input
                  type="text"
                  value={ageLimit}
                  onChange={(e) => setAgeLimit(e.target.value)}
                  placeholder="例: 30歳以上"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">年間走行距離（km）</label>
                <input
                  type="number"
                  value={annualMileageKm}
                  onChange={(e) => setAnnualMileageKm(e.target.value)}
                  placeholder="例: 10000"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">使用目的</label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value as 'private' | 'business')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="private">個人使用</option>
                  <option value="business">業務使用</option>
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="editFamilyOnly"
                  checked={familyOnly}
                  onChange={(e) => setFamilyOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="editFamilyOnly" className="ml-2 text-sm text-gray-700">
                  家族限定
                </label>
              </div>
            </div>
          </div>

          {/* メモ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="特記事項や注意点があれば記入してください"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* ボタン */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2 font-medium text-gray-900 hover:bg-gray-50 transition"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-500 transition"
            >
              更新
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
  const [selectedCarId, setSelectedCarId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'cost'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // フィルタリングとソートのロジック
  const filteredCustomizations = useMemo(() => {
    let filtered = customizations;

    // 車両でフィルタ
    if (selectedCarId !== 'all') {
      filtered = filtered.filter(customization => customization.carId === selectedCarId);
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
  }, [customizations, selectedCarId, searchTerm, selectedCategory, selectedStatus, sortBy, sortOrder]);

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 車両選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  車両でフィルター
                </label>
                <select
                  value={selectedCarId}
                  onChange={(e) => setSelectedCarId(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
                >
                  <option value="all">すべての車両</option>
                  {cars.map((car) => (
                    <option key={car.id} value={car.id}>
                      {car.name}
                    </option>
                  ))}
                </select>
              </div>

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
