"use client";

import { useState, useEffect } from "react";
import { addFuelLog, type FuelLogInput } from "@/lib/fuelLogs";
import type { Car } from "@/types";
import type { ModalProps } from "@/types";

interface FuelLogModalProps extends ModalProps {
  car: Car;
  onSuccess?: () => void;
}

export default function FuelLogModal({ isOpen, onClose, car, onSuccess }: FuelLogModalProps) {
  const [formData, setFormData] = useState({
    odoKm: (car.odoKm || 0).toString(),
    fuelAmount: "",
    cost: "",
    isFullTank: true,
    memo: "",
    date: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM形式
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // モーダルが開かれた時に車両の現在の走行距離を設定
  useEffect(() => {
    if (isOpen && car.odoKm) {
      setFormData(prev => ({
        ...prev,
        odoKm: (car.odoKm || 0).toString(),
      }));
    }
  }, [isOpen, car.odoKm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const fuelLogData: FuelLogInput = {
        carId: car.id!,
        odoKm: parseInt(formData.odoKm) || 0,
        fuelAmount: parseFloat(formData.fuelAmount) || 0,
        cost: parseInt(formData.cost) || 0,
        isFullTank: formData.isFullTank,
        memo: formData.memo.trim() || undefined,
        date: new Date(formData.date),
      };

      await addFuelLog(fuelLogData);
      
      // 成功時の処理
      onSuccess?.();
      onClose();
      
      // フォームをリセット
      setFormData({
        odoKm: (car.odoKm || 0).toString(),
        fuelAmount: "",
        cost: "",
        isFullTank: true,
        memo: "",
        date: new Date().toISOString().slice(0, 16),
      });
    } catch (err) {
      console.error("給油ログの追加に失敗しました:", err);
      setError("給油ログの追加に失敗しました。もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    console.log(`Input change: ${field} = ${value}`);
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">給油を追加</h2>
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

            {/* 走行距離 */}
            <div>
              <label htmlFor="odoKm" className="block text-sm font-medium text-gray-700 mb-1">
                走行距離 (ODO) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="odoKm"
                value={formData.odoKm}
                onChange={(e) => handleInputChange("odoKm", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="例: 50000"
                required
                min="0"
              />
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
                {isSubmitting ? "追加中..." : "追加"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
