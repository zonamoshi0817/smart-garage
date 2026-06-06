"use client";

import "../home/home.css";

import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import { watchCars, addCar } from "@/lib/cars";
import { watchFuelLogs, getDisplayAmount, getDisplayCost } from "@/lib/fuelLogs";
import { auth, watchAuth } from "@/lib/firebase";
import { toDate } from "@/lib/dateUtils";
import { isPremiumPlan } from "@/lib/plan";
import { usePremiumGuard } from "@/hooks/usePremium";
import { useSelectedCar } from "@/contexts/SelectedCarContext";
import type { Car, FuelLog } from "@/types";
import type { User } from "firebase/auth";
import FuelLogModal from "@/components/modals/FuelLogModal";
import FuelLogCard from "@/components/dashboard/FuelLogCard";
import AddCarModal from "@/components/modals/AddCarModal";
import { CollapsibleSidebar } from "@/components/common/CollapsibleSidebar";
import { SidebarLayout } from "@/components/common/SidebarLayout";

// ヘッダー用車両ドロップダウン（mycar/page.tsxと同じ）
function CarHeaderDropdown({
  cars,
  activeCarId,
  onSelectCar,
  onAddCar
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

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  const handleImageError = (carId: string) => {
    setImageErrors(prev => new Set(prev).add(carId));
  };

  const activeCar = cars.find(c => c.id === activeCarId) || cars[0];

  return (
    <div className="relative flex-shrink-0" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-9 sm:h-10 px-2 sm:px-3 rounded-lg border border-gray-300 bg-white flex items-center gap-1.5 sm:gap-2 shadow-sm hover:bg-gray-50 min-w-0"
      >
        {activeCar && (
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200">
            {activeCar.imagePath && !imageErrors.has(activeCar.id!) ? (
              <img
                src={activeCar.imagePath}
                alt={activeCar.name}
                className="w-full h-full object-cover"
                onError={() => handleImageError(activeCar.id!)}
              />
            ) : (
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
        )}
        <span className="truncate max-w-[120px] sm:max-w-[180px] lg:max-w-[200px] text-xs sm:text-sm font-medium text-gray-900">
          {activeCar?.name}
          {activeCar?.modelCode && !isMobile ? ` (${activeCar.modelCode})` : ''}
        </span>
        <svg 
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div 
            className="fixed inset-0 z-30" 
            onClick={() => setOpen(false)}
          />
          <div className="fixed sm:absolute z-40 top-[3.5rem] sm:top-full right-2 sm:right-0 left-2 sm:left-auto mt-0 sm:mt-2 w-[calc(100vw-1rem)] sm:w-80 max-w-[calc(100vw-1rem)] sm:max-w-[320px] bg-white rounded-lg border border-gray-200 shadow-xl">
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900">車両を選択</h3>
                <span className="text-xs text-gray-500">{cars.length}台</span>
              </div>
            </div>
            
            <div className="max-h-80 overflow-auto py-1 sm:py-2">
            {cars.map((car) => (
              <button
                key={car.id}
                onClick={() => {
                  const carId = car.id!;
                  setSelectedCarId(carId); // グローバルコンテキストを更新
                  onSelectCar(carId);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 ${
                  car.id === activeCarId ? 'bg-gray-50' : ''
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 bg-gray-50">
                    {car.imagePath && !imageErrors.has(car.id!) ? (
                      <img
                        src={car.imagePath}
                        alt={car.name}
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(car.id!)}
                      />
                    ) : (
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium text-gray-900 truncate">
                        {car.name}
                      </div>
                      {car.id === activeCarId && (
                        <svg className="w-4 h-4 text-gray-900 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {car.modelCode && (
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded">
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
            
            <div className="px-3 sm:px-4 py-2 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => { 
                  setOpen(false); 
                  onAddCar(); 
                }}
                className="w-full text-left px-3 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                車両を追加
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ナビゲーションアイテム
function NavItem({ 
  label, 
  active = false, 
  onClick,
  href
}: { 
  label: string; 
  active?: boolean; 
  onClick?: () => void;
  href?: string;
}) {
  if (href) {
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
  return (
    <button
      onClick={onClick}
      className={
        "w-full text-left px-3 py-2 rounded-xl transition " +
        (active ? "bg-blue-600 text-white font-semibold" : "hover:bg-gray-100 text-gray-700")
      }
    >
      {label}
    </button>
  );
}

// URLベースのガソリンナビゲーションリンク
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

// URLベースのマイカーナビゲーションリンク
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

// URLベースのメンテナンスナビゲーションリンク
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

// URLベースの共有ナビゲーションリンク
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

// 給油ログコンテンツ（home/page.tsxから抽出）
function FuelLogsContent({
  cars,
  activeCarId,
  fuelLogs,
  setShowFuelLogModal
}: {
  cars: Car[];
  activeCarId?: string;
  fuelLogs: FuelLog[];
  setShowFuelLogModal: (show: boolean) => void;
}) {
  // 安全のため、fuelLogsがundefinedの場合は空配列を使用
  const safeFuelLogs = fuelLogs || [];
  const activeCar = cars.find(car => car.id === activeCarId);
  
  // フィルター状態
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterFullTank, setFilterFullTank] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'cost' | 'odo'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // 利用可能な年月のリスト
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    safeFuelLogs.forEach(log => {
      const date = log.date?.toDate ? log.date.toDate() : new Date();
      months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(months).sort().reverse();
  }, [safeFuelLogs]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    safeFuelLogs.forEach(log => {
      const date = log.date?.toDate ? log.date.toDate() : new Date();
      years.add(date.getFullYear().toString());
    });
    return Array.from(years).sort().reverse();
  }, [safeFuelLogs]);
  
  // フィルター適用後の給油ログ
  const filteredFuelLogs = useMemo(() => {
    let filtered = safeFuelLogs;
    
    // 検索フィルター
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log => {
        const date = log.date?.toDate ? log.date.toDate() : new Date();
        const dateStr = date.toLocaleDateString('ja-JP');
        const { value: fuelAmount } = getDisplayAmount(log);
        const cost = getDisplayCost(log);
        const odoKm = log.odoKm?.toString() || '';
        
        return dateStr.includes(term) ||
               fuelAmount.toString().includes(term) ||
               cost.toString().includes(term) ||
               odoKm.includes(term);
      });
    }
    
    // 年フィルター
    if (filterYear !== 'all') {
      filtered = filtered.filter(log => {
        const date = log.date?.toDate ? log.date.toDate() : new Date();
        return date.getFullYear().toString() === filterYear;
      });
    }
    
    // 月フィルター
    if (filterMonth !== 'all' && filterYear !== 'all') {
      filtered = filtered.filter(log => {
        const date = log.date?.toDate ? log.date.toDate() : new Date();
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return monthKey === filterMonth;
      });
    }
    
    // 満タン/部分給油フィルター
    if (filterFullTank !== 'all') {
      filtered = filtered.filter(log => {
        if (filterFullTank === 'full') return log.isFullTank === true;
        if (filterFullTank === 'partial') return log.isFullTank === false;
        return true;
      });
    }
    
    // ソート
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          const dateA = a.date?.toDate ? a.date.toDate() : new Date();
          const dateB = b.date?.toDate ? b.date.toDate() : new Date();
          comparison = dateA.getTime() - dateB.getTime();
          break;
        case 'amount':
          const amountA = getDisplayAmount(a).value;
          const amountB = getDisplayAmount(b).value;
          comparison = amountA - amountB;
          break;
        case 'cost':
          const costA = getDisplayCost(a);
          const costB = getDisplayCost(b);
          comparison = costA - costB;
          break;
        case 'odo':
          const odoA = a.odoKm || 0;
          const odoB = b.odoKm || 0;
          comparison = odoA - odoB;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [safeFuelLogs, searchTerm, filterYear, filterMonth, filterFullTank, sortBy, sortOrder]);

  const summary = useMemo(() => {
    if (!safeFuelLogs || !Array.isArray(safeFuelLogs) || safeFuelLogs.length === 0) {
      return {
        totalLogs: 0,
        totalVolume: 0,
        totalCost: 0,
        avgPricePerLiter: null as number | null,
        lastLog: null as FuelLog | null,
        lastRefuelDate: null as Date | null,
        lastPricePerLiter: null as number | null,
        fullTankCount: 0,
        averageFillSize: null as number | null,
      };
    }

    let totalCost = 0;
    let totalVolume = 0;
    let volumeSamples = 0;

    try {
      safeFuelLogs.forEach((log) => {
        if (!log) return;
        try {
          const { value, unit } = getDisplayAmount(log);
          const cost = getDisplayCost(log);
          totalCost += cost || 0;

          if (unit === 'L' && value && value > 0) {
            totalVolume += value;
            volumeSamples += 1;
          }
        } catch (error) {
          console.error('Error processing fuel log:', error, log);
        }
      });
    } catch (error) {
      console.error('Error processing fuel logs:', error);
    }

    const lastLog = safeFuelLogs[0] ?? null;
    let lastRefuelDate: Date | null = null;
    if (lastLog && lastLog.date) {
      try {
        const dateValue: any = lastLog.date;
        if (dateValue && typeof dateValue === 'object' && 'toDate' in dateValue) {
          lastRefuelDate = dateValue.toDate();
        } else if (dateValue instanceof Date) {
          lastRefuelDate = dateValue;
        } else if (dateValue) {
          lastRefuelDate = new Date(dateValue);
        }
      } catch (error) {
        console.error('Error converting date:', error);
        lastRefuelDate = null;
      }
    }

    let lastPricePerLiter: number | null = null;
    if (lastLog) {
      try {
        const { value, unit } = getDisplayAmount(lastLog);
        const cost = getDisplayCost(lastLog);
        if (unit === 'L' && value > 0 && cost > 0) {
          lastPricePerLiter = cost / value;
        }
      } catch (error) {
        console.error('Error calculating last price per liter:', error);
        lastPricePerLiter = null;
      }
    }

    const avgPricePerLiter = totalVolume > 0 ? totalCost / totalVolume : null;
    const averageFillSize = volumeSamples > 0 ? totalVolume / volumeSamples : null;

    return {
      totalLogs: safeFuelLogs.length,
      totalVolume,
      totalCost,
      avgPricePerLiter,
      lastLog,
      lastRefuelDate,
      lastPricePerLiter,
      fullTankCount: safeFuelLogs.filter((log) => log && log.isFullTank).length,
      averageFillSize,
    };
  }, [safeFuelLogs]);

  const formatNumber = (num: number): string => {
    if (typeof window === 'undefined') {
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    return num.toLocaleString('ja-JP');
  };

  const totalCostLabel = summary.totalCost > 0 ? `¥${formatNumber(summary.totalCost)}` : '¥0';
  const totalVolumeLabel = summary.totalVolume > 0
    ? `${formatNumber(summary.totalVolume >= 100 ? Math.round(summary.totalVolume) : Math.round(summary.totalVolume * 10) / 10)} L`
    : '0 L';
  const avgPriceLabel = summary.avgPricePerLiter
    ? `¥${formatNumber(Math.round(summary.avgPricePerLiter))} / L`
    : '---';

  const summaryCards = useMemo(() => ([
    {
      title: '総給油回数',
      value: summary.totalLogs ? `${formatNumber(summary.totalLogs)} 回` : '0 回',
      description: '保存済みの記録',
      icon: '🧾',
    },
    {
      title: '累計給油量',
      value: totalVolumeLabel,
      description: 'レギュラー/ハイオクを含む',
      icon: '⛽',
    },
    {
      title: '累計ガソリン代',
      value: totalCostLabel,
      description: '税込み合計',
      icon: '💴',
    },
    {
      title: '平均単価',
      value: avgPriceLabel,
      description: '全期間平均',
      icon: '📈',
    },
  ]), [summary.totalLogs, totalVolumeLabel, totalCostLabel, avgPriceLabel]);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">給油ログ</h1>
          <p className="mt-1 text-sm text-gray-600">
            {activeCar ? `${activeCar.name} の給油記録` : '車両を選択してください'}
          </p>
        </div>
        <button
          onClick={() => setShowFuelLogModal(true)}
          className="rounded-xl bg-emerald-600 text-white px-5 py-2.5 font-medium hover:bg-emerald-500 transition-colors shadow-sm"
        >
          ＋ 給油を記録
        </button>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.title}</span>
              <span className="text-xl">{card.icon}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            <p className="mt-1 text-xs text-gray-500">{card.description}</p>
          </div>
        ))}
      </div>

      {/* フィルター・検索 */}
      {safeFuelLogs.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 検索 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                検索
              </label>
              <input
                type="text"
                placeholder="日付、給油量、金額、走行距離で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
              />
            </div>

            {/* 年フィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                年
              </label>
              <select
                value={filterYear}
                onChange={(e) => {
                  setFilterYear(e.target.value);
                  setFilterMonth('all');
                }}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
              >
                <option value="all">すべての年</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}年</option>
                ))}
              </select>
            </div>

            {/* 月フィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                月
              </label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
                disabled={filterYear === 'all'}
              >
                <option value="all">すべての月</option>
                {filterYear !== 'all' && availableMonths
                  .filter(m => m.startsWith(filterYear))
                  .map(month => {
                    const [, m] = month.split('-');
                    return (
                      <option key={month} value={month}>
                        {parseInt(m)}月
                      </option>
                    );
                  })}
              </select>
            </div>

            {/* 給油タイプフィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                給油タイプ
              </label>
              <select
                value={filterFullTank}
                onChange={(e) => setFilterFullTank(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
              >
                <option value="all">すべて</option>
                <option value="full">満タンのみ</option>
                <option value="partial">部分給油のみ</option>
              </select>
            </div>
          </div>

          {/* ソートオプション */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">並び順:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'cost' | 'odo')}
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="date">実施日</option>
                <option value="amount">給油量</option>
                <option value="cost">金額</option>
                <option value="odo">走行距離</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1 rounded hover:bg-gray-100 transition"
                title={sortOrder === 'asc' ? '昇順' : '降順'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
            
            <div className="text-sm text-gray-600">
              {filteredFuelLogs.length}件の給油記録
            </div>
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      {activeCar ? (
        <FuelLogCard 
          car={activeCar} 
          fuelLogs={filteredFuelLogs}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">表示できる給油データがありません</h3>
          <p className="mt-2 text-sm text-gray-500">サイドバーから車両を選択するか、新しく車両を追加してください。</p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setShowFuelLogModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-5 py-2.5 font-medium hover:bg-emerald-500 transition-colors shadow-sm"
            >
              ⛽ 給油を記録
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GasPageRouteContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedCarId, setSelectedCarId } = useSelectedCar();
  const urlCarId = searchParams?.get('car') || null;
  const [cars, setCars] = useState<Car[]>([]);
  const [activeCarId, setActiveCarId] = useState<string | undefined>(undefined);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAddCarModal, setShowAddCarModal] = useState(false);
  const [showFuelLogModal, setShowFuelLogModal] = useState(false);
  const [authTrigger, setAuthTrigger] = useState(0);

  // プレミアムガード
  const { userPlan } = usePremiumGuard();

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
        setFuelLogs([]);
        setAuthTrigger(prev => prev + 1);
      } else {
        setCars([]);
        setActiveCarId(undefined);
        setFuelLogs([]);
        setAuthTrigger(0);
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  // URLクエリとグローバルコンテキストの同期（無効化）
  // useEffect(() => {
  //   if (urlCarId && urlCarId !== selectedCarId) {
  //     setSelectedCarId(urlCarId);
  //   }
  // }, [urlCarId, selectedCarId, setSelectedCarId]);

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
      // URLの更新は行わない（URLクエリは別のuseEffectで処理）
    }
  }, [cars, activeCarId, selectedCarId, urlCarId, setSelectedCarId]);

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
        // 車両リスト変更時の処理は、別のuseEffectで処理する
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

  // 給油ログの取得
  useEffect(() => {
    if (!auth.currentUser) {
      setFuelLogs([]);
      setLoading(false);
      return;
    }

    // effectiveCarIdが設定されるまで待つ（loadingはtrueのまま）
    if (!effectiveCarId) {
      setFuelLogs([]);
      // loadingはtrueのまま（isReadyの条件で制御）
      return;
    }

    // effectiveCarIdが設定されたら、給油ログを取得開始
    setLoading(true);
    try {
      const off = watchFuelLogs(effectiveCarId, (logs) => {
        setFuelLogs(logs);
        setLoading(false);
      });
      return () => {
        off && off();
      };
    } catch (error) {
      console.error("Error watching fuel logs:", error);
      setFuelLogs([]);
      setLoading(false);
    }
  }, [auth.currentUser, effectiveCarId, authTrigger]);

  // 現在保有中の車両のみ
  const activeCars = useMemo(
    () => cars.filter((c) => !c.status || c.status === 'active'),
    [cars]
  );

  const car = useMemo(() => {
    return cars.find((c) => c.id === effectiveCarId);
  }, [cars, effectiveCarId]);

  // 読み込みが完了し、認証されている場合にページを表示
  // 車両が0台の場合でもページを表示できるようにする（車両追加モーダル表示のため）
  const isReady = !loading && auth.currentUser;

  if (!isReady) {
    return (
      <AuthGate>
        <div className="app-home min-h-screen">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="rounded-xl border border-gray-200 p-6 text-gray-600 bg-white">読み込み中...</div>
          </div>
        </div>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <div className="app-home min-h-screen">
        {/* ヘッダー */}
        <header className="app-header sticky top-0 z-30">
          <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
            <button
              onClick={() => router.push('/home')}
              className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink hover:opacity-70 transition-opacity"
            >
              <img src="/icon.png" alt="garage log" className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg shadow-sm ring-1 ring-black/5 flex-shrink-0" />
              <span className="app-logo-text text-sm sm:text-base truncate">GARAGE_LOG</span>
            </button>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {activeCars.length > 0 && (
                <div className="relative">
                  <CarHeaderDropdown 
                    cars={activeCars}
                    activeCarId={effectiveCarId}
                    onSelectCar={(id) => {
                      setSelectedCarId(id);
                      setActiveCarId(id);
                      router.replace(`${pathname}?car=${id}`);
                    }}
                    onAddCar={() => setShowAddCarModal(true)}
                  />
                </div>
              )}
              <button
                onClick={() => {
                  if (confirm('ログアウトしますか？')) {
                    auth.signOut();
                  }
                }}
                className="btn-secondary-dark px-3 py-1.5 rounded-none whitespace-nowrap"
              >
                LOGOUT
              </button>
            </div>
          </div>
        </header>

        {/* 軽量アラート（車検期限など） */}
        {(() => {
          const alerts: Array<React.ReactNode> = [];
          if (car?.inspectionExpiry) {
            const expiryDate = toDate(car.inspectionExpiry) || new Date();
            const today = new Date();
            const diffMs = expiryDate.getTime() - today.getTime();
            const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            if (days < 0) {
              alerts.push(
                <div key="inspection-overdue" className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                  <div className="text-sm text-red-800">
                    車検期限が過ぎています（{Math.abs(days)}日前）。早めに更新手続きを行ってください。
                  </div>
                  <Link
                    href="/home"
                    className="text-xs px-2 py-1 rounded-md bg-white border border-red-200 text-red-700 hover:bg-red-100"
                  >
                    対応する
                  </Link>
                </div>
              );
            } else if (days <= 60) {
              alerts.push(
                <div key="inspection-soon" className="flex items-center justify-between rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2">
                  <div className="text-sm text-yellow-900">
                    車検期限まで残り {days}日です。点検や準備を進めましょう。
                  </div>
                  <Link
                    href="/home"
                    className="text-xs px-2 py-1 rounded-md bg-white border border-yellow-200 text-yellow-800 hover:bg-yellow-100"
                  >
                    対応する
                  </Link>
                </div>
              );
            }
          }
          if (alerts.length === 0) return null;
          return (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-3">
              <div className="space-y-2">{alerts}</div>
            </div>
          );
        })()}

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
          <main className="space-y-6">
            <FuelLogsContent
              cars={cars}
              activeCarId={effectiveCarId}
              fuelLogs={fuelLogs}
              setShowFuelLogModal={setShowFuelLogModal}
            />
          </main>
        </SidebarLayout>
      </div>

      {/* モーダル */}
      {showAddCarModal && (
        <AddCarModal
          onClose={() => setShowAddCarModal(false)}
          onAdded={async () => {
            try {
              setShowAddCarModal(false);
              // AddCarModal内で車両が追加されるため、ここでは何もしない
              // 必要に応じて、watchCarsで自動的に更新される
            } catch (error) {
              console.error("Failed to add car:", error);
              alert("車両の追加に失敗しました");
            }
          }}
        />
      )}

      {showFuelLogModal && car && (
        <FuelLogModal
          isOpen={showFuelLogModal}
          onClose={() => setShowFuelLogModal(false)}
          car={car}
          onSuccess={() => {
            console.log("Fuel log added successfully");
            // 給油ログはwatchFuelLogsで自動的に更新されるため、authTriggerは不要
          }}
        />
      )}
    </AuthGate>
  );
}

export default function GasPageRoute() {
  return (
    <Suspense fallback={
      <AuthGate>
        <div className="app-home min-h-screen">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="rounded-xl border border-gray-200 p-6 text-gray-600 bg-white">読み込み中...</div>
          </div>
        </div>
      </AuthGate>
    }>
      <GasPageRouteContent />
    </Suspense>
  );
}
