"use client";

// 旧デザイン（ブルー系 AppShell）の車両詳細ページは廃止。
// 新デザインのフラットルート（/mycar・/customizations）へリダイレクトして
// アプリ全体のデザイン・URL体系を統一する。
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { use as usePromise } from "react";
import { useSelectedCar } from "@/contexts/SelectedCarContext";

type Props = { params: Promise<{ carId: string }> };

export default function CarDetailRedirect({ params }: Props) {
  const { carId } = usePromise(params);
  const router = useRouter();
  const search = useSearchParams();
  const tab = search.get("tab");
  const { setSelectedCarId } = useSelectedCar();

  useEffect(() => {
    if (!carId) return;
    setSelectedCarId(carId);
    const dest = tab === "customs" ? "/customizations" : "/mycar";
    router.replace(`${dest}?car=${carId}`);
  }, [carId, tab, router, setSelectedCarId]);

  return (
    <div className="min-h-screen grid place-items-center text-gray-500 text-sm">
      読み込み中...
    </div>
  );
}
