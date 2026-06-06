"use client";

// 旧デザイン（ブルー系 AppShell）のメンテナンスページは廃止。
// 新デザインのフラットルート /maintenance へリダイレクトして統一する。
import { useEffect, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { useSelectedCar } from "@/contexts/SelectedCarContext";

type Props = { params: Promise<{ carId: string }> };

export default function MaintenanceRedirect({ params }: Props) {
  const { carId } = usePromise(params);
  const router = useRouter();
  const { setSelectedCarId } = useSelectedCar();

  useEffect(() => {
    if (!carId) return;
    setSelectedCarId(carId);
    router.replace(`/maintenance?car=${carId}`);
  }, [carId, router, setSelectedCarId]);

  return (
    <div className="min-h-screen grid place-items-center text-gray-500 text-sm">
      読み込み中...
    </div>
  );
}
