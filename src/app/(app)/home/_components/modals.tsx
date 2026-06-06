"use client";

import { useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Timestamp } from "firebase/firestore";
import AuthGate from "@/components/AuthGate";
import { addCar, watchCars, updateCar } from "@/lib/cars";
import type { Car, CarInput } from "@/types";
import { auth, watchAuth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { User } from "firebase/auth";
import { addMaintenanceRecord, watchMaintenanceRecords, watchAllMaintenanceRecords, updateMaintenanceRecord, deleteMaintenanceRecord, deleteMultipleMaintenanceRecords } from "@/lib/maintenance";
import type { MaintenanceRecord } from "@/types";
import { downloadMaintenancePDF, downloadBuildSheetPDF, type PDFExportOptions } from "@/lib/pdfExport";
import { uploadCarImageWithProgress, isImageFile, uploadMaintenanceImage } from "@/lib/storage";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes } from "firebase/storage";
import { compressImage, getCompressionInfo } from "@/lib/imageCompression";
import { addCustomization, getCustomizations, updateCustomization, deleteCustomization, CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS } from "@/lib/customizations";
import type { Customization } from "@/types";
import { watchFuelLogs, calculateFuelEfficiency, calculateAverageFuelEfficiency, getDisplayAmount, getDisplayCost } from "@/lib/fuelLogs";
import type { FuelLog } from "@/types";
import { Bar as RechartsBar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import { Car as CarIcon } from 'lucide-react';
import FuelLogModal from "@/components/modals/FuelLogModal";
import AddCarModal from "@/components/modals/AddCarModal";
import FuelLogCard from "@/components/dashboard/FuelLogCard";
import CustomizationModal from "@/components/modals/CustomizationModal";
import PaywallModal from "@/components/modals/PaywallModal";
import SellCarModal from "@/components/modals/SellCarModal";
import OCRModal from "@/components/modals/OCRModal";
import { usePremiumGuard } from "@/hooks/usePremium";
import NextMaintenanceSuggestion from "@/components/mycar/NextMaintenanceSuggestion";
import { generateMaintenanceSuggestions } from "@/lib/maintenanceSuggestions";
import UnifiedCTA from "@/components/UnifiedCTA";
import { toDate, toMillis, toTimestamp } from "@/lib/dateUtils";
import { isPremiumPlan } from "@/lib/plan";
import ShareContent from "@/components/share/ShareContent";
import { useSelectedCar } from "@/contexts/SelectedCarContext";
import { CollapsibleSidebar } from "@/components/common/CollapsibleSidebar";
import { SidebarLayout } from "@/components/common/SidebarLayout";
import { useSidebarCollapse } from "@/hooks/useSidebarCollapse";

export function EditMaintenanceModal({
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
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(record.imageUrl || null);
  const [imageUrl, setImageUrl] = useState<string | null>(record.imageUrl || null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // 選択された車両の現在の走行距離を取得
  const selectedCar = cars.find(car => car.id === carId);
  const currentMileage = selectedCar?.odoKm;

  // 画像ファイル選択ハンドラー
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isImageFile(file)) {
      alert("画像ファイルを選択してください。");
      return;
    }

    // ファイルサイズチェック（10MB制限）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。");
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
  };

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
      let finalImageUrl = imageUrl;

      // 新規画像が選択されている場合、アップロード
      if (selectedImageFile && auth.currentUser && record.id) {
        setIsUploadingImage(true);
        setUploadProgress(0);
        try {
          const uploadedUrl = await uploadMaintenanceImage(
            selectedImageFile,
            auth.currentUser.uid,
            record.id,
            (progress) => setUploadProgress(progress)
          );
          finalImageUrl = uploadedUrl;
        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
          alert(`画像のアップロードに失敗しました: ${uploadError instanceof Error ? uploadError.message : '不明なエラー'}`);
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
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
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

/* -------------------- モーダルコンポーネント -------------------- */
export function MaintenanceModal({ 
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
      alert("画像ファイルを選択してください。");
      return;
    }

    // ファイルサイズチェック（10MB制限）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。");
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
    if (!title) return alert("タイトルを入力してください");
    if (!carId) return alert("車両が選択されていません");
    if (!mileage) return alert("走行距離を入力してください");
    
    // 走行距離のバリデーション
    const inputMileage = Number(mileage);
    if (currentMileage && inputMileage < currentMileage) {
      return alert(`走行距離は現在の値（${currentMileage.toLocaleString()} km）以上である必要があります`);
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
          alert(`画像のアップロードに失敗しました: ${uploadError instanceof Error ? uploadError.message : '不明なエラー'}`);
          setIsUploadingImage(false);
          return;
        }
        setIsUploadingImage(false);
      }

      console.log("Adding maintenance record with data:", {
        carId,
        title,
        description,
        cost,
        mileage,
        date,
        location,
        imageUrl: finalImageUrl
      });
      
      const newRecord = await addMaintenanceRecord({
        carId,
        title,
        description: description || undefined,
        cost: cost ? Number(cost) : undefined,
        mileage: Number(mileage), // 必須項目なので必ず数値
        date: Timestamp.fromDate(new Date(date)),
        location: location || undefined,
        imageUrl: finalImageUrl || undefined,
      });
      
      // 画像がアップロード済みでrecordIdが取得できた場合、正しいパスに移動（オプション）
      // 現在は一時パスのURLをそのまま使用
      
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
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
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

export function EditCarModal({
  car,
  onClose,
  onUpdated,
}: {
  car: Car;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [name, setName] = useState(car.name || "");
  const [modelCode, setModelCode] = useState(car.modelCode || "");
  const [year, setYear] = useState(car.year?.toString() || "");
  const [odoKm, setOdoKm] = useState(car.odoKm?.toString() || "");
  const [inspectionExpiry, setInspectionExpiry] = useState(
    car.inspectionExpiry instanceof Date ? car.inspectionExpiry.toISOString().split('T')[0] : ""
  );
  const [firstRegYm, setFirstRegYm] = useState(car.firstRegYm || "");
  const [avgKmPerMonth, setAvgKmPerMonth] = useState(car.avgKmPerMonth?.toString() || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: string;
    compressedSize: string;
    compressionRatio: string;
  } | null>(null);

  // ファイル選択ハンドラー
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイルタイプをチェック
    if (!isImageFile(file)) {
      alert("画像ファイルを選択してください。");
      return;
    }

    // ファイルサイズをチェック（圧縮前の制限を緩和）
    if (file.size > 50 * 1024 * 1024) { // 50MB
      alert("ファイルサイズが大きすぎます。50MB以下の画像を選択してください。");
      return;
    }

    try {
      // 画像を圧縮
      const compressedFile = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8,
        maxSizeKB: 500
      });

      setSelectedFile(compressedFile);
      
      // 圧縮情報を設定
      const info = getCompressionInfo(file, compressedFile);
      setCompressionInfo({
        originalSize: info.originalSize,
        compressedSize: info.compressedSize,
        compressionRatio: info.compressionRatio
      });
      
      // プレビュー用のURLを生成
      const previewUrl = URL.createObjectURL(compressedFile);
      setImagePreview(previewUrl);
    } catch (error) {
      console.error("Image compression failed:", error);
      alert("画像の圧縮に失敗しました。");
    }
  };

  // 画像削除処理
  const handleImageDelete = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setCompressionInfo(null);
  };


  // 画像アップロード処理
  const handleImageUpload = async (): Promise<string> => {
    if (!selectedFile) return car.imagePath || "/car.jpg"; // 既存の画像またはデフォルト

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // 実際の進捗監視付きアップロード
      const downloadURL = await uploadCarImageWithProgress(
        selectedFile,
        car.id,
        (progress) => {
          setUploadProgress(progress);
        }
      );
      
      // 完了表示を少し表示
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return downloadURL;
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("画像のアップロードに失敗しました。");
      return car.imagePath || "/car.jpg"; // 既存の画像またはデフォルト
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  async function handleUpdate() {
    if (!name) return alert("車名を入力してください");
    if (!car.id) return alert("車両IDが見つかりません");
    
    try {
      // 画像をアップロード
      const uploadedImagePath = await handleImageUpload();
      
      const carData: Partial<CarInput> = {
        name,
        imagePath: uploadedImagePath,
      };
      if (modelCode && modelCode.trim()) {
        carData.modelCode = modelCode.trim();
      }
      if (year && year.trim()) {
        carData.year = Number(year);
      }
      if (odoKm && odoKm.trim()) {
        carData.odoKm = Number(odoKm);
      }
      if (inspectionExpiry && inspectionExpiry.trim()) {
        // string (YYYY-MM-DD) → Timestamp変換
        carData.inspectionExpiry = Timestamp.fromDate(new Date(inspectionExpiry.trim()));
      }
      if (firstRegYm && firstRegYm.trim()) {
        carData.firstRegYm = firstRegYm.trim();
      }
      if (avgKmPerMonth && avgKmPerMonth.trim()) {
        carData.avgKmPerMonth = Number(avgKmPerMonth);
      }
      
      console.log("Updating car with data:", carData);
      await updateCar(car.id, carData);
      console.log("Car updated successfully");
      setName(""); setModelCode(""); setYear(""); setOdoKm(""); setInspectionExpiry(""); setFirstRegYm(""); setAvgKmPerMonth(""); setSelectedFile(null); setImagePreview(null); setCompressionInfo(null);
      onUpdated?.();
    } catch (error) {
      console.error("Error updating car:", error);
      alert("車両情報の更新に失敗しました。もう一度お試しください。");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-2xl relative">
        {/* アップロード中のオーバーレイ */}
        {isUploading && (
          <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">画像をアップロード中...</p>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">車両情報を編集</h2>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="text-gray-400 hover:text-gray-600 text-2xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ×
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              車名 *
            </label>
            <input
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
              placeholder="車名 (例: シビック Type R)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              型式
            </label>
            <input
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
              placeholder="型式 (例: FL5)"
              value={modelCode}
              onChange={(e) => setModelCode(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              年式
            </label>
            <input
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
              placeholder="年式 (例: 2023)"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              走行距離 (km)
            </label>
            <input
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-600 text-gray-900"
              placeholder="走行距離 km"
              value={odoKm}
              onChange={(e) => setOdoKm(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              車両画像
            </label>
            
            {/* 現在の画像またはプレビュー */}
            {(imagePreview || car.imagePath) && (
              <div className="mb-3">
                <img
                  src={imagePreview || car.imagePath}
                  alt="プレビュー"
                  className="w-full h-32 object-cover rounded-xl border border-gray-200"
                />
              </div>
            )}
            
            {/* ファイル選択 */}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="edit-car-image-upload"
            />
            <div className="flex gap-2">
              <label
                htmlFor="edit-car-image-upload"
              className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-center cursor-pointer hover:bg-gray-50 transition text-gray-900 font-medium"
              >
                {selectedFile ? "画像を変更" : "画像を選択"}
              </label>
            </div>
            
            {selectedFile && (
              <div className="text-xs text-gray-500 mt-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p>選択中: {selectedFile.name}</p>
                  <button
                    onClick={handleImageDelete}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    削除
                  </button>
                </div>
                {compressionInfo && (
                  <div className="bg-green-50 p-2 rounded border border-green-200">
                    <p className="text-green-700">
                      <span className="font-medium">圧縮完了:</span> {compressionInfo.originalSize} → {compressionInfo.compressedSize}
                    </p>
                    <p className="text-green-600">
                      サイズ削減: {compressionInfo.compressionRatio}
                    </p>
                  </div>
                )}
                {isUploading && (
                  <div className="bg-blue-50 p-2 rounded border border-blue-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-blue-700 text-xs">
                        {uploadProgress === 100 ? "アップロード完了！" : "アップロード中..."}
                      </span>
                      <span className="text-blue-600 text-xs">{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          uploadProgress === 100 ? 'bg-green-600' : 'bg-blue-600'
                        }`}
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              車検期限
            </label>
            <input
              type="date"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
              value={inspectionExpiry}
              onChange={(e) => setInspectionExpiry(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              初度登録年月（任意）
            </label>
            <input
              type="month"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
              value={firstRegYm}
              onChange={(e) => setFirstRegYm(e.target.value)}
              placeholder="例: 2020-03"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              平均月間走行距離（任意）
            </label>
            <select
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
              value={avgKmPerMonth}
              onChange={(e) => setAvgKmPerMonth(e.target.value)}
            >
              <option value="">選択してください</option>
              <option value="300">300km/月（低使用）</option>
              <option value="500">500km/月（普通）</option>
              <option value="800">800km/月（高使用）</option>
              <option value="1000">1000km/月（超高使用）</option>
            </select>
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
            onClick={handleUpdate}
            disabled={isUploading}
            className="flex-1 rounded-xl bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? "アップロード中..." : "更新"}
          </button>
        </div>
      </div>
      
    </div>
  );
}

// サイドバー用車両切り替えコンポーネント
// SidebarCarSwitcher はヘッダー統一のため削除

// メンテナンス記録タイトルの選択肢
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

// ShareContentとShareLinkCardは別ファイルに抽出済み（src/components/share/ShareContent.tsx）
// CustomizationsContentは/customizationsページに移動済み
