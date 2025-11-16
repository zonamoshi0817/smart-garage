/**
 * 型変換の唯一の経路（Single Source of Truth）
 * 
 * このファイルの関数を全CRUD操作で必ず使用すること。
 * 直接Date/Timestampの変換を行わないこと。
 */

import { Timestamp } from 'firebase/firestore';
import type { FuelLog, FuelType, EnergyUnit } from '@/types';

// ========================================
// Timestamp統一変換
// ========================================

/**
 * あらゆる日付形式をTimestampに統一する唯一の経路
 * 
 * @param input - Date | string | Timestamp | null | undefined
 * @returns Timestamp | null
 * 
 * 使用例:
 * ```typescript
 * const cleanData = {
 *   ...data,
 *   date: toTimestamp(data.date),
 *   createdAt: toTimestamp(data.createdAt),
 * };
 * ```
 */
export function toTimestamp(input: Date | string | Timestamp | null | undefined): Timestamp | null {
  if (!input) return null;
  
  // すでに Timestamp の場合
  if (typeof input === 'object' && 'toDate' in input && typeof input.toDate === 'function') {
    return input as Timestamp;
  }
  
  // Date の場合
  if (input instanceof Date) {
    return Timestamp.fromDate(input);
  }
  
  // string の場合（ISO文字列など）
  if (typeof input === 'string') {
    try {
      const date = new Date(input);
      if (!isNaN(date.getTime())) {
        return Timestamp.fromDate(date);
      }
    } catch (e) {
      console.error('Invalid date string:', input, e);
    }
  }
  
  return null;
}

/**
 * Timestamp を Date に変換（表示用のみ）
 * 
 * ⚠️ この関数は表示用途のみに使用すること
 * ⚠️ DB保存時は toTimestamp() を使用すること
 */
export function timestampToDate(value: Timestamp | null | undefined): Date | null {
  if (!value) return null;
  
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  
  return null;
}

// ========================================
// FuelLog物理量統一変換
// ========================================

/**
 * L → ml 変換（DB保存用）
 */
export function litersToMilliliters(liters: number): number {
  return Math.round(liters * 1000);
}

/**
 * ml → L 変換（表示用）
 */
export function millilitersToLiters(ml: number): number {
  return Math.round(ml / 1000 * 10) / 10;  // 小数点第1位
}

/**
 * kWh → Wh 変換（DB保存用）
 */
export function kilowatthoursToWatthours(kWh: number): number {
  return Math.round(kWh * 1000);
}

/**
 * Wh → kWh 変換（表示用）
 */
export function watthoursToKilowatthours(wh: number): number {
  return Math.round(wh / 1000 * 10) / 10;  // 小数点第1位
}

/**
 * 表示用の単位付き量を取得（L or kWh）
 * 
 * 新形式（quantity/unit）と旧形式（fuelAmount）の両方に対応
 */
export function getDisplayFuelAmount(log: FuelLog): { value: number; unit: string } {
  // 新形式優先
  if (log.quantity !== undefined && log.unit) {
    if (log.unit === 'ml') {
      return { value: millilitersToLiters(log.quantity), unit: 'L' };
    } else if (log.unit === 'wh') {
      return { value: watthoursToKilowatthours(log.quantity), unit: 'kWh' };
    }
  }
  
  // 旧形式（後方互換性）
  if (log.fuelAmount !== undefined) {
    const isEv = log.fuelType === 'ev';
    return { value: log.fuelAmount, unit: isEv ? 'kWh' : 'L' };
  }
  
  return { value: 0, unit: 'L' };
}

/**
 * 表示用の費用を取得
 * 
 * 新形式（totalCostJpy）と旧形式（cost）の両方に対応
 */
export function getDisplayFuelCost(log: FuelLog): number {
  return log.totalCostJpy ?? log.cost ?? 0;
}

/**
 * FuelLog入力データを正規化（新形式に統一）
 * 
 * DB保存前に必ず呼び出すこと
 * 
 * @param input - フォームからの入力データ
 * @returns 正規化されたデータ（quantity/unit/totalCostJpy形式）
 * 
 * 使用例:
 * ```typescript
 * const normalizedData = normalizeFuelLogInput({
 *   fuelAmount: 40.5,  // L単位
 *   cost: 6500,
 *   fuelType: 'regular',
 *   // ... 他のフィールド
 * });
 * 
 * // normalizedData:
 * // { quantity: 40500, unit: 'ml', totalCostJpy: 6500, ... }
 * ```
 */
export function normalizeFuelLogInput(input: any): {
  quantity: number;
  unit: EnergyUnit;
  totalCostJpy: number;
  pricePerUnit?: number;
} {
  // 既に新形式の場合
  if (input.quantity !== undefined && input.unit !== undefined) {
    return {
      quantity: input.quantity,
      unit: input.unit as EnergyUnit,
      totalCostJpy: input.totalCostJpy ?? input.cost ?? 0,
      pricePerUnit: input.pricePerUnit ?? input.pricePerLiter,
    };
  }
  
  // 旧形式からの変換（fuelAmount: L単位 → quantity: ml単位）
  if (input.fuelAmount !== undefined) {
    const isEv = input.fuelType === 'ev';
    
    return {
      quantity: isEv 
        ? kilowatthoursToWatthours(input.fuelAmount)  // kWh → Wh
        : litersToMilliliters(input.fuelAmount),      // L → ml
      unit: isEv ? 'wh' : 'ml',
      totalCostJpy: input.cost ?? 0,
      pricePerUnit: input.pricePerLiter,
    };
  }
  
  throw new Error('Invalid fuel log input: missing quantity or fuelAmount');
}

/**
 * FirestoreからのFuelLogデータを正規化（後方互換性）
 * 
 * 旧形式のデータを新形式に自動変換
 * 
 * @param data - Firestoreから取得した生データ
 * @returns 新形式に変換されたデータ
 */
export function migrateLegacyFuelLog(data: any): any {
  // 既に新形式の場合はそのまま
  if (data.quantity !== undefined && data.unit !== undefined) {
    return {
      ...data,
      // Timestampはそのまま保持（変換しない）
    };
  }
  
  // 旧形式（fuelAmount）を新形式に変換
  if (data.fuelAmount !== undefined) {
    const isEv = data.fuelType === 'ev';
    
    return {
      ...data,
      quantity: isEv 
        ? kilowatthoursToWatthours(data.fuelAmount)
        : litersToMilliliters(data.fuelAmount),
      unit: isEv ? 'wh' : 'ml',
      totalCostJpy: data.cost,
      pricePerUnit: data.pricePerLiter,
      // 後方互換用に旧フィールドも保持
      fuelAmount: data.fuelAmount,
      cost: data.cost,
      pricePerLiter: data.pricePerLiter,
      // Timestampはそのまま保持
    };
  }
  
  return data;
}

/**
 * 給油量をL単位で取得（燃費計算用）
 * 
 * EVの場合はnullを返す（燃費計算不可）
 */
export function getFuelAmountInLiters(log: FuelLog): number | null {
  // 新形式
  if (log.quantity !== undefined && log.unit) {
    if (log.unit === 'ml') {
      return millilitersToLiters(log.quantity);
    } else if (log.unit === 'wh') {
      // EVの場合は燃費計算不可
      return null;
    }
  }
  
  // 旧形式（後方互換性）
  if (log.fuelAmount !== undefined) {
    const isEv = log.fuelType === 'ev';
    return isEv ? null : log.fuelAmount;
  }
  
  return null;
}

// ========================================
// deletedAt統一ヘルパー
// ========================================

/**
 * deletedAtの統一フォーマット
 * 
 * クエリ最適化のため、未削除は必ずnullで統一
 */
export function normalizeDeletedAt(value: Timestamp | null | undefined): Timestamp | null {
  return value ?? null;
}

// ========================================
// エクスポート型定義
// ========================================

export type {
  Timestamp
} from 'firebase/firestore';


