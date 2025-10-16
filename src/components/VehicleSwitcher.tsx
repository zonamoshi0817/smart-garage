import React, { useState } from 'react';
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
  
  const activeCar = cars.find(car => car.id === activeCarId);
  
  if (cars.length <= 1) {
    return null; // 1台以下の場合は表示しない
  }

  return (
    <div className={`relative ${className}`}>
      {/* メイン表示（常時表示） */}
      <div className="flex items-center space-x-2">
        {/* 車両ピル表示 */}
        <div className="flex space-x-1">
          {cars.slice(0, 3).map((car) => (
            <button
              key={car.id}
              onClick={() => onSelectCar(car.id!)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                car.id === activeCarId
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {car.modelCode || car.name.split(' ')[0]}
            </button>
          ))}
          {cars.length > 3 && (
            <span className="px-2 py-1 text-xs text-gray-500 bg-gray-50 rounded-full">
              +{cars.length - 3}
            </span>
          )}
        </div>
        
        {/* ドロップダウンボタン */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg 
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <>
          {/* オーバーレイ */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* メニュー */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-2">
            <div className="px-4 py-2 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-900">車両を選択</h3>
            </div>
            
            {cars.map((car) => (
              <button
                key={car.id}
                onClick={() => {
                  onSelectCar(car.id!);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  car.id === activeCarId ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  {/* 車両画像 */}
                  {car.imagePath && (
                    <img
                      src={car.imagePath}
                      alt={car.name}
                      className="w-10 h-10 object-cover rounded-lg"
                    />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {car.name}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      {car.modelCode && (
                        <span className="bg-gray-100 px-2 py-0.5 rounded">
                          {car.modelCode}
                        </span>
                      )}
                      {car.year && (
                        <span>{car.year}年式</span>
                      )}
                    </div>
                    {car.odoKm && (
                      <p className="text-xs text-gray-500 mt-1">
                        走行距離: {car.odoKm.toLocaleString()}km
                      </p>
                    )}
                  </div>
                  
                  {/* 選択状態インジケーター */}
                  {car.id === activeCarId && (
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

