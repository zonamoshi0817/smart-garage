/**
 * Timestamp or Date を安全に Date に変換するヘルパー関数
 */
import { Timestamp } from 'firebase/firestore';

export function toDate(value: Timestamp | Date | undefined | null): Date | null {
  if (!value) return null;
  
  // Timestamp オブジェクトの場合
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  
  // Date オブジェクトの場合
  if (value instanceof Date) {
    return value;
  }
  
  return null;
}

/**
 * Timestamp or Date から時刻（ミリ秒）を取得
 */
export function toMillis(value: Timestamp | Date | undefined | null): number {
  const date = toDate(value);
  return date ? date.getTime() : 0;
}

/**
 * 2つの日付の差（日数）を計算
 */
export function daysBetween(date1: Timestamp | Date, date2: Timestamp | Date): number {
  const millis1 = toMillis(date1);
  const millis2 = toMillis(date2);
  return Math.floor((millis1 - millis2) / (1000 * 60 * 60 * 24));
}

/**
 * 今日からの日数を計算
 */
export function daysFromNow(date: Timestamp | Date | undefined | null): number | null {
  if (!date) return null;
  const dateObj = toDate(date);
  if (!dateObj) return null;
  return Math.ceil((dateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

/**
 * Date を Timestamp に変換
 */
export function toTimestamp(date: Date | Timestamp | undefined | null): Timestamp | null {
  if (!date) return null;
  
  // すでに Timestamp の場合
  if (typeof date === 'object' && 'toDate' in date) {
    return date as Timestamp;
  }
  
  // Date の場合
  if (date instanceof Date) {
    return Timestamp.fromDate(date);
  }
  
  return null;
}

