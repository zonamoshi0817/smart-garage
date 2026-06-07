"use client";

import "../home/home.css";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import { watchCars } from "@/lib/cars";
import { watchAllMaintenanceRecords } from "@/lib/maintenance";
import { getCustomizations } from "@/lib/customizations";
import { auth, watchAuth } from "@/lib/firebase";
import { isPremiumPlan } from "@/lib/plan";
import { usePremiumGuard } from "@/hooks/usePremium";
import { useSelectedCar } from "@/contexts/SelectedCarContext";
import { downloadMaintenancePDF, type PDFExportOptions } from "@/lib/pdfExport";
import type { Car, MaintenanceRecord, Customization, User } from "@/types";
import { CollapsibleSidebar } from "@/components/common/CollapsibleSidebar";
import { SidebarLayout } from "@/components/common/SidebarLayout";
import { AppHeader } from "@/components/common/AppHeader";
import { AppLoading } from "@/components/common/AppLoading";
import { useToast } from "@/components/common/Feedback";

function NavItem({ label, href, active }: { label: string; href: string; active: boolean }) {
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

function DataNavLink() {
  const pathname = usePathname();
  const isActive = pathname === '/data';
  
  return (
    <Link
      href="/data"
      className={
        "w-full text-left px-3 py-2 rounded-xl transition block " +
        (isActive ? "bg-blue-600 text-white font-semibold" : "hover:bg-gray-100 text-gray-700")
      }
    >
      データ
    </Link>
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
  const toast = useToast();

  // CSVエクスポート機能
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast('エクスポートするデータがありません。', 'error');
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
      toast('車両を選択してください。', 'error');
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
          toast('車両が見つかりません。', 'error');
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
      toast('PDFの生成に失敗しました。', 'error');
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

function DataPageRouteContent() {
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
  const [customizations, setCustomizations] = useState<Customization[]>([]);
  const [loading, setLoading] = useState(true);
  const [authTrigger, setAuthTrigger] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAddCarModal, setShowAddCarModal] = useState(false);

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
        setCustomizations([]);
        setAuthTrigger(prev => prev + 1);
      } else {
        setCars([]);
        setActiveCarId(undefined);
        setMaintenanceRecords([]);
        setCustomizations([]);
        setAuthTrigger(0);
      }
    });
    return () => unsubscribe();
  }, []);

  // URLクエリとグローバルコンテキストの同期
  useEffect(() => {
    if (urlCarId && urlCarId !== selectedCarId) {
      // URLにcarパラメータがある場合、グローバルコンテキストを更新
      setSelectedCarId(urlCarId);
    } else if (!urlCarId && selectedCarId) {
      // URLにcarパラメータがないが、グローバルコンテキストがある場合、URLを更新
      router.push(`${pathname}?car=${selectedCarId}`);
    }
  }, [urlCarId, selectedCarId, setSelectedCarId, router, pathname]);

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
      // URLも更新（まだ設定されていない場合）
      if (!urlCarId) {
        router.push(`${pathname}?car=${targetCarId}`);
      }
    }
  }, [cars, activeCarId, selectedCarId, urlCarId, setSelectedCarId, router, pathname]);

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
            router.push(`${pathname}?car=${id}`);
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

          {/* メインコンテンツ */}
          <main>
            <DataManagementContent 
              cars={cars}
              maintenanceRecords={maintenanceRecords}
              customizations={customizations}
              activeCarId={effectiveCarId}
            />
          </main>
        </SidebarLayout>
      </div>
    </AuthGate>
  );
}

export default function DataPageRoute() {
  return (
    <Suspense fallback={<AppLoading />}>
      <DataPageRouteContent />
    </Suspense>
  );
}
