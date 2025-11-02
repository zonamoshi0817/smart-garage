import React, { useState } from 'react';
import { Car } from '@/types';
import CarModal from '@/components/modals/CarModal';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toDate } from '@/lib/dateUtils';

interface CarManagementProps {
  cars: Car[];
  loading: boolean;
  error: string | null;
  onAddCar: (carData: any) => Promise<string>;
  onUpdateCar: (carId: string, carData: any) => Promise<void>;
  onDeleteCar: (carId: string) => Promise<void>;
  onSelectCar: (carId: string) => void;
  activeCarId?: string;
}

export default function CarManagement({
  cars,
  loading,
  error,
  onAddCar,
  onUpdateCar,
  onDeleteCar,
  onSelectCar,
  activeCarId,
}: CarManagementProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);

  const handleEditCar = (car: Car) => {
    setEditingCar(car);
    setShowEditModal(true);
  };

  const handleSaveCar = async (carData: any) => {
    if (editingCar) {
      await onUpdateCar(editingCar.id!, carData);
      setShowEditModal(false);
      setEditingCar(null);
    } else {
      await onAddCar(carData);
      setShowAddModal(false);
    }
  };

  const handleDeleteCar = async (carId: string) => {
    if (confirm('この車両を削除しますか？関連するメンテナンス記録も削除されます。')) {
      await onDeleteCar(carId);
    }
  };

  if (loading) {
    return <LoadingSpinner text="車両データを読み込み中..." />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">車両管理</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          車両を追加
        </button>
      </div>

      {cars.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">車両が登録されていません</h3>
          <p className="text-gray-500 mb-4">最初の車両を追加して始めましょう</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            車両を追加
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cars.map((car) => (
            <div
              key={car.id}
              className={`bg-white rounded-lg border-2 p-6 cursor-pointer transition-all hover:shadow-md ${
                activeCarId === car.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => onSelectCar(car.id!)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{car.name}</h3>
                  {car.modelCode && (
                    <p className="text-sm text-gray-600 mb-2">{car.modelCode}</p>
                  )}
                  {car.year && (
                    <p className="text-sm text-gray-600">{car.year}年式</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditCar(car);
                    }}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCar(car.id!);
                    }}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {car.imagePath && (
                <div className="mb-4">
                  <img
                    src={car.imagePath}
                    alt={car.name}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                </div>
              )}

              <div className="space-y-2 text-sm text-gray-600">
                {car.odoKm && (
                  <div className="flex justify-between">
                    <span>走行距離:</span>
                    <span>{car.odoKm.toLocaleString()} km</span>
                  </div>
                )}
                {car.inspectionExpiry && (
                  <div className="flex justify-between">
                    <span>車検期限:</span>
                    <span>{toDate(car.inspectionExpiry)?.toLocaleDateString('ja-JP')}</span>
                  </div>
                )}
                {car.avgKmPerMonth && (
                  <div className="flex justify-between">
                    <span>月間走行:</span>
                    <span>{car.avgKmPerMonth} km</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* モーダル */}
      <CarModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveCar}
        title="車両を追加"
      />

      <CarModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingCar(null);
        }}
        onSave={handleSaveCar}
        editingCar={editingCar}
        title="車両を編集"
      />
    </div>
  );
}
