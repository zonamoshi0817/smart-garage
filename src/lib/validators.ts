import { z } from 'zod';

// ===== 基本スキーマ =====

// 車両スキーマ
export const CarSchema = z.object({
  id: z.string().optional(), // Firestoreで自動生成
  name: z.string().min(1, '車両名は必須です').max(50, '車両名は50文字以内で入力してください'),
  make: z.string().min(1, 'メーカーは必須です').max(30, 'メーカー名は30文字以内で入力してください'),
  model: z.string().min(1, 'モデルは必須です').max(50, 'モデル名は50文字以内で入力してください'),
  year: z.number().int().min(1900, '年式は1900年以降で入力してください').max(new Date().getFullYear() + 1, '年式は未来年を入力できません'),
  odoKm: z.number().int().min(0, '走行距離は0km以上で入力してください').max(999999, '走行距離は999,999km以下で入力してください'),
  inspectionExpiry: z.date().optional(),
  engineCode: z.string().max(20, 'エンジンコードは20文字以内で入力してください').optional(),
  oilSpec: z.object({
    viscosity: z.string().min(1, 'オイル粘度は必須です').max(10, 'オイル粘度は10文字以内で入力してください'),
    api: z.string().min(1, 'API規格は必須です').max(10, 'API規格は10文字以内で入力してください'),
    volumeL: z.number().positive('オイル容量は正の数で入力してください').max(20, 'オイル容量は20L以下で入力してください')
  }).optional(),
  imageUrl: z.string().url('有効なURLを入力してください').optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// メンテナンス記録スキーマ
export const MaintenanceRecordSchema = z.object({
  id: z.string().optional(), // Firestoreで自動生成
  carId: z.string().min(1, '車両IDは必須です'),
  title: z.string().min(1, 'タイトルは必須です').max(100, 'タイトルは100文字以内で入力してください'),
  description: z.string().max(500, '説明は500文字以内で入力してください').optional(),
  cost: z.number().int().min(0, '費用は0円以上で入力してください').max(10000000, '費用は10,000,000円以下で入力してください').optional(),
  mileage: z.number().int().min(0, '走行距離は0km以上で入力してください').max(999999, '走行距離は999,999km以下で入力してください'),
  date: z.date(),
  location: z.string().max(100, '場所は100文字以内で入力してください').optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// リマインダースキーマ
export const ReminderSchema = z.object({
  id: z.string().optional(), // Firestoreで自動生成
  carId: z.string().min(1, '車両IDは必須です'),
  kind: z.enum(['time', 'distance']).refine(val => val !== undefined, { message: 'リマインダーの種類は必須です' }),
  title: z.string().min(1, 'タイトルは必須です').max(100, 'タイトルは100文字以内で入力してください'),
  dueDate: z.date().optional(),
  dueOdoKm: z.number().int().min(0).max(999999).optional(),
  baseEntryRef: z.string().optional(),
  threshold: z.object({
    months: z.number().int().min(1).max(120).optional(),
    km: z.number().int().min(1).max(100000).optional()
  }).default({}),
  status: z.enum(['active', 'done', 'snoozed', 'dismissed']).default('active'),
  notes: z.string().max(500, 'メモは500文字以内で入力してください').optional(),
  type: z.string().max(50).optional(),
  purchaseCandidates: z.array(z.object({
    sku: z.string(),
    title: z.string(),
    store: z.string(),
    url: z.string().url(),
    price: z.number().optional()
  })).optional(),
  reservationUrl: z.string().url().optional(),
  carName: z.string().max(100).optional(),
  lastOilChangeAt: z.date().optional(),
  oilSpec: z.object({
    viscosity: z.string(),
    api: z.string(),
    volumeL: z.number()
  }).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// ===== バリデーション関数 =====

/**
 * オブジェクトからundefinedの値を再帰的に除去
 * Firestoreにundefinedを送信することを防ぐ
 */
export function removeUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item)).filter(item => item !== undefined) as T;
  }
  
  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        const cleanedValue = removeUndefined(value);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
    }
    return cleaned as T;
  }
  
  return obj;
}

/**
 * 車両データのバリデーション
 */
export function validateCar(data: unknown) {
  const result = CarSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`車両データのバリデーションエラー: ${result.error.issues.map(e => e.message).join(', ')}`);
  }
  return removeUndefined(result.data);
}

/**
 * メンテナンス記録のバリデーション
 */
export function validateMaintenanceRecord(data: unknown) {
  const result = MaintenanceRecordSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`メンテナンス記録のバリデーションエラー: ${result.error.issues.map(e => e.message).join(', ')}`);
  }
  return removeUndefined(result.data);
}

/**
 * リマインダーのバリデーション
 */
export function validateReminder(data: unknown) {
  const result = ReminderSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`リマインダーのバリデーションエラー: ${result.error.issues.map(e => e.message).join(', ')}`);
  }
  return removeUndefined(result.data);
}

// ===== ビジネスロジックバリデーション =====

/**
 * メンテナンス記録の走行距離整合性チェック
 * 条件: 過去記録のODO ≤ 現在車両ODO ≤ 新規ODO
 */
export function validateMileageConsistency(
  newMileage: number,
  currentCarMileage: number,
  existingMaintenanceRecords: Array<{ mileage: number; date: Date }>
): { isValid: boolean; error?: string } {
  // 現在の車両走行距離より小さい場合はエラー
  if (newMileage < currentCarMileage) {
    return {
      isValid: false,
      error: `走行距離は現在の車両走行距離（${currentCarMileage.toLocaleString()} km）以上である必要があります`
    };
  }

  // 過去のメンテナンス記録より小さい場合はエラー
  const conflictingRecords = existingMaintenanceRecords.filter(record => record.mileage > newMileage);
  if (conflictingRecords.length > 0) {
    const maxPastMileage = Math.max(...conflictingRecords.map(r => r.mileage));
    return {
      isValid: false,
      error: `走行距離は過去のメンテナンス記録（${maxPastMileage.toLocaleString()} km）以上である必要があります`
    };
  }

  return { isValid: true };
}

/**
 * オイル交換リマインダー生成に必要な車両情報のチェック
 */
export function validateOilReminderRequirements(car: {
  oilSpec?: { viscosity: string; api: string; volumeL: number };
  engineCode?: string;
}): { isValid: boolean; error?: string } {
  if (!car.oilSpec) {
    return {
      isValid: false,
      error: 'オイル交換リマインダーを生成するには、車両のオイル仕様（粘度、API規格、容量）が必要です'
    };
  }

  if (!car.oilSpec.viscosity || !car.oilSpec.api || !car.oilSpec.volumeL) {
    return {
      isValid: false,
      error: 'オイル仕様の粘度、API規格、容量はすべて必須です'
    };
  }

  return { isValid: true };
}

// ===== 型定義のエクスポート =====
export type Car = z.infer<typeof CarSchema>;
export type MaintenanceRecord = z.infer<typeof MaintenanceRecordSchema>;
export type Reminder = z.infer<typeof ReminderSchema>;
