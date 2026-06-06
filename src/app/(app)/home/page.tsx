// src/app/page.tsx
"use client";

import "./home.css";
import { useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Timestamp } from "firebase/firestore";
import AuthGate from "@/components/AuthGate";
import { addCar, watchCars, updateCar } from "@/lib/cars";
import type { Car, CarInput } from "@/types";
import { auth, watchAuth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { User } from "firebase/auth";
import { addMaintenanceRecord, watchMaintenanceRecords, watchAllMaintenanceRecords, updateMaintenanceRecord, deleteMaintenanceRecord, deleteMultipleMaintenanceRecords } from "@/lib/maintenance";
import type { MaintenanceRecord } from "@/types";
import { downloadMaintenancePDF, downloadBuildSheetPDF, type PDFExportOptions } from "@/lib/pdfExport";
import { uploadCarImageWithProgress, isImageFile, uploadMaintenanceImage } from "@/lib/storage";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes } from "firebase/storage";
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
import OCRModal from "@/components/modals/OCRModal";
import { usePremiumGuard } from "@/hooks/usePremium";
import NextMaintenanceSuggestion from "@/components/mycar/NextMaintenanceSuggestion";
import { generateMaintenanceSuggestions } from "@/lib/maintenanceSuggestions";
import UnifiedCTA from "@/components/UnifiedCTA";
import { toDate, toMillis, toTimestamp } from "@/lib/dateUtils";
import { isPremiumPlan } from "@/lib/plan";
import ShareContent from "@/components/share/ShareContent";
import { useSelectedCar } from "@/contexts/SelectedCarContext";
import { CollapsibleSidebar } from "@/components/common/CollapsibleSidebar";
import { SidebarLayout } from "@/components/common/SidebarLayout";
import { useSidebarCollapse } from "@/hooks/useSidebarCollapse";
import { EditMaintenanceModal, MaintenanceModal, EditCarModal } from "./_components/modals";
import { DashboardContent } from "./_components/Dashboard";
import { CarHeaderDropdown, NotificationsContent } from "./_components/widgets";

/* -------------------- ページ本体 -------------------- */
function HomeContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedCarId, setSelectedCarId } = useSelectedCar();
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
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [authTrigger, setAuthTrigger] = useState(0); // 認証状態変更のトリガー
  const [currentUser, setCurrentUser] = useState<User | null>(null); // 現在のユーザー情報
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'my-car' | 'maintenance-history' | 'fuel-logs' | 'customizations' | 'notifications' | 'share'>('dashboard');
  // 軽量トースト（成功フィードバック）
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 1800);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // プレミアムガード
  const { userPlan, checkFeature, showPaywall, closePaywall, paywallFeature, paywallVariant } = usePremiumGuard();

  // URLクエリのtabパラメータを読み取ってcurrentPageを設定（ブリッジ遷移対応）
  useEffect(() => {
    const tab = searchParams?.get('tab');
    const allowedTabs = new Set(['dashboard', 'my-car', 'maintenance-history', 'fuel-logs', 'customizations', 'notifications', 'share']);
    if (tab && allowedTabs.has(tab)) {
      setCurrentPage(tab as any);
    }
  }, [searchParams]);

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

  // 車両リストが変更されたときに自動選択（グローバルコンテキストを優先）
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

    // 優先順位: 1) グローバルselectedCarId 2) 現在のactiveCarId 3) 最初の車
    let targetCarId: string | undefined = undefined;
    
    if (selectedCarId && activeCarsList.some(car => car.id === selectedCarId)) {
      // グローバルコンテキストのselectedCarIdが有効な場合
      targetCarId = selectedCarId;
    } else if (activeCarId && activeCarsList.some(car => car.id === activeCarId)) {
      // 現在のactiveCarIdが有効な場合
      targetCarId = activeCarId;
    } else {
      // effectiveCarIdがundefinedの場合、即座に最初の車を選択
      targetCarId = activeCarsList[0].id;
    }
    
    // targetCarIdが設定されている場合、activeCarIdがundefinedまたは異なる場合に更新
    if (targetCarId && (!activeCarId || targetCarId !== activeCarId)) {
      console.log("Setting activeCarId from context/fallback:", targetCarId);
      setActiveCarId(targetCarId);
      // グローバルコンテキストも更新（まだ設定されていない場合）
      if (!selectedCarId) {
        setSelectedCarId(targetCarId);
      }
    }
  }, [cars, activeCarId, selectedCarId, setSelectedCarId]);


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
          
          // 優先順位: 1) グローバルselectedCarId 2) 現在のactiveCarId 3) 最初の車
          const activeCarsList = list.filter((c) => !c.status || c.status === 'active');
          if (activeCarsList.length === 0) {
            setCars([]);
            return;
          }
          
          let targetCarId: string | undefined = undefined;
          if (selectedCarId && activeCarsList.some(car => car.id === selectedCarId)) {
            targetCarId = selectedCarId;
          } else if (activeCarId && activeCarsList.some(car => car.id === activeCarId)) {
            targetCarId = activeCarId;
          } else {
            targetCarId = activeCarsList[0].id;
          }
          
          if (targetCarId && targetCarId !== activeCarId) {
            console.log("Auto-selecting car from context/fallback:", targetCarId);
            setActiveCarId(targetCarId);
            if (!selectedCarId) {
              setSelectedCarId(targetCarId);
            }
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
      <div className="app-home min-h-screen">
        {/* ヘッダー */}
        <header className="app-header sticky top-0 z-30">
          <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
            <button
              onClick={() => router.push('/home')}
              className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink hover:opacity-70 transition-opacity"
            >
              <img src="/icon.png" alt="garage log" className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg shadow-sm ring-1 ring-black/5 flex-shrink-0" />
              <span className="app-logo-text text-sm sm:text-base truncate">GARAGE_LOG</span>
            </button>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* ヘッダー車両セレクター（右上に配置） */}
              {activeCars.length > 0 && (
                <div className="relative">
                  <CarHeaderDropdown
                    cars={activeCars}
                    activeCarId={selectedCarId || activeCarId}
                    onSelectCar={(id) => {
                      setSelectedCarId(id);
                      setActiveCarId(id);
                    }}
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
                className="btn-secondary-dark px-3 py-1.5 rounded-none whitespace-nowrap"
              >
                LOGOUT
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
                    onClick={() => router.push('/maintenance')}
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
                    onClick={() => router.push('/maintenance')}
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
        <SidebarLayout>
          {/* サイドバー */}
          <CollapsibleSidebar
            activeCarId={activeCarId}
            currentUser={currentUser}
            userPlan={userPlan}
            isPremiumPlan={isPremiumPlan}
            onHomeClick={() => {
              setCurrentPage('dashboard');
              router.push('/home?tab=dashboard');
            }}
            isHomeActive={currentPage === 'dashboard'}
          />

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
            ) : currentPage === 'share' ? (
              <ShareContent
                cars={cars}
                activeCarId={activeCarId}
                car={car}
                maintenanceRecords={maintenanceRecords}
                customizations={customizations}
              />
            ) : (
              <NotificationsContent 
                cars={cars}
                maintenanceRecords={allMaintenanceRecords}
              />
            )}
          </main>
        </SidebarLayout>
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

export default function Home() {
  return (
    <Suspense fallback={<div className="p-6">読み込み中…</div>}>
      <HomeContent />
    </Suspense>
  );
}
