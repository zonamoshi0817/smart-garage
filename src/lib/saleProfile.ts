/**
 * 売却用公開ページのデータ取得とViewModel生成
 */

import { getAdminFirestore } from "@/lib/firebaseAdmin";
import type { Car, MaintenanceRecord, SaleProfile, Evidence, Customization, FuelLog } from "@/types";
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
    recordId?: string; // メンテナンス記録ID（証跡紐づけ判定用）
    hasEvidence?: boolean; // 証跡の有無
  }[];
  consumables: {
    type: 'oil' | 'tire' | 'brake' | 'battery' | 'coolant';
    history: {
      date: string; // ISO string形式（JSONシリアライズ可能）
      mileageKm?: number;
    }[];
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
    // PR5: 発行日時と検証ID
    issuedAt?: string; // ISO string形式（JSONシリアライズ可能）
    lastUpdatedAt?: string; // ISO string形式（JSONシリアライズ可能）
    verificationId?: string; // 検証ID（短い文字列）
  };
  unclassifiedCount: number; // 未分類レコード数（直近12ヶ月）
  // PR2: 記録件数カウント用
  recordCounts: {
    maintenance: number; // 整備件数
    fuel: number; // 給油件数
    customization: number; // カスタム件数
  };
  // カスタマイズパーツ情報
  customizations: {
    id: string;
    title: string;
    brand?: string;
    modelCode?: string;
    categories: string[];
    status: 'installed' | 'removed' | 'planned';
    date: string; // ISO string形式（JSONシリアライズ可能）
    odoKm?: number;
    vendorType?: 'self' | 'shop' | 'dealer';
    vendorName?: string;
    partsCostJpy?: number;
    laborCostJpy?: number;
    otherCostJpy?: number;
    link?: string;
    memo?: string;
    hasEvidence?: boolean; // 証跡の有無
  }[];
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
 * 証跡を取得（maskedのみ、公開ページ表示用）
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
 * 証跡を取得（recordId確認用、maskStatusに関係なく取得）
 */
async function getAllEvidencesForRecordIdCheck(vehicleId: string): Promise<Evidence[]> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection('evidences')
    .where('vehicleId', '==', vehicleId)
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
 * カスタマイズを取得（サーバーサイド用）
 */
export async function getCustomizationsForPublic(
  userId: string,
  carId: string
): Promise<Customization[]> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('cars')
    .doc(carId)
    .collection('customizations')
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
      date: data.date as Timestamp,
    } as Customization;
  });
}

/**
 * 給油ログを取得（サーバーサイド用）
 */
export async function getFuelLogsForPublic(
  userId: string,
  carId: string
): Promise<FuelLog[]> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('fuelLogs')
    .where('carId', '==', carId)
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
      date: data.date as Timestamp,
    } as FuelLog;
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
    recordId: item.record.id, // メンテナンス記録ID（証跡紐づけ判定用）
  }));
}

/**
 * 消耗品交換一覧を生成（履歴を含む）
 */
function generateConsumablesTable(
  records: MaintenanceRecord[]
): SalePublicViewModel['consumables'] {
  const consumablesHistory: { [key: string]: { date: Date; mileage?: number }[] } = {};
  const categories = ['oil', 'tire', 'brake', 'battery', 'coolant'] as const;

  // 初期化
  categories.forEach(cat => {
    consumablesHistory[cat] = [];
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

  // 各カテゴリのすべての交換記録を抽出
  sortedRecords.forEach(record => {
    const category = record.category as typeof categories[number];
    if (category && categories.includes(category)) {
      const recordDate = record.date?.toDate?.() || (record.date as any) instanceof Date 
        ? (record.date as any) 
        : new Date(record.date as any);
      consumablesHistory[category].push({
        date: recordDate,
        mileage: record.mileage,
      });
    }
  });

  // 結果を配列に変換（日付降順でソート）
  return categories.map(type => ({
    type,
    history: consumablesHistory[type]
      .sort((a, b) => {
        const timeA = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
        const timeB = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
        return timeB - timeA; // 日付降順
      })
      .map(item => {
        const date = item.date instanceof Date 
          ? item.date 
          : (typeof item.date === 'string' ? new Date(item.date) : new Date());
        return {
          date: date.toISOString(),
          mileageKm: item.mileage,
        };
      }),
  }));
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

  // PR2: 記録件数をカウント（全期間）
  const fuelLogs = await getFuelLogsForPublic(saleProfile.ownerUid, saleProfile.vehicleId);
  const customizations = await getCustomizationsForPublic(saleProfile.ownerUid, saleProfile.vehicleId);

  // 証跡を取得（recordIdの確認のため、includeEvidenceがfalseでも取得）
  // recordId確認用には全証跡を取得（maskStatusに関係なく）
  const allEvidenceList = await getAllEvidencesForRecordIdCheck(saleProfile.vehicleId);
  // 証跡のrecordIdをマップ（カスタマイズID/メンテナンス記録ID -> 証跡有無）
  const evidenceRecordIds = new Set<string>();
  allEvidenceList.forEach(e => {
    if (e.recordId) {
      evidenceRecordIds.add(e.recordId);
    }
  });

  // 直近12ヶ月サマリー
  // 未分類（categoryがない）レコードは除外
  const classifiedRecords = allRecords.filter(record => record.category);
  const recent12MonthsSummaryBase = generateRecent12MonthsSummary(
    classifiedRecords,
    saleProfile.includeAmounts,
    saleProfile.highlightTopN
  );
  // 証跡の有無を判定して追加
  const recent12MonthsSummary = recent12MonthsSummaryBase.map(item => ({
    ...item,
    hasEvidence: item.recordId ? evidenceRecordIds.has(item.recordId) : false,
  }));

  // 消耗品交換一覧（分類済みレコードのみ）
  const consumables = generateConsumablesTable(classifiedRecords);

  // 予防整備一覧（分類済みレコードのみ）
  const preventiveMaintenance = generatePreventiveMaintenance(classifiedRecords);

  // 証跡（includeEvidenceがtrueの場合のみ表示用データを生成）
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

  // PR2: 記録件数をカウント（全期間）
  const recordCounts = {
    maintenance: allRecords.length, // 全期間の整備件数
    fuel: fuelLogs.length, // 全期間の給油件数
    customization: customizations.filter(c => c.status === 'installed').length, // インストール済みカスタム件数
  };

  // カスタマイズ情報をシリアライズ
  const serializedCustomizations = customizations
    .filter(c => c.status === 'installed') // インストール済みのみ表示
    .map(c => {
      const dateStr = c.date?.toDate?.()?.toISOString() || 
                     (c.date instanceof Date ? c.date.toISOString() : 
                     (typeof c.date === 'string' ? c.date : undefined));
      return {
        id: c.id!,
        title: c.title,
        brand: c.brand,
        modelCode: c.modelCode,
        categories: c.categories || [],
        status: c.status,
        date: dateStr || '',
        odoKm: c.odoKm,
        vendorType: c.vendorType,
        vendorName: c.vendorName,
        partsCostJpy: c.partsCostJpy,
        laborCostJpy: c.laborCostJpy,
        otherCostJpy: c.otherCostJpy,
        link: c.link,
        memo: c.memo,
        hasEvidence: c.id ? evidenceRecordIds.has(c.id) : false, // 証跡の有無を判定
      };
    })
    .sort((a, b) => {
      // 日付でソート（新しい順）
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });

  // PR5: 発行日時と検証IDを生成
  let issuedAt: string | undefined;
  if (saleProfile.createdAt) {
    if (saleProfile.createdAt.toDate && typeof saleProfile.createdAt.toDate === 'function') {
      // Firestore Timestamp
      issuedAt = saleProfile.createdAt.toDate().toISOString();
    } else if (saleProfile.createdAt instanceof Date) {
      // Dateオブジェクト
      issuedAt = saleProfile.createdAt.toISOString();
    } else if (typeof saleProfile.createdAt === 'string') {
      // ISO文字列
      issuedAt = saleProfile.createdAt;
    }
  }
  
  let lastUpdatedAt: string | undefined;
  if (saleProfile.updatedAt) {
    if (saleProfile.updatedAt.toDate && typeof saleProfile.updatedAt.toDate === 'function') {
      // Firestore Timestamp
      lastUpdatedAt = saleProfile.updatedAt.toDate().toISOString();
    } else if (saleProfile.updatedAt instanceof Date) {
      // Dateオブジェクト
      lastUpdatedAt = saleProfile.updatedAt.toISOString();
    } else if (typeof saleProfile.updatedAt === 'string') {
      // ISO文字列
      lastUpdatedAt = saleProfile.updatedAt;
    }
  }
  
  // 検証IDはslugをベースに生成（既存データ互換性のため、slugが無い場合はundefined）
  const verificationId = saleProfile.slug ? `V-${saleProfile.slug.substring(0, 8).toUpperCase()}` : undefined;

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
      issuedAt, // PR5: 発行日時
      lastUpdatedAt, // PR5: 最終更新日時
      verificationId, // PR5: 検証ID
    },
    unclassifiedCount, // 未分類レコード数（直近12ヶ月）
    recordCounts, // PR2: 記録件数
    customizations: serializedCustomizations, // カスタマイズパーツ情報
  };
}

// extractCategoryFromTitle関数を削除（推測ロジックを撤廃）