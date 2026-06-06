"use client";

import UnifiedCTA from "@/components/UnifiedCTA";
import type { Car, MaintenanceRecord, FuelLog, Customization } from "@/types";
import { ExpenseChart } from "./dashboard/ExpenseChart";
import { MaintenanceSummaryCard, FuelSummaryCard, CustomSummaryCard } from "./dashboard/SummaryCards";
import { InspectionReminder, CarSummaryCard, DashboardFooter } from "./dashboard/sections";

export function DashboardContent({
  cars,
  activeCarId,
  car,
  maintenanceRecords,
  fuelLogs,
  customizations,
  setCurrentPage,
  setShowMaintenanceModal,
  setShowFuelLogModal,
  setShowCustomizationModal,
  setShowAddCarModal,
}: {
  cars: Car[];
  activeCarId?: string;
  car?: Car;
  maintenanceRecords: MaintenanceRecord[];
  fuelLogs: FuelLog[];
  customizations: Customization[];
  setCurrentPage: (page: 'dashboard' | 'maintenance-history' | 'fuel-logs' | 'customizations' | 'notifications' | 'my-car') => void;
  setActiveCarId: (id: string) => void;
  setShowMaintenanceModal: (show: boolean) => void;
  setShowFuelLogModal: (show: boolean) => void;
  setShowCustomizationModal: (show: boolean) => void;
  setShowAddCarModal: (show: boolean) => void;
}) {
  return (
    <>
      {/* ヘッダー */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">ホーム</h1>
          {/* Primaryアクション: 記録を追加（グローバルCTA） */}
          {car && (
            <UnifiedCTA
              onMaintenance={() => setShowMaintenanceModal(true)}
              onFuel={() => setShowFuelLogModal(true)}
              onCustom={() => setShowCustomizationModal(true)}
            />
          )}
        </div>
      </div>

      {/* 車検期限リマインダー */}
      <InspectionReminder car={car} />

      {/* 車カード（選択中の車を表示 / なければダミー） */}
      <CarSummaryCard
        cars={cars}
        car={car}
        activeCarId={activeCarId}
        maintenanceRecords={maintenanceRecords}
        setShowAddCarModal={setShowAddCarModal}
      />

      {/* メンテナンス、給油情報、カスタマイズ情報を3列に配置 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-4">
        <MaintenanceSummaryCard
          maintenanceRecords={maintenanceRecords}
          activeCarId={activeCarId}
          setShowMaintenanceModal={setShowMaintenanceModal}
        />
        <FuelSummaryCard
          car={car}
          fuelLogs={fuelLogs}
          activeCarId={activeCarId}
          setShowFuelLogModal={setShowFuelLogModal}
          setShowAddCarModal={setShowAddCarModal}
        />
        <CustomSummaryCard
          customizations={customizations}
          activeCarId={activeCarId}
          setShowCustomizationModal={setShowCustomizationModal}
          setCurrentPage={setCurrentPage}
        />
      </div>

      {/* 下段：月別費用推移 */}
      <ExpenseChart
        maintenanceRecords={maintenanceRecords}
        fuelLogs={fuelLogs}
        customizations={customizations}
      />

      {/* フッター */}
      <DashboardFooter />
    </>
  );
}
