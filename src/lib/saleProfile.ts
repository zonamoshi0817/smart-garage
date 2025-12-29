/**
 * 売却用公開ページのデータ取得とViewModel生成
 */

import { getAdminFirestore } from "@/lib/firebaseAdmin";
import type { Car, MaintenanceRecord, SaleProfile, Evidence } from "@/types";
import { Timestamp } from "firebase-admin/firestore";

/**
 * 公開ページ用のViewModel
 */
export interface SalePublicViewModel {
  vehicle: {
    name: string;
    year?: number;
    odoKm?: number;
    inspectionExpiry?: string; // ISO string形式（JSONシリアライズ可能）
    modelCode?: string;
  };
  recent12MonthsSummary: {
    date: string; // ISO string形式（JSONシリアライズ可能）
    category?: string;
    title: string;
    mileageKm?: number;
    amountYen?: number;
    isPreventive?: boolean;
  }[];
  consumables: {
    type: 'oil' | 'tire' | 'brake' | 'battery' | 'coolant';
    lastReplacedDate?: string; // ISO string形式（JSONシリアライズ可能）
    lastReplacedMileageKm?: number;
  }[];
  preventiveMaintenance: {
    date: string; // ISO string形式（JSONシリアライズ可能）
    title: string;
    mileageKm?: number;
    category?: string;
  }[];
  evidences: {
    id: string;
    storagePath: string;
    maskedStoragePath: string;
  }[];
  saleProfile: {
    slug: string;
    includeAmounts: boolean;
    highlightTopN: number;
  };
  unclassifiedCount: number; // 未分類レコード数（直近12ヶ月）
}

/**
 * slugからSaleProfileを取得
 */
export async function getSaleProfileBySlug(slug: string): Promise<SaleProfile | null> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection('saleProfiles')
    .where('slug', '==', slug)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();
  
  return {
    id: doc.id,
    ...data,
    deletedAt: data.deletedAt || null,
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
  } as SaleProfile;
}

/**
 * 車両情報を取得（users/{userId}/cars/{carId}）
 * サーバーサイド用（Firebase Admin SDK）
 */
export async function getVehicleByCarId(userId: string, carId: string): Promise<Car | null> {
  const db = getAdminFirestore();
  const carDoc = await db.collection('users').doc(userId).collection('cars').doc(carId).get();
  
  if (!carDoc.exists) {
    return null;
  }

  const data = carDoc.data()!;
  return {
    id: carDoc.id,
    ...data,
    deletedAt: data.deletedAt || null,
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
  } as Car;
}

/**
 * メンテナンス記録を取得（直近12ヶ月 + 全期間で消耗品抽出用）
 */
export async function getMaintenanceRecords(
  userId: string, 
  carId: string,
  includeAllForConsumables: boolean = false
): Promise<MaintenanceRecord[]> {
  const db = getAdminFirestore();
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);
  
  let query = db
    .collection('users')
    .doc(userId)
    .collection('maintenance')
    .where('carId', '==', carId)
    .where('deletedAt', '==', null);

  if (!includeAllForConsumables) {
    // 直近12ヶ月のみ
    query = query.where('date', '>=', Timestamp.fromDate(twelveMonthsAgo)) as any;
  }

  const snapshot = await query.orderBy('date', 'desc').get();
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      deletedAt: data.deletedAt || null,
      createdAt: data.createdAt as Timestamp,
      updatedAt: data.updatedAt as Timestamp,
      date: data.date as Timestamp,
    } as MaintenanceRecord;
  });
}

/**
 * 証跡を取得（maskedのみ）
 */
export async function getEvidences(vehicleId: string): Promise<Evidence[]> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection('evidences')
    .where('vehicleId', '==', vehicleId)
    .where('maskStatus', '==', 'masked')
    .where('deletedAt', '==', null)
    .get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      deletedAt: data.deletedAt || null,
      createdAt: data.createdAt as Timestamp,
      updatedAt: data.updatedAt as Timestamp,
    } as Evidence;
  });
}

/**
 * 直近12ヶ月サマリーを生成
 */
function generateRecent12MonthsSummary(
  records: MaintenanceRecord[],
  includeAmounts: boolean,
  highlightTopN: number
): SalePublicViewModel['recent12MonthsSummary'] {
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);
  
  // 直近12ヶ月の記録をフィルタ
  const recentRecords = records.filter(record => {
    const recordDate = record.date?.toDate?.() || (record.date as any) instanceof Date 
      ? (record.date as any) 
      : new Date(record.date as any);
    return recordDate >= twelveMonthsAgo;
  });

  // 優先順位でソート
  // 1. typeTag: receipt_backed > owner_log
  // 2. isPreventive: true > false
  // 3. 主要カテゴリ（oil, tire, brake, battery, coolant）
  const priorityScore = (record: MaintenanceRecord): number => {
    let score = 0;
    
    // typeTag優先度
    if (record.typeTag === 'receipt_backed') score += 100;
    else if (record.typeTag === 'owner_log') score += 50;
    
    // 予防整備優先度
    if (record.isPreventive === true) score += 30;
    
    // 主要カテゴリ優先度
    const majorCategories = ['oil', 'tire', 'brake', 'battery', 'coolant'];
    if (record.category && majorCategories.includes(record.category)) {
      score += 20;
    }
    
    return score;
  };

  const sorted = recentRecords
    .map(record => ({
      record,
      score: priorityScore(record),
      date: record.date?.toDate?.() || (record.date as any) instanceof Date 
        ? (record.date as any) 
        : new Date(record.date as any),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, highlightTopN)
    .sort((a, b) => b.date.getTime() - a.date.getTime()); // 日付降順

  return sorted.map(item => ({
    date: item.date.toISOString(), // DateをISO stringに変換
    category: item.record.category,
    title: item.record.title,
    mileageKm: item.record.mileage,
    amountYen: includeAmounts ? item.record.cost : undefined,
    isPreventive: item.record.isPreventive,
  }));
}

/**
 * 消耗品交換一覧を生成
 */
function generateConsumablesTable(
  records: MaintenanceRecord[]
): SalePublicViewModel['consumables'] {
  const consumables: { [key: string]: { date?: Date; mileage?: number } } = {};
  const categories = ['oil', 'tire', 'brake', 'battery', 'coolant'] as const;

  // 初期化
  categories.forEach(cat => {
    consumables[cat] = {};
  });

  // 記録を日付降順でソート（categoryがあるもののみ）
  const sortedRecords = records
    .filter(record => record.category && categories.includes(record.category as typeof categories[number]))
    .sort((a, b) => {
      const dateA = a.date?.toDate?.() || (a.date as any) instanceof Date 
        ? (a.date as any) 
        : new Date(a.date as any);
      const dateB = b.date?.toDate?.() || (b.date as any) instanceof Date 
        ? (b.date as any) 
        : new Date(b.date as any);
      return dateB.getTime() - dateA.getTime();
    });

  // 各カテゴリの最新記録を抽出
  sortedRecords.forEach(record => {
    const category = record.category as typeof categories[number];
    if (category && categories.includes(category)) {
      if (!consumables[category].date) {
        const recordDate = record.date?.toDate?.() || (record.date as any) instanceof Date 
          ? (record.date as any) 
          : new Date(record.date as any);
        consumables[category] = {
          date: recordDate,
          mileage: record.mileage,
        };
      }
    }
  });

  return categories.map(type => {
    const date = consumables[type].date;
    // Dateオブジェクトかどうかを確認してからISO文字列に変換
    const isoDate = date instanceof Date ? date.toISOString() : undefined;
    return {
      type,
      lastReplacedDate: isoDate,
      lastReplacedMileageKm: consumables[type].mileage,
    };
  });
}

/**
 * 予防整備一覧を生成
 */
function generatePreventiveMaintenance(
  records: MaintenanceRecord[]
): SalePublicViewModel['preventiveMaintenance'] {
  const preventiveRecords = records
    .filter(record => record.isPreventive === true)
    .map(record => {
      const date = record.date?.toDate?.() || (record.date as any) instanceof Date 
        ? (record.date as any) 
        : new Date(record.date as any);
      return {
        date: date.toISOString(), // DateをISO stringに変換
        title: record.title,
        mileageKm: record.mileage,
        category: record.category,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return preventiveRecords;
}

/**
 * ViewModelを生成
 */
export async function generateSalePublicViewModel(
  saleProfile: SaleProfile
): Promise<SalePublicViewModel | null> {
  // 車両情報を取得
  const vehicle = await getVehicleByCarId(saleProfile.ownerUid, saleProfile.vehicleId);
  if (!vehicle) {
    return null;
  }

  // メンテナンス記録を取得（全期間で消耗品抽出）
  const allRecords = await getMaintenanceRecords(saleProfile.ownerUid, saleProfile.vehicleId, true);
  
  // 実データを使用（推測ロジックを削除）
  // category, isPreventive, typeTagはMaintenanceRecordに統合済み

  // 未分類レコード数をカウント（直近12ヶ月）
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);
  const unclassifiedCount = allRecords.filter(record => {
    const recordDate = record.date?.toDate?.() || (record.date as any) instanceof Date 
      ? (record.date as any) 
      : new Date(record.date as any);
    const isRecent = recordDate >= twelveMonthsAgo;
    const isUnclassified = !record.category;
    return isRecent && isUnclassified;
  }).length;

  // 直近12ヶ月サマリー
  // 未分類（categoryがない）レコードは除外
  const classifiedRecords = allRecords.filter(record => record.category);
  const recent12MonthsSummary = generateRecent12MonthsSummary(
    classifiedRecords,
    saleProfile.includeAmounts,
    saleProfile.highlightTopN
  );

  // 消耗品交換一覧（分類済みレコードのみ）
  const consumables = generateConsumablesTable(classifiedRecords);

  // 予防整備一覧（分類済みレコードのみ）
  const preventiveMaintenance = generatePreventiveMaintenance(classifiedRecords);

  // 証跡（includeEvidenceがtrueの場合のみ）
  let evidences: SalePublicViewModel['evidences'] = [];
  if (saleProfile.includeEvidence) {
    const evidenceList = await getEvidences(saleProfile.vehicleId);
    evidences = evidenceList
      .filter(e => e.maskedStoragePath)
      .map(e => ({
        id: e.id!,
        storagePath: e.storagePath,
        maskedStoragePath: e.maskedStoragePath!,
      }));
  }

  return {
    vehicle: {
      name: vehicle.name,
      year: vehicle.year,
      odoKm: vehicle.odoKm,
      inspectionExpiry: vehicle.inspectionExpiry?.toDate?.()?.toISOString(),
      modelCode: vehicle.modelCode,
    },
    recent12MonthsSummary,
    consumables,
    preventiveMaintenance,
    evidences,
    saleProfile: {
      slug: saleProfile.slug,
      includeAmounts: saleProfile.includeAmounts,
      highlightTopN: saleProfile.highlightTopN,
    },
    unclassifiedCount, // 未分類レコード数（直近12ヶ月）
  };
}

// extractCategoryFromTitle関数を削除（推測ロジックを撤廃）