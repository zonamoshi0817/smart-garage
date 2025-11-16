"use client";

import { useEffect, useState, use as usePromise } from "react";
import { AppShell } from "@/components/common/AppChrome";
import type { Car, FuelLog } from "@/types";
import { watchCars } from "@/lib/cars";
import { watchFuelLogs, calculateAverageFuelEfficiency } from "@/lib/fuelLogs";
import FuelLogModal from "@/components/modals/FuelLogModal";
import CostAndFuelDashboard from "@/components/mycar/CostAndFuelDashboard";

type Props = { params: Promise<{ carId: string }> };

export default function FuelPage({ params }: Props) {
  const { carId } = usePromise(params);
  const [car, setCar] = useState<Car | null>(null);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [kpis, setKpis] = useState<{ latestDate?: string; thisMonthCost?: number; avgEfficiency?: number | null }>({});

  useEffect(() => {
    const unsubCars = watchCars((cars) => setCar(cars.find((c) => c.id === carId) || null));
    const unsubFuel = watchFuelLogs(carId, (logs) => {
      setFuelLogs(logs);
      // ミニダッシュボード指標計算
      if (logs.length > 0) {
        const latest = logs[0];
        const latestDate = latest.date?.toDate ? latest.date.toDate().toLocaleDateString() : undefined;
        const now = new Date();
        const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const thisMonthCost = logs.reduce((sum, l) => {
          const d = l.date?.toDate ? l.date.toDate() : undefined;
          const dym = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : "";
          const cost = l.totalCostJpy ?? l.cost ?? 0;
          return sum + (dym === ym ? cost : 0);
        }, 0);
        const avgEfficiency = calculateAverageFuelEfficiency(logs);
        setKpis({ latestDate, thisMonthCost, avgEfficiency });
      } else {
        setKpis({});
      }
    });
    return () => {
      unsubCars?.();
      unsubFuel?.();
    };
  }, [carId]);

  return (
    <AppShell activeCarId={car?.id}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold">ガソリン</h1>
          {car && <p className="text-sm text-gray-600 mt-1">{car.name}</p>}
        </div>
        {car && (
          <button
            onClick={() => setShowModal(true)}
            className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-500"
          >
            給油を追加
          </button>
        )}
      </div>

      {/* ダッシュボード（既存コンポーネントを再利用） */}
      <div className="mb-4">
        <CostAndFuelDashboard maintenanceRecords={[]} fuelLogs={fuelLogs} insurancePolicies={[]} />
      </div>

      {fuelLogs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-6 text-gray-600 bg-white">
          給油記録がありません。右上の「給油を追加」から記録できます。
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <ul className="divide-y divide-gray-100">
            {fuelLogs.map((log) => (
              <li key={log.id} className="py-3 flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">
                    {log.odoKm?.toLocaleString()} km
                  </div>
                  <div className="text-gray-600">
                    {log.totalCostJpy ? `¥${log.totalCostJpy.toLocaleString()}` : "—"}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {log.date?.toDate ? log.date.toDate().toLocaleDateString() : ""}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {car && (
        <FuelLogModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          car={car}
          onSuccess={() => {}}
        />
      )}
    </AppShell>
  );
}


