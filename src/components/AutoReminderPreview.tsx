"use client";

import React, { useState, useEffect } from 'react';
import { CarManufacturer, CarModel } from '@/lib/carDatabase';

interface AutoReminderPreviewProps {
  manufacturer: CarManufacturer | null;
  model: CarModel | null;
  year: number | null;
  inspectionExpiry: string;
  onConfirm: (enabledReminders: string[]) => void;
  onClose: () => void;
}

interface ReminderConfig {
  id: string;
  title: string;
  description: string;
  category: 'legal' | 'maintenance' | 'insurance';
  priority: 'high' | 'medium' | 'low';
  enabled: boolean;
}

export default function AutoReminderPreview({
  manufacturer,
  model,
  year,
  inspectionExpiry,
  onConfirm,
  onClose
}: AutoReminderPreviewProps) {
  const [reminders, setReminders] = useState<ReminderConfig[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    generateReminders();
  }, [inspectionExpiry]);

  const generateReminders = () => {
    setIsGenerating(true);
    
    // 車検リマインダー（法定系）
    const shakenReminders: ReminderConfig[] = [
      {
        id: 'shaken_90',
        title: '車検まで90日',
        description: '車検の準備を始めましょう。整備工場の予約を検討してください。',
        category: 'legal',
        priority: 'medium',
        enabled: true
      },
      {
        id: 'shaken_30',
        title: '車検まで30日',
        description: '車検の予約を取ることをお勧めします。',
        category: 'legal',
        priority: 'high',
        enabled: true
      },
      {
        id: 'shaken_7',
        title: '車検まで7日',
        description: '車検が近づいています。急いで予約を取ってください。',
        category: 'legal',
        priority: 'high',
        enabled: true
      },
      {
        id: 'shaken_1',
        title: '車検まで1日',
        description: '車検が明日です！忘れずに受検してください。',
        category: 'legal',
        priority: 'high',
        enabled: true
      }
    ];

    // 自動車税リマインダー（法定系）
    const taxReminders: ReminderConfig[] = [
      {
        id: 'auto_tax_41',
        title: '自動車税納付（41日前）',
        description: '自動車税の納付期限が近づいています。',
        category: 'legal',
        priority: 'medium',
        enabled: true
      },
      {
        id: 'auto_tax_30',
        title: '自動車税納付（30日前）',
        description: '自動車税の納付期限が30日前です。',
        category: 'legal',
        priority: 'high',
        enabled: true
      },
      {
        id: 'auto_tax_21',
        title: '自動車税納付（21日前）',
        description: '自動車税の納付期限が21日前です。',
        category: 'legal',
        priority: 'high',
        enabled: true
      }
    ];

    // メンテナンスリマインダー
    const maintenanceReminders: ReminderConfig[] = [
      {
        id: 'oil_change',
        title: 'エンジンオイル交換',
        description: '6ヶ月または5,000kmごとのオイル交換をお勧めします。',
        category: 'maintenance',
        priority: 'medium',
        enabled: true
      },
      {
        id: 'oil_filter',
        title: 'オイルフィルター交換',
        description: '12ヶ月ごとのオイルフィルター交換をお勧めします。',
        category: 'maintenance',
        priority: 'low',
        enabled: true
      },
      {
        id: 'brake_fluid',
        title: 'ブレーキフルード交換',
        description: '24ヶ月ごとのブレーキフルード交換をお勧めします。',
        category: 'maintenance',
        priority: 'medium',
        enabled: true
      },
      {
        id: 'coolant',
        title: 'クーラント交換',
        description: '24ヶ月ごとのクーラント交換をお勧めします。',
        category: 'maintenance',
        priority: 'low',
        enabled: true
      },
      {
        id: 'tire_check',
        title: 'タイヤ点検',
        description: '12ヶ月ごとのタイヤ点検をお勧めします。',
        category: 'maintenance',
        priority: 'medium',
        enabled: true
      }
    ];

    const allReminders = [...shakenReminders, ...taxReminders, ...maintenanceReminders];
    
    // 車検満了日が設定されている場合のみ車検リマインダーを有効化
    if (!inspectionExpiry) {
      allReminders.forEach(reminder => {
        if (reminder.id.startsWith('shaken_')) {
          reminder.enabled = false;
        }
      });
    }

    setReminders(allReminders);
    setIsGenerating(false);
  };

  const toggleReminder = (id: string) => {
    setReminders(prev => 
      prev.map(reminder => 
        reminder.id === id 
          ? { ...reminder, enabled: !reminder.enabled }
          : reminder
      )
    );
  };

  const toggleCategory = (category: string) => {
    setReminders(prev => 
      prev.map(reminder => 
        reminder.category === category 
          ? { ...reminder, enabled: !reminder.enabled }
          : reminder
      )
    );
  };

  const handleConfirm = () => {
    const enabledReminders = reminders
      .filter(reminder => reminder.enabled)
      .map(reminder => reminder.id);
    onConfirm(enabledReminders);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'legal': return '⚖️';
      case 'maintenance': return '🔧';
      case 'insurance': return '🛡️';
      default: return '📅';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'legal': return '法定・税務';
      case 'maintenance': return 'メンテナンス';
      case 'insurance': return '保険';
      default: return 'その他';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const enabledCount = reminders.filter(r => r.enabled).length;
  const totalCount = reminders.length;

  if (isGenerating) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              自動リマインダーを生成中...
            </h3>
            <p className="text-sm text-gray-600">
              車両情報に基づいて最適なリマインダーを作成しています
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-xl font-bold text-gray-900">自動リマインダー設定</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* スクロール可能なメインコンテンツ */}
        <div className="flex-1 overflow-y-auto px-6">
          {/* 車両情報確認 */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">車両情報</h3>
            <div className="space-y-1 text-sm text-blue-800">
              {manufacturer && <div>メーカー: {manufacturer.name}</div>}
              {model && <div>車種: {model.name}</div>}
              {year && <div>年式: {year}年</div>}
              {inspectionExpiry && <div>車検満了日: {inspectionExpiry}</div>}
            </div>
          </div>

          {/* リマインダー一覧 */}
          <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              自動生成されるリマインダー
            </h3>
            <div className="text-sm text-gray-600">
              {enabledCount}/{totalCount} 件有効
            </div>
          </div>

          {/* カテゴリ別表示 */}
          {['legal', 'maintenance', 'insurance'].map(category => {
            const categoryReminders = reminders.filter(r => r.category === category);
            if (categoryReminders.length === 0) return null;

            const categoryEnabled = categoryReminders.every(r => r.enabled);
            const categoryDisabled = categoryReminders.every(r => !r.enabled);

            return (
              <div key={category} className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <span>{getCategoryIcon(category)}</span>
                    {getCategoryName(category)}
                  </h4>
                  <button
                    onClick={() => toggleCategory(category)}
                    className={`px-3 py-1 text-xs rounded-full ${
                      categoryEnabled 
                        ? 'bg-green-100 text-green-700' 
                        : categoryDisabled
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {categoryEnabled ? '全てON' : categoryDisabled ? '全てOFF' : '一部ON'}
                  </button>
                </div>
                
                <div className="space-y-2">
                  {categoryReminders.map(reminder => (
                    <div
                      key={reminder.id}
                      className={`p-3 rounded-lg border ${
                        reminder.enabled 
                          ? 'bg-white border-green-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <input
                              type="checkbox"
                              checked={reminder.enabled}
                              onChange={() => toggleReminder(reminder.id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="font-medium text-gray-900">
                              {reminder.title}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(reminder.priority)}`}>
                              {reminder.priority === 'high' ? '高' : 
                               reminder.priority === 'medium' ? '中' : '低'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 ml-6">
                            {reminder.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

          {/* 注意事項 */}
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-2">💡 注意事項</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• リマインダーは後からいつでも編集・削除できます</li>
              <li>• 通知は設定した日時にWeb Pushで送信されます</li>
              <li>• 車検満了日が未設定の場合、車検リマインダーは無効になります</li>
              <li>• メンテナンスリマインダーは走行距離に応じて自動調整されます</li>
            </ul>
          </div>
        </div>

        {/* 固定ボタン */}
        <div className="p-6 pt-0 border-t border-gray-200">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              キャンセル
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              この設定で自動化を開始
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
