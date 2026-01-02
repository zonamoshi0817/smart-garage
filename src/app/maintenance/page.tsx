"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Timestamp } from "firebase/firestore";
import AuthGate from "@/components/AuthGate";
import { watchCars, addCar } from "@/lib/cars";
import { watchAllMaintenanceRecords, updateMaintenanceRecord, deleteMaintenanceRecord, deleteMultipleMaintenanceRecords, addMaintenanceRecord } from "@/lib/maintenance";
import { generateMaintenanceSuggestions } from "@/lib/maintenanceSuggestions";
import { auth, watchAuth } from "@/lib/firebase";
import { toDate, toMillis } from "@/lib/dateUtils";
import { isPremiumPlan } from "@/lib/plan";
import { usePremiumGuard } from "@/hooks/usePremium";
import type { Car, MaintenanceRecord, User } from "@/types";
import AddCarModal from "@/components/modals/AddCarModal";

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
                  onSelectCar(car.id!);
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

// メンテナンスタイトルオプション
const MAINTENANCE_TITLE_OPTIONS = [
  { value: 'オイル交換', label: 'オイル交換', category: 'メンテナンス' },
  { value: 'タイヤ交換', label: 'タイヤ交換', category: 'メンテナンス' },
  { value: 'ブレーキパッド交換', label: 'ブレーキパッド交換', category: 'メンテナンス' },
  { value: 'エアフィルター交換', label: 'エアフィルター交換', category: 'メンテナンス' },
  { value: 'バッテリー交換', label: 'バッテリー交換', category: 'メンテナンス' },
  { value: '車検', label: '車検', category: '法定点検' },
  { value: 'タイヤローテーション', label: 'タイヤローテーション', category: 'メンテナンス' },
  { value: 'ブレーキフルード交換', label: 'ブレーキフルード交換', category: 'メンテナンス' },
  { value: 'クーラント交換', label: 'クーラント交換', category: 'メンテナンス' },
  { value: 'スパークプラグ交換', label: 'スパークプラグ交換', category: 'メンテナンス' },
  { value: 'ベルト交換', label: 'ベルト交換', category: 'メンテナンス' },
  { value: 'ワイパー交換', label: 'ワイパー交換', category: 'メンテナンス' },
  { value: '電球交換', label: '電球交換', category: 'メンテナンス' },
  { value: 'エンジン点検', label: 'エンジン点検', category: 'メンテナンス' },
  { value: 'トランスミッションオイル交換', label: 'トランスミッションオイル交換', category: 'メンテナンス' },
  { value: 'ディファレンシャルオイル交換', label: 'ディファレンシャルオイル交換', category: 'メンテナンス' },
  { value: 'ブレーキディスク交換', label: 'ブレーキディスク交換', category: 'メンテナンス' },
  { value: 'サスペンション点検', label: 'サスペンション点検', category: 'メンテナンス' },
  { value: 'エアコン点検', label: 'エアコン点検', category: 'メンテナンス' },
  { value: 'その他', label: 'その他', category: 'その他' }
];

// メンテナンス編集モーダル
function EditMaintenanceModal({
  record,
  cars,
  onClose,
  onUpdated
}: {
  record: MaintenanceRecord;
  cars: Car[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [title, setTitle] = useState(record.title);
  const [description, setDescription] = useState(record.description || '');
  const [cost, setCost] = useState(record.cost?.toString() || '');
  const [mileage, setMileage] = useState(record.mileage?.toString() || '');
  const [date, setDate] = useState((toDate(record.date) || new Date()).toISOString().split('T')[0]);
  const [location, setLocation] = useState(record.location || '');
  const [carId, setCarId] = useState(record.carId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 選択された車両の現在の走行距離を取得
  const selectedCar = cars.find(car => car.id === carId);
  const currentMileage = selectedCar?.odoKm;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record.id) return;
    
    // 走行距離のバリデーション
    if (mileage) {
      const inputMileage = Number(mileage);
      if (currentMileage && inputMileage < currentMileage) {
        alert(`走行距離は現在の値（${currentMileage.toLocaleString()} km）以上である必要があります`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const updateData = {
        carId,
        title,
        description: description || undefined,
        cost: cost ? Number(cost) : undefined,
        mileage: mileage ? Number(mileage) : undefined,
        date: Timestamp.fromDate(new Date(date)),
        location: location || undefined,
      };

      await updateMaintenanceRecord(record.id, updateData);
      onUpdated();
    } catch (error) {
      console.error("Error updating maintenance record:", error);
      if (error instanceof Error) {
        alert(`更新に失敗しました: ${error.message}`);
      } else {
        alert("更新に失敗しました。");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">メンテナンスを編集</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          {/* 車両選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              車両
            </label>
            <select
              value={carId}
              onChange={(e) => setCarId(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
              required
            >
              {cars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.name}
                </option>
              ))}
            </select>
          </div>

          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              タイトル
            </label>
            <select
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
              required
            >
              <option value="">選択してください</option>
              {['メンテナンス', '法定点検', 'その他'].map((category) => (
                <optgroup key={category} label={category}>
                  {MAINTENANCE_TITLE_OPTIONS
                    .filter(option => option.category === category)
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* 説明 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              説明
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
              placeholder="詳細な説明（任意）"
              rows={3}
            />
          </div>

          {/* 費用と走行距離 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                費用（円）
              </label>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
                placeholder="例: 5000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                走行距離（km）
              </label>
              <input
                type="number"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 placeholder:text-gray-600 text-gray-900 ${
                  currentMileage && Number(mileage) < currentMileage && mileage !== ""
                    ? "border-red-300 focus:ring-red-100 bg-red-50"
                    : "border-gray-300 focus:ring-blue-100"
                }`}
                placeholder={currentMileage ? `現在: ${currentMileage.toLocaleString()} km` : "例: 50000"}
                min={currentMileage || 0}
              />
              {currentMileage && Number(mileage) < currentMileage && mileage !== "" && (
                <p className="text-red-600 text-sm mt-1">
                  現在の走行距離（{currentMileage.toLocaleString()} km）以上を入力してください
                </p>
              )}
            </div>
          </div>

          {/* 日付と場所 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                日付
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                作業場所
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
                placeholder="例: ガソリンスタンド"
              />
            </div>
          </div>

          {/* ボタン */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 transition text-gray-900"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-500 transition disabled:opacity-50"
            >
              {isSubmitting ? "更新中..." : "更新"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// メンテナンス履歴コンテンツ（home/page.tsxから抽出）
function MaintenanceHistoryContent({
  cars,
  activeCarId,
  maintenanceRecords,
  setShowMaintenanceModal,
  setShowEditMaintenanceModal,
  setEditingMaintenanceRecord
}: {
  cars: Car[];
  activeCarId?: string;
  maintenanceRecords: MaintenanceRecord[];
  setShowMaintenanceModal: (show: boolean) => void;
  setShowEditMaintenanceModal: (show: boolean) => void;
  setEditingMaintenanceRecord: (record: MaintenanceRecord | null) => void;
}) {
  const [activeTab, setActiveTab] = useState<'suggestions' | 'history'>('history');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // ヘッダーで選択された車両を使用
  const selectedCar = activeCarId ? cars.find(c => c.id === activeCarId) : null;
  
  // 選択されている車両のメンテナンス記録のみを取得
  const selectedCarMaintenanceRecords = activeCarId 
    ? maintenanceRecords.filter(r => r.carId === activeCarId)
    : maintenanceRecords;

  // 提案を取得（車両が選択されている場合のみ）
  const suggestions = selectedCar 
    ? generateMaintenanceSuggestions(selectedCar, selectedCarMaintenanceRecords)
    : [];

  // 優先度別に提案を分類
  const criticalSuggestions = suggestions.filter(s => s.status === 'critical');
  const soonSuggestions = suggestions.filter(s => s.status === 'soon');
  const upcomingSuggestions = suggestions.filter(s => s.status === 'upcoming');
  const okSuggestions = suggestions.filter(s => s.status === 'ok');

  // メンテナンスカテゴリの定義
  const MAINTENANCE_CATEGORIES = {
    'all': 'すべてのカテゴリ',
    'engine': 'エンジン',
    'transmission': 'トランスミッション',
    'brake': 'ブレーキ',
    'suspension': 'サスペンション',
    'exhaust': '排気系',
    'electrical': '電気系',
    'body': 'ボディ',
    'interior': '内装',
    'tire': 'タイヤ',
    'battery': 'バッテリー',
    'air_conditioner': 'エアコン',
    'other': 'その他'
  };

  // メンテナンスステータスの定義
  const MAINTENANCE_STATUS = {
    'all': 'すべてのステータス',
    'completed': '完了',
    'scheduled': '予定',
    'in_progress': '進行中',
    'cancelled': 'キャンセル'
  };

  // フィルタリングされたメンテナンス
  const filteredRecords = useMemo(() => {
    let filtered = maintenanceRecords;

    // ヘッダーで選択された車両でフィルタリング
    if (activeCarId) {
      filtered = filtered.filter(record => record.carId === activeCarId);
    }

    // 検索でフィルタリング
    if (searchTerm) {
      filtered = filtered.filter(record => 
        record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.description && record.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (record.location && record.location.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // カテゴリでフィルタリング（タイトルから推測）
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(record => {
        const title = record.title.toLowerCase();
        switch (selectedCategory) {
          case 'engine':
            return title.includes('エンジン') || title.includes('オイル') || title.includes('オイル交換') || title.includes('エンジンオイル');
          case 'brake':
            return title.includes('ブレーキ') || title.includes('ブレーキパッド') || title.includes('ブレーキフルード');
          case 'tire':
            return title.includes('タイヤ') || title.includes('ホイール') || title.includes('バランス');
          case 'battery':
            return title.includes('バッテリー') || title.includes('バッテリ');
          case 'air_conditioner':
            return title.includes('エアコン') || title.includes('冷媒') || title.includes('ガス');
          case 'electrical':
            return title.includes('電気') || title.includes('配線') || title.includes('ランプ') || title.includes('バルブ');
          case 'suspension':
            return title.includes('サスペンション') || title.includes('ショック') || title.includes('ストラット');
          case 'transmission':
            return title.includes('トランスミッション') || title.includes('ATF') || title.includes('MTF');
          case 'exhaust':
            return title.includes('排気') || title.includes('マフラー') || title.includes('触媒');
          case 'body':
            return title.includes('ボディ') || title.includes('塗装') || title.includes('板金');
          case 'interior':
            return title.includes('内装') || title.includes('シート') || title.includes('ダッシュボード');
          default:
            return true;
        }
      });
    }

    // ステータスでフィルタリング（現在はすべて完了として扱う）
    if (selectedStatus !== 'all') {
      if (selectedStatus !== 'completed') {
        filtered = [];
      }
    }

    // 並び替え
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
          comparison = (a.cost || 0) - (b.cost || 0);
          break;
        case 'mileage':
          comparison = (a.mileage || 0) - (b.mileage || 0);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [maintenanceRecords, activeCarId, searchTerm, selectedCategory, selectedStatus, sortBy, sortOrder]);

  // 車両名を取得する関数
  const getCarName = (carId: string) => {
    const car = cars.find(c => c.id === carId);
    return car ? car.name : '不明な車両';
  };

  // 編集ボタンのハンドラー
  const handleEditRecord = (record: MaintenanceRecord) => {
    setEditingMaintenanceRecord(record);
    setShowEditMaintenanceModal(true);
  };

  // 削除ボタンのハンドラー
  const handleDeleteRecord = async (record: MaintenanceRecord) => {
    if (!record.id) return;
    
    if (confirm(`「${record.title}」を削除しますか？`)) {
      try {
        await deleteMaintenanceRecord(record.id);
      } catch (error) {
        console.error("Error deleting maintenance record:", error);
        alert("削除に失敗しました。");
      }
    }
  };

  return (
    <>
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">メンテナンス</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowMaintenanceModal(true)}
            className="rounded-xl bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-500 transition"
          >
            ＋ メンテナンスを記録
          </button>
        </div>
      </div>

      {/* 統計カード */}
      {(() => {
        const totalRecords = maintenanceRecords.length;
        const totalCost = maintenanceRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
        const avgCost = totalRecords > 0 ? Math.round(totalCost / totalRecords) : 0;
        const lastMaintenance = maintenanceRecords
          .sort((a, b) => toMillis(b.date) - toMillis(a.date))[0];
        const lastMaintenanceDate = lastMaintenance 
          ? (lastMaintenance.date?.toDate ? lastMaintenance.date.toDate() : new Date())
          : null;

        const summaryCards = [
          {
            title: '総メンテナンス回数',
            value: `${totalRecords} 回`,
            description: '保存済みの記録',
            icon: '🔧',
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
            description: '1回あたり平均',
            icon: '📊',
          },
          {
            title: '直近メンテナンス',
            value: lastMaintenanceDate 
              ? lastMaintenanceDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
              : '記録なし',
            description: '最新の実施日',
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

      {/* フィルター・検索 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 検索 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              検索
            </label>
            <input
              type="text"
              placeholder="タイトル、説明、場所で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
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
              {Object.entries(MAINTENANCE_CATEGORIES).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
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
              {Object.entries(MAINTENANCE_STATUS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ソートオプション */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">並び順:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="date">実施日</option>
              <option value="title">タイトル</option>
              <option value="cost">費用</option>
              <option value="mileage">走行距離</option>
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
            {filteredRecords.length}件のメンテナンス記録
          </div>
        </div>
      </div>

      {/* 履歴一覧 */}
      <div className="bg-white rounded-2xl border border-gray-200">
        {filteredRecords.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {maintenanceRecords.length === 0 
                ? "メンテナンス記録がありません" 
                : "フィルター条件に一致するメンテナンス記録がありません"
              }
            </h3>
            <p className="text-gray-500 mb-4">
              {maintenanceRecords.length === 0 
                ? "最初のメンテナンスを記録しましょう。" 
                : "フィルター条件を変更して再度お試しください。"
              }
            </p>
            {maintenanceRecords.length === 0 && (
              <button
                onClick={() => setShowMaintenanceModal(true)}
                className="rounded-xl bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-500 transition"
              >
                メンテナンスを記録
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredRecords.map((record) => (
              <div key={record.id} className="p-6 hover:bg-gray-50 transition">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {record.title}
                      </span>
                      <span className="text-sm text-gray-500">
                        {getCarName(record.carId)}
                      </span>
              </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {record.title}
                    </h3>
                    {record.description && (
                      <p className="text-gray-600 mb-2">{record.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{(record.date?.toDate ? record.date.toDate() : new Date()).toLocaleDateString('ja-JP')}</span>
                      {record.cost && (
                        <span>¥{record.cost.toLocaleString()}</span>
                      )}
                      {record.mileage && (
                        <span>{record.mileage.toLocaleString()} km</span>
                      )}
                      {record.location && (
                        <span>{record.location}</span>
                      )}
                    </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button 
                      onClick={() => handleEditRecord(record)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      編集
                    </button>
                    <button 
                      onClick={() => handleDeleteRecord(record)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// メンテナンス追加モーダル（home/page.tsxから）
function MaintenanceModal({ 
  carId, 
  carName, 
  currentMileage,
  initialTitle,
  onClose, 
  onAdded 
}: { 
  carId: string; 
  carName: string; 
  currentMileage?: number;
  initialTitle?: string;
  onClose: () => void; 
  onAdded: () => void; 
}) {
  const [title, setTitle] = useState(initialTitle || "");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState<string>("");
  const [mileage, setMileage] = useState<string>(currentMileage ? currentMileage.toString() : "");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState("");

  // initialTitleが変更されたときにtitleを更新
  useEffect(() => {
    if (initialTitle) {
      setTitle(initialTitle);
    }
  }, [initialTitle]);

  async function handleAdd() {
    if (!title) return alert("タイトルを入力してください");
    if (!carId) return alert("車両が選択されていません");
    if (!mileage) return alert("走行距離を入力してください");
    
    // 走行距離のバリデーション
    const inputMileage = Number(mileage);
    if (currentMileage && inputMileage < currentMileage) {
      return alert(`走行距離は現在の値（${currentMileage.toLocaleString()} km）以上である必要があります`);
    }
    
    try {
      const newRecord = await addMaintenanceRecord({
        carId,
        title,
        description: description || undefined,
        cost: cost ? Number(cost) : undefined,
        mileage: Number(mileage),
        date: Timestamp.fromDate(new Date(date)),
        location: location || undefined,
      });
      
      // フォームをリセット
      setTitle("");
      setDescription("");
      setCost("");
      setMileage("");
      setLocation("");
      onAdded?.();
    } catch (error) {
      console.error("Error adding maintenance record:", error);
      alert(`履歴の追加に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">メンテナンスを記録 - {carName}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              日付
            </label>
            <input
              type="date"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル *
            </label>
            <select
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
              required
            >
              <option value="">選択してください</option>
              {['メンテナンス', '法定点検', 'その他'].map((category) => (
                <optgroup key={category} label={category}>
                  {MAINTENANCE_TITLE_OPTIONS
                    .filter(option => option.category === category)
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              詳細・メモ
            </label>
            <textarea
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
              placeholder="作業内容やメモを入力..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                費用 (円)
              </label>
              <input
                type="number"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
                placeholder="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                走行距離 (km) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                className={`w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 placeholder:text-gray-600 text-gray-900 ${
                  currentMileage && Number(mileage) < currentMileage && mileage !== ""
                    ? "border-red-300 focus:ring-red-100 bg-red-50"
                    : "border-gray-300 focus:ring-blue-100"
                }`}
                placeholder={currentMileage ? `現在: ${currentMileage.toLocaleString()} km` : "例: 50000"}
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                min={currentMileage || 0}
                required
              />
              {currentMileage && Number(mileage) < currentMileage && mileage !== "" && (
                <p className="text-red-600 text-sm mt-1">
                  現在の走行距離（{currentMileage.toLocaleString()} km）以上を入力してください
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                作業場所
              </label>
              <input
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
                placeholder="例：ガソリンスタンド"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50 transition text-gray-900"
          >
            キャンセル
          </button>
          <button
            onClick={handleAdd}
            className="flex-1 rounded-xl bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-500 transition"
          >
            記録
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MaintenancePageRoute() {
  const router = useRouter();
  const pathname = usePathname();
  const [cars, setCars] = useState<Car[]>([]);
  const [activeCarId, setActiveCarId] = useState<string | undefined>(undefined);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAddCarModal, setShowAddCarModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceTemplate, setMaintenanceTemplate] = useState<string | null>(null);
  const [showEditMaintenanceModal, setShowEditMaintenanceModal] = useState(false);
  const [editingMaintenanceRecord, setEditingMaintenanceRecord] = useState<MaintenanceRecord | null>(null);
  const [authTrigger, setAuthTrigger] = useState(0);

  // プレミアムガード
  const { userPlan } = usePremiumGuard();

  // 認証状態を監視
  useEffect(() => {
    const unsubscribe = watchAuth((user) => {
      setCurrentUser(user);
      
      if (user) {
        setCars([]);
        setActiveCarId(undefined);
        setMaintenanceRecords([]);
        setAuthTrigger(prev => prev + 1);
      } else {
        setCars([]);
        setActiveCarId(undefined);
        setMaintenanceRecords([]);
        setAuthTrigger(0);
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  // 車両リストが変更されたときに自動選択
  useEffect(() => {
    if (cars.length === 0) {
      return;
    }

    const activeCarsList = cars.filter((c) => !c.status || c.status === 'active');
    
    if (activeCarsList.length === 0) {
      return;
    }

    const currentCarExists = activeCarId ? activeCarsList.some(car => car.id === activeCarId) : false;
    
    if (!activeCarId || !currentCarExists) {
      setActiveCarId(activeCarsList[0].id);
    }
  }, [cars, activeCarId]);

  // 車両データの取得
  useEffect(() => {
    if (!auth.currentUser) {
      return;
    }
    
    try {
      const off = watchCars((list) => {
        if (list.length > 0) {
          setCars(list);
          
          const currentCarExists = activeCarId ? list.some(car => car.id === activeCarId) : false;
          if (!activeCarId || !currentCarExists) {
            setActiveCarId(list[0].id);
          }
        } else {
          setCars([]);
        }
      });
      return () => {
        off && off();
      };
    } catch (error) {
      console.error("Error watching cars:", error);
      setCars([]);
    }
  }, [auth.currentUser, activeCarId, authTrigger]);

  // 全メンテナンス記録を取得
  useEffect(() => {
    if (!auth.currentUser) {
      setMaintenanceRecords([]);
      setLoading(false);
      return;
    }
    
    try {
      const off = watchAllMaintenanceRecords((records) => {
        setMaintenanceRecords(records);
        setLoading(false);
      });
      return () => {
        off && off();
      };
    } catch (error) {
      console.error("Error watching all maintenance records:", error);
      setMaintenanceRecords([]);
      setLoading(false);
    }
  }, [auth.currentUser, authTrigger]);

  // 現在保有中の車両のみ
  const activeCars = useMemo(
    () => cars.filter((c) => !c.status || c.status === 'active'),
    [cars]
  );

  const car = useMemo(() => {
    return cars.find((c) => c.id === activeCarId);
  }, [cars, activeCarId]);

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
                    activeCarId={activeCarId}
                    onSelectCar={(id) => setActiveCarId(id)}
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
          {/* サイドバー */}
          <aside className="lg:sticky lg:top-20 h-fit">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
              {currentUser?.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt={currentUser.displayName || currentUser.email || 'User'} 
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className={`h-8 w-8 rounded-full grid place-items-center font-semibold text-sm ${
                  isPremiumPlan(userPlan) ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' : 'bg-blue-100 text-blue-600'
                }`}>
                  {currentUser?.displayName?.[0] || currentUser?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="text-sm">
                <div className="font-semibold">
                  {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'ユーザー'}
                </div>
                <div className={`text-xs ${isPremiumPlan(userPlan) ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                  {isPremiumPlan(userPlan) ? '✨ Premium プラン' : 'Free プラン'}
                </div>
              </div>
            </div>

            <nav className="mt-4 bg-white rounded-2xl border border-gray-200 p-2 space-y-1 text-[15px]">
              <NavItem 
                label="ホーム" 
                active={false}
                href="/home"
              />
              <MyCarNavLink />
              <NavItem 
                label="ガソリン" 
                active={false}
                href="/home"
              />
              <MaintenanceNavLink />
              <NavItem 
                label="カスタマイズ" 
                active={false}
                href="/home"
              />
              <ShareNavLink />
              <NavItem 
                label="車両管理" 
                active={false}
                href="/home"
              />
              <NavItem 
                label="データ" 
                href="/data"
                active={pathname === '/data'}
              />
            </nav>

            {/* 設定リンク */}
            <div className="mt-4 bg-white rounded-2xl border border-gray-200 p-2">
              <a
                href="/settings/account"
                className="flex items-center gap-2 px-3 py-2 text-[15px] text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                アカウント設定
              </a>
            </div>

            {/* プレミアムアップグレード（無料ユーザーのみ表示） */}
            {!isPremiumPlan(userPlan) && (
              <div className="mt-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl border border-yellow-300 p-4 text-white">
                <div className="text-sm font-semibold mb-1">✨ Premium プラン</div>
                <div className="text-xs opacity-90 mb-3">より多くの機能を利用できます</div>
                <Link
                  href="/settings/account"
                  className="block w-full text-center px-4 py-2 bg-white text-orange-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  アップグレード
                </Link>
              </div>
            )}
          </aside>

          {/* メインコンテンツ */}
          <main className="space-y-6">
            <MaintenanceHistoryContent
              cars={cars}
              activeCarId={activeCarId}
              maintenanceRecords={maintenanceRecords}
              setShowMaintenanceModal={setShowMaintenanceModal}
              setShowEditMaintenanceModal={setShowEditMaintenanceModal}
              setEditingMaintenanceRecord={setEditingMaintenanceRecord}
            />
          </main>
        </div>
      </div>

      {/* モーダル */}
      {showAddCarModal && (
        <AddCarModal
          onClose={() => setShowAddCarModal(false)}
          onAdded={async (carData) => {
            try {
              const newCar = await addCar(carData);
              setShowAddCarModal(false);
              if (newCar?.id) {
                setActiveCarId(newCar.id);
              }
            } catch (error) {
              console.error("Failed to add car:", error);
              alert("車両の追加に失敗しました");
            }
          }}
        />
      )}

      {showMaintenanceModal && activeCarId && car && (
        <MaintenanceModal
          carId={activeCarId}
          carName={car.name}
          currentMileage={car.odoKm}
          initialTitle={maintenanceTemplate || undefined}
          onClose={() => {
            setShowMaintenanceModal(false);
            setMaintenanceTemplate(null);
          }}
          onAdded={() => {
            setShowMaintenanceModal(false);
            setMaintenanceTemplate(null);
            setAuthTrigger(prev => prev + 1);
          }}
        />
      )}

      {showEditMaintenanceModal && editingMaintenanceRecord && (
        <EditMaintenanceModal
          record={editingMaintenanceRecord}
          cars={cars}
          onClose={() => {
            setShowEditMaintenanceModal(false);
            setEditingMaintenanceRecord(null);
          }}
          onUpdated={() => {
            setShowEditMaintenanceModal(false);
            setEditingMaintenanceRecord(null);
            setAuthTrigger(prev => prev + 1);
          }}
        />
      )}
    </AuthGate>
  );
}

