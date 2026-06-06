"use client";

import { useEffect, useState, useRef } from "react";
import type { Car } from "@/types";
import type { MaintenanceRecord } from "@/types";
import { useSelectedCar } from "@/contexts/SelectedCarContext";

export function CarHeaderDropdown({
  cars,
  activeCarId,
  onSelectCar,
  onAddCar
}: {
  cars: Car[];
  activeCarId?: string;
  onSelectCar: (id: string) => void;
  onAddCar: () => void;
}) {
  const { setSelectedCarId } = useSelectedCar();
  const [open, setOpen] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const activeCar = cars.find(c => c.id === activeCarId) || cars[0];

  // モバイル判定
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // クリックアウトサイドで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // ESCキーで閉じる
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  const handleImageError = (carId: string) => {
    setImageErrors(prev => new Set(prev).add(carId));
  };

  return (
    <div className="relative flex-shrink-0" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-9 sm:h-10 px-2 sm:px-3 rounded-lg border border-gray-300 bg-white flex items-center gap-1.5 sm:gap-2 shadow-sm hover:bg-gray-50 min-w-0"
      >
        {/* アクティブ車両のサムネイル */}
        {activeCar && (
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200">
            {activeCar.imagePath && !imageErrors.has(activeCar.id!) ? (
              <img
                src={activeCar.imagePath}
                alt={activeCar.name}
                className="w-full h-full object-cover"
                onError={() => handleImageError(activeCar.id!)}
              />
            ) : (
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
        )}
        <span className="truncate max-w-[120px] sm:max-w-[180px] lg:max-w-[200px] text-xs sm:text-sm font-medium text-gray-900">
          {activeCar?.name}
          {activeCar?.modelCode && !isMobile ? ` (${activeCar.modelCode})` : ''}
        </span>
        <svg 
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div 
            className="fixed inset-0 z-30" 
            onClick={() => setOpen(false)}
          />
          <div className="fixed sm:absolute z-40 top-[3.5rem] sm:top-full right-2 sm:right-0 left-2 sm:left-auto mt-0 sm:mt-2 w-[calc(100vw-1rem)] sm:w-80 max-w-[calc(100vw-1rem)] sm:max-w-[320px] bg-white rounded-lg border border-gray-200 shadow-xl">
            {/* ヘッダー */}
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900">車両を選択</h3>
                <span className="text-xs text-gray-500">{cars.length}台</span>
              </div>
            </div>
            
            {/* 車両リスト */}
            <div className="max-h-80 overflow-auto py-1 sm:py-2">
            {cars.map((car) => (
              <button
                key={car.id}
                onClick={() => {
                  const carId = car.id!;
                  setSelectedCarId(carId); // グローバルコンテキストを更新
                  onSelectCar(carId);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 ${
                  car.id === activeCarId ? 'bg-gray-50' : ''
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* 車両画像サムネイル */}
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 bg-gray-50">
                    {car.imagePath && !imageErrors.has(car.id!) ? (
                      <img
                        src={car.imagePath}
                        alt={car.name}
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(car.id!)}
                      />
                    ) : (
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium text-gray-900 truncate">
                        {car.name}
                      </div>
                      {car.id === activeCarId && (
                        <svg className="w-4 h-4 text-gray-900 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {car.modelCode && (
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded">
                          {car.modelCode}
                        </span>
                      )}
                      {car.year && <span>{car.year}年式</span>}
                      {car.odoKm && <span>• {car.odoKm.toLocaleString()}km</span>}
                    </div>
                  </div>
                </div>
              </button>
            ))}
            </div>
            
            {/* フッター */}
            <div className="px-3 sm:px-4 py-2 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => { 
                  setOpen(false); 
                  onAddCar(); 
                }}
                className="w-full text-left px-3 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                車両を追加
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function NotificationsContent({
  cars,
  maintenanceRecords
}: {
  cars: Car[];
  maintenanceRecords: MaintenanceRecord[];
}) {
  // 通知設定の状態
  const [notificationSettings, setNotificationSettings] = useState({
    maintenanceReminders: true,
    inspectionReminders: true,
    mileageAlerts: true,
    emailNotifications: false,
    pushNotifications: true
  });



  // 通知設定の更新
  const updateNotificationSetting = (key: string, value: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 通知のテスト送信
  const testNotification = () => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('garage log', {
          body: 'これはテスト通知です。通知機能が正常に動作しています。',
          icon: '/favicon.ico'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('garage log', {
              body: 'これはテスト通知です。通知機能が正常に動作しています。',
              icon: '/favicon.ico'
            });
          }
        });
      }
    }
  };

  return (
    <>
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">通知設定</h1>
        <button
          onClick={testNotification}
          className="rounded-xl bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-500 transition"
        >
          テスト通知
        </button>
        </div>



      {/* 通知設定 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">通知設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">メンテナンスリマインダー</h4>
              <p className="text-sm text-gray-600">メンテナンス時期の通知</p>
      </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.maintenanceReminders}
                onChange={(e) => updateNotificationSetting('maintenanceReminders', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">車検リマインダー</h4>
              <p className="text-sm text-gray-600">車検期限の通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.inspectionReminders}
                onChange={(e) => updateNotificationSetting('inspectionReminders', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">走行距離アラート</h4>
              <p className="text-sm text-gray-600">走行距離に基づく通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.mileageAlerts}
                onChange={(e) => updateNotificationSetting('mileageAlerts', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">プッシュ通知</h4>
              <p className="text-sm text-gray-600">ブラウザのプッシュ通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.pushNotifications}
                onChange={(e) => updateNotificationSetting('pushNotifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* 通知のヒント */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">通知について</h3>
        <ul className="text-blue-800 space-y-2">
          <li>• ブラウザの通知許可が必要です</li>
          <li>• 車検期限は30日前から通知されます</li>
          <li>• メンテナンスは2,000km前から通知されます</li>
          <li>• 通知設定はブラウザに保存されます</li>
        </ul>
      </div>
    </>
  );
}

