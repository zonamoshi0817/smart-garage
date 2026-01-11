'use client';

import { useState, useEffect } from 'react';
import { addCar, watchCars } from '@/lib/cars';
import { CarInput } from '@/types';
import { compressImage, getCompressionInfo } from '@/lib/imageCompression';
import { isImageFile, uploadCarImageWithProgress } from '@/lib/storage';
import { usePremiumGuard } from '@/hooks/usePremium';
import PaywallModal from '@/components/modals/PaywallModal';
import QRCodeScannerModal from '@/components/modals/QRCodeScannerModal';
import { toTimestamp } from '@/lib/dateUtils';
import { VehicleClass } from '@/types';
import { findCarNameByModelCode, mapBodyTypeStringToVehicleClass } from '@/lib/carLookup';

interface AddCarModalProps {
  onClose: () => void;
  onAdded: () => void;
}

export default function AddCarModal({ onClose, onAdded }: AddCarModalProps) {
  const { userPlan, checkFeature, showPaywall, closePaywall, paywallFeature, paywallVariant } = usePremiumGuard();
  const [carCount, setCarCount] = useState(0);
  const [name, setName] = useState("");
  const [modelCode, setModel] = useState("");
  const [year, setYear] = useState<string>("");
  const [odoKm, setOdo] = useState<string>("");
  const [yearError, setYearError] = useState("");
  const [inspectionExpiry, setInspectionExpiry] = useState("");
  const [firstRegYm, setFirstRegYm] = useState("");
  const [avgKmPerMonth, setAvgKmPerMonth] = useState<string>("");
  const [chassisNumber, setChassisNumber] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  // vehicleClassは削除（UIから削除、デフォルト値で保存）
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: string;
    compressedSize: string;
    compressionRatio: string;
  } | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);

  // 車両数をリアルタイムで監視
  useEffect(() => {
    const unsubscribe = watchCars((cars) => {
      setCarCount(cars.length);
    });
    return () => unsubscribe();
  }, []);

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

  // 年式バリデーション
  const handleYearChange = (value: string) => {
    setYear(value);
    if (value && value.trim()) {
      const yearNum = Number(value);
      const currentYear = new Date().getFullYear();
      // 年式は1900年以降、現在年以下を許可（古い車両も登録可能）
      if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear) {
        setYearError(`年式は1900～${currentYear}年の範囲で入力してください`);
      } else {
        setYearError("");
      }
    } else {
      setYearError("");
    }
  };

  // QRコードスキャン成功時の処理
  const handleQRScanSuccess = (data: {
    chassisNumber?: string;
    registrationNumber?: string;
    inspectionExpiry?: string;
    firstRegYm?: string;
    modelCode?: string;
    year?: number;
    bodyType?: 'sedan' | 'hatchback' | 'suv' | 'wagon' | 'coupe' | 'convertible' | 'pickup' | 'minivan' | 'sports' | 'other';
  }) => {
    console.log('QRコードスキャン成功:', data);
    
    // データをフォームに反映
    if (data.modelCode && !modelCode) {
      setModel(data.modelCode);
      
      // modelCodeから車名を自動検索
      if (!name) {
        findCarNameByModelCode(data.modelCode, data.year).then((carInfo) => {
          if (carInfo) {
            setName(`${carInfo.manufacturer} ${carInfo.name}`);
            console.log('車名を自動入力:', `${carInfo.manufacturer} ${carInfo.name}`);
          }
        }).catch((error) => {
          console.error('車名検索エラー:', error);
        });
      }
    }
    
    if (data.year && !year) {
      setYear(data.year.toString());
      handleYearChange(data.year.toString());
    }
    
    if (data.inspectionExpiry && !inspectionExpiry) {
      setInspectionExpiry(data.inspectionExpiry);
    }
    
    if (data.firstRegYm && !firstRegYm) {
      setFirstRegYm(data.firstRegYm);
    }
    
    if (data.chassisNumber && !chassisNumber) {
      setChassisNumber(data.chassisNumber);
    }
    
    if (data.registrationNumber && !registrationNumber) {
      setRegistrationNumber(data.registrationNumber);
    }
    
    setShowQRScanner(false);
    
    // 成功メッセージ
    const hasData = data.modelCode || data.year || data.inspectionExpiry || data.firstRegYm || data.chassisNumber || data.registrationNumber;
    if (hasData) {
      alert('QRコードから情報を読み取りました。必要に応じて内容を確認・修正してください。');
    } else {
      alert('QRコードを読み取りましたが、認識できる情報が見つかりませんでした。手動で入力してください。');
    }
  };

  // 画像アップロード処理
  const handleImageUpload = async (): Promise<string | undefined> => {
    if (!selectedFile) return undefined; // 画像が選択されていない場合はundefined

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // 実際の進捗監視付きアップロード
      const downloadURL = await uploadCarImageWithProgress(
        selectedFile,
        undefined, // carIdは新規作成時は未定義
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
      return undefined; // アップロード失敗時もundefined
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  async function handleAdd() {
    console.log("=== HANDLE ADD FUNCTION CALLED ===");
    console.log("handleAdd called");
    console.log("name:", name);
    console.log("modelCode:", modelCode);
    console.log("year:", year);
    console.log("odoKm:", odoKm);
    
    // 認証状態を確認
    const { auth } = await import("@/lib/firebase");
    console.log("Current user:", auth.currentUser);
    console.log("User ID:", auth.currentUser?.uid);
    
    if (!name) {
      console.log("No name provided");
      return alert("車名を入力してください");
    }
    
    // 車両数チェック: 2台目以降はプレミアム必須
    if (carCount >= 1) {
      const canAdd = checkFeature('multiple_cars', { carCount: carCount }, 'minimal');
      if (!canAdd) {
        console.log("Car limit reached, showing paywall");
        return; // ペイウォールが表示され、ユーザーがアップグレードするまで処理を中断
      }
    }
    
    console.log("Starting to add car...");
    
    try {
      // 画像をアップロード
      const uploadedImagePath = await handleImageUpload();
      
      // undefinedの値を除外してオブジェクトを作成
      const carData: CarInput = {
        name,
        ...(uploadedImagePath && { imagePath: uploadedImagePath }),
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
        carData.inspectionExpiry = toTimestamp(new Date(inspectionExpiry.trim())) || undefined;
      }
      
      if (firstRegYm && firstRegYm.trim()) {
        carData.firstRegYm = firstRegYm.trim();
      }
      
      if (avgKmPerMonth && avgKmPerMonth.trim()) {
        carData.avgKmPerMonth = Number(avgKmPerMonth);
      }
      
      if (chassisNumber && chassisNumber.trim()) {
        carData.chassisNumber = chassisNumber.trim();
      }
      
      if (registrationNumber && registrationNumber.trim()) {
        carData.registrationNumber = registrationNumber.trim();
      }
      
      // modelCodeからbodyTypeとvehicleClassを自動判定
      let detectedBodyType: CarInput['bodyType'] | undefined;
      if (modelCode && modelCode.trim()) {
        const carInfo = await findCarNameByModelCode(modelCode.trim(), year ? Number(year) : undefined);
        if (carInfo) {
          if (carInfo.bodyType) {
            detectedBodyType = carInfo.bodyType;
            carData.bodyType = carInfo.bodyType;
          }
          if (carInfo.vehicleClass) {
            carData.vehicleClass = carInfo.vehicleClass;
          }
        }
      }
      
      // bodyTypeからvehicleClassを自動判定（modelCodeから取得できなかった場合）
      if (!carData.vehicleClass && detectedBodyType) {
        carData.vehicleClass = mapBodyTypeStringToVehicleClass(detectedBodyType);
      }
      
      // 車種クラスが未設定の場合はデフォルト値
      if (!carData.vehicleClass) {
        carData.vehicleClass = 'Cセグメント';
      }
      
      // undefined を null に正規化（Firestore 対策）
      const clean = <T extends object>(o: T): T => {
        return JSON.parse(JSON.stringify(o, (_, v) => v === undefined ? null : v));
      };
      
      const cleanedData = clean(carData);
      console.log("Car data to be added (cleaned):", cleanedData);
      await addCar(cleanedData);
      console.log("Car added successfully");
      
      // 完了トースト（将来的に実装）
      console.log(`✅ ${name} を追加しました`);
      
      setName(""); setModel(""); setYear(""); setOdo(""); setInspectionExpiry(""); setFirstRegYm(""); setAvgKmPerMonth(""); setChassisNumber(""); setRegistrationNumber(""); setSelectedFile(null); setImagePreview(null); setCompressionInfo(null);
      onAdded?.();
    } catch (error) {
      console.error("Error adding car:", error);
      alert("車の追加に失敗しました。もう一度お試しください。");
    }
  }

  return (
    <>
      {/* ペイウォールモーダル */}
      {showPaywall && (
        <PaywallModal
          onClose={closePaywall}
          feature={paywallFeature}
          variant={paywallVariant}
        />
      )}
      
      {/* QRコードスキャナーモーダル */}
      {showQRScanner && (
        <QRCodeScannerModal
          onClose={() => setShowQRScanner(false)}
          onScanSuccess={handleQRScanSuccess}
        />
      )}
      
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50">
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 w-full max-w-2xl h-[95vh] sm:h-[90vh] flex flex-col overflow-hidden">
        {/* アップロード中のオーバーレイ */}
        {isUploading && (
          <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">画像をアップロード中...</p>
            </div>
          </div>
        )}
        
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 sm:p-6 pb-3 sm:pb-4 flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">車を追加</h2>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="text-gray-400 hover:text-gray-600 text-xl sm:text-2xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ×
          </button>
        </div>
        
        {/* ボディ - スクロール可能 */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6">
          <div className="space-y-4 sm:space-y-6">
            {/* 基本情報 */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">基本情報</h3>
                <button
                  type="button"
                  onClick={() => setShowQRScanner(true)}
                  className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-200"
                >
                  <span>📱</span>
                  <span>QRコード読み取り</span>
                </button>
              </div>
              
              {/* 車名 */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  車名 <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full rounded-lg sm:rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 text-gray-900"
                  placeholder="例：シビック Type R"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* 型式・年式 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    型式
                  </label>
                  <input
                    className="w-full rounded-lg sm:rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 text-gray-900"
                    placeholder="例：FL5"
                    value={modelCode}
                    onChange={(e) => setModel(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">QRコードから自動入力可能</p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    年式
                  </label>
                  <input
                    className={`w-full rounded-lg sm:rounded-xl border px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 placeholder:text-gray-400 text-gray-900 ${
                      yearError 
                        ? 'border-red-300 focus:ring-red-100' 
                        : 'border-gray-300 focus:ring-blue-100'
                    }`}
                    placeholder="例：2023"
                    inputMode="numeric"
                    value={year}
                    onChange={(e) => handleYearChange(e.target.value)}
                  />
                  {yearError ? (
                    <p className="text-xs text-red-600 mt-1">{yearError}</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">QRコードから自動入力可能</p>
                  )}
                </div>
              </div>

              {/* 走行距離 */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  走行距離
                </label>
                <div className="relative">
                  <input
                    className="w-full rounded-lg sm:rounded-xl border border-gray-300 px-3 py-2 pr-8 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 text-gray-900"
                    placeholder="例：10000"
                    inputMode="numeric"
                    value={odoKm}
                    onChange={(e) => setOdo(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs sm:text-sm text-gray-500">km</span>
                </div>
              </div>
            </div>
            
            {/* 車両画像 */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">車両画像</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="image-upload"
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex-1 rounded-lg sm:rounded-xl border-2 border-dashed border-gray-300 p-4 sm:p-6 text-center hover:border-gray-400 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="text-gray-400">
                        <svg className="mx-auto h-6 w-6 sm:h-8 sm:w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600">画像を選択</p>
                      <p className="text-xs text-gray-500">JPG, PNG, WebP (最大50MB)</p>
                    </div>
                  </label>
                </div>
                
                {imagePreview && (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="プレビュー"
                      className="w-full h-48 object-cover rounded-xl border border-gray-200"
                    />
                    <button
                      onClick={handleImageDelete}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                      disabled={isUploading}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                
                {compressionInfo && (
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>圧縮前: {compressionInfo.originalSize}</p>
                    <p>圧縮後: {compressionInfo.compressedSize}</p>
                    <p>圧縮率: {compressionInfo.compressionRatio}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 詳細情報 */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">詳細情報 (任意)</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    車検期限
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg sm:rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
                    value={inspectionExpiry}
                    onChange={(e) => setInspectionExpiry(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">QRコードから自動入力可能</p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    初度登録年月
                  </label>
                  <input
                    type="month"
                    className="w-full rounded-lg sm:rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
                    value={firstRegYm}
                    onChange={(e) => setFirstRegYm(e.target.value)}
                    placeholder="例: 2020-03"
                  />
                  <p className="text-xs text-gray-500 mt-1">QRコードから自動入力可能</p>
                </div>
              </div>
              
              {/* 登録番号・車台番号 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    登録番号（ナンバー）
                  </label>
                  <input
                    className="w-full rounded-lg sm:rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 text-gray-900"
                    placeholder="例：品川500 あ1234"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">QRコードから自動入力可能</p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    車台番号
                  </label>
                  <input
                    className="w-full rounded-lg sm:rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 text-gray-900"
                    placeholder="例：ABC1234567890"
                    value={chassisNumber}
                    onChange={(e) => setChassisNumber(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">QRコードから自動入力可能</p>
                </div>
              </div>
              
              {/* 平均月間走行距離 */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  平均月間走行距離
                </label>
                <select
                  className="w-full rounded-lg sm:rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
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
          </div>
        </div>
        
        {/* フッター - 固定 */}
        <div className="flex gap-2 sm:gap-3 p-4 sm:p-6 pt-3 sm:pt-4 border-t border-gray-200 bg-gray-50 rounded-b-xl sm:rounded-b-2xl flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg sm:rounded-xl border border-gray-300 px-3 sm:px-4 py-2 text-sm sm:text-base font-medium hover:bg-gray-50 transition text-gray-900"
          >
            キャンセル
          </button>
          <button
            onClick={() => {
              console.log("=== ADD BUTTON CLICKED ===");
              console.log("Button click event fired");
              handleAdd();
            }}
            disabled={isUploading}
            className="flex-1 rounded-lg sm:rounded-xl bg-blue-600 text-white px-3 sm:px-4 py-2 text-sm sm:text-base font-medium hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? "アップロード中..." : "追加"}
          </button>
        </div>
      </div>
      </div>
    </>
  );
}
