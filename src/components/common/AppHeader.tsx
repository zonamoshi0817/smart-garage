"use client";

/**
 * 全画面共通のアプリヘッダー。
 * ロゴ + 車両セレクタ（ドロップダウン）+ ログアウトを内包する。
 * 以前は home / gas / mycar / share に同じコードが重複していたものを集約した。
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Car as CarIcon, Check, ChevronDown, Plus } from "lucide-react";
import type { Car } from "@/types";
import { auth } from "@/lib/firebase";
import { useSelectedCar } from "@/contexts/SelectedCarContext";
import { useConfirm, useToast } from "@/components/common/Feedback";

export function CarHeaderDropdown({
  cars,
  activeCarId,
  onSelectCar,
  onAddCar,
}: {
  cars: Car[];
  activeCarId?: string;
  onSelectCar: (id: string) => void;
  onAddCar: () => void;
}) {
  const { setSelectedCarId } = useSelectedCar();
  const [open, setOpen] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const activeCar = cars.find((c) => c.id === activeCarId) || cars[0];

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) setOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  const handleImageError = (carId: string) =>
    setImageErrors((prev) => new Set(prev).add(carId));

  return (
    <div className="relative flex-shrink-0" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-9 sm:h-10 px-2 sm:px-3 bg-white flex items-center gap-1.5 sm:gap-2 hover:bg-[#f2f0eb] min-w-0 transition-colors"
        style={{ border: "0.5px solid var(--border-bright)", borderRadius: "8px" }}
      >
        {activeCar && (
          <div
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{ background: "var(--surface-muted)", border: "0.5px solid var(--border-color)", borderRadius: "6px" }}
          >
            {activeCar.imagePath && !imageErrors.has(activeCar.id!) ? (
              <img
                src={activeCar.imagePath}
                alt={activeCar.name}
                className="w-full h-full object-cover"
                onError={() => handleImageError(activeCar.id!)}
              />
            ) : (
              <CarIcon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: "var(--text-dim)" }} />
            )}
          </div>
        )}
        <span
          className="truncate max-w-[120px] sm:max-w-[180px] lg:max-w-[200px] text-xs sm:text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {activeCar?.name}
          {activeCar?.modelCode && !isMobile ? ` (${activeCar.modelCode})` : ""}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--text-dim)" }}
        />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className="fixed sm:absolute z-40 top-[3.5rem] sm:top-full right-2 sm:right-0 left-2 sm:left-auto mt-0 sm:mt-2 w-[calc(100vw-1rem)] sm:w-80 max-w-[calc(100vw-1rem)] sm:max-w-[320px] bg-white shadow-xl"
            style={{ border: "0.5px solid var(--border-bright)", borderRadius: "8px" }}
          >
            <div className="px-3 sm:px-4 py-2.5 sm:py-3" style={{ borderBottom: "0.5px solid var(--border-color)" }}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  車両を選択
                </h3>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{cars.length}台</span>
              </div>
            </div>

            <div className="max-h-80 overflow-auto py-1 sm:py-2">
              {cars.map((car) => (
                <button
                  key={car.id}
                  onClick={() => {
                    const carId = car.id!;
                    setSelectedCarId(carId);
                    onSelectCar(carId);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-[#f2f0eb] transition-colors"
                  style={car.id === activeCarId ? { background: "var(--surface-muted)" } : {}}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div
                      className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center overflow-hidden flex-shrink-0"
                      style={{ background: "var(--surface-muted)", border: "0.5px solid var(--border-color)", borderRadius: "6px" }}
                    >
                      {car.imagePath && !imageErrors.has(car.id!) ? (
                        <img
                          src={car.imagePath}
                          alt={car.name}
                          className="w-full h-full object-cover"
                          onError={() => handleImageError(car.id!)}
                        />
                      ) : (
                        <CarIcon className="w-5 h-5" style={{ color: "var(--text-dim)" }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {car.name}
                        </div>
                        {car.id === activeCarId && (
                          <Check className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-primary)" }} />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                        {car.modelCode && (
                          <span className="px-1.5 py-0.5" style={{ background: "var(--surface-muted)", borderRadius: "4px" }}>
                            {car.modelCode}
                          </span>
                        )}
                        {car.year && <span>{car.year}年式</span>}
                        {car.odoKm && <span>• {car.odoKm.toLocaleString()}km</span>}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="px-3 sm:px-4 py-2" style={{ borderTop: "0.5px solid var(--border-color)", background: "var(--surface-muted)" }}>
              <button
                onClick={() => {
                  setOpen(false);
                  onAddCar();
                }}
                className="w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-[#e8e6e0] transition-colors flex items-center gap-2"
                style={{ color: "var(--text-muted)", borderRadius: "6px" }}
              >
                <Plus className="w-4 h-4" />
                車両を追加
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface AppHeaderProps {
  cars: Car[];
  activeCarId?: string;
  onSelectCar: (id: string) => void;
  onAddCar: () => void;
}

export function AppHeader({ cars, activeCarId, onSelectCar, onAddCar }: AppHeaderProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();

  const handleLogout = async () => {
    const ok = await confirm({
      title: "ログアウト",
      message: "ログアウトしますか？",
      confirmLabel: "ログアウト",
    });
    if (ok) {
      await auth.signOut();
      toast("ログアウトしました");
    }
  };

  return (
    <header className="app-header sticky top-0 z-30">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        <button
          onClick={() => router.push("/home")}
          className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink hover:opacity-70 transition-opacity"
        >
          <img
            src="/icon.png"
            alt="garage log"
            className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg shadow-sm ring-1 ring-black/5 flex-shrink-0"
          />
          <span className="app-logo-text text-sm sm:text-base truncate">GARAGE_LOG</span>
        </button>
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {cars.length > 0 && (
            <CarHeaderDropdown
              cars={cars}
              activeCarId={activeCarId}
              onSelectCar={onSelectCar}
              onAddCar={onAddCar}
            />
          )}
          <button
            onClick={handleLogout}
            className="btn-secondary-dark px-3 py-1.5 rounded-none whitespace-nowrap"
          >
            ログアウト
          </button>
        </div>
      </div>
    </header>
  );
}
