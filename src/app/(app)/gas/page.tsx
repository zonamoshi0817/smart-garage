"use client";

import "../home/home.css";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Receipt, Fuel as FuelIcon, JapaneseYen, TrendingUp } from "lucide-react";
import AuthGate from "@/components/AuthGate";
import { watchCars } from "@/lib/cars";
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
import { AppHeader } from "@/components/common/AppHeader";
import { AppLoading } from "@/components/common/AppLoading";
import { useToast } from "@/components/common/Feedback";

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
      Icon: Receipt,
    },
    {
      title: '累計給油量',
      value: totalVolumeLabel,
      description: 'レギュラー/ハイオクを含む',
      Icon: FuelIcon,
    },
    {
      title: '累計ガソリン代',
      value: totalCostLabel,
      description: '税込み合計',
      Icon: JapaneseYen,
    },
    {
      title: '平均単価',
      value: avgPriceLabel,
      description: '全期間平均',
      Icon: TrendingUp,
    },
  ]), [summary.totalLogs, totalVolumeLabel, totalCostLabel, avgPriceLabel]);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>給油ログ</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            {activeCar ? `${activeCar.name} の給油記録` : '車両を選択してください'}
          </p>
        </div>
        <button
          onClick={() => setShowFuelLogModal(true)}
          className="btn-primary-dark px-5 py-2.5 rounded-none inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          給油を記録
        </button>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.title} className="app-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="app-section-title">{card.title}</span>
              <card.Icon className="w-5 h-5" style={{ color: 'var(--text-dim)' }} />
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{card.value}</div>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{card.description}</p>
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
        <div className="app-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'var(--surface-muted)' }}>
            <FuelIcon className="h-8 w-8" style={{ color: 'var(--text-dim)' }} />
          </div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>表示できる給油データがありません</h3>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>サイドバーから車両を選択するか、新しく車両を追加してください。</p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setShowFuelLogModal(true)}
              className="btn-primary-dark px-5 py-2.5 rounded-none inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              給油を記録
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
  const toast = useToast();

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
    return <AppLoading />;
  }

  return (
    <AuthGate>
      <div className="app-home min-h-screen">
        {/* ヘッダー */}
        <AppHeader
          cars={activeCars}
          activeCarId={effectiveCarId}
          onSelectCar={(id) => {
            setSelectedCarId(id);
            setActiveCarId(id);
            router.replace(`${pathname}?car=${id}`);
          }}
          onAddCar={() => setShowAddCarModal(true)}
        />

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
            // 給油ログはwatchFuelLogsで自動的に更新される
            toast("給油を記録しました");
          }}
        />
      )}
    </AuthGate>
  );
}

export default function GasPageRoute() {
  return (
    <Suspense fallback={<AppLoading />}>
      <GasPageRouteContent />
    </Suspense>
  );
}
