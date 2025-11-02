"use client";

import { useState, useEffect } from "react";
import { addFuelLog, updateFuelLog, getFuelLogs, type FuelLogInput } from "@/lib/fuelLogs";
import { updateCar } from "@/lib/cars";
import type { Car, FuelLog } from "@/types";
import type { ModalProps } from "@/types";
import Tesseract from 'tesseract.js';
import { logOcrUsed, logOcrStarted, logOcrAutofillDone, logFuelCreated } from '@/lib/analytics';
import { usePremiumGuard } from '@/hooks/usePremium';
import PaywallModal from './PaywallModal';

interface FuelLogModalProps extends ModalProps {
  car: Car;
  editingFuelLog?: FuelLog | null;
  onSuccess?: () => void;
}

export default function FuelLogModal({ isOpen, onClose, car, editingFuelLog, onSuccess }: FuelLogModalProps) {
  const { checkFeature, showPaywall, closePaywall, paywallFeature, paywallVariant } = usePremiumGuard();
  const [formData, setFormData] = useState({
    meterType: "odo" as "odo" | "trip",
    odoKm: (car.odoKm || 0).toString(),
    tripKm: "",
    fuelAmount: "",
    cost: "",
    pricePerLiter: "",
    isFullTank: true,
    fuelType: "regular" as "regular" | "premium" | "diesel" | "ev",
    stationName: "",
    memo: "",
    date: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM形式
  });
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [odoWarning, setOdoWarning] = useState<string | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<string | null>(null);

  const isEditing = !!editingFuelLog;

  // ODO距離の検証関数
  const validateOdoDistance = (odoKm: number) => {
    if (fuelLogs.length === 0) return null;
    
    const lastFuelLog = fuelLogs[0]; // 最新の給油ログ
    if (odoKm < lastFuelLog.odoKm) {
      return `警告: 入力された走行距離（${odoKm.toLocaleString()}km）が前回の給油時（${lastFuelLog.odoKm.toLocaleString()}km）より少なくなっています。`;
    }
    return null;
  };

  // 給油ログの履歴を取得
  const loadFuelLogs = async () => {
    if (!car.id) return;
    
    setIsLoadingLogs(true);
    try {
      const logs = await getFuelLogs(car.id);
      setFuelLogs(logs);
    } catch (error) {
      console.error("給油ログの取得に失敗しました:", error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // モーダルが開かれた時にフォームデータを設定
  useEffect(() => {
    if (isOpen) {
      // 警告をリセット
      setOdoWarning(null);
      
      if (editingFuelLog) {
        // 編集モード：既存のデータを設定
        setFormData({
          meterType: "odo",
          odoKm: editingFuelLog.odoKm.toString(),
          tripKm: "",
          fuelAmount: editingFuelLog.fuelAmount.toString(),
          cost: editingFuelLog.cost.toString(),
          pricePerLiter: editingFuelLog.pricePerLiter?.toString() || "",
          isFullTank: editingFuelLog.isFullTank,
          fuelType: (editingFuelLog.fuelType as any) || "regular",
          stationName: editingFuelLog.stationName || "",
          memo: editingFuelLog.memo || "",
          date: editingFuelLog.date.toISOString().slice(0, 16),
        });
      } else {
        // 新規作成モード：給油ログの履歴を取得して推奨メーターを決定
        loadFuelLogs();
        
        // 初回はODO、2回目以降はトリップを推奨
        const isFirstTime = fuelLogs.length === 0;
        const recommendedMeterType = isFirstTime ? "odo" : "trip";
        
        setFormData({
          meterType: recommendedMeterType,
          odoKm: (car.odoKm || 0).toString(),
          tripKm: "",
          fuelAmount: "",
          cost: "",
          pricePerLiter: "",
          isFullTank: true,
          fuelType: "regular",
          stationName: "",
          memo: "",
          date: new Date().toISOString().slice(0, 16),
        });
      }
    }
  }, [isOpen, car.odoKm, editingFuelLog, fuelLogs.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // メーター種別に応じてODO距離を計算
      let finalOdoKm: number;
      if (formData.meterType === "odo") {
        finalOdoKm = parseInt(formData.odoKm) || 0;
      } else {
        // トリップメーターの場合、前回のODO距離にトリップ距離を加算
        const lastFuelLog = fuelLogs[0]; // 最新の給油ログ
        const tripKm = parseInt(formData.tripKm) || 0;
        finalOdoKm = lastFuelLog ? lastFuelLog.odoKm + tripKm : (car.odoKm || 0) + tripKm;
      }

      const fuelLogData: FuelLogInput = {
        carId: car.id!,
        odoKm: finalOdoKm,
        fuelAmount: parseFloat(formData.fuelAmount) || 0,
        cost: parseInt(formData.cost) || 0,
        pricePerLiter: formData.pricePerLiter ? parseFloat(formData.pricePerLiter) : undefined,
        isFullTank: formData.isFullTank,
        fuelType: formData.fuelType as any,
        stationName: formData.stationName.trim() || undefined,
        unit: 'JPY/L',
        memo: formData.memo.trim() || undefined,
        date: new Date(formData.date),
      };

      if (isEditing && editingFuelLog?.id) {
        // 編集モード
        await updateFuelLog(editingFuelLog.id, fuelLogData);
        console.log("給油ログを更新しました");
      } else {
        // 新規作成モード
        await addFuelLog(fuelLogData);
        console.log("給油ログを追加しました");
        
        // 車両データの走行距離を更新（新規作成時のみ）
        if (car.id && finalOdoKm > (car.odoKm || 0)) {
          try {
            await updateCar(car.id, { odoKm: finalOdoKm });
            console.log(`車両の走行距離を更新しました: ${finalOdoKm}km`);
          } catch (error) {
            console.error("車両データの更新に失敗しました:", error);
            // エラーが発生しても給油ログの保存は成功しているので、警告のみ
            console.warn("給油ログは保存されましたが、車両データの更新に失敗しました");
          }
        }
      }
      
      // 成功時の処理
      onSuccess?.();
      onClose();
      
      // フォームをリセット（新規作成時のみ）
      if (!isEditing) {
        setFormData({
          meterType: "trip", // 次回はトリップを推奨
          odoKm: (car.odoKm || 0).toString(),
          tripKm: "",
          fuelAmount: "",
          cost: "",
          pricePerLiter: "",
          isFullTank: true,
          fuelType: "regular",
          stationName: "",
          memo: "",
          date: new Date().toISOString().slice(0, 16),
        });
      }
    } catch (err) {
      console.error("給油ログの保存に失敗しました:", err);
      setError(`給油ログの${isEditing ? '更新' : '追加'}に失敗しました。もう一度お試しください。`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    console.log(`Input change: ${field} = ${value}`);
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value,
      };
      
      // ODO距離の検証
      if (field === "odoKm" && typeof value === "string") {
        const odoKm = parseInt(value) || 0;
        const warning = validateOdoDistance(odoKm);
        setOdoWarning(warning);
      } else if (field === "tripKm" && typeof value === "string") {
        // トリップメーターの場合も検証
        const tripKm = parseInt(value) || 0;
        const lastFuelLog = fuelLogs[0];
        if (lastFuelLog) {
          const calculatedOdo = lastFuelLog.odoKm + tripKm;
          const warning = validateOdoDistance(calculatedOdo);
          setOdoWarning(warning);
        }
      }
      
      return newData;
    });
  };

  // OCR処理：レシート画像から給油データを抽出
  const handleReceiptScan = async (file: File) => {
    setIsOcrProcessing(true);
    setError(null);
    setOcrResult(null);

    // OCRファネル: スキャン開始イベント
    logOcrStarted('fuel', file.size);

    try {
      console.log("Starting OCR processing...");
      
      const { data: { text } } = await Tesseract.recognize(
        file,
        'jpn+eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              console.log(`OCR進捗: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );
      
      console.log("OCR結果:", text);
      setOcrResult(text);
      
      // テキストから給油データを抽出
      const parsedData = parseReceiptText(text);
      
      if (parsedData) {
        const fieldsPopulated: string[] = [];
        
        // ペイウォールチェック: 自動入力成功直前（価値体験後）
        console.log('[FuelLog] OCR success, checking premium feature before autofill');
        const canUse = checkFeature('ocr_scan', undefined, 'minimal');
        console.log('[FuelLog] Can use OCR autofill:', canUse);
        
        if (!canUse) {
          console.log('[FuelLog] Premium required for autofill, showing paywall');
          // OCRは成功したが、自動入力はプレミアム限定
          logOcrUsed('fuel', false); // ペイウォールで中断
          alert('OCRスキャンに成功しました！\n自動入力機能はプレミアムプランでご利用いただけます。');
          return; // ここでペイウォールが表示される（checkFeature内で）
        }
        
        // プレミアムユーザー: フォームに自動入力（給油量は小数点第1位まで）
        if (parsedData.fuelAmount) {
          const roundedFuelAmount = Math.round(parsedData.fuelAmount * 10) / 10;
          handleInputChange('fuelAmount', roundedFuelAmount.toString());
          fieldsPopulated.push('fuelAmount');
        }
        if (parsedData.cost) {
          handleInputChange('cost', parsedData.cost.toString());
          fieldsPopulated.push('cost');
        }
        if (parsedData.pricePerLiter) {
          handleInputChange('pricePerLiter', parsedData.pricePerLiter.toString());
          fieldsPopulated.push('pricePerLiter');
        }
        
        // OCRファネル: 自動入力完了イベント
        logOcrAutofillDone('fuel', fieldsPopulated);
        
        // 既存のアナリティクスイベント
        logOcrUsed('fuel', true);
        
        alert('レシートから給油データを読み取りました！\n内容を確認して必要に応じて修正してください。');
      } else {
        // アナリティクスイベントを記録（失敗）
        logOcrUsed('fuel', false);
        
        alert('レシートから給油データを読み取れませんでした。\n手動で入力してください。');
      }
    } catch (err) {
      console.error('OCR処理エラー:', err);
      
      // アナリティクスイベントを記録（エラー）
      logOcrUsed('fuel', false);
      
      setError('レシートの読み取りに失敗しました。もう一度お試しいただくか、手動で入力してください。');
    } finally {
      setIsOcrProcessing(false);
    }
  };

  // レシートテキストから給油データをパース
  const parseReceiptText = (text: string): { fuelAmount?: number; cost?: number; pricePerLiter?: number } | null => {
    const result: { fuelAmount?: number; cost?: number; pricePerLiter?: number } = {};
    
    // 給油量の抽出 (L, リットル, ℓ など)
    const fuelAmountPatterns = [
      /(\d+\.?\d*)\s*[LℓＬ]/i,
      /(\d+\.?\d*)\s*リットル/i,
      /数量.*?(\d+\.?\d*)/i,
    ];
    
    for (const pattern of fuelAmountPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.fuelAmount = parseFloat(match[1]);
        break;
      }
    }
    
    // 金額の抽出 (円、¥、合計 など)
    const costPatterns = [
      /合計.*?[¥￥]?\s*(\d{1,3}(?:,?\d{3})*)/i,
      /金額.*?[¥￥]?\s*(\d{1,3}(?:,?\d{3})*)/i,
      /[¥￥]\s*(\d{1,3}(?:,?\d{3})*)/,
      /(\d{1,3}(?:,?\d{3})*)\s*円/,
    ];
    
    for (const pattern of costPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.cost = parseInt(match[1].replace(/,/g, ''));
        break;
      }
    }
    
    // L価格の抽出
    const pricePerLiterPatterns = [
      /単価.*?[¥￥]?\s*(\d+\.?\d*)/i,
      /(\d+\.?\d*)\s*円\s*[/／]\s*[LℓＬ]/i,
      /[LℓＬ]\s*[¥￥]?\s*(\d+\.?\d*)/i,
    ];
    
    for (const pattern of pricePerLiterPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.pricePerLiter = parseFloat(match[1]);
        break;
      }
    }
    
    // 金額と給油量から単価を計算（単価が取得できなかった場合）
    if (!result.pricePerLiter && result.cost && result.fuelAmount) {
      result.pricePerLiter = Math.round((result.cost / result.fuelAmount) * 10) / 10;
    }
    
    // 少なくとも1つのデータが取得できた場合のみ返す
    if (result.fuelAmount || result.cost) {
      return result;
    }
    
    return null;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {isEditing ? '給油ログを編集' : '給油を追加'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 車両名表示 */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">車両</p>
              <p className="font-medium text-gray-900">{car.name}</p>
            </div>

            {/* レシートスキャン（新規作成時のみ） */}
            {!isEditing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-900 mb-1">レシートから自動入力 🔒</h4>
                    <p className="text-xs text-blue-700 mb-3">給油レシートの写真から給油量・金額を自動で読み取ります（プレミアム機能）</p>
                    <button
                      type="button"
                      onClick={() => {
                        console.log('[FuelLog] OCR button clicked, opening file picker');
                        // フリーミアムモデル: まず体験させる（ボタンクリック時はチェックしない）
                        document.getElementById('receipt-file-input')?.click();
                      }}
                      disabled={isOcrProcessing}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isOcrProcessing ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          読み取り中...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          レシートを撮影/選択
                        </>
                      )}
                    </button>
                    <input
                      id="receipt-file-input"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleReceiptScan(file);
                        }
                      }}
                      disabled={isOcrProcessing}
                    />
                    {ocrResult && (
                      <div className="mt-2 text-xs text-blue-600">
                        ✓ レシートを読み取りました
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* メーター種別選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                走行距離の入力方法
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="meterType"
                    value="odo"
                    checked={formData.meterType === "odo"}
                    onChange={(e) => handleInputChange("meterType", e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">ODOメーター</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="meterType"
                    value="trip"
                    checked={formData.meterType === "trip"}
                    onChange={(e) => handleInputChange("meterType", e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">トリップメーター</span>
                </label>
              </div>
            </div>

            {/* 走行距離入力 */}
            <div>
              {formData.meterType === "odo" ? (
                <>
                  <label htmlFor="odoKm" className="block text-sm font-medium text-gray-700 mb-1">
                    ODOメーター (km) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="odoKm"
                    value={formData.odoKm}
                    onChange={(e) => handleInputChange("odoKm", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-gray-900 ${
                      odoWarning ? 'border-yellow-400 focus:ring-yellow-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="例: 50000"
                    required
                    min="0"
                  />
                  {odoWarning && (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-yellow-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm text-yellow-800">
                          {odoWarning}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <label htmlFor="tripKm" className="block text-sm font-medium text-gray-700 mb-1">
                    トリップメーター (km) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="tripKm"
                    value={formData.tripKm}
                    onChange={(e) => handleInputChange("tripKm", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-gray-900 ${
                      odoWarning ? 'border-yellow-400 focus:ring-yellow-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="例: 350"
                    required
                    min="0"
                  />
                  {fuelLogs.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      前回のODO: {fuelLogs[0].odoKm.toLocaleString()}km + トリップ = {((fuelLogs[0].odoKm + (parseInt(formData.tripKm) || 0))).toLocaleString()}km
                    </p>
                  )}
                  {odoWarning && (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-yellow-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm text-yellow-800">
                          {odoWarning}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 給油量 */}
            <div>
              <label htmlFor="fuelAmount" className="block text-sm font-medium text-gray-700 mb-1">
                給油量 (L) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="fuelAmount"
                value={formData.fuelAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  // 小数点第1位までに制限
                  if (value && value.includes('.')) {
                    const [integer, decimal] = value.split('.');
                    if (decimal && decimal.length > 1) {
                      e.target.value = `${integer}.${decimal.slice(0, 1)}`;
                      handleInputChange("fuelAmount", e.target.value);
                      return;
                    }
                  }
                  handleInputChange("fuelAmount", value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="例: 45.2"
                required
                min="0"
                step="0.1"
              />
            </div>

            {/* 金額 */}
            <div>
              <label htmlFor="cost" className="block text-sm font-medium text-gray-700 mb-1">
                金額 (¥) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="cost"
                value={formData.cost}
                onChange={(e) => handleInputChange("cost", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="例: 6500"
                required
                min="0"
              />
            </div>

            {/* L価格 */}
            <div>
              <label htmlFor="pricePerLiter" className="block text-sm font-medium text-gray-700 mb-1">
                L価格 (¥/L)
              </label>
              <input
                type="number"
                id="pricePerLiter"
                value={formData.pricePerLiter}
                onChange={(e) => handleInputChange("pricePerLiter", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="例: 143.8"
                min="0"
                step="0.1"
              />
            </div>

            {/* 燃料種別 */}
            <div>
              <label htmlFor="fuelType" className="block text-sm font-medium text-gray-700 mb-1">
                燃料種別
              </label>
              <select
                id="fuelType"
                value={formData.fuelType}
                onChange={(e) => handleInputChange("fuelType", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="regular">レギュラー</option>
                <option value="premium">ハイオク</option>
                <option value="diesel">軽油</option>
                <option value="ev">EV充電</option>
              </select>
            </div>

            {/* スタンド名 */}
            <div>
              <label htmlFor="stationName" className="block text-sm font-medium text-gray-700 mb-1">
                スタンド名
              </label>
              <input
                type="text"
                id="stationName"
                value={formData.stationName}
                onChange={(e) => handleInputChange("stationName", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="例: ENEOS 〇〇店"
              />
            </div>

            {/* 満タンチェック */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isFullTank"
                checked={formData.isFullTank}
                onChange={(e) => handleInputChange("isFullTank", e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isFullTank" className="ml-2 block text-sm text-gray-700">
                満タン
              </label>
            </div>

            {/* 日時 */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                給油日時
              </label>
              <input
                type="datetime-local"
                id="date"
                value={formData.date}
                onChange={(e) => handleInputChange("date", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
              />
            </div>

            {/* メモ */}
            <div>
              <label htmlFor="memo" className="block text-sm font-medium text-gray-700 mb-1">
                メモ
              </label>
              <textarea
                id="memo"
                value={formData.memo}
                onChange={(e) => handleInputChange("memo", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="給油時のメモ（任意）"
                rows={3}
              />
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* ボタン */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled={isSubmitting}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? (isEditing ? "更新中..." : "追加中...") : (isEditing ? "更新" : "追加")}
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
      
      {/* ペイウォールモーダル（最上位に表示） */}
      {showPaywall && (
        <PaywallModal
          onClose={closePaywall}
          feature={paywallFeature}
          variant={paywallVariant}
        />
      )}
    </>
  );
}
