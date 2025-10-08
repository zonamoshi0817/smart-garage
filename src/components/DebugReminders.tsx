"use client";

import { useState, useEffect } from 'react';
import { watchActiveReminders, getActiveReminders } from '@/lib/reminders';
import type { Reminder } from '@/lib/reminders';

export default function DebugReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadReminders = async () => {
      try {
        const activeReminders = await getActiveReminders();
        setReminders(activeReminders);
        console.log('デバッグ：取得したリマインダー:', activeReminders);
      } catch (error) {
        console.error('デバッグ：リマインダー取得エラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadReminders();

    // リアルタイム監視も開始
    const unsubscribe = watchActiveReminders((newReminders) => {
      setReminders(newReminders);
      console.log('デバッグ：リアルタイム更新されたリマインダー:', newReminders);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">
          🐛 デバッグ：リマインダー情報
        </h3>
        <p className="text-sm text-blue-700">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
      <h3 className="text-lg font-semibold text-blue-800 mb-2">
        🐛 デバッグ：リマインダー情報
      </h3>
      
      <div className="text-sm text-blue-700 mb-3">
        リマインダー数: {reminders.length}
      </div>

      {reminders.length === 0 ? (
        <p className="text-sm text-blue-600">リマインダーがありません</p>
      ) : (
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="bg-white rounded-lg p-3 border">
              <div className="font-medium text-gray-900">{reminder.title}</div>
              <div className="text-sm text-gray-600 mt-1">
                <div>ID: {reminder.id}</div>
                <div>車両ID: {reminder.carId}</div>
                <div>種類: {reminder.kind}</div>
                <div>ステータス: {reminder.status}</div>
                <div>期限日: {reminder.dueDate ? reminder.dueDate.toLocaleDateString('ja-JP') : '未設定'}</div>
                <div>期限日（ISO）: {reminder.dueDate ? reminder.dueDate.toISOString() : 'null'}</div>
                <div>期限走行距離: {reminder.dueOdoKm || '未設定'}</div>
                <div>タイプ: {reminder.type || '未設定'}</div>
                <div>最終オイル交換日: {reminder.lastOilChangeAt ? reminder.lastOilChangeAt.toLocaleDateString('ja-JP') : '未設定'}</div>
                <div>作成日: {reminder.createdAt.toLocaleDateString('ja-JP')}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
