// src/app/page.tsx
"use client";

import "./home.css";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import { watchCars } from "@/lib/cars";
import { Car } from "@/types";
import { auth, watchAuth } from "@/lib/firebase";
import { User } from "firebase/auth";
import { watchMaintenanceRecords, watchAllMaintenanceRecords } from "@/lib/maintenance";
import { MaintenanceRecord } from "@/types";
import { getCustomizations } from "@/lib/customizations";
import { Customization } from "@/types";
import { watchFuelLogs } from "@/lib/fuelLogs";
import { FuelLog } from "@/types";
import FuelLogModal from "@/components/modals/FuelLogModal";
import AddCarModal from "@/components/modals/AddCarModal";
import CustomizationModal from "@/components/modals/CustomizationModal";
import PaywallModal from "@/components/modals/PaywallModal";
import SellCarModal from "@/components/modals/SellCarModal";
import OCRModal from "@/components/modals/OCRModal";
import { usePremiumGuard } from "@/hooks/usePremium";
import { toDate } from "@/lib/dateUtils";
import { isPremiumPlan } from "@/lib/plan";
import ShareContent from "@/components/share/ShareContent";
import { useSelectedCar } from "@/contexts/SelectedCarContext";
import { CollapsibleSidebar } from "@/components/common/CollapsibleSidebar";
import { SidebarLayout } from "@/components/common/SidebarLayout";
import { AppHeader } from "@/components/common/AppHeader";
import { AppLoading } from "@/components/common/AppLoading";
import { useToast } from "@/components/common/Feedback";
import { EditMaintenanceModal, MaintenanceModal, EditCarModal } from "./_components/modals";
import { DashboardContent } from "./_components/Dashboard";
import { NotificationsContent } from "./_components/widgets";

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
  // 成功フィードバック（共通トースト）
  const toast = useToast();

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
    const unsubscribe = watchAuth((user) => {
      // ユーザー情報をstateに保存
      setCurrentUser(user);
      
      if (user) {
        // 認証されたらデータをクリアして再取得を促す
        setCars([]);
        setActiveCarId(undefined);
        setMaintenanceRecords([]);
        setAllMaintenanceRecords([]);
        setFuelLogs([]);
        
        // 認証トリガーを更新してデータ取得を促す
        setAuthTrigger(prev => prev + 1);
      } else {
        setCars([]);
        setActiveCarId(undefined);
        setMaintenanceRecords([]);
        setAllMaintenanceRecords([]);
        setFuelLogs([]);
        setAuthTrigger(0);
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  // 車両リストが変更されたときに自動選択（グローバルコンテキストを優先）
  useEffect(() => {
    if (cars.length === 0) {
      return;
    }

    // アクティブな車両のみを取得
    const activeCarsList = cars.filter((c) => !c.status || c.status === 'active');
    
    if (activeCarsList.length === 0) {
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
      return;
    }
    
    
    try {
    const off = watchCars((list) => {
        
        
        // 実際のデータがある場合はそれを使用
        if (list.length > 0) {
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
            setActiveCarId(targetCarId);
            if (!selectedCarId) {
              setSelectedCarId(targetCarId);
            }
          }
        } else {
          // データがない場合は空の配列を設定
          setCars([]);
        }
      });
      return () => {
        off && off();
      };
    } catch (error) {
      console.error("Error watching cars:", error);
      // エラーの場合は空の配列を設定
      setCars([]);
    }
  }, [auth.currentUser, activeCarId, authTrigger]); // 認証状態、activeCarId、認証トリガーの変更に反応

  // activeCarIdの設定を別途処理
  useEffect(() => {
    if (cars.length > 0 && !activeCarId) {
      setActiveCarId(cars[0].id);
    }
  }, [cars, activeCarId]);

  // メンテナンスの監視（認証状態とactiveCarIdに依存）
  useEffect(() => {
    // 認証されていない場合は何もしない
    if (!auth.currentUser) {
      setMaintenanceRecords([]);
      return;
    }
    
    if (!activeCarId) {
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

  // 全メンテナンスを監視（メンテナンスページ用）
  useEffect(() => {
    // 認証されていない場合は何もしない
    if (!auth.currentUser) {
      setAllMaintenanceRecords([]);
      return;
    }
    
    
    try {
      const off = watchAllMaintenanceRecords((records) => {
        setAllMaintenanceRecords(records);
      });
      return () => {
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

    const unsubscribe = watchFuelLogs(activeCarId, (logs) => {
      setFuelLogs(logs);
    });

    return () => {
      unsubscribe();
    };
  }, [auth.currentUser, activeCarId, authTrigger]);

  // カスタマイズデータの監視
  useEffect(() => {
    if (!auth.currentUser || !activeCarId) {
      setCustomizations([]);
      return;
    }

    const loadCustomizations = async () => {
      try {
        const customizations = await getCustomizations(auth.currentUser!.uid, activeCarId);
        setCustomizations(customizations);
      } catch (error) {
        console.error("Error loading customizations:", error);
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
    return cars.find((c) => c.id === activeCarId);
  }, [cars, activeCarId]);

  return (
    <AuthGate>
      <div className="app-home min-h-screen">
        {/* ヘッダー */}
        <AppHeader
          cars={activeCars}
          activeCarId={selectedCarId || activeCarId}
          onSelectCar={(id) => {
            setSelectedCarId(id);
            setActiveCarId(id);
          }}
          onAddCar={() => setShowAddCarModal(true)}
        />


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
            setShowAddCarModal(false);
          }}
          onAdded={() => {
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
            setShowMaintenanceModal(false);
            setMaintenanceTemplate(null);
            toast("メンテナンス記録を追加しました");
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
            toast("給油を記録しました");
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
    <Suspense fallback={<AppLoading />}>
      <HomeContent />
    </Suspense>
  );
}
