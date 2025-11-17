"use client";

import Link from "next/link";
import { AppShell } from "@/components/common/AppChrome";
import { useEffect, useState } from "react";
import { watchCars } from "@/lib/cars";
import type { Car } from "@/types";

export default function CarsIndexPage() {
  const [cars, setCars] = useState<Car[]>([]);
  useEffect(() => {
    const unsub = watchCars((list) => setCars(list));
    return () => unsub?.();
  }, []);

  return (
    <AppShell>
      <h1 className="text-lg sm:text-xl font-semibold mb-4">車両管理</h1>
      {cars.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-6 text-gray-600 bg-white">
          まだ車両がありません。ホームから追加してください。
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cars.map((car) => (
            <li key={car.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm transition">
              <Link href={`/cars/${car.id}`} className="block p-4">
                <div className="flex items-center gap-3">
                  {car.imagePath ? (
                    <img src={car.imagePath} alt={car.name} className="h-16 w-24 object-cover rounded-lg ring-1 ring-black/5" />
                  ) : (
                    <div className="h-16 w-24 bg-gray-100 rounded-lg ring-1 ring-black/5" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{car.name}</p>
                    <p className="text-xs text-gray-500">
                      {car.modelCode || '—'} {car.year ? ` / ${car.year}年` : ''}
                    </p>
                    {typeof car.odoKm === 'number' && (
                      <p className="text-xs text-gray-600 mt-1">ODO: {car.odoKm.toLocaleString()} km</p>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}


