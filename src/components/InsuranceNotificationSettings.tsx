// src/components/InsuranceNotificationSettings.tsx
"use client";

import { useState, useEffect } from 'react';
import { 
  getNotificationSettings, 
  updateNotificationSettings,
  type NotificationSettings 
} from '@/lib/insuranceNotifications';

interface InsuranceNotificationSettingsProps {
  onClose: () => void;
}

export default function InsuranceNotificationSettings({ onClose }: InsuranceNotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await getNotificationSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      await updateNotificationSettings({
        policyExpiryNotifications: settings.policyExpiryNotifications,
      });
      onClose();
    } catch (error) {
      console.error('Error saving notification settings:', error);
      alert('設定の保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const updateDaysBefore = (index: number, value: number) => {
    if (!settings) return;
    
    const newDaysBefore = [...settings.policyExpiryNotifications.daysBefore];
    newDaysBefore[index] = value;
    
    setSettings({
      ...settings,
      policyExpiryNotifications: {
        ...settings.policyExpiryNotifications,
        daysBefore: newDaysBefore,
      },
    });
  };

  const addDayBefore = () => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      policyExpiryNotifications: {
        ...settings.policyExpiryNotifications,
        daysBefore: [...settings.policyExpiryNotifications.daysBefore, 30],
      },
    });
  };

  const removeDayBefore = (index: number) => {
    if (!settings || settings.policyExpiryNotifications.daysBefore.length <= 1) return;
    
    const newDaysBefore = settings.policyExpiryNotifications.daysBefore.filter((_, i) => i !== index);
    
    setSettings({
      ...settings,
      policyExpiryNotifications: {
        ...settings.policyExpiryNotifications,
        daysBefore: newDaysBefore,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-center text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full">
          <p className="text-center text-gray-600">設定の読み込みに失敗しました</p>
          <button
            onClick={onClose}
            className="mt-4 w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition"
          >
            閉じる
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">保険通知設定</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSaving}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* 保険満期通知 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">保険満期通知</h3>
            
            <div className="space-y-4">
              {/* 通知の有効/無効 */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  通知を有効にする
                </label>
                <input
                  type="checkbox"
                  checked={settings.policyExpiryNotifications.enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    policyExpiryNotifications: {
                      ...settings.policyExpiryNotifications,
                      enabled: e.target.checked,
                    },
                  })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              {/* 通知日数設定 */}
              {settings.policyExpiryNotifications.enabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    通知する日数（満期前）
                  </label>
                  <div className="space-y-2">
                    {settings.policyExpiryNotifications.daysBefore.map((days, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="number"
                          value={days}
                          onChange={(e) => updateDaysBefore(index, parseInt(e.target.value) || 0)}
                          min="1"
                          max="365"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                        <span className="text-sm text-gray-600">日前</span>
                        {settings.policyExpiryNotifications.daysBefore.length > 1 && (
                          <button
                            onClick={() => removeDayBefore(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={addDayBefore}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      通知日を追加
                    </button>
                  </div>
                </div>
              )}

              {/* 通知方法 */}
              {settings.policyExpiryNotifications.enabled && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    通知方法
                  </label>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">メール通知</span>
                    <input
                      type="checkbox"
                      checked={settings.policyExpiryNotifications.emailEnabled}
                      onChange={(e) => setSettings({
                        ...settings,
                        policyExpiryNotifications: {
                          ...settings.policyExpiryNotifications,
                          emailEnabled: e.target.checked,
                        },
                      })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">プッシュ通知</span>
                    <input
                      type="checkbox"
                      checked={settings.policyExpiryNotifications.pushEnabled}
                      onChange={(e) => setSettings({
                        ...settings,
                        policyExpiryNotifications: {
                          ...settings.policyExpiryNotifications,
                          pushEnabled: e.target.checked,
                        },
                      })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ボタン */}
        <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            disabled={isSaving}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            disabled={isSaving}
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
