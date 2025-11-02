import React, { useState, useEffect } from 'react';
import Modal from '@/components/common/Modal';
import { MaintenanceRecord, MaintenanceInput, Car } from '@/types';
import { toTimestamp, toDate } from '@/lib/dateUtils';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recordData: MaintenanceInput) => Promise<void>;
  editingRecord?: MaintenanceRecord | null;
  cars: Car[];
  title: string;
}

export default function MaintenanceModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingRecord, 
  cars,
  title 
}: MaintenanceModalProps) {
  const [formData, setFormData] = useState<MaintenanceInput>({
    carId: '',
    title: '',
    description: '',
    cost: undefined,
    mileage: 0,
    date: toTimestamp(new Date())!,
    location: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingRecord) {
      setFormData({
        carId: editingRecord.carId || '',
        title: editingRecord.title || '',
        description: editingRecord.description || '',
        cost: editingRecord.cost || undefined,
        mileage: editingRecord.mileage || 0,
        date: editingRecord.date || new Date(),
        location: editingRecord.location || '',
      });
    } else {
      setFormData({
        carId: '',
        title: '',
        description: '',
        cost: undefined,
        mileage: 0,
        date: toTimestamp(new Date())!,
        location: '',
      });
    }
    setError(null);
  }, [editingRecord, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? undefined : (name === 'cost' || name === 'mileage' ? Number(value) : value)
    }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      date: toTimestamp(new Date(e.target.value))!
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 車両選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              車両 *
            </label>
            <select
              name="carId"
              value={formData.carId}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">車両を選択してください</option>
              {cars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.name}
                </option>
              ))}
            </select>
          </div>

          {/* 作業日 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              作業日 *
            </label>
            <input
              type="date"
              value={toDate(formData.date)?.toISOString().split('T')[0] || ''}
              onChange={handleDateChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* タイトル */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              作業内容 *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              placeholder="例: オイル交換、タイヤ交換など"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 走行距離 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              走行距離 (km) *
            </label>
            <input
              type="number"
              name="mileage"
              value={formData.mileage}
              onChange={handleInputChange}
              required
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 費用 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              費用 (円)
            </label>
            <input
              type="number"
              name="cost"
              value={formData.cost || ''}
              onChange={handleInputChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 作業場所 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              作業場所
            </label>
            <input
              type="text"
              name="location"
              value={formData.location || ''}
              onChange={handleInputChange}
              placeholder="例: ガソリンスタンド、ディーラーなど"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 詳細説明 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            詳細説明
          </label>
          <textarea
            name="description"
            value={formData.description || ''}
            onChange={handleInputChange}
            rows={4}
            placeholder="作業の詳細や使用した部品などを記入してください"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* ボタン */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
