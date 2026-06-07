"use client";

import "../home/home.css";
import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Timestamp } from "firebase/firestore";
import AuthGate from "@/components/AuthGate";
import { watchCars, addCar } from "@/lib/cars";
import { watchAllMaintenanceRecords, updateMaintenanceRecord, deleteMaintenanceRecord, deleteMultipleMaintenanceRecords, addMaintenanceRecord } from "@/lib/maintenance";
import { generateMaintenanceSuggestions } from "@/lib/maintenanceSuggestions";
import { auth, watchAuth } from "@/lib/firebase";
import { backfillEvidenceForExistingRecords, getEvidenceRecordIds } from "@/lib/evidence";
import { uploadMaintenanceImage, isImageFile } from "@/lib/storage";
import { toDate, toMillis } from "@/lib/dateUtils";
import { isPremiumPlan } from "@/lib/plan";
import { usePremiumGuard } from "@/hooks/usePremium";
import { useSelectedCar } from "@/contexts/SelectedCarContext";
import type { Car, MaintenanceRecord } from "@/types";
import type { User } from "firebase/auth";
import AddCarModal from "@/components/modals/AddCarModal";
import { CollapsibleSidebar } from "@/components/common/CollapsibleSidebar";
import { SidebarLayout } from "@/components/common/SidebarLayout";
import EvidenceReliabilityBadge from "@/components/EvidenceReliabilityBadge";
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart } from 'recharts';
import { AppHeader } from "@/components/common/AppHeader";
import { AppLoading } from "@/components/common/AppLoading";
import { useToast, useConfirm } from "@/components/common/Feedback";

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
  const toast = useToast();
  const [title, setTitle] = useState(record.title);
  const [description, setDescription] = useState(record.description || '');
  const [cost, setCost] = useState(record.cost?.toString() || '');
  const [mileage, setMileage] = useState(record.mileage?.toString() || '');
  const [date, setDate] = useState((toDate(record.date) || new Date()).toISOString().split('T')[0]);
  const [location, setLocation] = useState(record.location || '');
  const [carId, setCarId] = useState(record.carId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(record.imageUrl || null);
  const [imageUrl, setImageUrl] = useState<string | null>(record.imageUrl || null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 選択された車両の現在の走行距離を取得
  const selectedCar = cars.find(car => car.id === carId);
  const currentMileage = selectedCar?.odoKm;

  // 画像ファイル選択ハンドラー
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isImageFile(file)) {
      toast("画像ファイルを選択してください。", "error");
      return;
    }

    // ファイルサイズチェック（10MB制限）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast("ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。", "error");
      return;
    }

    setSelectedImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  // 画像削除ハンドラー
  const handleImageDelete = () => {
    setSelectedImageFile(null);
    if (imagePreview && imagePreview !== record.imageUrl) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record.id) return;
    
    // 走行距離のバリデーション
    if (mileage) {
      const inputMileage = Number(mileage);
      if (currentMileage && inputMileage < currentMileage) {
        toast(`走行距離は現在の値（${currentMileage.toLocaleString()} km）以上である必要があります`, "error");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let finalImageUrl = imageUrl;

      // 新規画像が選択されている場合、アップロード
      if (selectedImageFile && auth.currentUser) {
        setIsUploadingImage(true);
        setUploadProgress(0);
        try {
          // 一時パスにアップロード（recordIdは後で更新）
          const tempRecordId = record.id || `temp_${Date.now()}`;
          const uploadedUrl = await uploadMaintenanceImage(
            selectedImageFile,
            auth.currentUser.uid,
            tempRecordId,
            (progress) => setUploadProgress(progress)
          );
          finalImageUrl = uploadedUrl;
        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
          toast(`画像のアップロードに失敗しました: ${uploadError instanceof Error ? uploadError.message : '不明なエラー'}`, "error");
          setIsUploadingImage(false);
          setIsSubmitting(false);
          return;
        }
        setIsUploadingImage(false);
      }

      const updateData = {
        carId,
        title,
        description: description || undefined,
        cost: cost ? Number(cost) : undefined,
        mileage: mileage ? Number(mileage) : undefined,
        date: Timestamp.fromDate(new Date(date)),
        location: location || undefined,
        imageUrl: finalImageUrl || undefined,
      };

      await updateMaintenanceRecord(record.id, updateData);
      onUpdated();
    } catch (error) {
      console.error("Error updating maintenance record:", error);
      if (error instanceof Error) {
        toast(`更新に失敗しました: ${error.message}`, "error");
      } else {
        toast("更新に失敗しました。", "error");
      }
    } finally {
      setIsSubmitting(false);
      setIsUploadingImage(false);
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
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 text-gray-900"
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
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 text-gray-900"
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
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder:text-gray-600 text-gray-900"
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
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder:text-gray-600 text-gray-900"
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
                    : "border-gray-300 focus:ring-gray-200"
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
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 text-gray-900"
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
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder:text-gray-600 text-gray-900"
                placeholder="例: ガソリンスタンド"
              />
            </div>
          </div>

          {/* 画像アップロード */}
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              画像（領収書など）
            </label>
            {imagePreview || imageUrl ? (
              <div className="mb-3">
                <div className="relative inline-block">
                  <img
                    src={imagePreview || imageUrl || ''}
                    alt="プレビュー"
                    className="max-w-full h-32 object-contain border border-gray-300 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={handleImageDelete}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  disabled={isUploadingImage || isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  領収書や作業写真の画像をアップロードできます（10MB以下）
                </p>
              </div>
            )}
            {isUploadingImage && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 transition-all duration-300" style={{ background: "var(--accent)" }}
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">アップロード中... {Math.round(uploadProgress)}%</p>
              </div>
            )}
          </div>

          {/* ボタン */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary-dark flex-1 rounded-none px-4 py-2"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploadingImage}
              className="flex-1 rounded-xl bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-500 transition disabled:opacity-50"
            >
              {isSubmitting || isUploadingImage ? (isUploadingImage ? '画像アップロード中...' : '更新中...') : '更新'}
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
  const toast = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<'suggestions' | 'history'>('history');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  
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
        const recordIds = await getEvidenceRecordIds();
        setEvidenceRecordIds(recordIds);
      } catch (error) {
        console.error('Failed to load evidence record IDs:', error);
      }
    };
    
    loadEvidenceRecordIds();
    // メンテナンス記録が更新されたときにも証跡を再取得
  }, [auth.currentUser, maintenanceRecords]);

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
    
    const ok = await confirm({
      title: 'メンテナンスを削除',
      message: `「${record.title}」を削除しますか？`,
      confirmLabel: '削除',
      tone: 'danger',
    });
    if (ok) {
      try {
        await deleteMaintenanceRecord(record.id);
      } catch (error) {
        console.error("Error deleting maintenance record:", error);
        toast("削除に失敗しました。", "error");
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
            onClick={() => {
              if (cars.length === 0) {
                toast('メンテナンスを記録するには、まず車両を登録してください。', 'error');
                return;
              }
              setShowMaintenanceModal(true);
            }}
            className="btn-primary-dark rounded-none px-4 py-2 disabled:opacity-50"
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
                className="app-card p-5"
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

      {/* 月別費用グラフ */}
      {(() => {
        const carRecords = maintenanceRecords.filter(r =>
          (!activeCarId || r.carId === activeCarId) && r.cost && r.cost > 0
        );
        if (carRecords.length === 0) return null;

        // 直近12ヶ月分を集計
        const now = new Date();
        const months: { label: string; cost: number }[] = [];
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const label = `${d.getMonth() + 1}月`;
          const cost = carRecords
            .filter(r => {
              const rd = r.date?.toDate ? r.date.toDate() : new Date(r.date as any);
              return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth();
            })
            .reduce((sum, r) => sum + (r.cost || 0), 0);
          months.push({ label, cost });
        }
        const hasData = months.some(m => m.cost > 0);
        if (!hasData) return null;

        return (
          <div className="app-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">月別整備費用（直近12ヶ月）</h3>
              <span className="text-xs text-gray-500" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                合計 ¥{carRecords.reduce((s, r) => s + (r.cost || 0), 0).toLocaleString()}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={months} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#a0a098', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(v: number) => [`¥${v.toLocaleString()}`, '費用']}
                  contentStyle={{ fontSize: 12, fontFamily: 'var(--font-mono)', background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6 }}
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                />
                <Bar dataKey="cost" fill="#1a1a18" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })()}

      {/* フィルター・検索 */}
      <div className="app-card p-4">
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
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder:text-gray-600 text-gray-900"
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
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 text-gray-900"
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
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 text-gray-900"
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
              className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
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
      <div className="app-card">
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
                onClick={() => {
                  if (cars.length === 0) {
                    toast('メンテナンスを記録するには、まず車両を登録してください。', 'error');
                    return;
                  }
                  setShowMaintenanceModal(true);
                }}
                className="btn-primary-dark rounded-none px-4 py-2 disabled:opacity-50"
              >
                メンテナンスを記録
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredRecords.map((record) => (
              <div key={record.id} className="p-6 transition" style={{ borderBottom: "0.5px solid var(--border-color)" }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {record.imageUrl && (
                      <div className="flex-shrink-0">
                        <img
                          src={record.imageUrl}
                          alt={record.title}
                          className="w-20 h-20 object-cover rounded-md border border-gray-200"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium" style={{ background: "var(--surface-muted)", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
                        {record.title}
                      </span>
                      <span className="text-sm text-gray-500">
                        {getCarName(record.carId)}
                      </span>
              </div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {record.title}
                      </h3>
                      {record.id && (
                        <EvidenceReliabilityBadge 
                          hasEvidence={evidenceRecordIds.has(record.id)} 
                        />
                      )}
                    </div>
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
                      className="app-link text-sm"
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
  existingRecords,
  onClose,
  onAdded
}: {
  carId: string;
  carName: string;
  currentMileage?: number;
  initialTitle?: string;
  existingRecords?: MaintenanceRecord[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [title, setTitle] = useState(initialTitle || "");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState<string>("");
  const [mileage, setMileage] = useState<string>(currentMileage ? currentMileage.toString() : "");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState("");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // initialTitleが変更されたときにtitleを更新
  useEffect(() => {
    if (initialTitle) {
      setTitle(initialTitle);
    }
  }, [initialTitle]);

  // 画像ファイル選択ハンドラー
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isImageFile(file)) {
      toast("画像ファイルを選択してください。", "error");
      return;
    }

    // ファイルサイズチェック（10MB制限）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast("ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。", "error");
      return;
    }

    setSelectedImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  // 画像削除ハンドラー
  const handleImageDelete = () => {
    setSelectedImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setImageUrl(null);
  };

  async function handleAdd() {
    if (!title) return toast("タイトルを入力してください", "error");
    if (!carId) return toast("車両が選択されていません", "error");
    if (!mileage) return toast("走行距離を入力してください", "error");

    // 重複チェック：同じ車両で同じタイトル＋30日以内の記録
    if (existingRecords && existingRecords.length > 0) {
      const inputDate = new Date(date);
      const similar = existingRecords.filter(r => {
        if (r.carId !== carId) return false;
        if ((r.title || '').trim().toLowerCase() !== title.trim().toLowerCase()) return false;
        const rDate = r.date?.toDate ? r.date.toDate() : new Date(r.date as any);
        const diffDays = Math.abs(inputDate.getTime() - rDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 30;
      });
      if (similar.length > 0) {
        const proceed = await confirm({
          title: '似た記録があります',
          message: `「${title}」と似た記録が30日以内に存在します。（${new Intl.DateTimeFormat('ja-JP').format(similar[0].date?.toDate ? similar[0].date.toDate() : new Date(similar[0].date as any))}）\n\nそれでも追加しますか？`,
          confirmLabel: '追加する',
        });
        if (!proceed) return;
      }
    }

    // 走行距離のバリデーション
    const inputMileage = Number(mileage);
    if (currentMileage && inputMileage < currentMileage) {
      return toast(`走行距離は現在の値（${currentMileage.toLocaleString()} km）以上である必要があります`, "error");
    }
    
    try {
      let finalImageUrl = imageUrl;

      // 画像が選択されている場合、先にアップロード（一時パスに保存）
      if (selectedImageFile && auth.currentUser) {
        setIsUploadingImage(true);
        setUploadProgress(0);
        try {
          // 一時パスにアップロード（recordIdは後で更新）
          const tempRecordId = `temp_${Date.now()}`;
          const uploadedUrl = await uploadMaintenanceImage(
            selectedImageFile,
            auth.currentUser.uid,
            tempRecordId,
            (progress) => setUploadProgress(progress)
          );
          finalImageUrl = uploadedUrl;
        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
          toast(`画像のアップロードに失敗しました: ${uploadError instanceof Error ? uploadError.message : '不明なエラー'}`, "error");
          setIsUploadingImage(false);
          return;
        }
        setIsUploadingImage(false);
      }

      const newRecord = await addMaintenanceRecord({
        carId,
        title,
        description: description || undefined,
        cost: cost ? Number(cost) : undefined,
        mileage: Number(mileage),
        date: Timestamp.fromDate(new Date(date)),
        location: location || undefined,
        imageUrl: finalImageUrl || undefined,
      });
      
      // フォームをリセット
      setTitle("");
      setDescription("");
      setCost("");
      setMileage("");
      setLocation("");
      handleImageDelete();
      onAdded?.();
    } catch (error) {
      console.error("Error adding maintenance record:", error);
      toast(`履歴の追加に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`, "error");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="app-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 text-gray-900"
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
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 text-gray-900"
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
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder:text-gray-600 text-gray-900"
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
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder:text-gray-600 text-gray-900"
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
                    : "border-gray-300 focus:ring-gray-200"
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
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder:text-gray-600 text-gray-900"
                placeholder="例：ガソリンスタンド"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          {/* 画像アップロード */}
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              画像（領収書など）
            </label>
            {imagePreview || imageUrl ? (
              <div className="mb-3">
                <div className="relative inline-block">
                  <img
                    src={imagePreview || imageUrl || ''}
                    alt="プレビュー"
                    className="max-w-full h-32 object-contain border border-gray-300 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={handleImageDelete}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  disabled={isUploadingImage}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  領収書や作業写真の画像をアップロードできます（10MB以下）
                </p>
              </div>
            )}
            {isUploadingImage && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 transition-all duration-300" style={{ background: "var(--accent)" }}
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">アップロード中... {Math.round(uploadProgress)}%</p>
              </div>
            )}
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

function MaintenancePageRouteContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedCarId, setSelectedCarId } = useSelectedCar();
  const urlCarId = searchParams?.get('car') || null;
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
  const [backfillExecuted, setBackfillExecuted] = useState(false);

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
      return;
    }
    
    try {
      const off = watchCars((list) => {
        setCars(list);
        // 車両リスト変更時の処理は、別のuseEffectで処理する
      });
      return () => {
        off && off();
      };
    } catch (error) {
      console.error("Error watching cars:", error);
      setCars([]);
    }
  }, [auth.currentUser, authTrigger]);

  // バックフィル処理（既存の記録にEvidenceを自動登録）
  useEffect(() => {
    if (!auth.currentUser || backfillExecuted) {
      return;
    }

    const runBackfill = async () => {
      try {
        console.log('Running evidence backfill for existing records...');
        const result = await backfillEvidenceForExistingRecords();
        console.log('Backfill completed:', result);
        setBackfillExecuted(true);
      } catch (error) {
        console.error('Backfill failed:', error);
      }
    };

    // 少し遅延させて実行（ページ読み込みを妨げないように）
    const timeoutId = setTimeout(() => {
      runBackfill();
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [auth.currentUser, backfillExecuted]);

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
    return cars.find((c) => c.id === effectiveCarId);
  }, [cars, effectiveCarId]);

  if (loading) {
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
            <MaintenanceHistoryContent
              cars={cars}
              activeCarId={effectiveCarId}
              maintenanceRecords={maintenanceRecords}
              setShowMaintenanceModal={setShowMaintenanceModal}
              setShowEditMaintenanceModal={setShowEditMaintenanceModal}
              setEditingMaintenanceRecord={setEditingMaintenanceRecord}
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
              toast("車両の追加に失敗しました", "error");
            }
          }}
        />
      )}

      {showMaintenanceModal && (() => {
        // 車両が選択されていない場合は、最初の車両を使用
        const targetCarId = effectiveCarId || activeCars[0]?.id;
        const targetCar = car || activeCars[0];
        
        if (!targetCarId || !targetCar) {
          // 車両が登録されていない場合はアラートを表示
          return null;
        }
        
        return (
          <MaintenanceModal
            carId={targetCarId}
            carName={targetCar.name}
            currentMileage={targetCar.odoKm}
            initialTitle={maintenanceTemplate || undefined}
            existingRecords={maintenanceRecords}
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
        );
      })()}

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

export default function MaintenancePageRoute() {
  return (
    <Suspense fallback={<AppLoading />}>
      <MaintenancePageRouteContent />
    </Suspense>
  );
}

