"use client";

import { useEffect, useState, use as usePromise } from "react";
import { AppShell } from "@/components/common/AppChrome";
import type { Car, MaintenanceRecord } from "@/types";
import { watchCars } from "@/lib/cars";
import { watchMaintenanceRecords } from "@/lib/maintenance";
import MaintenanceModal from "@/components/modals/MaintenanceModal";
import { addMaintenanceRecord } from "@/lib/maintenance";

type Props = { params: Promise<{ carId: string }> };

export default function MaintenancePage({ params }: Props) {
  const { carId } = usePromise(params);
  const [car, setCar] = useState<Car | null>(null);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const unsubCars = watchCars((cars) => setCar(cars.find((c) => c.id === carId) || null));
    const unsub = watchMaintenanceRecords(carId, (list) => setRecords(list));
    return () => {
      unsubCars?.();
      unsub?.();
    };
  }, [carId]);

  return (
    <AppShell activeCarId={car?.id}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold">メンテナンス</h1>
          {car && <p className="text-sm text-gray-600 mt-1">{car.name}</p>}
        </div>
        {car && (
          <button
            onClick={() => setShowModal(true)}
            className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-500"
          >
            メンテを追加
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-6 text-gray-600 bg-white">
          メンテナンス記録がありません。右上の「メンテを追加」から登録できます。
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <ul className="divide-y divide-gray-100">
            {records.map((r) => (
              <li key={r.id} className="py-3 flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{r.title}</div>
                  <div className="text-gray-600">
                    {r.mileage?.toLocaleString()} km {typeof r.cost === "number" ? ` / ¥${r.cost.toLocaleString()}` : ""}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {r.date?.toDate ? r.date.toDate().toLocaleDateString() : ""}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {car && (
        <MaintenanceModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="メンテナンスを追加"
          cars={[car]}
          onSave={async (data) => {
            await addMaintenanceRecord({ ...data, carId: car.id! });
          }}
        />
      )}
    </AppShell>
  );
}






