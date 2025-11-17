// src/lib/carLookup.ts
// 車種データベースから車名を検索する機能
'use client';

import type { CarModel, CarManufacturer } from './carDatabase';
import type { VehicleClass } from '@/types';

// 動的インポート用の遅延読み込み（クライアントサイドのみ）
let carDatabaseCache: CarManufacturer[] | null = null;

async function getCarDatabase(): Promise<CarManufacturer[]> {
  if (carDatabaseCache) {
    return carDatabaseCache;
  }
  
  // クライアントサイドでのみ実行（SSRを回避）
  if (typeof window === 'undefined') {
    // サーバーサイドでは空配列を返す（クライアントサイドで再実行される）
    return [];
  }
  
  try {
    const module = await import('./carDatabase');
    carDatabaseCache = module.carDatabase;
    return carDatabaseCache;
  } catch (error) {
    console.error('Failed to load car database:', error);
    return [];
  }
}

/**
 * modelCodeから車名を検索
 * @param modelCode 型式（例: "FL5", "ZVW30"）
 * @param year 年式（オプション、より正確な検索のため）
 * @returns 車名とメーカー名、見つからない場合はnull
 */
export async function findCarNameByModelCode(
  modelCode: string,
  year?: number
): Promise<{ name: string; manufacturer: string; bodyType?: CarModel['bodyType']; vehicleClass?: VehicleClass } | null> {
  if (!modelCode || modelCode.trim().length === 0) {
    return null;
  }

  const carDatabase = await getCarDatabase();
  const normalizedModelCode = modelCode.trim().toUpperCase();

  // 全メーカーを検索
  for (const manufacturer of carDatabase) {
    for (const model of manufacturer.models) {
      // 型式が完全一致するか、部分一致するか
      if (
        model.modelCode?.toUpperCase() === normalizedModelCode ||
        model.modelCode?.toUpperCase().includes(normalizedModelCode) ||
        normalizedModelCode.includes(model.modelCode?.toUpperCase() || '')
      ) {
        // 年式が指定されている場合、範囲内かチェック
        if (year && model.yearFrom && model.yearTo) {
          if (year >= model.yearFrom && year <= model.yearTo) {
            return {
              name: model.name,
              manufacturer: manufacturer.name,
              bodyType: model.bodyType,
              vehicleClass: mapBodyTypeToVehicleClass(model.bodyType)
            };
          }
        } else {
          // 年式が指定されていない場合、最初に見つかったものを返す
          return {
            name: model.name,
            manufacturer: manufacturer.name,
            bodyType: model.bodyType,
            vehicleClass: mapBodyTypeToVehicleClass(model.bodyType)
          };
        }
      }
    }
  }

  return null;
}

/**
 * bodyTypeからVehicleClassを自動判定
 * @param bodyType 車体形状
 * @returns VehicleClass
 */
export function mapBodyTypeToVehicleClass(
  bodyType?: CarModel['bodyType']
): VehicleClass | undefined {
  if (!bodyType) return undefined;

  const mapping: Record<CarModel['bodyType'], VehicleClass> = {
    'sedan': 'Cセグメント',
    'hatchback': 'コンパクト',
    'suv': 'SUV',
    'wagon': 'Cセグメント',
    'coupe': 'スポーツ',
    'convertible': 'スポーツ',
    'pickup': 'SUV',
    'minivan': 'ミニバン',
    'sports': 'スポーツ',
    'other': 'Cセグメント'
  };

  return mapping[bodyType];
}

/**
 * 車体形状（bodyType）からVehicleClassを判定（直接指定版）
 * @param bodyType 車体形状（英語）
 * @returns VehicleClass
 */
export function mapBodyTypeStringToVehicleClass(
  bodyType?: 'sedan' | 'hatchback' | 'suv' | 'wagon' | 'coupe' | 'convertible' | 'pickup' | 'minivan' | 'sports' | 'other'
): VehicleClass | undefined {
  if (!bodyType) return undefined;

  const mapping: Record<string, VehicleClass> = {
    'sedan': 'Cセグメント',
    'hatchback': 'コンパクト',
    'suv': 'SUV',
    'wagon': 'Cセグメント',
    'coupe': 'スポーツ',
    'convertible': 'スポーツ',
    'pickup': 'SUV',
    'minivan': 'ミニバン',
    'sports': 'スポーツ',
    'other': 'Cセグメント'
  };

  return mapping[bodyType];
}

