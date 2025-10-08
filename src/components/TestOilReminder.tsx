"use client";

import { useState } from 'react';
import { addReminder } from '@/lib/reminders';
import { useCars } from '@/hooks/useCars';

export default function TestOilReminder() {
  const [selectedCarId, setSelectedCarId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const { cars } = useCars();

  const createTestOilReminder = async () => {
    if (!selectedCarId) {
      alert('車両を選択してください');
      return;
    }

    setIsCreating(true);
    try {
      // 昨日の日付でオイル交換リマインダーを作成
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const reminderData = {
        carId: selectedCarId,
        kind: 'time' as const,
        title: '次回オイル交換',
        dueDate: yesterday,
        dueOdoKm: null,
        baseEntryRef: null,
        threshold: { months: 6, km: 5000 },
        status: 'active' as const,
        notes: 'テスト用オイル交換リマインダー',
        type: 'oil_change' as const,
        lastOilChangeAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addReminder(reminderData);
      alert('テスト用オイル交換リマインダーを作成しました（昨日の日付）');
    } catch (error) {
      console.error('テストリマインダー作成エラー:', error);
      alert('テストリマインダーの作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  const createTestOilMaintenance = async () => {
    if (!selectedCarId) {
      alert('車両を選択してください');
      return;
    }

    setIsCreating(true);
    try {
      // 実際のオイル交換記録を作成して自動リマインダーをテスト
      const { addMaintenanceRecord } = await import('@/lib/maintenance');
      
      const maintenanceData = {
        carId: selectedCarId,
        title: 'オイル交換',
        description: 'テスト用オイル交換記録',
        cost: 5000,
        mileage: 50000,
        date: new Date().toISOString().split('T')[0], // 今日の日付
        location: 'テスト工場',
      };

      const result = await addMaintenanceRecord(maintenanceData);
      console.log('メンテナンス記録作成結果:', result);
      alert('オイル交換記録を作成しました。自動リマインダーが生成されているはずです。');
    } catch (error) {
      console.error('テストメンテナンス記録作成エラー:', error);
      alert('テストメンテナンス記録の作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  if (cars.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
      <h3 className="text-lg font-semibold text-yellow-800 mb-2">
        🧪 テスト用オイルリマインダー
      </h3>
      <p className="text-sm text-yellow-700 mb-3">
        <strong>オイル交換記録作成</strong>：実際のオイル交換記録を作成して自動リマインダー生成をテスト<br/>
        <strong>テストリマインダー作成</strong>：昨日の日付でオイル交換リマインダーを作成して通知システムをテスト
      </p>
      
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <select
            value={selectedCarId}
            onChange={(e) => setSelectedCarId(e.target.value)}
            className="rounded-lg border border-yellow-300 px-3 py-2 text-sm"
          >
            <option value="">車両を選択</option>
            {cars.map((car) => (
              <option key={car.id} value={car.id}>
                {car.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={createTestOilMaintenance}
            disabled={isCreating}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
          >
            {isCreating ? '作成中...' : 'オイル交換記録作成'}
          </button>
          
          <button
            onClick={createTestOilReminder}
            disabled={isCreating}
            className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-700 disabled:opacity-50"
          >
            {isCreating ? '作成中...' : 'テストリマインダー作成'}
          </button>
        </div>
      </div>
    </div>
  );
}
