import { useState, useEffect } from 'react';
import { 
  addReminder, 
  watchReminders, 
  updateReminder, 
  removeReminder,
  markReminderDone,
  snoozeReminder,
  dismissReminder,
  suggestReminders,
  checkReminderDue,
  getDaysUntilDue,
  getKmUntilDue,
  getReminderPriority,
  generateReminderFromMaintenance,
  extractMaintenanceTypeFromTitle,
  deleteRemindersByMaintenanceRecord,
  generateNextReminderOnComplete,
  type Reminder 
} from '@/lib/reminders';

export function useReminders(carId?: string) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = watchReminders((remindersList) => {
      setReminders(remindersList);
      setLoading(false);
      setError(null);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  const addNewReminder = async (reminderData: any) => {
    try {
      setError(null);
      const reminderId = await addReminder(reminderData);
      return reminderId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'リマインダーの追加に失敗しました';
      setError(errorMessage);
      throw err;
    }
  };

  const updateReminderData = async (reminderId: string, reminderData: Partial<Reminder>) => {
    try {
      setError(null);
      await updateReminder(reminderId, reminderData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'リマインダーの更新に失敗しました';
      setError(errorMessage);
      throw err;
    }
  };

  const deleteReminderData = async (reminderId: string) => {
    try {
      setError(null);
      await removeReminder(reminderId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'リマインダーの削除に失敗しました';
      setError(errorMessage);
      throw err;
    }
  };

  const markAsDone = async (reminderId: string) => {
    try {
      setError(null);
      await markReminderDone(reminderId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'リマインダーの完了処理に失敗しました';
      setError(errorMessage);
      throw err;
    }
  };

  const snoozeReminderData = async (reminderId: string, days: number = 7) => {
    try {
      setError(null);
      await snoozeReminder(reminderId, days);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'リマインダーのスヌーズ処理に失敗しました';
      setError(errorMessage);
      throw err;
    }
  };

  const dismissReminderData = async (reminderId: string) => {
    try {
      setError(null);
      await dismissReminder(reminderId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'リマインダーの却下処理に失敗しました';
      setError(errorMessage);
      throw err;
    }
  };

  const getSuggestedReminders = (maintenanceType: string, performedAt: Date, odoKm: number) => {
    return suggestReminders(maintenanceType, performedAt, odoKm);
  };

  const checkDue = (reminder: Reminder) => {
    return checkReminderDue(reminder);
  };

  const getDueInfo = (reminder: Reminder, currentOdoKm?: number) => {
    return {
      daysUntilDue: getDaysUntilDue(reminder),
      kmUntilDue: currentOdoKm ? getKmUntilDue(reminder, currentOdoKm) : null,
      priority: getReminderPriority(reminder),
    };
  };

  const generateFromMaintenance = async (
    carId: string,
    title: string,
    date: Date,
    mileage: number,
    maintenanceRecordId: string
  ) => {
    try {
      setError(null);
      const reminderId = await generateReminderFromMaintenance(
        carId,
        title,
        date,
        mileage,
        maintenanceRecordId
      );
      return reminderId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'メンテナンスからのリマインダー生成に失敗しました';
      setError(errorMessage);
      throw err;
    }
  };

  return {
    reminders,
    loading,
    error,
    addReminder: addNewReminder,
    updateReminder: updateReminderData,
    deleteReminder: deleteReminderData,
    markAsDone,
    snoozeReminder: snoozeReminderData,
    dismissReminder: dismissReminderData,
    getSuggestedReminders,
    checkDue,
    getDueInfo,
    generateFromMaintenance,
  };
}
