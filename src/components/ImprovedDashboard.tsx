import React from 'react';
import { Car, MaintenanceRecord, FuelLog } from '@/types';
import UnifiedCTA from './UnifiedCTA';
import RemainingTimeDisplay, { CombinedRemainingDisplay } from './RemainingTimeDisplay';
import HistoryItem, { FuelLogItem } from './HistoryItem';
import InlineUpsell, { LockedFeature } from './InlineUpsell';
import EmptyStateGuide from './EmptyStateGuide';
import { CarCardSkeleton, HistoryItemSkeleton, StatusCardSkeleton } from './SkeletonLoaders';
import { toMillis, toDate } from '@/lib/dateUtils';

interface ImprovedDashboardProps {
  // データ
  cars: Car[];
  activeCarId?: string;
  maintenanceRecords: any[]; // 型の不整合を回避
  fuelLogs: FuelLog[];
  
  // ローディング状態
  carsLoading: boolean;
  maintenanceLoading: boolean;
  fuelLoading: boolean;
  
  // アクション
  onSelectCar: (carId: string) => void;
  onAddMaintenance: () => void;
  onAddFuel: () => void;
  onEditMaintenance: (record: any) => void;
  onEditFuel: (fuelLog: FuelLog) => void;
  onUpgrade: () => void;
  
  // 設定
  isPremium: boolean;
}

export default function ImprovedDashboard({
  cars,
  activeCarId,
  maintenanceRecords,
  fuelLogs,
  carsLoading,
  maintenanceLoading,
  fuelLoading,
  onSelectCar,
  onAddMaintenance,
  onAddFuel,
  onEditMaintenance,
  onEditFuel,
  onUpgrade,
  isPremium
}: ImprovedDashboardProps) {
  
  const activeCar = cars.find(car => car.id === activeCarId);
  const recentMaintenance = maintenanceRecords.slice(0, 5);
  const recentFuelLogs = fuelLogs.slice(0, 5);
  
  // 車両が選択されていない場合の処理
  if (!activeCarId && cars.length > 0) {
    onSelectCar(cars[0].id!);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        
        <div className="mt-4 sm:mt-0">
          <UnifiedCTA
            onMaintenance={onAddMaintenance}
            onFuel={onAddFuel}
          />
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="space-y-8">
        
        {/* 車両切り替え */}
        {cars.length > 1 && (
          <div className="mb-6">
            <CarSwitcher
              cars={cars}
              activeCarId={activeCarId}
              onSelectCar={onSelectCar}
            />
          </div>
        )}

        {/* 上段: 車両カード + ステータス */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 車両カード */}
          <div className="lg:col-span-2">
            {carsLoading ? (
              <CarCardSkeleton />
            ) : activeCar ? (
              <VehicleCard car={activeCar} />
            ) : (
              <EmptyStateGuide
                type="maintenance"
                onAction={onAddMaintenance}
              />
            )}
          </div>
          
          {/* ステータスカード */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {carsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <StatusCardSkeleton key={i} />
              ))
            ) : activeCar ? (
              <>
                <StatusCard
                  title="車検期限"
                  value={activeCar.inspectionExpiry ? toMillis(activeCar.inspectionExpiry) : undefined}
                  icon="📋"
                  type="date"
                />
                <StatusCard
                  title="走行距離"
                  value={activeCar.odoKm?.toString()}
                  icon="🛣️"
                  type="km"
                />
                <StatusCard
                  title="直近の総費用"
                  value={calculateRecentCosts(maintenanceRecords, fuelLogs)}
                  icon="💰"
                  type="cost"
                />
              </>
            ) : null}
          </div>
        </div>

        {/* 下段: 最近の履歴 + 給油ログ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 最近の履歴 */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">最近の履歴</h2>
              <button
                onClick={onAddMaintenance}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                すべて見る →
              </button>
            </div>
            
            {maintenanceLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <HistoryItemSkeleton key={i} />
                ))}
              </div>
            ) : recentMaintenance.length > 0 ? (
              <div className="space-y-4">
                {recentMaintenance.map((record) => (
                  <HistoryItem
                    key={record.id}
                    record={record}
                    carName={activeCar?.name}
                    onClick={() => onEditMaintenance(record)}
                    onEdit={() => onEditMaintenance(record)}
                  />
                ))}
              </div>
            ) : (
              <EmptyStateGuide
                type="maintenance"
                onAction={onAddMaintenance}
              />
            )}
          </div>

          {/* 給油ログ */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">給油ログ</h2>
              <button
                onClick={onAddFuel}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                すべて見る →
              </button>
            </div>
            
            {fuelLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <HistoryItemSkeleton key={i} />
                ))}
              </div>
            ) : recentFuelLogs.length > 0 ? (
              <div className="space-y-4">
                {recentFuelLogs.map((fuelLog) => (
                  <FuelLogItem
                    key={fuelLog.id}
                    fuelLog={fuelLog}
                    carName={activeCar?.name}
                    onClick={() => onEditFuel(fuelLog)}
                    onEdit={() => onEditFuel(fuelLog)}
                  />
                ))}
              </div>
            ) : (
              <EmptyStateGuide
                type="fuel"
                onAction={onAddFuel}
              />
            )}
          </div>
        </div>

        {/* プレミアムアップセル */}
        {!isPremium && (
          <div className="mt-8">
            <InlineUpsell
              type="photo"
              onUpgrade={onUpgrade}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// 車両カードコンポーネント
function VehicleCard({ car }: { car: Car }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 mb-1">
            {car.name}
          </h3>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            {car.modelCode && (
              <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                {car.modelCode}
              </span>
            )}
            {car.year && (
              <span>{car.year}年式</span>
            )}
          </div>
        </div>
        
        {/* 車両写真 */}
        {car.imagePath && (
          <img
            src={car.imagePath}
            alt={car.name}
            className="w-20 h-20 object-cover rounded-lg"
          />
        )}
      </div>
      
      {/* 車両情報 */}
      <div className="space-y-2 text-sm text-gray-600">
        {car.odoKm && (
          <div className="flex justify-between">
            <span>走行距離:</span>
            <span>{car.odoKm.toLocaleString()} km</span>
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
  );
}

// ステータスカードコンポーネント
function StatusCard({ 
  title, 
  value, 
  icon, 
  type 
}: { 
  title: string; 
  value?: string | number; 
  icon: string; 
  type: 'date' | 'km' | 'cost';
}) {
  const formatValue = () => {
    if (!value) return '未設定';
    
    switch (type) {
      case 'date':
        return (
          <RemainingTimeDisplay
            targetDate={value.toString()}
            showDate={true}
            variant="compact"
          />
        );
      case 'km':
        return (
          <span className="text-lg font-semibold text-gray-900">
            {Number(value).toLocaleString()} km
          </span>
        );
      case 'cost':
        return (
          <span className="text-lg font-semibold text-gray-900">
            ¥{Number(value).toLocaleString()}
          </span>
        );
      default:
        return value.toString();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-600">{title}</h4>
        <span className="text-lg">{icon}</span>
      </div>
      
      {formatValue()}
    </div>
  );
}

// 車両切り替えコンポーネント
function CarSwitcher({ 
  cars, 
  activeCarId, 
  onSelectCar 
}: { 
  cars: Car[]; 
  activeCarId?: string; 
  onSelectCar: (carId: string) => void; 
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center space-x-4 overflow-x-auto">
        {cars.map((car) => (
          <button
            key={car.id}
            onClick={() => onSelectCar(car.id!)}
            className={`flex-shrink-0 flex items-center space-x-3 p-3 rounded-lg transition-all ${
              car.id === activeCarId
                ? 'bg-blue-50 border-2 border-blue-200'
                : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
            }`}
          >
            {/* 車両画像 */}
            {car.imagePath && (
              <img
                src={car.imagePath}
                alt={car.name}
                className="w-12 h-12 object-cover rounded-lg"
              />
            )}
            
            {/* 車両情報 */}
            <div className="text-left">
              <p className={`text-sm font-medium ${
                car.id === activeCarId ? 'text-blue-900' : 'text-gray-900'
              }`}>
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
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ヘルパー関数
function calculateRecentCosts(maintenance: MaintenanceRecord[], fuel: FuelLog[]): number {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentMaintenance = maintenance.filter(record => {
    const date = toDate(record.date);
    return date && date >= thirtyDaysAgo && record.cost;
  });
  
  const recentFuel = fuel.filter(log => {
    const date = toDate(log.date);
    return date && date >= thirtyDaysAgo && log.cost;
  });
  
  const maintenanceCost = recentMaintenance.reduce((sum, record) => sum + (record.cost || 0), 0);
  const fuelCost = recentFuel.reduce((sum, log) => sum + (log.cost || 0), 0);
  
  return maintenanceCost + fuelCost;
}
