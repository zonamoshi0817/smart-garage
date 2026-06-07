"use client";

import "../home/home.css";
import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
import { useSelectedCar } from "@/contexts/SelectedCarContext";
import type { Car, MaintenanceRecord, Customization, FuelLog } from "@/types";
import type { User } from "firebase/auth";
import MyCarPage from "@/components/mycar/MyCarPage";
import { CollapsibleSidebar } from "@/components/common/CollapsibleSidebar";
import { SidebarLayout } from "@/components/common/SidebarLayout";
import { AppHeader } from "@/components/common/AppHeader";
import { AppLoading, InlineLoading } from "@/components/common/AppLoading";
import AddCarModal from "@/components/modals/AddCarModal";
import FuelLogModal from "@/components/modals/FuelLogModal";
import MaintenanceModal from "@/components/modals/MaintenanceModal";
import CustomizationModal from "@/components/modals/CustomizationModal";
import CarModal from "@/components/modals/CarModal";
import OCRModal from "@/components/modals/OCRModal";
import { useToast } from "@/components/common/Feedback";

function MyCarPageRouteContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { selectedCarId, setSelectedCarId } = useSelectedCar();
  const urlCarId = searchParams?.get('car') || null;
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

  // activeCarIdを決定（優先順位: URLクエリ > グローバルコンテキスト > ローカル状態）
  const effectiveCarId = useMemo(() => {
    return urlCarId || selectedCarId || activeCarId;
  }, [urlCarId, selectedCarId, activeCarId]);

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
      // effectiveCarIdがundefinedの場合、即座に最初の車を選択
      targetCarId = activeCarsList[0].id;
    }
    
    // targetCarIdが設定されている場合、activeCarIdがundefinedまたは異なる場合に更新
    if (targetCarId && (!activeCarId || targetCarId !== activeCarId)) {
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
      return;
    }
    
    try {
      const off = watchCars((list) => {
        setCars(list);
        // 車両リスト変更時の処理は、別のuseEffectで処理する
      });
      return () => {
        off && off();
      };
    } catch (error) {
      console.error("Error watching cars:", error);
      setCars([]);
    }
  }, [auth.currentUser, authTrigger]);

  // メンテナンス記録を取得
  useEffect(() => {
    if (!auth.currentUser || !effectiveCarId) {
      setMaintenanceRecords([]);
      return;
    }
    
    try {
      const off = watchMaintenanceRecords(effectiveCarId, (records) => {
        setMaintenanceRecords(records);
      });
      return () => {
        off && off();
      };
    } catch (error) {
      console.error("Error watching maintenance records:", error);
      setMaintenanceRecords([]);
    }
  }, [auth.currentUser, effectiveCarId, authTrigger]);

  // 給油ログの取得
  useEffect(() => {
    if (!auth.currentUser || !effectiveCarId) {
      setFuelLogs([]);
      return;
    }

    try {
      const off = watchFuelLogs(effectiveCarId, (logs) => {
        setFuelLogs(logs);
      });
      return () => {
        off && off();
      };
    } catch (error) {
      console.error("Error watching fuel logs:", error);
      setFuelLogs([]);
    }
  }, [auth.currentUser, effectiveCarId, authTrigger]);

  // カスタマイズ記録を取得
  useEffect(() => {
    if (!effectiveCarId || !auth.currentUser) {
      setCustomizations([]);
      setLoading(false);
      return;
    }
    getCustomizations(auth.currentUser.uid, effectiveCarId)
      .then((list) => {
        setCustomizations(list);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load customizations:", error);
        setCustomizations([]);
        setLoading(false);
      });
  }, [effectiveCarId, authTrigger]);

  // 現在保有中の車両のみ
  const activeCars = useMemo(
    () => cars.filter((c) => !c.status || c.status === 'active'),
    [cars]
  );

  const car = useMemo(() => {
    return cars.find((c) => c.id === effectiveCarId);
  }, [cars, effectiveCarId]);

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
        <SidebarLayout>
          {/* サイドバー */}
          <CollapsibleSidebar
            activeCarId={activeCarId}
            currentUser={currentUser}
            userPlan={userPlan}
            isPremiumPlan={isPremiumPlan}
          />

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
              <div className="app-card p-8 text-center">
                <p className="mb-4" style={{ color: "var(--text-muted)" }}>現在保有中の車両がありません</p>
                <button
                  onClick={() => setShowAddCarModal(true)}
                  className="btn-primary-dark px-6 py-3 rounded-none"
                >
                  車両を追加
                </button>
              </div>
            ) : (
              // 自動選択が進行中、または読み込み待ち
              <div className="app-card">
                <InlineLoading text="車両情報を読み込んでいます..." />
              </div>
            )}
          </main>
        </SidebarLayout>
      </div>

      {/* モーダル */}
      {showAddCarModal && (
        <AddCarModal
          onClose={() => setShowAddCarModal(false)}
          onAdded={async () => {
            try {
              setShowAddCarModal(false);
              // AddCarModal内で車両が追加されるため、ここでは何もしない
              // 必要に応じて、watchCarsで自動的に更新される
            } catch (error) {
              console.error("Failed to add car:", error);
              toast("車両の追加に失敗しました", "error");
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
              isOpen={showMaintenanceModal}
              onClose={() => {
                setShowMaintenanceModal(false);
                setMaintenanceTemplate(null);
              }}
              onSave={async (recordData) => {
                if (!car.id) return;
                try {
                  const { addMaintenanceRecord } = await import("@/lib/maintenance");
                  await addMaintenanceRecord({ ...recordData, carId: car.id });
                  setShowMaintenanceModal(false);
                  setMaintenanceTemplate(null);
                  setAuthTrigger(prev => prev + 1);
                } catch (error) {
                  console.error("Failed to add maintenance record:", error);
                  toast("メンテナンス記録の追加に失敗しました", "error");
                }
              }}
              cars={[car]}
              title={maintenanceTemplate || "メンテナンスを追加"}
            />
          )}

          {showCustomizationModal && (
            <CustomizationModal
              isOpen={showCustomizationModal}
              onClose={() => setShowCustomizationModal(false)}
              carId={car.id!}
              onSave={() => setShowCustomizationModal(false)}
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
                  toast("車両の更新に失敗しました", "error");
                }
              }}
              editingCar={editingCar}
              title="車両情報を編集"
            />
          )}

          {showOCRModal && (
            <OCRModal
              car={car}
              onClose={() => setShowOCRModal(false)}
            />
          )}
        </>
      )}
    </AuthGate>
  );
}

export default function MyCarPageRoute() {
  return (
    <Suspense fallback={<AppLoading />}>
      <MyCarPageRouteContent />
    </Suspense>
  );
}
