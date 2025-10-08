// src/app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { addCar, watchCars, type Car, type CarInput, updateCar, removeCar } from "@/lib/cars";
import { auth, watchAuth } from "@/lib/firebase";
import { addMaintenanceRecord, watchMaintenanceRecords, watchAllMaintenanceRecords, updateMaintenanceRecord, deleteMaintenanceRecord, deleteMultipleMaintenanceRecords, type MaintenanceRecord } from "@/lib/maintenance";
import { downloadMaintenancePDF, generateMaintenanceURL, type PDFExportOptions } from "@/lib/pdfExport";
import { generateCombinedProof, type ProofData } from '@/lib/proof';
import ProofBadge from '@/components/ProofBadge';
import { uploadCarImage, uploadCarImageWithProgress, isImageFile, validateFileSize } from "@/lib/storage";
import { compressImage, getFileSizeString, getCompressionInfo } from "@/lib/imageCompression";
import { carDatabase, type CarManufacturer, type CarModel } from "@/lib/carDatabase";
import CarModelSelector from "@/components/CarModelSelector";
import TypeaheadCarSelector from "@/components/TypeaheadCarSelector";
import AutoReminderPreview from "@/components/AutoReminderPreview";
import { addInsurancePolicy, watchInsurancePolicies, updateInsurancePolicy, removeInsurancePolicy, addInsuranceClaim, watchInsuranceClaims, updateInsuranceClaim, removeInsuranceClaim, type InsurancePolicy, type InsuranceClaim, calculateMonthlyInsuranceCosts, getDaysUntilExpiry, getExpiryStatus } from "@/lib/insurance";
import { watchInsuranceNotifications, type InsuranceNotification } from "@/lib/insuranceNotifications";
import InsuranceNotificationSettings from "@/components/InsuranceNotificationSettings";
import { addReminder, watchReminders, updateReminder, removeReminder, markReminderDone, snoozeReminder, dismissReminder, suggestReminders, checkReminderDue, getDaysUntilDue, getKmUntilDue, getReminderPriority, generateReminderFromMaintenance, extractMaintenanceTypeFromTitle, deleteRemindersByMaintenanceRecord, generateNextReminderOnComplete, type Reminder } from "@/lib/reminders";
import { watchFuelLogs } from "@/lib/fuelLogs";
import type { FuelLog } from "@/types";
import { BarChart, Bar as RechartsBar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Area, AreaChart } from 'recharts';
import FuelLogModal from "@/components/modals/FuelLogModal";
import FuelLogCard from "@/components/dashboard/FuelLogCard";

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
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [showEditInsuranceModal, setShowEditInsuranceModal] = useState(false);
  const [editingInsurancePolicy, setEditingInsurancePolicy] = useState<InsurancePolicy | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showEditReminderModal, setShowEditReminderModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [proofData, setProofData] = useState<ProofData | null>(null);
  const [showInsuranceNotificationSettings, setShowInsuranceNotificationSettings] = useState(false);
  const [showTypeaheadCarSelector, setShowTypeaheadCarSelector] = useState(false);
  const [showAutoReminderPreview, setShowAutoReminderPreview] = useState(false);
  const [showFuelLogModal, setShowFuelLogModal] = useState(false);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [pendingCarData, setPendingCarData] = useState<{
    manufacturer: CarManufacturer | null;
    model: CarModel | null;
    year: number | null;
    inspectionExpiry: string;
  } | null>(null);
  const [authTrigger, setAuthTrigger] = useState(0); // 認証状態変更のトリガー
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'car-management' | 'maintenance-history' | 'data-management' | 'notifications' | 'reminders' | 'insurance'>('dashboard');

  // テスト用の車両データ（開発時のみ）
  const testCars: Car[] = [
    {
      id: 'test1',
      name: 'シビック（FL5）',
      modelCode: 'RS200',
      year: 2023,
      odoKm: 10000,
      imagePath: '/car.jpg'
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
        setReminders([]);
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
        setReminders([]);
        setFuelLogs([]);
        setAuthTrigger(0);
      }
    });
    
    return () => {
      console.log("Cleaning up auth watcher");
      unsubscribe();
    };
  }, []);


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
        
        
        // 実際のデータがある場合はそれを使用
        if (list.length > 0) {
          console.log("Using real cars from Firestore");
      setCars(list);
          if (!activeCarId && list[0]?.id) {
            console.log("Setting active car to:", list[0].id);
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

  // メンテナンス履歴の監視（認証状態とactiveCarIdに依存）
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

  // 全メンテナンス履歴を監視（履歴ページ用）
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

  // リマインダーの監視
  useEffect(() => {
    // 認証されていない場合は何もしない
    if (!auth.currentUser) {
      console.log("No user authenticated, skipping reminders watch");
      setReminders([]);
      setFuelLogs([]);
      return;
    }
    
    console.log("Setting up reminders watcher");
    console.log("Current user:", auth.currentUser.email);
    
    try {
      const off = watchReminders((reminders) => {
        console.log("Reminders received:", reminders.length, "reminders");
        setReminders(reminders);
        
      });
      console.log("Reminders watcher set up successfully");
      return () => {
        console.log("Cleaning up reminders watcher");
        off && off();
      };
    } catch (error) {
      console.error("Error watching reminders:", error);
      setReminders([]);
      setFuelLogs([]);
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

  const car = useMemo(
    () => cars.find((c) => c.id === activeCarId),
    [cars, activeCarId]
  );

  // アクティブなリマインダーを取得
  const activeReminders = useMemo(() => {
    return reminders.filter(reminder => 
      reminder.status === 'active' && 
      reminder.carId === activeCarId
    );
  }, [reminders, activeCarId]);

  // 期限切れのリマインダーを取得
  const overdueReminders = useMemo(() => {
    return activeReminders.filter(reminder => 
      checkReminderDue(reminder, car?.odoKm)
    );
  }, [activeReminders, car?.odoKm]);

  // 今週期限のリマインダーを取得
  const thisWeekReminders = useMemo(() => {
    return activeReminders.filter(reminder => {
      const daysUntilDue = getDaysUntilDue(reminder);
      return daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue >= 0;
    });
  }, [activeReminders]);

  // デバッグ情報
  console.log("Dashboard state:", {
    activeCarId,
    carName: car?.name,
    maintenanceRecordsCount: maintenanceRecords.length,
    allMaintenanceRecordsCount: allMaintenanceRecords.length,
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
        date: new Date(),
        location: 'テスト工場',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setAllMaintenanceRecords([testRecord]);
    }
  }, [activeCarId, allMaintenanceRecords.length]);

  // タイプアヘッド車種選択のハンドラー
  const handleTypeaheadCarSelect = (data: {
    manufacturer: CarManufacturer | null;
    model: CarModel | null;
    year: number | null;
    inspectionExpiry: string;
  }) => {
    setPendingCarData(data);
    setShowTypeaheadCarSelector(false);
    setShowAutoReminderPreview(true);
  };

  // 自動リマインダープレビューのハンドラー
  const handleAutoReminderConfirm = async (enabledReminders: string[]) => {
    if (!pendingCarData) return;

    try {
      console.log("=== 車両追加開始 ===");
      console.log("pendingCarData:", pendingCarData);
      console.log("enabledReminders:", enabledReminders);
      
      // 認証状態を確認
      const { auth } = await import('@/lib/firebase');
      console.log("認証状態:", auth.currentUser);
      if (!auth.currentUser) {
        throw new Error("ユーザーがログインしていません");
      }
      
      // 車両データを作成
      const carData: CarInput = {
        name: pendingCarData.model 
          ? `${pendingCarData.manufacturer?.name || ''} ${pendingCarData.model.name}`.trim()
          : pendingCarData.manufacturer?.name || '未設定',
        modelCode: pendingCarData.model?.modelCode || undefined,
        year: pendingCarData.year || new Date().getFullYear(),
        odoKm: 0,
        inspectionExpiry: pendingCarData.inspectionExpiry,
        firstRegYm: undefined,
        avgKmPerMonth: undefined,
        imagePath: pendingCarData.model?.defaultImagePath || '/car.jpg' // デフォルト画像パスを設定
      };

      console.log("作成する車両データ:", carData);

      // 車両を追加
      const newCar = await addCar(carData);
      console.log("車両追加成功, ID:", newCar);
      
      // 自動リマインダーを生成（有効なもののみ）
      if (enabledReminders.length > 0) {
        const { generateInitialReminders, saveAutoReminders } = await import("@/lib/reminders");
        const vehicleData = {
          id: newCar,
          name: carData.name,
          inspectionExpiry: new Date(pendingCarData.inspectionExpiry),
          firstRegYm: undefined,
          odoAtReg: 0,
          avgKmPerMonth: undefined
        };
        
        const autoReminders = generateInitialReminders(vehicleData);
        // 有効なリマインダーのみフィルタリング
        const filteredReminders = autoReminders.filter(reminder => 
          enabledReminders.includes(reminder.type)
        );
        
        await saveAutoReminders(newCar, filteredReminders);
      }

      // モーダルを閉じる
      setShowAutoReminderPreview(false);
      setPendingCarData(null);
      
      // 成功メッセージ
      alert('車両が正常に追加され、自動リマインダーが設定されました！');
      
    } catch (error) {
      console.error('=== 車両追加エラー ===');
      console.error('Error:', error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // より詳細なエラーメッセージを表示
      let errorMessage = '車両の追加に失敗しました。';
      if (error instanceof Error) {
        if (error.message.includes('not signed in')) {
          errorMessage = 'ログインが必要です。ページを再読み込みしてください。';
        } else if (error.message.includes('permission')) {
          errorMessage = '権限エラーが発生しました。Firebase設定を確認してください。';
        } else if (error.message.includes('network')) {
          errorMessage = 'ネットワークエラーが発生しました。接続を確認してください。';
        } else {
          errorMessage = `車両の追加に失敗しました: ${error.message}`;
        }
      }
      
      alert(errorMessage);
    }
  };

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
            <div className="flex items-center gap-3">
              <span className="text-2xl font-extrabold tracking-tight text-blue-600">
                Smart Garage
              </span>
            </div>
            <div className="flex items-center gap-4">

              {/* ▼ Firestoreのcarsから生成されるセレクト */}
              <CarPicker
                cars={cars}
                activeId={activeCarId}
                onChange={(id) => setActiveCarId(id)}
                onAddCar={() => setShowAddCarModal(true)}
              />

              <button
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100"
                aria-label="notifications"
              >
                🔔
              </button>
            </div>
          </div>
        </header>

        {/* レイアウト */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
          {/* サイドバー */}
          <aside className="lg:sticky lg:top-20 h-fit">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 grid place-items-center font-semibold text-sm">
                小
              </div>
              <div className="text-sm">
                <div className="font-semibold">小林 健太</div>
                <div className="text-gray-500">Free プラン</div>
              </div>
            </div>

            <button 
              onClick={() => {
                console.log("Sidebar maintenance button clicked, activeCarId:", activeCarId);
                if (!activeCarId) {
                  if (cars.length === 0) {
                    alert("まず車を追加してください。右上の「＋ 車を追加」ボタンから車を登録できます。");
                    setShowAddCarModal(true);
                  } else {
                    alert("車を選択してください。右上のドロップダウンから車を選択できます。");
                  }
                  return;
                }
                setShowMaintenanceModal(true);
              }}
              className="mt-4 w-full rounded-2xl bg-blue-600 text-white py-3 font-semibold hover:bg-blue-500 transition"
            >
              ＋ メンテナンスを記録
            </button>

            <button 
              onClick={() => {
                console.log("Sidebar fuel log button clicked, activeCarId:", activeCarId);
                if (!activeCarId) {
                  if (cars.length === 0) {
                    alert("まず車を追加してください。右上の「＋ 車を追加」ボタンから車を登録できます。");
                    setShowAddCarModal(true);
                  } else {
                    alert("車を選択してください。右上のドロップダウンから車を選択できます。");
                  }
                  return;
                }
                setShowFuelLogModal(true);
              }}
              className="mt-2 w-full rounded-2xl bg-green-600 text-white py-3 font-semibold hover:bg-green-500 transition"
            >
              ＋ 給油を記録
            </button>

            <nav className="mt-4 bg-white rounded-2xl border border-gray-200 p-2 space-y-1 text-[15px]">
              <NavItem 
                label="ダッシュボード" 
                active={currentPage === 'dashboard'} 
                onClick={() => setCurrentPage('dashboard')}
              />
            <NavItem 
              label="車両" 
              active={currentPage === 'car-management'} 
              onClick={() => setCurrentPage('car-management')}
            />
            <NavItem 
              label="メンテナンス計画" 
              active={currentPage === 'reminders'} 
              onClick={() => setCurrentPage('reminders')}
            />
            <NavItem 
              label="メンテナンス履歴" 
              active={currentPage === 'maintenance-history'} 
              onClick={() => setCurrentPage('maintenance-history')}
            />
            <NavItem 
              label="保険" 
              active={currentPage === 'insurance'} 
              onClick={() => setCurrentPage('insurance')}
            />
            <NavItem 
              label="エクスポート" 
              active={currentPage === 'data-management'} 
              onClick={() => setCurrentPage('data-management')}
            />
            </nav>

            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="text-sm font-semibold">プレミアムにアップグレード</div>
              <p className="text-xs text-gray-600 mt-1">
                無制限の車両登録と高度な分析機能を利用できます
              </p>
              <button className="mt-3 w-full rounded-xl bg-white border border-blue-300 py-2 text-sm font-medium hover:bg-blue-100">
                詳細を見る
              </button>
            </div>
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
                activeReminders={activeReminders}
                overdueReminders={overdueReminders}
                thisWeekReminders={thisWeekReminders}
                setShowMaintenanceModal={setShowMaintenanceModal}
                setShowAddCarModal={setShowAddCarModal}
                setShowReminderModal={setShowReminderModal}
                setShowEditReminderModal={setShowEditReminderModal}
                setEditingReminder={setEditingReminder}
                setShowEditMaintenanceModal={setShowEditMaintenanceModal}
                setEditingMaintenanceRecord={setEditingMaintenanceRecord}
                setCurrentPage={setCurrentPage}
                setShowFuelLogModal={setShowFuelLogModal}
              />
            ) : currentPage === 'car-management' ? (
              <CarManagementContent 
                cars={cars}
                activeCarId={activeCarId}
                setActiveCarId={setActiveCarId}
                setShowAddCarModal={setShowAddCarModal}
                setShowEditCarModal={setShowEditCarModal}
                setEditingCar={setEditingCar}
                setShowTypeaheadCarSelector={setShowTypeaheadCarSelector}
              />
            ) : currentPage === 'maintenance-history' ? (
              <MaintenanceHistoryContent 
                cars={cars}
                maintenanceRecords={allMaintenanceRecords}
                setShowMaintenanceModal={setShowMaintenanceModal}
                setShowEditMaintenanceModal={setShowEditMaintenanceModal}
                setEditingMaintenanceRecord={setEditingMaintenanceRecord}
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
              />
            ) : currentPage === 'reminders' ? (
              <RemindersContent 
                cars={cars}
                maintenanceRecords={allMaintenanceRecords}
                reminders={reminders}
                activeReminders={activeReminders}
                overdueReminders={overdueReminders}
                thisWeekReminders={thisWeekReminders}
                setShowReminderModal={setShowReminderModal}
                setShowEditReminderModal={setShowEditReminderModal}
                setEditingReminder={setEditingReminder}
                markReminderDone={markReminderDone}
                snoozeReminder={snoozeReminder}
                dismissReminder={dismissReminder}
                getDaysUntilDue={getDaysUntilDue}
                getKmUntilDue={getKmUntilDue}
                checkReminderDue={checkReminderDue}
              />
            ) : (
              <NotificationsContent 
                cars={cars}
                maintenanceRecords={allMaintenanceRecords}
                reminders={reminders}
                activeReminders={activeReminders}
                overdueReminders={overdueReminders}
                thisWeekReminders={thisWeekReminders}
                setShowReminderModal={setShowReminderModal}
                setShowEditReminderModal={setShowEditReminderModal}
                setEditingReminder={setEditingReminder}
                markReminderDone={markReminderDone}
                snoozeReminder={snoozeReminder}
                dismissReminder={dismissReminder}
                getDaysUntilDue={getDaysUntilDue}
                getKmUntilDue={getKmUntilDue}
                checkReminderDue={checkReminderDue}
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
          }}
        />
      )}

      {/* メンテナンス履歴記録モーダル */}
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

      {/* メンテナンス履歴編集モーダル */}
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

      {/* リマインダー追加モーダル */}
      {showReminderModal && activeCarId && (
        <ReminderModal
          carId={activeCarId}
          carName={car?.name || "車"}
          onClose={() => setShowReminderModal(false)}
          onAdded={() => {
            console.log("Reminder added, closing modal");
            setShowReminderModal(false);
          }}
        />
      )}

      {/* リマインダー編集モーダル */}
      {showEditReminderModal && editingReminder && (
        <EditReminderModal
          reminder={editingReminder}
          onClose={() => {
            setShowEditReminderModal(false);
            setEditingReminder(null);
          }}
          onUpdated={() => {
            console.log("Reminder updated, closing modal");
            setShowEditReminderModal(false);
            setEditingReminder(null);
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

      {/* タイプアヘッド車種選択モーダル */}
      {showTypeaheadCarSelector && (
        <TypeaheadCarSelector
          onSelect={handleTypeaheadCarSelect}
          onClose={() => setShowTypeaheadCarSelector(false)}
        />
      )}

      {/* 自動リマインダープレビューモーダル */}
      {showAutoReminderPreview && pendingCarData && (
        <AutoReminderPreview
          manufacturer={pendingCarData.manufacturer}
          model={pendingCarData.model}
          year={pendingCarData.year}
          inspectionExpiry={pendingCarData.inspectionExpiry}
          onConfirm={handleAutoReminderConfirm}
          onClose={() => {
            setShowAutoReminderPreview(false);
            setPendingCarData(null);
          }}
        />
      )}


    </AuthGate>
  );
}/* -------------------- ページコンテンツ -------------------- */
function DashboardContent({ 
  cars, 
  activeCarId, 
  car, 
  maintenanceRecords,
  fuelLogs,
  activeReminders,
  overdueReminders,
  thisWeekReminders,
  setShowMaintenanceModal, 
  setShowAddCarModal,
  setShowReminderModal,
  setShowEditReminderModal,
  setEditingReminder,
  setShowEditMaintenanceModal,
  setEditingMaintenanceRecord,
  setCurrentPage,
  setShowFuelLogModal
}: {
  cars: Car[];
  activeCarId?: string;
  car?: Car;
  maintenanceRecords: MaintenanceRecord[];
  fuelLogs: FuelLog[];
  activeReminders: Reminder[];
  overdueReminders: Reminder[];
  thisWeekReminders: Reminder[];
  setShowMaintenanceModal: (show: boolean) => void;
  setShowAddCarModal: (show: boolean) => void;
  setShowReminderModal: (show: boolean) => void;
  setShowEditReminderModal: (show: boolean) => void;
  setEditingReminder: (reminder: Reminder | null) => void;
  setShowEditMaintenanceModal: (show: boolean) => void;
  setEditingMaintenanceRecord: (record: MaintenanceRecord | null) => void;
  setCurrentPage: (page: 'dashboard' | 'car-management' | 'maintenance-history' | 'data-management' | 'notifications' | 'insurance') => void;
  setShowFuelLogModal: (show: boolean) => void;
}) {

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
          const recordDate = record.date;
          return recordDate.getFullYear() === date.getFullYear() && 
                 recordDate.getMonth() === date.getMonth();
        })
        .reduce((sum, record) => sum + (record.cost || 0), 0);
      
      // その月の給油費用を計算
      const fuelCost = fuelLogs
        .filter(log => {
          const logDate = log.date;
          return logDate.getFullYear() === date.getFullYear() && 
                 logDate.getMonth() === date.getMonth();
        })
        .reduce((sum, log) => sum + (log.cost || 0), 0);
      
      const totalCost = maintenanceCost + fuelCost;
      
      months.push({
        month: monthName,
        monthKey,
        maintenanceCost,
        fuelCost,
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

  // リマインダー関連のハンドラー
  const handleReminderAction = async (reminder: Reminder, action: 'done' | 'snooze' | 'dismiss') => {
    if (!reminder.id) return;
    
    try {
      switch (action) {
        case 'done':
          await markReminderDone(reminder.id);
          
          // リマインダー完了時の自動生成は無効化（無限ループ防止）
          // 必要に応じて手動でメンテナンス記録を作成してリマインダーを生成
          console.log("リマインダーを完了しました。次のリマインダーは手動でメンテナンス記録を作成して生成してください。");
          break;
        case 'snooze':
          await snoozeReminder(reminder.id, 7);
          break;
        case 'dismiss':
          await dismissReminder(reminder.id);
          break;
      }
    } catch (error) {
      console.error('Error updating reminder:', error);
      alert('リマインダーの更新に失敗しました。');
    }
  };

  const handleEditReminder = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setShowEditReminderModal(true);
  };


  // 証明性データの生成
  useEffect(() => {
    const generateProof = async () => {
      if (car && maintenanceRecords.length > 0) {
        try {
          const proof = await generateCombinedProof(car, maintenanceRecords, []);
          // setProofData(proof);
        } catch (error) {
          console.error('証明性データの生成に失敗:', error);
        }
      }
    };

    generateProof();
  }, [car, maintenanceRecords]);


  return (
    <>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
      </div>


      {/* 証明性バッジ */}
      {/* {proofData && (
        <div className="mb-6">
          <ProofBadge proof={proofData} showDetails={true} />
        </div>
      )} */}

      {/* 車検期限リマインダー */}
      {car?.inspectionExpiry && (() => {
        const expiryDate = new Date(car.inspectionExpiry);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
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
                            ? new Date(car.inspectionExpiry).toLocaleDateString('ja-JP', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                            : "未設定"
                        } 
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
              {!activeCarId ? (
                <div className="text-sm text-gray-500 px-4 py-2">
                  {cars.length === 0 ? "まず車を追加してください" : "車を選択してください"}
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => {
                      console.log("Maintenance button clicked, activeCarId:", activeCarId);
                      setShowMaintenanceModal(true);
                    }}
                    className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-500"
                  >
                    ＋ メンテナンスを記録
                  </button>
                  <button 
                    onClick={() => {
                      console.log("Fuel log button clicked, activeCarId:", activeCarId);
                      setShowFuelLogModal(true);
                    }}
                    className="rounded-xl bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-500"
                  >
                    ＋ 給油を記録
                  </button>
                </>
              )}
                  </div>
                </div>
              </div>
            </section>

            {/* リマインダーとメンテナンス履歴 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 次回リマインダー */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">次のメンテナンス計画</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowReminderModal(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      ＋ 追加
                    </button>
                    {activeReminders.length > 3 && (
                      <button
                        onClick={() => setCurrentPage('notifications')}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                    すべて表示
                  </button>
                    )}
                </div>
                </div>

              {activeReminders.length > 0 ? (
                <div className="space-y-4">
                  {activeReminders
                    .sort((a, b) => {
                      // 期限切れを最優先、次に日付・走行距離の近い順
                      const aOverdue = checkReminderDue(a, car?.odoKm);
                      const bOverdue = checkReminderDue(b, car?.odoKm);
                      if (aOverdue && !bOverdue) return -1;
                      if (!aOverdue && bOverdue) return 1;
                      
                      const aDays = getDaysUntilDue(a) || 999;
                      const bDays = getDaysUntilDue(b) || 999;
                      return aDays - bDays;
                    })
                    .slice(0, 3)
                    .map((reminder) => {
                      const daysUntilDue = getDaysUntilDue(reminder);
                      const kmUntilDue = car?.odoKm ? getKmUntilDue(reminder, car.odoKm) : null;
                      const isOverdue = checkReminderDue(reminder, car?.odoKm);
                      
                      // 進捗バーの計算
                      let progress = 0;
                      if (reminder.kind === 'time' && reminder.dueDate && reminder.threshold.months) {
                        const totalDays = reminder.threshold.months * 30;
                        const remainingDays = daysUntilDue || 0;
                        progress = Math.max(0, Math.min(100, ((totalDays - remainingDays) / totalDays) * 100));
                      } else if (reminder.kind === 'distance' && reminder.dueOdoKm && reminder.threshold.km && car?.odoKm) {
                        const totalKm = reminder.threshold.km;
                        const remainingKm = kmUntilDue || 0;
                        progress = Math.max(0, Math.min(100, ((totalKm - remainingKm) / totalKm) * 100));
                      }
                      
                      // アイコンの決定
                      const getReminderIcon = (title: string) => {
                        if (title.includes('オイル') || title.includes('エンジン')) {
                          return (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                          );
                        } else if (title.includes('タイヤ') || title.includes('ローテーション')) {
                          return (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                            </svg>
                          );
                        } else if (title.includes('車検') || title.includes('点検')) {
                          return (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                            </svg>
                          );
                        } else if (title.includes('自動車税')) {
                          return (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                          );
                        } else if (title.includes('ブレーキ')) {
                          return (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                          );
                        } else {
                          return (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                          );
                        }
                      };
                      
                      return (
                        <div key={reminder.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition">
                          {/* アイコン */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isOverdue ? 'bg-red-100 text-red-600' : 
                            daysUntilDue !== null && daysUntilDue <= 7 ? 'bg-yellow-100 text-yellow-600' : 
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {getReminderIcon(reminder.title)}
              </div>

                          {/* 内容 */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{reminder.title}</h4>
                            
                            {/* オイルリマインダーの特別な情報 */}
                            {reminder.type === 'oil_change' && reminder.oilSpec && (
                              <div className="text-xs text-blue-600 mb-1">
                                {reminder.oilSpec.viscosity} / {reminder.oilSpec.api}
                              </div>
                            )}
                            
                            <p className="text-sm text-gray-500">
                              {isOverdue ? (
                                <span className="text-red-600 font-medium">期限切れ</span>
                              ) : (
                                <>
                                  {/* 日数表示 */}
                                  {daysUntilDue !== null && (
                                    <span>あと{daysUntilDue}日</span>
                                  )}
                                  {kmUntilDue !== null && kmUntilDue > 0 && (
                                    <span className={daysUntilDue !== null ? 'ml-2' : ''}>
                                      または {kmUntilDue.toLocaleString()}km
                                    </span>
                                  )}
                                </>
                              )}
                            </p>
                            
                            {/* 進捗バー */}
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    isOverdue ? 'bg-red-500' : 
                                    daysUntilDue !== null && daysUntilDue <= 7 ? 'bg-yellow-500' : 
                                    'bg-blue-500'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                                ></div>
                              </div>
                            </div>
                            
                            {/* オイルリマインダーのアクションボタン */}
                            {reminder.type === 'oil_change' && (reminder.purchaseCandidates?.length || reminder.reservationUrl) && (
                              <div className="mt-2 flex gap-2">
                                {reminder.reservationUrl && (
                                  <a
                                    href={reminder.reservationUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition"
                                  >
                                    予約する
                                  </a>
                                )}
                                {reminder.purchaseCandidates && reminder.purchaseCandidates.length > 0 && (
                                  <a
                                    href={reminder.purchaseCandidates[0].url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition"
                                  >
                                    オイルを買う
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* アクションボタン */}
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleReminderAction(reminder, 'done')}
                              className="p-1 rounded-full bg-green-100 hover:bg-green-200 text-green-600 text-xs"
                              title="完了"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => handleEditReminder(reminder)}
                              className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs"
                              title="編集"
                            >
                              ✏️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-5 5v-5zM9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">メンテナンス計画がありません</h4>
                  <p className="text-gray-500 mb-4">メンテナンスの計画を設定しましょう</p>
                  <button
                    onClick={() => setShowReminderModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    メンテナンス計画を追加
                  </button>
                </div>
              )}
              </div>

              {/* メンテナンス履歴 */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">最近のメンテナンス履歴</h3>
                  <button
                    onClick={() => setShowMaintenanceModal(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ＋ メンテナンスを記録
                  </button>
                  </div>
              
              {maintenanceRecords.length > 0 ? (
                <div className="space-y-3">
                  {maintenanceRecords
                    .sort((a, b) => b.date.getTime() - a.date.getTime())
                    .slice(0, 5)
                    .map((record) => (
                    <div key={record.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">{record.title}</h4>
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                              {record.title}
                            </span>
                </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {record.date.toLocaleDateString('ja-JP')} • {record.mileage?.toLocaleString()}km
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
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => {
                              setEditingMaintenanceRecord(record);
                              setShowEditMaintenanceModal(true);
                            }}
                            className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs"
                            aria-label="Edit maintenance record"
                          >
                            ✏️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {maintenanceRecords.length > 5 && (
                    <div className="text-center pt-2">
                      <button
                        onClick={() => setCurrentPage('maintenance-history')}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        すべての履歴を見る ({maintenanceRecords.length}件)
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
                  <h4 className="text-lg font-medium text-gray-900 mb-2">メンテナンス履歴がありません</h4>
                  <p className="text-gray-500 mb-4">最初のメンテナンス記録を追加しましょう</p>
                  <button
                    onClick={() => setShowMaintenanceModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    メンテナンスを記録
                  </button>
                </div>
              )}
              </div>
            </div>

            {/* 給油ログカード */}
            {car && (
              <div className="mb-6">
                <FuelLogCard car={car} />
              </div>
            )}

            {/* 下段：月別費用推移 */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
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
                    <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                    <span>累積費用</span>
                  </div>
                </div>
              </div>

            </section>
    </>
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
  const [selectedCarId, setSelectedCarId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // フィルタリングされたメンテナンス履歴
  const filteredRecords = useMemo(() => {
    console.log("Filtering maintenance records:", {
      totalRecords: maintenanceRecords.length,
      selectedCarId,
      searchTerm,
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
        (record.description && record.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      console.log(`Search filter: ${beforeCount} -> ${filtered.length} records`);
    }

    console.log("Final filtered records:", filtered.length);
    return filtered;
  }, [maintenanceRecords, selectedCarId, searchTerm]);

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
        
        // 関連するリマインダーも削除
        try {
          await deleteRemindersByMaintenanceRecord(record.carId, record.id);
          console.log("Related reminders deleted successfully");
        } catch (reminderError) {
          console.error("リマインダー削除エラー:", reminderError);
          // リマインダー削除に失敗してもメンテナンス記録の削除は成功とする
        }
        
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
      
      // 関連するリマインダーも削除
      try {
        const deletePromises = selectedRecords.map(recordId => {
          const record = maintenanceRecords.find((r: MaintenanceRecord) => r.id === recordId);
          if (record) {
            return deleteRemindersByMaintenanceRecord(record.carId, recordId);
          }
          return Promise.resolve();
        });
        await Promise.all(deletePromises);
        console.log("Related reminders deleted successfully");
      } catch (reminderError) {
        console.error("リマインダー削除エラー:", reminderError);
        // リマインダー削除に失敗してもメンテナンス記録の削除は成功とする
      }
      
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
        <h1 className="text-2xl font-bold">メンテナンス履歴</h1>
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

      {/* フィルター・検索 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          {/* 全選択チェックボックス - 一時的に無効化 */}
          {/* {filteredRecords.length > 0 && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedRecords.length === filteredRecords.length && filteredRecords.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-gray-700">
                全選択 ({selectedRecords.length}/{filteredRecords.length})
              </label>
            </div>
          )} */}
          {/* 車両選択 */}
          <div className="flex-1">
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
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              検索
            </label>
            <input
              type="text"
              placeholder="タイトル、種類、説明で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
            />
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">メンテナンス履歴がありません</h3>
            <p className="text-gray-500 mb-4">最初のメンテナンスメンテナンスを記録しましょう。</p>
            <button
              onClick={() => setShowMaintenanceModal(true)}
              className="rounded-xl bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-500 transition"
            >
              メンテナンスを記録
            </button>
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
                      <span>📅 {record.date.toLocaleDateString('ja-JP')}</span>
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
  );
}

function DataManagementContent({
  cars,
  maintenanceRecords
}: {
  cars: Car[];
  maintenanceRecords: MaintenanceRecord[];
}) {
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
      inspectionExpiry: car.inspectionExpiry || '',
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

  const handleExportAll = () => {
    const allData = {
      cars: cars.map(car => ({
        id: car.id,
        name: car.name,
        modelCode: car.modelCode || '',
        year: car.year || '',
        odoKm: car.odoKm || '',
        inspectionExpiry: car.inspectionExpiry || '',
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
  const handleGenerateURL = (carId?: string) => {
    try {
      if (carId) {
        const car = cars.find(c => c.id === carId);
        if (!car) {
          alert('車両が見つかりません。');
          return;
        }
        
        const carMaintenanceRecords = maintenanceRecords.filter(record => record.carId === carId);
        const url = generateMaintenanceURL(car, carMaintenanceRecords);
        
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
              <span className="font-medium">メンテナンス履歴 (CSV)</span>
            </button>

            <button
              onClick={handleExportAll}
              className="flex items-center justify-center gap-2 p-4 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
            >
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  maintenanceRecords,
  reminders,
  activeReminders,
  overdueReminders,
  thisWeekReminders,
  setShowReminderModal,
  setShowEditReminderModal,
  setEditingReminder,
  markReminderDone,
  snoozeReminder,
  dismissReminder,
  getDaysUntilDue,
  getKmUntilDue,
  checkReminderDue
}: {
  cars: Car[];
  maintenanceRecords: MaintenanceRecord[];
  reminders: Reminder[];
  activeReminders: Reminder[];
  overdueReminders: Reminder[];
  thisWeekReminders: Reminder[];
  setShowReminderModal: (show: boolean) => void;
  setShowEditReminderModal: (show: boolean) => void;
  setEditingReminder: (reminder: Reminder | null) => void;
  markReminderDone: (reminderId: string) => Promise<void>;
  snoozeReminder: (reminderId: string, days: number) => Promise<void>;
  dismissReminder: (reminderId: string) => Promise<void>;
  getDaysUntilDue: (reminder: Reminder) => number | null;
  getKmUntilDue: (reminder: Reminder, currentOdo: number) => number | null;
  checkReminderDue: (reminder: Reminder, currentOdo?: number) => boolean;
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
        new Notification('Smart Garage', {
          body: 'これはテスト通知です。通知機能が正常に動作しています。',
          icon: '/favicon.ico'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('Smart Garage', {
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
  const [date, setDate] = useState(record.date.toISOString().split('T')[0]);
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
        date: new Date(date),
        location: location || undefined,
      };

      await updateMaintenanceRecord(record.id, updateData);
      
      // メンテナンス記録の更新時にリマインダーも更新
      try {
        const maintenanceType = title; // メンテナンス記録のtitleフィールドを使用
        const performedAt = new Date(date);
        const odoKm = mileage ? Number(mileage) : 0;
        
        await generateReminderFromMaintenance(
          carId,
          maintenanceType,
          performedAt,
          odoKm,
          record.id
        );
        
        console.log(`リマインダーを更新しました: ${maintenanceType}`);
      } catch (reminderError) {
        console.error("リマインダー更新エラー:", reminderError);
        // リマインダー更新に失敗してもメンテナンス記録の更新は成功とする
      }
      
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
          <h2 className="text-xl font-semibold text-gray-900">メンテナンス履歴を編集</h2>
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
  setShowTypeaheadCarSelector
}: {
  cars: Car[];
  activeCarId?: string;
  setActiveCarId: (id: string) => void;
  setShowAddCarModal: (show: boolean) => void;
  setShowEditCarModal: (show: boolean) => void;
  setEditingCar: (car: Car | null) => void;
  setShowTypeaheadCarSelector: (show: boolean) => void;
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
  return (
    <>
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">車両</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTypeaheadCarSelector(true)}
            className="rounded-xl bg-green-600 text-white px-4 py-2 font-medium hover:bg-green-500 transition"
          >
            車種から選択
          </button>
        </div>
      </div>

      {/* 車一覧 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cars.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <div className="text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">車が登録されていません</h3>
            <p className="text-gray-500 mb-4">まず車を追加して、メンテナンス履歴を管理しましょう。</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowTypeaheadCarSelector(true)}
                className="rounded-xl bg-green-600 text-white px-4 py-2 font-medium hover:bg-green-500 transition"
              >
                車種から選択
              </button>
            </div>
          </div>
        ) : (
          cars.map((car) => (
            <CarCard
              key={car.id}
              car={car}
              isActive={car.id === activeCarId}
              onSelect={() => car.id && setActiveCarId(car.id)}
              onDelete={() => car.id && handleDeleteCar(car.id, car.name)}
              onEdit={() => handleEditCar(car)}
            />
          ))
        )}
      </div>
    </>
  );
}

function CarCard({ 
  car, 
  isActive, 
  onSelect,
  onDelete,
  onEdit
}: { 
  car: Car; 
  isActive: boolean; 
  onSelect: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  // テスト車両でも編集・削除を許可（デバッグ用）
  const isTestCar = false; // car.id?.startsWith('test');
  
  return (
    <div 
      className={`bg-white rounded-2xl border p-4 transition relative ${
        isActive ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* 編集・削除ボタン（テスト車両以外） */}
      {!isTestCar && (
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs hover:bg-blue-600 transition flex items-center justify-center"
            title="車両情報を編集"
          >
            ✏️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="w-6 h-6 rounded-full bg-red-500 text-white text-xs hover:bg-red-600 transition flex items-center justify-center"
            title="車両を削除"
          >
            ×
          </button>
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
          
          {isActive && (
            <div className="text-xs text-blue-600 font-medium">
              現在選択中
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
        date: new Date(date),
        location: location || undefined,
      });
      
      // メンテナンス記録からリマインダーを自動生成
      try {
        const maintenanceType = title; // メンテナンス記録のtitleフィールドを使用
        const performedAt = new Date(date);
        const odoKm = Number(mileage); // 必須項目なので必ず数値
        
        await generateReminderFromMaintenance(
          carId,
          maintenanceType,
          performedAt,
          odoKm,
          newRecord.id
        );
        
        console.log(`自動リマインダーを生成しました: ${maintenanceType}`);
      } catch (reminderError) {
        console.error("リマインダー生成エラー:", reminderError);
        // リマインダー生成に失敗してもメンテナンス記録の追加は成功とする
      }
      
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

function AddCarModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [modelCode, setModel] = useState("");
  const [year, setYear] = useState<string>("");
  const [odoKm, setOdo] = useState<string>("");
  const [inspectionExpiry, setInspectionExpiry] = useState("");
  const [firstRegYm, setFirstRegYm] = useState("");
  const [avgKmPerMonth, setAvgKmPerMonth] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: string;
    compressedSize: string;
    compressionRatio: string;
  } | null>(null);
  const [showCarModelSelector, setShowCarModelSelector] = useState(false);
  const [selectedManufacturer, setSelectedManufacturer] = useState<CarManufacturer | null>(null);
  const [selectedModel, setSelectedModel] = useState<CarModel | null>(null);

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


  // 車種選択処理
  const handleCarModelSelect = (manufacturer: CarManufacturer, model: CarModel) => {
    setSelectedManufacturer(manufacturer);
    setSelectedModel(model);
    // 車種名と型式を自動入力
    setName(`${manufacturer.name} ${model.name}`);
    if (model.modelCode) {
      setModel(model.modelCode);
    }
  };

  // 画像アップロード処理
  const handleImageUpload = async (): Promise<string> => {
    if (!selectedFile) return "/car.jpg"; // デフォルト画像

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // 実際の進捗監視付きアップロード
      const downloadURL = await uploadCarImageWithProgress(
        selectedFile,
        undefined, // carIdは新規作成時は未定義
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
      return "/car.jpg"; // デフォルト画像
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  async function handleAdd() {
    console.log("=== HANDLE ADD FUNCTION CALLED ===");
    console.log("handleAdd called");
    console.log("name:", name);
    console.log("modelCode:", modelCode);
    console.log("year:", year);
    console.log("odoKm:", odoKm);
    
    // 認証状態を確認
    const { auth } = await import("@/lib/firebase");
    console.log("Current user:", auth.currentUser);
    console.log("User ID:", auth.currentUser?.uid);
    
    if (!name) {
      console.log("No name provided");
      return alert("車名を入力してください");
    }
    
    console.log("Starting to add car...");
    
    try {
      // 画像をアップロード
      const uploadedImagePath = await handleImageUpload();
      
      // undefinedの値を除外してオブジェクトを作成
      const carData: CarInput = {
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
        carData.inspectionExpiry = inspectionExpiry.trim();
      }
      
      if (firstRegYm && firstRegYm.trim()) {
        carData.firstRegYm = firstRegYm.trim();
      }
      
      if (avgKmPerMonth && avgKmPerMonth.trim()) {
        carData.avgKmPerMonth = Number(avgKmPerMonth);
      }
      
      console.log("Car data to be added:", carData);
      await addCar(carData);
      console.log("Car added successfully");
      
    setName(""); setModel(""); setYear(""); setOdo(""); setInspectionExpiry(""); setFirstRegYm(""); setAvgKmPerMonth(""); setSelectedFile(null); setImagePreview(null); setCompressionInfo(null);
    onAdded?.();
    } catch (error) {
      console.error("Error adding car:", error);
      alert("車の追加に失敗しました。もう一度お試しください。");
    }
  }

  return (
    <>
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
            <h2 className="text-xl font-semibold text-gray-900">車を追加</h2>
            <button
              onClick={onClose}
              disabled={isUploading}
              className="text-gray-400 hover:text-gray-600 text-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex gap-2">
        <input
                  className="flex-1 rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600"
                  placeholder="車名（例：シビック Type R）"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
                <button
                  type="button"
                  onClick={() => setShowCarModelSelector(true)}
                  className="px-3 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition text-sm"
                >
                  車種選択
                </button>
              </div>
        <input
                className="rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600"
          placeholder="型式（例：FL5）"
          value={modelCode}
          onChange={(e) => setModel(e.target.value)}
        />
            </div>
            
            {selectedManufacturer && selectedModel && (
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <div>
                    <p className="font-medium text-green-900">
                      {selectedManufacturer.name} {selectedModel.name}
                    </p>
                    <p className="text-sm text-green-700">
                      {selectedModel.modelCode && `型式: ${selectedModel.modelCode}`}
                      {selectedModel.displacement && ` • 排気量: ${selectedModel.displacement}cc`}
                      {selectedModel.generation && ` • ${selectedModel.generation}`}
                    </p>
                  </div>
                </div>
              </div>
            )}
        <input
              className="rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600"
          placeholder="年式（例：2023）"
          inputMode="numeric"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
        <input
              className="rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600"
          placeholder="走行距離 km"
          inputMode="numeric"
          value={odoKm}
          onChange={(e) => setOdo(e.target.value)}
        />
      </div>
          
          {/* 画像アップロード */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
            車両画像
          </label>
          
          {/* 画像プレビュー */}
          {imagePreview && (
            <div className="mb-3">
              <img
                src={imagePreview}
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
            id="car-image-upload"
          />
          <div className="flex gap-2">
            <label
              htmlFor="car-image-upload"
              className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-center cursor-pointer hover:bg-gray-50 transition"
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
              onClick={() => {
                console.log("=== ADD BUTTON CLICKED ===");
                console.log("Button click event fired");
                handleAdd();
              }}
              disabled={isUploading}
              className="flex-1 rounded-xl bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? "アップロード中..." : "追加"}
            </button>
          </div>
        </div>
      
      
      {/* 車種セレクター */}
      {showCarModelSelector && (
        <CarModelSelector
          onSelect={handleCarModelSelect}
          onClose={() => setShowCarModelSelector(false)}
          currentManufacturer={selectedManufacturer?.id}
          currentModel={selectedModel?.id}
        />
      )}
    </>
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
  const [inspectionExpiry, setInspectionExpiry] = useState(car.inspectionExpiry || "");
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
        carData.inspectionExpiry = inspectionExpiry.trim();
      }
      if (firstRegYm && firstRegYm.trim()) {
        carData.firstRegYm = firstRegYm.trim();
      }
      if (avgKmPerMonth && avgKmPerMonth.trim()) {
        carData.avgKmPerMonth = Number(avgKmPerMonth);
      }
      
      await updateCar(car.id, carData);
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
                className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-center cursor-pointer hover:bg-gray-50 transition"
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

function CarPicker({
  cars,
  activeId,
  onChange,
  onAddCar,
}: {
  cars: Car[];
  activeId?: string;
  onChange: (id: string) => void;
  onAddCar: () => void;
}) {
  console.log("CarPicker rendered with cars:", cars.length, "activeId:", activeId);
  
  if (cars.length === 0) {
  return (
      <button
        onClick={onAddCar}
        className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
      >
        ＋ 車を追加
      </button>
    );
  }

  return (
    <div className="flex gap-2">
    <select
        className="rounded-xl border border-gray-300 px-3 py-2 text-sm min-w-[200px]"
      value={activeId || ""}
        onChange={(e) => {
          console.log("Car selection changed to:", e.target.value);
          if (e.target.value === "add") {
            onAddCar();
          } else {
            onChange(e.target.value);
          }
        }}
      >
        <option value="">車を選択してください</option>
      {cars.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
          {c.modelCode ? `（${c.modelCode}）` : ""}
        </option>
      ))}
        <option value="add" className="text-blue-600 font-medium">
          ＋ 車を追加
        </option>
    </select>
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
    
    return filtered.sort((a, b) => a.endDate.getTime() - b.endDate.getTime());
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
              const daysUntilExpiry = getDaysUntilExpiry(policy.endDate);
              const expiryStatus = getExpiryStatus(policy.endDate);
              
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
                          {policy.endDate.toLocaleDateString('ja-JP')}
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

// 保険契約追加モーダル
function InsuranceModal({
  carId,
  carName,
  onClose,
  onAdded
}: {
  carId: string;
  carName: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [provider, setProvider] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentCycle, setPaymentCycle] = useState<'annual' | 'monthly'>('annual');
  const [premiumAmount, setPremiumAmount] = useState('');
  const [bodilyInjuryLimit, setBodilyInjuryLimit] = useState('');
  const [propertyDamageLimit, setPropertyDamageLimit] = useState('');
  const [personalInjuryLimit, setPersonalInjuryLimit] = useState('');
  const [vehicleType, setVehicleType] = useState<'AG' | 'AC' | 'NONE'>('NONE');
  const [deductible, setDeductible] = useState('');
  const [riders, setRiders] = useState('');
  const [ageLimit, setAgeLimit] = useState('');
  const [familyOnly, setFamilyOnly] = useState(false);
  const [purpose, setPurpose] = useState<'private' | 'business'>('private');
  const [annualMileageKm, setAnnualMileageKm] = useState('');
  const [notes, setNotes] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!provider || !policyNumber || !startDate || !endDate || !premiumAmount) {
      alert('必須項目を入力してください。');
      return;
    }

    try {
      const policyData = {
        provider,
        policyNumber,
        carId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
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

      await addInsurancePolicy(policyData);
      onAdded();
    } catch (error) {
      console.error('Error adding insurance policy:', error);
      alert('保険契約の追加に失敗しました。');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">保険契約を追加 - {carName}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleAdd} className="space-y-4">
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
                  onChange={(e) => setVehicleType(e.target.value as 'AG' | 'AC' | 'NONE')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="NONE">なし</option>
                  <option value="AG">車両保険（免責なし）</option>
                  <option value="AC">車両保険（免責あり）</option>
                </select>
              </div>
            </div>
            {vehicleType !== 'NONE' && (
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
                  id="familyOnly"
                  checked={familyOnly}
                  onChange={(e) => setFamilyOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="familyOnly" className="ml-2 text-sm text-gray-700">
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
              追加
            </button>
          </div>
        </form>
      </div>
    </div>
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
  const [startDate, setStartDate] = useState(policy.startDate.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(policy.endDate.toISOString().split('T')[0]);
  const [paymentCycle, setPaymentCycle] = useState(policy.paymentCycle);
  const [premiumAmount, setPremiumAmount] = useState(policy.premiumAmount.toString());
  const [bodilyInjuryLimit, setBodilyInjuryLimit] = useState(policy.coverages.bodilyInjury.limit);
  const [propertyDamageLimit, setPropertyDamageLimit] = useState(policy.coverages.propertyDamage.limit);
  const [personalInjuryLimit, setPersonalInjuryLimit] = useState(policy.coverages.personalInjury.limit);
  const [vehicleType, setVehicleType] = useState(policy.coverages.vehicle.type);
  const [deductible, setDeductible] = useState(policy.coverages.vehicle.deductible);
  const [riders, setRiders] = useState(policy.coverages.riders.join(', '));
  const [ageLimit, setAgeLimit] = useState(policy.drivers.ageLimit);
  const [familyOnly, setFamilyOnly] = useState(policy.drivers.familyOnly);
  const [purpose, setPurpose] = useState(policy.usage.purpose);
  const [annualMileageKm, setAnnualMileageKm] = useState(policy.usage.annualMileageKm.toString());
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
        startDate: new Date(startDate),
        endDate: new Date(endDate),
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
                  onChange={(e) => setVehicleType(e.target.value as 'AG' | 'AC' | 'NONE')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="NONE">なし</option>
                  <option value="AG">車両保険（免責なし）</option>
                  <option value="AC">車両保険（免責あり）</option>
                </select>
              </div>
            </div>
            {vehicleType !== 'NONE' && (
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

// リマインダー追加モーダル
function ReminderModal({
  carId,
  carName,
  onClose,
  onAdded
}: {
  carId: string;
  carName: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<'time' | 'distance' | 'both'>('time');
  const [dueDate, setDueDate] = useState('');
  const [dueOdoKm, setDueOdoKm] = useState('');
  const [thresholdMonths, setThresholdMonths] = useState('');
  const [thresholdKm, setThresholdKm] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('タイトルを入力してください');
      return;
    }

    setIsSubmitting(true);
    try {
      const reminderData = {
        carId,
        kind,
        title: title.trim(),
        dueDate: dueDate ? new Date(dueDate) : null,
        dueOdoKm: dueOdoKm ? parseInt(dueOdoKm) : null,
        baseEntryRef: null,
        threshold: {
          ...(thresholdMonths && { months: parseInt(thresholdMonths) }),
          ...(thresholdKm && { km: parseInt(thresholdKm) }),
        },
        status: 'active' as const,
        notes: notes.trim(),
      };

      await addReminder(reminderData);
      onAdded();
    } catch (error) {
      console.error('Error adding reminder:', error);
      alert('リマインダーの追加に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">メンテナンス計画を追加</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSubmitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              車両
            </label>
            <div className="text-gray-900 font-medium">{carName}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル *
            </label>
            <select
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            >
              <option value="">選択してください</option>
              {['メンテナンス', '法定点検', '税金', '保険', 'その他'].map((category) => (
                <optgroup key={category} label={category}>
                  {REMINDER_TITLE_OPTIONS
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
              リマインダーの種類
            </label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as 'time' | 'distance' | 'both')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="time">日付ベース</option>
              <option value="distance">走行距離ベース</option>
              <option value="both">日付・走行距離両方</option>
            </select>
          </div>

          {(kind === 'time' || kind === 'both') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                期限日
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          )}

          {(kind === 'distance' || kind === 'both') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                期限走行距離 (km)
              </label>
              <input
                type="number"
                value={dueOdoKm}
                onChange={(e) => setDueOdoKm(e.target.value)}
                placeholder="例: 50000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              閾値設定（自動提案用）
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={thresholdMonths}
                onChange={(e) => setThresholdMonths(e.target.value)}
                placeholder="月数"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              <input
                type="number"
                value={thresholdKm}
                onChange={(e) => setThresholdKm(e.target.value)}
                placeholder="走行距離(km)"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メモ
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="追加の詳細や注意事項"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              disabled={isSubmitting}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? '追加中...' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// リマインダー編集モーダル
function EditReminderModal({
  reminder,
  onClose,
  onUpdated
}: {
  reminder: Reminder;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [title, setTitle] = useState(reminder.title);
  const [kind, setKind] = useState(reminder.kind);
  const [dueDate, setDueDate] = useState(
    reminder.dueDate ? reminder.dueDate.toISOString().split('T')[0] : ''
  );
  const [dueOdoKm, setDueOdoKm] = useState(reminder.dueOdoKm?.toString() || '');
  const [thresholdMonths, setThresholdMonths] = useState(
    reminder.threshold.months?.toString() || ''
  );
  const [thresholdKm, setThresholdKm] = useState(
    reminder.threshold.km?.toString() || ''
  );
  const [notes, setNotes] = useState(reminder.notes);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('タイトルを入力してください');
      return;
    }

    if (!reminder.id) {
      alert('リマインダーIDが見つかりません');
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData = {
        title: title.trim(),
        kind,
        dueDate: dueDate ? new Date(dueDate) : null,
        dueOdoKm: dueOdoKm ? parseInt(dueOdoKm) : null,
        threshold: {
          ...(thresholdMonths && { months: parseInt(thresholdMonths) }),
          ...(thresholdKm && { km: parseInt(thresholdKm) }),
        },
        notes: notes.trim(),
      };

      await updateReminder(reminder.id, updateData);
      onUpdated();
    } catch (error) {
      console.error('Error updating reminder:', error);
      alert('リマインダーの更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">メンテナンス計画を編集</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSubmitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル *
            </label>
            <select
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            >
              <option value="">選択してください</option>
              {['メンテナンス', '法定点検', '税金', '保険', 'その他'].map((category) => (
                <optgroup key={category} label={category}>
                  {REMINDER_TITLE_OPTIONS
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
              リマインダーの種類
            </label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as 'time' | 'distance' | 'both')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="time">日付ベース</option>
              <option value="distance">走行距離ベース</option>
              <option value="both">日付・走行距離両方</option>
            </select>
          </div>

          {(kind === 'time' || kind === 'both') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                期限日
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          )}

          {(kind === 'distance' || kind === 'both') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                期限走行距離 (km)
              </label>
              <input
                type="number"
                value={dueOdoKm}
                onChange={(e) => setDueOdoKm(e.target.value)}
                placeholder="例: 50000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              閾値設定（自動提案用）
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={thresholdMonths}
                onChange={(e) => setThresholdMonths(e.target.value)}
                placeholder="月数"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              <input
                type="number"
                value={thresholdKm}
                onChange={(e) => setThresholdKm(e.target.value)}
                placeholder="走行距離(km)"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メモ
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="追加の詳細や注意事項"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              disabled={isSubmitting}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? '更新中...' : '更新'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



function RemindersContent({
  cars,
  maintenanceRecords,
  reminders,
  activeReminders,
  overdueReminders,
  thisWeekReminders,
  setShowReminderModal,
  setShowEditReminderModal,
  setEditingReminder,
  markReminderDone,
  snoozeReminder,
  dismissReminder,
  getDaysUntilDue,
  getKmUntilDue,
  checkReminderDue
}: {
  cars: Car[];
  maintenanceRecords: MaintenanceRecord[];
  reminders: Reminder[];
  activeReminders: Reminder[];
  overdueReminders: Reminder[];
  thisWeekReminders: Reminder[];
  setShowReminderModal: (show: boolean) => void;
  setShowEditReminderModal: (show: boolean) => void;
  setEditingReminder: (reminder: Reminder | null) => void;
  markReminderDone: (reminderId: string) => Promise<void>;
  snoozeReminder: (reminderId: string, days: number) => Promise<void>;
  dismissReminder: (reminderId: string) => Promise<void>;
  getDaysUntilDue: (reminder: Reminder) => number | null;
  getKmUntilDue: (reminder: Reminder, currentOdo: number) => number | null;
  checkReminderDue: (reminder: Reminder, currentOdo?: number) => boolean;
}) {
  // 削除されたアラートの状態管理
  const [deletedAlerts, setDeletedAlerts] = useState<Set<string>>(new Set());

  // アラートを完全に削除する関数
  const deleteAlert = (alertId: string) => {
    setDeletedAlerts(prev => new Set([...prev, alertId]));
  };

  // 緊急アラートを一括削除する関数
  const deleteAllUrgentAlerts = () => {
    const urgentAlertIds = alerts
      .filter(alert => alert.severity === 'high')
      .map(alert => alert.id);
    
    setDeletedAlerts(prev => new Set([...prev, ...urgentAlertIds]));
  };

  // アラートの計算
  const alerts = useMemo(() => {
    const alertsList: Array<{
      id: string;
      type: 'inspection' | 'maintenance';
      severity: 'high' | 'medium' | 'low';
      title: string;
      message: string;
      carName: string;
      dueDate?: Date;
      daysRemaining?: number;
      maintenanceType?: string;
      remainingKm?: number;
    }> = [];

    // 車検期限のアラート
    cars.forEach(car => {
      if (car.inspectionExpiry) {
        const expiryDate = new Date(car.inspectionExpiry);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry <= 30) {
          alertsList.push({
            id: `inspection-${car.id}`,
            type: 'inspection',
            severity: daysUntilExpiry <= 7 ? 'high' : daysUntilExpiry <= 14 ? 'medium' : 'low',
            title: '車検期限が近づいています',
            message: `${car.name}の車検期限まで${daysUntilExpiry}日です`,
            carName: car.name,
            dueDate: expiryDate,
            daysRemaining: daysUntilExpiry
          });
        }
      }
    });

    // メンテナンス予定のアラート
    cars.forEach(car => {
      if (car.odoKm) {
        const currentMileage = car.odoKm;
        const maintenanceIntervals = [
          { type: "オイル交換", interval: 10000 },
          { type: "エアフィルター交換", interval: 20000 },
          { type: "タイヤ交換", interval: 50000 },
          { type: "ブレーキパッド交換", interval: 30000 },
        ];

        maintenanceIntervals.forEach(maintenance => {
          const nextDue = Math.ceil(currentMileage / maintenance.interval) * maintenance.interval;
          const remainingKm = nextDue - currentMileage;
          
          if (remainingKm <= 2000) {
            alertsList.push({
              id: `maintenance-${car.id}-${maintenance.type}`,
              type: 'maintenance',
              severity: remainingKm <= 500 ? 'high' : remainingKm <= 1000 ? 'medium' : 'low',
              title: `${maintenance.type}の時期です`,
              message: `${car.name}の${maintenance.type}まで残り${remainingKm.toLocaleString()}kmです`,
              carName: car.name,
              maintenanceType: maintenance.type,
              remainingKm
            });
          }
        });
      }
    });

    return alertsList
      .filter(alert => !deletedAlerts.has(alert.id))
      .sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });
  }, [cars, deletedAlerts]);

  return (
    <>
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">メンテナンス計画</h1>
        <button
          onClick={() => setShowReminderModal(true)}
          className="rounded-xl bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-500 transition"
        >
          ＋ メンテナンス計画を追加
        </button>
      </div>

      {/* 現在のアラート */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">現在のアラート</h3>
            {alerts.some(alert => alert.severity === 'high') && (
              <button
                onClick={deleteAllUrgentAlerts}
                className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1 border border-red-200 rounded-lg hover:bg-red-50 transition"
              >
                緊急アラートを一括削除
              </button>
            )}
          </div>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className={`p-4 rounded-xl border ${
                alert.severity === 'high' ? 'border-red-200 bg-red-50' :
                alert.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                'border-blue-200 bg-blue-50'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">{alert.title}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        alert.severity === 'high' ? 'bg-red-100 text-red-800' :
                        alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {alert.severity === 'high' ? '緊急' : alert.severity === 'medium' ? '注意' : '情報'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                    {alert.daysRemaining !== undefined && (
                      <p className="text-xs text-gray-500 mt-1">
                        期限: {alert.dueDate?.toLocaleDateString('ja-JP')}
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={() => deleteAlert(alert.id)}
                    className="text-red-400 hover:text-red-600 ml-4"
                    title="アラートを削除"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* リマインダー一覧 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">メンテナンス計画一覧</h3>
          <div className="flex gap-2">
            <span className="text-sm text-gray-500">
              アクティブ: {activeReminders.length}件
            </span>
            {overdueReminders.length > 0 && (
              <span className="text-sm text-red-600">
                期限切れ: {overdueReminders.length}件
              </span>
            )}
          </div>
        </div>

        {activeReminders.length > 0 ? (
          <div className="space-y-3">
            {activeReminders
              .sort((a, b) => {
                const aDays = getDaysUntilDue(a) || 999;
                const bDays = getDaysUntilDue(b) || 999;
                return aDays - bDays;
              })
              .map((reminder) => {
                const car = cars.find(c => c.id === reminder.carId);
                const daysUntilDue = getDaysUntilDue(reminder);
                const kmUntilDue = car?.odoKm ? getKmUntilDue(reminder, car.odoKm) : null;
                const isOverdue = checkReminderDue(reminder, car?.odoKm);

                return (
                  <div key={reminder.id} className={`p-4 rounded-xl border ${
                    isOverdue ? "border-red-200 bg-red-50" :
                    daysUntilDue !== null && daysUntilDue <= 7 ? "border-yellow-200 bg-yellow-50" :
                    "border-gray-200 bg-gray-50"
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900">{reminder.title}</h4>
                          {car && (
                            <span className="text-xs text-gray-500">({car.name})</span>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            isOverdue ? "bg-red-100 text-red-800" :
                            daysUntilDue !== null && daysUntilDue <= 7 ? "bg-yellow-100 text-yellow-800" :
                            "bg-blue-100 text-blue-800"
                          }`}>
                            {isOverdue ? "期限切れ" : 
                             daysUntilDue !== null && daysUntilDue <= 7 ? "今週" : 
                             "予定"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{reminder.notes || ""}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {daysUntilDue !== null && (
                            <span>
                              {isOverdue ? `期限切れ ${Math.abs(daysUntilDue)}日` : 
                               `あと${daysUntilDue}日`}
                            </span>
                          )}
                          {kmUntilDue !== null && (
                            <span>あと{kmUntilDue.toLocaleString()}km</span>
                          )}
                          {reminder.dueDate && (
                            <span>期限: {new Date(reminder.dueDate).toLocaleDateString("ja-JP")}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => {
                            setEditingReminder(reminder);
                            setShowEditReminderModal(true);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                          title="編集"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => reminder.id && markReminderDone(reminder.id)}
                          className="text-green-600 hover:text-green-700"
                          title="完了"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => reminder.id && snoozeReminder(reminder.id, 7)}
                          className="text-blue-600 hover:text-blue-700"
                          title="1週間延期"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 1 0-15 0v5h5l-5 5-5-5h5v-5a7.5 7.5 0 1 1 15 0v5z" />
            </svg>
            <p>メンテナンス計画がありません</p>
            <p className="text-sm mt-1">メンテナンス記録から自動生成されるか、手動で追加してください</p>
          </div>
        )}
      </div>

      {/* リマインダーのヒント */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">メンテナンス計画について</h3>
        <ul className="text-blue-800 space-y-2">
          <li>• メンテナンス記録から自動でメンテナンス計画が生成されます</li>
          <li>• 手動でメンテナンス計画を追加・編集できます</li>
          <li>• 完了したメンテナンス計画は自動で次回予定が設定されます</li>
          <li>• 期限切れのメンテナンス計画は赤色で表示されます</li>
        </ul>
      </div>
    </>
  );
}
