import React, { useState } from 'react';
import { MaintenanceRecord, Car } from '@/types';
import MaintenanceModal from '@/components/modals/MaintenanceModal';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toDate } from '@/lib/dateUtils';

interface MaintenanceHistoryProps {
  maintenanceRecords: MaintenanceRecord[];
  allMaintenanceRecords: MaintenanceRecord[];
  cars: Car[];
  loading: boolean;
  error: string | null;
  onAddRecord: (recordData: any) => Promise<any>;
  onUpdateRecord: (recordId: string, recordData: any) => Promise<void>;
  onDeleteRecord: (recordId: string) => Promise<void>;
  onDeleteMultipleRecords: (recordIds: string[]) => Promise<void>;
  activeCarId?: string;
}

export default function MaintenanceHistory({
  maintenanceRecords,
  allMaintenanceRecords,
  cars,
  loading,
  error,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
  onDeleteMultipleRecords,
  activeCarId,
}: MaintenanceHistoryProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);

  const handleEditRecord = (record: MaintenanceRecord) => {
    setEditingRecord(record);
    setShowEditModal(true);
  };

  const handleSaveRecord = async (recordData: any) => {
    if (editingRecord) {
      await onUpdateRecord(editingRecord.id!, recordData);
      setShowEditModal(false);
      setEditingRecord(null);
    } else {
      await onAddRecord(recordData);
      setShowAddModal(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (confirm('このメンテナンス記録を削除しますか？')) {
      await onDeleteRecord(recordId);
    }
  };

  const handleSelectRecord = (recordId: string) => {
    setSelectedRecords(prev => 
      prev.includes(recordId) 
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedRecords.length === 0) return;
    
    if (confirm(`選択した${selectedRecords.length}件の記録を削除しますか？`)) {
      await onDeleteMultipleRecords(selectedRecords);
      setSelectedRecords([]);
    }
  };

  const getCarName = (carId: string) => {
    const car = cars.find(c => c.id === carId);
    return car?.name || '不明な車両';
  };

  const recordsToShow = activeCarId ? maintenanceRecords : allMaintenanceRecords;

  if (loading) {
    return <LoadingSpinner text="メンテナンス記録を読み込み中..." />;
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
        <h2 className="text-xl font-semibold text-gray-900">
          {activeCarId ? 'メンテナンス履歴' : '全メンテナンス履歴'}
        </h2>
        <div className="flex space-x-3">
          {selectedRecords.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              選択した{selectedRecords.length}件を削除
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            記録を追加
          </button>
        </div>
      </div>

      {recordsToShow.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">メンテナンス記録がありません</h3>
          <p className="text-gray-500 mb-4">最初のメンテナンス記録を追加しましょう</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            記録を追加
          </button>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {recordsToShow.map((record) => (
              <li key={record.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={selectedRecords.includes(record.id!)}
                      onChange={() => handleSelectRecord(record.id!)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    {record.imageUrl && (
                      <div className="flex-shrink-0">
                        <img
                          src={record.imageUrl}
                          alt={record.title}
                          className="w-16 h-16 object-cover rounded border border-gray-200"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">{record.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{toDate(record.date)?.toLocaleDateString('ja-JP')}</span>
                          {record.mileage && (
                            <span>{record.mileage.toLocaleString()} km</span>
                          )}
                          {record.cost && (
                            <span className="font-medium text-gray-900">¥{record.cost.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <span>{getCarName(record.carId)}</span>
                        {record.location && (
                          <span>@ {record.location}</span>
                        )}
                      </div>
                      {record.description && (
                        <p className="mt-2 text-sm text-gray-600">{record.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditRecord(record)}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteRecord(record.id!)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* モーダル */}
      <MaintenanceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveRecord}
        cars={cars}
        title="メンテナンス記録を追加"
      />

      <MaintenanceModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveRecord}
        editingRecord={editingRecord}
        cars={cars}
        title="メンテナンス記録を編集"
      />
    </div>
  );
}
