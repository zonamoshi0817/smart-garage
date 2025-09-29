import { useState, useEffect } from 'react';
import { 
  addMaintenanceRecord, 
  watchMaintenanceRecords, 
  watchAllMaintenanceRecords,
  updateMaintenanceRecord, 
  deleteMaintenanceRecord,
  deleteMultipleMaintenanceRecords,
  type MaintenanceRecord, 
  type MaintenanceInput 
} from '@/lib/maintenance';

export function useMaintenance(carId?: string) {
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [allMaintenanceRecords, setAllMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (carId) {
      setLoading(true);
      const unsubscribe = watchMaintenanceRecords(carId, (records) => {
        setMaintenanceRecords(records);
        setLoading(false);
        setError(null);
      });
      
      return () => {
        unsubscribe();
      };
    }
  }, [carId]);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = watchAllMaintenanceRecords((records) => {
      setAllMaintenanceRecords(records);
      setLoading(false);
      setError(null);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  const addRecord = async (recordData: MaintenanceInput) => {
    try {
      setError(null);
      const result = await addMaintenanceRecord(recordData);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'メンテナンス記録の追加に失敗しました';
      setError(errorMessage);
      throw err;
    }
  };

  const updateRecord = async (recordId: string, recordData: Partial<MaintenanceInput>) => {
    try {
      setError(null);
      await updateMaintenanceRecord(recordId, recordData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'メンテナンス記録の更新に失敗しました';
      setError(errorMessage);
      throw err;
    }
  };

  const deleteRecord = async (recordId: string) => {
    try {
      setError(null);
      await deleteMaintenanceRecord(recordId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'メンテナンス記録の削除に失敗しました';
      setError(errorMessage);
      throw err;
    }
  };

  const deleteMultipleRecords = async (recordIds: string[]) => {
    try {
      setError(null);
      await deleteMultipleMaintenanceRecords(recordIds);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'メンテナンス記録の一括削除に失敗しました';
      setError(errorMessage);
      throw err;
    }
  };

  return {
    maintenanceRecords,
    allMaintenanceRecords,
    loading,
    error,
    addRecord,
    updateRecord,
    deleteRecord,
    deleteMultipleRecords,
  };
}
