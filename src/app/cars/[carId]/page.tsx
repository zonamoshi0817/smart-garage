"use client";

import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/common/AppChrome";
import { useEffect, useState, use as usePromise } from "react";
import type { Car, FuelLog, MaintenanceRecord, Customization } from "@/types";
import { watchCars } from "@/lib/cars";
import { watchFuelLogs } from "@/lib/fuelLogs";
import { watchMaintenanceRecords } from "@/lib/maintenance";
import { getCustomizations } from "@/lib/customizations";
import { auth } from "@/lib/firebase";
import MyCarPage from "@/components/mycar/MyCarPage";
import Link from "next/link";
import FuelLogModal from "@/components/modals/FuelLogModal";
import MaintenanceModal from "@/components/modals/MaintenanceModal";
import CustomizationModal from "@/components/modals/CustomizationModal";
import { addMaintenanceRecord } from "@/lib/maintenance";

type Props = { params: Promise<{ carId: string }> };

export default function CarDetailShell({ params }: Props) {
  const search = useSearchParams();
  const tab = search.get("tab") || "overview";
  const { carId } = usePromise(params);

  const [car, setCar] = useState<Car | null>(null);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [customizations, setCustomizations] = useState<Customization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);

  useEffect(() => {
    let unsubCars: (() => void) | undefined;
    let unsubFuel: (() => void) | undefined;
    let unsubMaint: (() => void) | undefined;
    let cancelled = false;

    // 車両
    unsubCars = watchCars((cars) => {
      if (cancelled) return;
      const found = cars.find((c) => c.id === carId) || null;
      setCar(found || null);
    });

    // 給油
    unsubFuel = watchFuelLogs(carId, (logs) => {
      if (cancelled) return;
      setFuelLogs(logs);
    });

    // メンテ
    unsubMaint = watchMaintenanceRecords(carId, (records) => {
      if (cancelled) return;
      setMaintenanceRecords(records);
    });

    // カスタム（単発取得）
    const user = auth.currentUser;
    if (user) {
      getCustomizations(user.uid, carId).then((list) => {
        if (!cancelled) setCustomizations(list);
      }).finally(() => setLoading(false));
    } else {
      setCustomizations([]);
      setLoading(false);
    }

    return () => {
      cancelled = true;
      unsubCars?.();
      unsubFuel?.();
      unsubMaint?.();
    };
  }, [carId]);

  return (
    <AppShell activeCarId={car?.id} showBack={false} backFallback="/cars">
      <h1 className="text-lg sm:text-xl font-semibold mb-4">マイカー</h1>
      <div>
        {loading ? (
          <div className="rounded-xl border border-gray-200 p-6 text-gray-600 bg-white">読み込み中...</div>
        ) : car ? (
          <MyCarPage
            car={car}
            maintenanceRecords={maintenanceRecords}
            fuelLogs={fuelLogs}
            customizations={customizations}
            readOnly={car.status === "sold" || car.status === "scrapped"}
            onOpenModal={(type) => {
              if (type === "fuel") setShowFuelModal(true);
              else if (type === "maintenance") setShowMaintenanceModal(true);
              else if (type === "customization") setShowCustomizationModal(true);
            }}
          />
        ) : (
          <div className="rounded-xl border border-gray-200 p-6 text-gray-600 bg-white">
            車両が見つかりません。
          </div>
        )}
        {car && (
          <>
            <FuelLogModal
              isOpen={showFuelModal}
              onClose={() => setShowFuelModal(false)}
              car={car}
              onSuccess={() => {}}
            />
            <MaintenanceModal
              isOpen={showMaintenanceModal}
              onClose={() => setShowMaintenanceModal(false)}
              title="メンテナンスを追加"
              cars={[car]}
              onSave={async (data) => {
                await addMaintenanceRecord({ ...data, carId: car.id! });
              }}
            />
            <CustomizationModal
              isOpen={showCustomizationModal}
              onClose={() => setShowCustomizationModal(false)}
              carId={`${auth.currentUser?.uid}/${car.id}`}
              onSave={() => {}}
            />
          </>
        )}
      </div>
    </AppShell>
  );
}


