"use client";

import { useState, useEffect } from "react";
import { addFuelLog, updateFuelLog, getFuelLogs, type FuelLogInput } from "@/lib/fuelLogs";
import { updateCar } from "@/lib/cars";
import type { Car, FuelLog } from "@/types";
import type { ModalProps } from "@/types";

interface FuelLogModalProps extends ModalProps {
  car: Car;
  editingFuelLog?: FuelLog | null;
  onSuccess?: () => void;
}

export default function FuelLogModal({ isOpen, onClose, car, editingFuelLog, onSuccess }: FuelLogModalProps) {
  const [formData, setFormData] = useState({
    meterType: "odo" as "odo" | "trip",
    odoKm: (car.odoKm || 0).toString(),
    tripKm: "",
    fuelAmount: "",
    cost: "",
    pricePerLiter: "",
    isFullTank: true,
    memo: "",
    date: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM形式
  });
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [odoWarning, setOdoWarning] = useState<string | null>(null);

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

  if (!isOpen) return null;

  return (
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
                onChange={(e) => handleInputChange("fuelAmount", e.target.value)}
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
  );
}
