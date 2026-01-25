"use client";

import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import { watchCars, addCar } from "@/lib/cars";
import { getCustomizations, CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS, deleteCustomization } from "@/lib/customizations";
import { auth, watchAuth } from "@/lib/firebase";
import { backfillEvidenceForExistingRecords, getEvidenceRecordIds } from "@/lib/evidence";
import { toMillis } from "@/lib/dateUtils";
import { isPremiumPlan } from "@/lib/plan";
import { usePremiumGuard } from "@/hooks/usePremium";
import { useSelectedCar } from "@/contexts/SelectedCarContext";
import type { Car, Customization } from "@/types";
import type { User } from "firebase/auth";
import AddCarModal from "@/components/modals/AddCarModal";
import { CollapsibleSidebar } from "@/components/common/CollapsibleSidebar";
import { SidebarLayout } from "@/components/common/SidebarLayout";
import CustomizationModal from "@/components/modals/CustomizationModal";
import EvidenceReliabilityBadge from "@/components/EvidenceReliabilityBadge";

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
          {activeCar?.name || "車を選択"}
        </span>
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 sm:w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[70vh] overflow-y-auto">
          <div className="p-2">
            {cars.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                車が登録されていません
              </div>
            ) : (
              cars.map((car) => (
                <button
                  key={car.id}
                  onClick={() => {
                    const carId = car.id!;
                    setSelectedCarId(carId); // グローバルコンテキストを更新
                    onSelectCar(carId);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors ${
                    activeCarId === car.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200">
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
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{car.name}</div>
                    {car.modelCode && (
                      <div className="text-xs text-gray-500 truncate">{car.modelCode}</div>
                    )}
                  </div>
                  {activeCarId === car.id && (
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))
            )}
            <button
              onClick={() => {
                onAddCar();
                setOpen(false);
              }}
              className="w-full mt-2 p-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              車を追加
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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

function CustomizationsNavLink() {
  const pathname = usePathname();
  const isActive = pathname === '/customizations';
  
  return (
    <Link
      href="/customizations"
      className={
        "w-full text-left px-3 py-2 rounded-xl transition block " +
        (isActive ? "bg-blue-600 text-white font-semibold" : "hover:bg-gray-100 text-gray-700")
      }
    >
      カスタマイズ
    </Link>
  );
}

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

function CustomizationsContent({ 
  cars, 
  activeCarId, 
  customizations, 
  setShowCustomizationModal, 
  setEditingCustomization,
  setCustomizations,
  backfillCompleted
}: {
  cars: Car[];
  activeCarId: string | undefined;
  customizations: Customization[];
  setShowCustomizationModal: (show: boolean) => void;
  setEditingCustomization: (customization: Customization | null) => void;
  setCustomizations: (customizations: Customization[]) => void;
  backfillCompleted?: boolean;
}) {
  const activeCar = cars.find(car => car.id === activeCarId);
  
  // フィルタリングと検索の状態
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'cost'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // 証跡のrecordIdセット
  const [evidenceRecordIds, setEvidenceRecordIds] = useState<Set<string>>(new Set());
  
  // 証跡のrecordIdセットを取得
  useEffect(() => {
    if (!auth.currentUser) {
      setEvidenceRecordIds(new Set());
      return;
    }
    
    const loadEvidenceRecordIds = async () => {
      try {
        // バックフィル処理が完了した場合は少し遅延してから証跡を取得
        if (backfillCompleted) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        const recordIds = await getEvidenceRecordIds();
        console.log('Loaded evidence record IDs:', Array.from(recordIds));
        console.log('Customization IDs:', customizations.map(c => c.id).filter(Boolean));
        // マッチング確認
        customizations.forEach(c => {
          if (c.id) {
            console.log(`Customization ${c.id} (${c.title}): hasEvidence=${recordIds.has(c.id)}`);
          }
        });
        setEvidenceRecordIds(recordIds);
      } catch (error) {
        console.error('Failed to load evidence record IDs:', error);
      }
    };
    
    loadEvidenceRecordIds();
    // カスタマイズ一覧が更新されたときにも証跡を再取得
    // バックフィル処理が完了したときにも証跡を再取得
  }, [auth.currentUser, customizations, backfillCompleted]);

  // フィルタリングとソートのロジック
  const filteredCustomizations = useMemo(() => {
    let filtered = customizations;

    // 車両でフィルタ（ヘッダーで選択された車両のみ表示）
    if (activeCarId) {
      filtered = filtered.filter(customization => customization.carId === activeCarId);
    }

    // 検索語でフィルタ
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(customization => 
        customization.title.toLowerCase().includes(term) ||
        customization.brand?.toLowerCase().includes(term) ||
        customization.modelCode?.toLowerCase().includes(term) ||
        customization.memo?.toLowerCase().includes(term) ||
        customization.vendorName?.toLowerCase().includes(term)
      );
    }

    // カテゴリでフィルタ
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(customization => 
        customization.categories.includes(selectedCategory as any)
      );
    }

    // ステータスでフィルタ
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(customization => customization.status === selectedStatus);
    }

    // ソート
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = toMillis(a.date) - toMillis(b.date);
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'cost':
          const costA = (a.partsCostJpy || 0) + (a.laborCostJpy || 0) + (a.otherCostJpy || 0);
          const costB = (b.partsCostJpy || 0) + (b.laborCostJpy || 0) + (b.otherCostJpy || 0);
          comparison = costA - costB;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [customizations, activeCarId, searchTerm, selectedCategory, selectedStatus, sortBy, sortOrder]);

  const handleEdit = (customization: Customization) => {
    setEditingCustomization(customization);
    setShowCustomizationModal(true);
  };

  const handleDelete = async (customizationId: string) => {
    if (!activeCarId || !auth.currentUser) return;
    
    if (confirm('このカスタマイズ記録を削除しますか？')) {
      try {
        console.log('Deleting customization:', customizationId);
        await deleteCustomization(auth.currentUser.uid, activeCarId, customizationId);
        console.log('Customization deleted successfully');
        
        // カスタマイズ一覧を再取得
        console.log('Reloading customizations...');
        const updatedCustomizations = await getCustomizations(auth.currentUser.uid, activeCarId);
        console.log('Customizations reloaded:', updatedCustomizations.length);
        setCustomizations(updatedCustomizations);
      } catch (error) {
        console.error('Error deleting customization:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: (error as any)?.code,
          stack: error instanceof Error ? error.stack : undefined
        });
        alert(`削除に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
      }
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">カスタマイズ</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCustomizationModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + カスタマイズを追加
          </button>
        </div>
      </div>

      {/* 統計カード */}
      {(() => {
        const totalCustomizations = customizations.length;
        const totalCost = customizations.reduce((sum, c) => {
          return sum + ((c.partsCostJpy || 0) + (c.laborCostJpy || 0) + (c.otherCostJpy || 0));
        }, 0);
        const avgCost = totalCustomizations > 0 ? Math.round(totalCost / totalCustomizations) : 0;
        const lastCustomization = customizations
          .sort((a, b) => toMillis(b.date) - toMillis(a.date))[0];
        const lastCustomizationDate = lastCustomization 
          ? (lastCustomization.date?.toDate ? lastCustomization.date.toDate() : new Date())
          : null;

        const summaryCards = [
          {
            title: '総カスタマイズ数',
            value: `${totalCustomizations} 件`,
            description: '保存済みの記録',
            icon: '✨',
          },
          {
            title: '累計費用',
            value: `¥${totalCost.toLocaleString()}`,
            description: '税込み合計',
            icon: '💴',
          },
          {
            title: '平均費用',
            value: avgCost > 0 ? `¥${avgCost.toLocaleString()}` : '---',
            description: '1件あたり平均',
            icon: '📊',
          },
          {
            title: '最新カスタマイズ',
            value: lastCustomizationDate 
              ? lastCustomizationDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
              : '記録なし',
            description: '最新の登録日',
            icon: '📅',
          },
        ];

        return (
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
        );
      })()}

      {!activeCarId ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            {cars.length === 0 ? "まず車を追加してください" : "車を選択してください"}
          </div>
        </div>
      ) : (
        <>
          {/* フィルター・検索 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 検索 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  検索
                </label>
                <input
                  type="text"
                  placeholder="タイトル、ブランド、メモで検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
                />
              </div>

              {/* カテゴリフィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  カテゴリ
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
                >
                  <option value="all">すべてのカテゴリ</option>
                  <option value="エンジン">エンジン</option>
                  <option value="サスペンション">サスペンション</option>
                  <option value="ブレーキ">ブレーキ</option>
                  <option value="ホイール・タイヤ">ホイール・タイヤ</option>
                  <option value="エクステリア">エクステリア</option>
                  <option value="インテリア">インテリア</option>
                  <option value="電装">電装</option>
                  <option value="その他">その他</option>
                </select>
              </div>

              {/* ステータスフィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ステータス
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
                >
                  <option value="all">すべてのステータス</option>
                  <option value="planning">計画中</option>
                  <option value="in_progress">進行中</option>
                  <option value="completed">完了</option>
                  <option value="cancelled">キャンセル</option>
                </select>
              </div>
            </div>

            {/* ソートオプション */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">並び順:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'cost')}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="date">実施日</option>
                  <option value="title">タイトル</option>
                  <option value="cost">費用</option>
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
                {filteredCustomizations.length}件のカスタマイズ記録
              </div>
            </div>
          </div>

          {/* カスタマイズ一覧 */}
          {filteredCustomizations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                {customizations.length === 0 
                  ? "カスタマイズ記録がありません" 
                  : "フィルター条件に一致するカスタマイズ記録がありません"
                }
              </div>
              {customizations.length === 0 && (
                <button
                  onClick={() => setShowCustomizationModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  最初のカスタマイズを追加
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredCustomizations.map((customization) => (
            <div key={customization.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {customization.imageUrl && (
                    <div className="flex-shrink-0">
                      <img
                        src={customization.imageUrl}
                        alt={customization.title}
                        className="w-20 h-20 object-cover rounded-md border border-gray-200"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{customization.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[customization.status]}`}>
                        {STATUS_LABELS[customization.status]}
                      </span>
                      {customization.id && (
                        <EvidenceReliabilityBadge 
                          hasEvidence={evidenceRecordIds.has(customization.id)} 
                        />
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-3">
                      {customization.categories.map((category) => (
                        <span key={category} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {CATEGORY_LABELS[category]}
                        </span>
                      ))}
                      </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">実施日:</span>
                      <div>{(customization.date?.toDate ? customization.date.toDate() : new Date()).toLocaleDateString('ja-JP')}</div>
                    </div>
                    {customization.odoKm && (
                      <div>
                        <span className="font-medium">走行距離:</span>
                        <div>{customization.odoKm.toLocaleString()} km</div>
                      </div>
                    )}
                    {customization.brand && (
                      <div>
                        <span className="font-medium">ブランド:</span>
                        <div>{customization.brand}</div>
                      </div>
                    )}
                    {(customization.partsCostJpy || customization.laborCostJpy || customization.otherCostJpy) && (
                      <div>
                        <span className="font-medium">総費用:</span>
                        <div className="font-semibold text-green-600">
                          ¥{((customization.partsCostJpy || 0) + (customization.laborCostJpy || 0) + (customization.otherCostJpy || 0)).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {customization.memo && (
                    <div className="mt-3">
                      <span className="font-medium text-sm">メモ:</span>
                      <p className="text-sm text-gray-600 mt-1">{customization.memo}</p>
                    </div>
                  )}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(customization)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => customization.id && handleDelete(customization.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CustomizationsPageRouteContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedCarId, setSelectedCarId } = useSelectedCar();
  const urlCarId = searchParams?.get('car') || null;
  const { userPlan, checkFeature, showPaywall, closePaywall, paywallFeature, paywallVariant } = usePremiumGuard();

  // 状態管理
  const [cars, setCars] = useState<Car[]>([]);
  const [activeCarId, setActiveCarId] = useState<string | undefined>(undefined);
  const [customizations, setCustomizations] = useState<Customization[]>([]);
  const [loading, setLoading] = useState(true);
  const [authTrigger, setAuthTrigger] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAddCarModal, setShowAddCarModal] = useState(false);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [editingCustomization, setEditingCustomization] = useState<Customization | null>(null);
  const [backfillExecuted, setBackfillExecuted] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  // activeCarIdを決定（優先順位: URLクエリ > グローバルコンテキスト > ローカル状態）
  const effectiveCarId = useMemo(() => {
    return urlCarId || selectedCarId || activeCarId;
  }, [urlCarId, selectedCarId, activeCarId]);

  // 認証状態を監視
  useEffect(() => {
    console.log("Setting up auth watcher...");
    const unsubscribe = watchAuth((user) => {
      console.log("Auth state changed:", user ? `User: ${user.email}` : "No user");
      setCurrentUser(user);
      
      if (user) {
        console.log("User authenticated, forcing data refresh");
        setCars([]);
        setActiveCarId(undefined);
        setCustomizations([]);
        setAuthTrigger(prev => prev + 1);
      } else {
        console.log("User not authenticated, clearing all data");
        setCars([]);
        setActiveCarId(undefined);
        setCustomizations([]);
        setAuthTrigger(0);
      }
    });
    
    return () => {
      console.log("Cleaning up auth watcher");
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

  // バックフィル処理（既存の記録にEvidenceを自動登録）
  useEffect(() => {
    if (!auth.currentUser) {
      console.log('Backfill skipped: no auth.currentUser');
      return;
    }

    if (!effectiveCarId) {
      console.log('Backfill skipped: no effectiveCarId');
      return;
    }

    console.log('Setting up backfill with effectiveCarId:', effectiveCarId);

    // バックフィル処理を常に実行（証跡が不足している可能性があるため）
    const runBackfill = async () => {
      try {
        console.log('Starting backfill process...');
        setBackfilling(true);
        console.log('Running evidence backfill for existing records...');
        const result = await backfillEvidenceForExistingRecords();
        console.log('Backfill completed:', result);
        setBackfillExecuted(true);
        
        // カスタマイズ一覧を再取得して反映
        if (effectiveCarId) {
          console.log('Reloading customizations after backfill...');
          const updatedCustomizations = await getCustomizations(auth.currentUser.uid, effectiveCarId);
          console.log('Reloaded customizations:', updatedCustomizations.length);
          setCustomizations(updatedCustomizations);
          // 証跡も再取得される（CustomizationsContent内のuseEffectで）
        }
      } catch (error) {
        console.error('Backfill failed:', error);
      } finally {
        setBackfilling(false);
      }
    };

    // 少し遅延させて実行（ページ読み込みを妨げないように）
    const timeoutId = setTimeout(() => {
      console.log('Executing backfill after timeout...');
      runBackfill();
    }, 2000);

    return () => {
      console.log('Cleaning up backfill timeout');
      clearTimeout(timeoutId);
    };
  }, [auth.currentUser, effectiveCarId]); // backfillExecutedを依存から削除して常に実行

  // カスタマイズデータの取得
  useEffect(() => {
    if (!auth.currentUser || !effectiveCarId) {
      setCustomizations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const loadCustomizations = async () => {
      try {
        console.log("Loading customizations for car:", effectiveCarId);
        const customizations = await getCustomizations(auth.currentUser!.uid, effectiveCarId);
        console.log("Customizations loaded successfully:", customizations.length);
        setCustomizations(customizations);
        setLoading(false);
      } catch (error) {
        console.error("Error loading customizations:", error);
        console.error("Error details:", {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: (error as any)?.code,
          stack: error instanceof Error ? error.stack : undefined
        });
        setCustomizations([]);
        setLoading(false);
      }
    };

    // タイムアウトを設定して無限読み込みを防ぐ
    const timeoutId = setTimeout(() => {
      console.warn("Customizations loading timeout, setting empty array");
      setCustomizations([]);
      setLoading(false);
    }, 10000); // 10秒でタイムアウト

    loadCustomizations().finally(() => {
      clearTimeout(timeoutId);
    });
  }, [auth.currentUser, effectiveCarId, authTrigger]);

  // 現在保有中の車両のみ
  const activeCars = useMemo(
    () => cars.filter((c) => !c.status || c.status === 'active'),
    [cars]
  );

  const car = useMemo(() => {
    return cars.find((c) => c.id === effectiveCarId);
  }, [cars, effectiveCarId]);

  if (loading) {
    return (
      <AuthGate>
        <div className="min-h-screen bg-gray-50 text-gray-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="rounded-xl border border-gray-200 p-6 text-gray-600 bg-white">読み込み中...</div>
          </div>
        </div>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        {/* ヘッダー */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
            <button
              onClick={() => router.push('/home')}
              className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink hover:opacity-80 transition-opacity"
            >
              <img src="/icon.png" alt="garage log" className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg shadow-sm ring-1 ring-black/5 flex-shrink-0" />
              <span className="text-lg sm:text-xl lg:text-2xl font-semibold tracking-tight text-gray-900 truncate">garage log</span>
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
                className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors whitespace-nowrap"
              >
                ログアウト
              </button>
            </div>
          </div>
        </header>

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
            <CustomizationsContent 
              cars={cars}
              activeCarId={effectiveCarId}
              customizations={customizations}
              setShowCustomizationModal={setShowCustomizationModal}
              setEditingCustomization={setEditingCustomization}
              setCustomizations={setCustomizations}
              backfillCompleted={backfillExecuted}
            />
          </main>
        </SidebarLayout>
      </div>

      {/* 車を追加モーダル */}
      {showAddCarModal && (
        <AddCarModal
          onClose={() => {
            console.log("Closing add car modal");
            setShowAddCarModal(false);
          }}
          onAdded={() => {
            console.log("Car added, closing modal");
            setShowAddCarModal(false);
          }}
        />
      )}

      {/* カスタマイズモーダル */}
      {showCustomizationModal && activeCarId && auth.currentUser && (
        <CustomizationModal
          isOpen={showCustomizationModal}
          onClose={() => {
            setShowCustomizationModal(false);
            setEditingCustomization(null);
          }}
          carId={`${auth.currentUser.uid}/cars/${activeCarId}`}
          editingCustomization={editingCustomization}
          onSave={async () => {
            // カスタマイズ一覧を再取得
            if (auth.currentUser && activeCarId) {
              const updatedCustomizations = await getCustomizations(auth.currentUser.uid, activeCarId);
              setCustomizations(updatedCustomizations);
            }
            setShowCustomizationModal(false);
            setEditingCustomization(null);
          }}
        />
      )}
    </AuthGate>
  );
}

export default function CustomizationsPageRoute() {
  return (
    <Suspense fallback={
      <AuthGate>
        <div className="min-h-screen bg-gray-50 text-gray-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="rounded-xl border border-gray-200 p-6 text-gray-600 bg-white">読み込み中...</div>
          </div>
        </div>
      </AuthGate>
    }>
      <CustomizationsPageRouteContent />
    </Suspense>
  );
}
