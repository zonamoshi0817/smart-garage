"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { BackButton } from "./BackButton";
import VehicleSwitcher from "@/components/VehicleSwitcher";
import type { Car } from "@/types";
import { watchCars } from "@/lib/cars";
import { logout } from "@/lib/firebase";

export function AppHeader({ activeCarId }: { activeCarId?: string }) {
  const [cars, setCars] = useState<Car[]>([]);
  const router = useRouter();
  useEffect(() => {
    const unsub = watchCars((list) => setCars(list));
    return () => unsub?.();
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/icon.png" alt="garage LOG" className="h-8 w-8 rounded-lg shadow-sm ring-1 ring-black/5" />
          <span className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">garage LOG</span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          {cars.length > 0 && (
            <VehicleSwitcher
              cars={cars}
              activeCarId={activeCarId}
              onSelectCar={(id) => router.push(`/cars/${id}`)}
            />
          )}
          <button
            onClick={() => logout()}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            ログアウト
          </button>
        </nav>
      </div>
    </header>
  );
}

function SidebarLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={
        "block w-full text-left px-3 py-2 rounded-xl transition " +
        (isActive ? "bg-blue-600 text-white font-semibold" : "hover:bg-gray-100 text-gray-700")
      }
    >
      {children}
    </Link>
  );
}

export function AppSidebar({ activeCarId }: { activeCarId?: string }) {
  const carPath = activeCarId ? `/cars/${activeCarId}` : "/cars";
  return (
    <aside className="lg:sticky lg:top-20 h-fit">
      <nav className="bg-white rounded-2xl border border-gray-200 p-2 space-y-1 text-[15px]">
        <SidebarLink href="/dashboard">ダッシュボード</SidebarLink>
        <SidebarLink href={carPath}>マイカー</SidebarLink>
        <SidebarLink href={carPath + "/fuel"}>ガソリン</SidebarLink>
        <SidebarLink href={carPath + "/maintenance"}>メンテナンス</SidebarLink>
        <SidebarLink href={carPath + "?tab=customs"}>カスタマイズ</SidebarLink>
        <SidebarLink href="/cars">車両管理</SidebarLink>
        <a className="block w-full text-left px-3 py-2 rounded-xl text-gray-400 cursor-not-allowed">データ</a>
      </nav>
    </aside>
  );
}

export function AppShell({
  children,
  activeCarId,
  showBack = false,
  backFallback = "/dashboard",
}: {
  children: React.ReactNode;
  activeCarId?: string;
  showBack?: boolean;
  backFallback?: string;
}) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <AppHeader activeCarId={activeCarId} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
        <AppSidebar activeCarId={activeCarId} />
        <div>
          {showBack && (
            <div className="mb-4">
              <BackButton fallback={backFallback} />
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}


