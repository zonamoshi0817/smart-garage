import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Car } from '@/types';

interface VehicleSwitcherProps {
  cars: Car[];
  activeCarId?: string;
  onSelectCar: (carId: string) => void;
  className?: string;
}

export default function VehicleSwitcher({ 
  cars, 
  activeCarId, 
  onSelectCar,
  className = ""
}: VehicleSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  const activeCar = cars.find(car => car.id === activeCarId);
  
  // 検索フィルタリング
  const filteredCars = cars.filter(car => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      car.name.toLowerCase().includes(query) ||
      car.modelCode?.toLowerCase().includes(query) ||
      car.year?.toString().includes(query)
    );
  });
  
  // クリックアウトサイドで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // ドロップダウンが開いたら検索入力にフォーカス
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  // ESCキーで閉じる
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);
  
  if (cars.length <= 1) {
    return null; // 1台以下の場合は表示しない
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* メイン表示（常時表示） */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all shadow-sm hover:shadow-md"
      >
        {/* アクティブな車両の表示 */}
        {activeCar && (
          <>
            {activeCar.imagePath ? (
              <img
                src={activeCar.imagePath}
                alt={activeCar.name}
                className="w-8 h-8 object-cover rounded-lg"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
            <div className="text-left min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate max-w-[120px]">
                {activeCar.name}
              </div>
              {activeCar.modelCode && (
                <div className="text-xs text-gray-500">{activeCar.modelCode}</div>
              )}
            </div>
          </>
        )}
        
        {/* ドロップダウンアイコン */}
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden transition-all duration-200 ease-out opacity-100">
          {/* ヘッダー */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">車両を選択</h3>
              <span className="text-xs text-gray-500">{filteredCars.length}台</span>
            </div>
            
            {/* 検索バー */}
            {cars.length > 3 && (
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="車両を検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>
          
          {/* 車両リスト */}
          <div className="max-h-96 overflow-y-auto">
            {filteredCars.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                該当する車両が見つかりません
              </div>
            ) : (
              filteredCars.map((car) => (
                <button
                  key={car.id}
                  onClick={() => {
                    onSelectCar(car.id!);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 ${
                    car.id === activeCarId ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* 車両画像 */}
                    {car.imagePath ? (
                      <img
                        src={car.imagePath}
                        alt={car.name}
                        className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {car.name}
                        </p>
                        {car.id === activeCarId && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            選択中
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {car.modelCode && (
                          <span className="bg-gray-100 px-2 py-0.5 rounded">
                            {car.modelCode}
                          </span>
                        )}
                        {car.year && (
                          <span>{car.year}年式</span>
                        )}
                        {car.odoKm && (
                          <span>• {car.odoKm.toLocaleString()}km</span>
                        )}
                      </div>
                    </div>
                    
                    {/* 選択状態インジケーター */}
                    {car.id === activeCarId && (
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
          
          {/* フッター（車両管理へのリンク） */}
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => {
                router.push('/cars');
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              車両を追加・管理
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

