"use client";

import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  getDocs,
  Timestamp,
  limit,
  QueryDocumentSnapshot,
  DocumentData
} from "firebase/firestore";
import { db } from "./firebase";
import { auth } from "./firebase";
import type { FuelLog, FuelLogInput } from "@/types";
import { logAudit } from "./auditLog";
import { logFuelCreated } from "./analytics";
import { fetchPaginatedData } from "./pagination";

// 型をエクスポート
export type { FuelLog, FuelLogInput };

/**
 * L → ml 変換ヘルパー
 */
function litersToMilliliters(liters: number): number {
  return Math.round(liters * 1000);
}

/**
 * ml → L 変換ヘルパー
 */
function millilitersToLiters(ml: number): number {
  return Math.round(ml / 1000 * 10) / 10;  // 小数点第1位
}

/**
 * Wh → kWh 変換ヘルパー
 */
function watthourToKilowatthour(wh: number): number {
  return Math.round(wh / 1000 * 10) / 10;  // 小数点第1位
}

/**
 * 表示用の量を取得（L or kWh）
 */
export function getDisplayAmount(log: FuelLog): { value: number; unit: string } {
  // 新形式
  if (log.quantity !== undefined && log.unit) {
    if (log.unit === 'ml') {
      return { value: millilitersToLiters(log.quantity), unit: 'L' };
    } else if (log.unit === 'wh') {
      return { value: watthourToKilowatthour(log.quantity), unit: 'kWh' };
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
 */
export function getDisplayCost(log: FuelLog): number {
  return log.totalCostJpy ?? log.cost ?? 0;
}

/**
 * 後方互換性: 旧形式（fuelAmount）を新形式（quantity/unit）に変換
 */
function migrateLegacyFuelLog(data: any): any {
  // 既に新形式の場合はそのまま
  if (data.quantity !== undefined && data.unit !== undefined) {
    return data;
  }
  
  // 旧形式（fuelAmount）を新形式に変換
  if (data.fuelAmount !== undefined) {
    const isEv = data.fuelType === 'ev';
    
    return {
      ...data,
      quantity: isEv ? data.fuelAmount : litersToMilliliters(data.fuelAmount),
      unit: isEv ? 'wh' : 'ml',
      totalCostJpy: data.cost,
      pricePerUnit: data.pricePerLiter,
      // 後方互換用に旧フィールドも保持
      fuelAmount: data.fuelAmount,
      cost: data.cost,
      pricePerLiter: data.pricePerLiter,
    };
  }
  
  return data;
}

// 給油ログを追加
export const addFuelLog = async (fuelLogData: FuelLogInput): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("ユーザーがログインしていません");
  }

  console.log("Adding fuel log with data:", fuelLogData);
  console.log("User ID:", user.uid);
  console.log("Collection path:", `users/${user.uid}/fuelLogs`);

  try {
    // undefined値をnullに変換、Timestamp変換
    const cleanData: any = {};
    for (const [key, value] of Object.entries(fuelLogData)) {
      if (value === undefined) {
        cleanData[key] = null;
      } else if (key === 'date' && value instanceof Date) {
        // Date → Timestamp変換（後方互換性）
        cleanData[key] = Timestamp.fromDate(value);
      } else {
        cleanData[key] = value;
      }
    }
    
    const docRef = await addDoc(collection(db, "users", user.uid, "fuelLogs"), {
      ...cleanData,
      userId: user.uid,     // セキュリティルールで必須
      ownerUid: user.uid,
      createdBy: user.uid,
      updatedBy: user.uid,
      deletedAt: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log("給油ログを追加しました:", docRef.id);
    
    // 監査ログを記録
    await logAudit({
      entityType: 'fuelLog',
      entityId: docRef.id,
      action: 'create',
      after: cleanData
    });
    
    // アナリティクスイベントを記録
    logFuelCreated(fuelLogData.carId, false);
    
    return docRef.id;
  } catch (error) {
    console.error("給油ログの追加に失敗しました:", error);
    console.error("Error details:", {
      code: (error as any)?.code,
      message: (error as any)?.message,
      stack: (error as any)?.stack
    });
    throw error;
  }
};

// 給油ログを更新
export const updateFuelLog = async (id: string, fuelLogData: Partial<FuelLogInput>): Promise<void> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("ユーザーがログインしていません");
  }

  try {
    // undefined値をnullに変換、Timestamp変換
    const cleanData: any = {};
    for (const [key, value] of Object.entries(fuelLogData)) {
      if (value === undefined) {
        cleanData[key] = null;
      } else if (key === 'date' && value instanceof Date) {
        // Date → Timestamp変換（後方互換性）
        cleanData[key] = Timestamp.fromDate(value);
      } else {
        cleanData[key] = value;
      }
    }
    
    const docRef = doc(db, "users", user.uid, "fuelLogs", id);
    await updateDoc(docRef, {
      ...cleanData,
      userId: user.uid,     // セキュリティルールで必須
      updatedBy: user.uid,
      updatedAt: Timestamp.now(),
    });

    console.log("給油ログを更新しました:", id);
    
    // 監査ログを記録
    await logAudit({
      entityType: 'fuelLog',
      entityId: id,
      action: 'update',
      after: cleanData
    });
  } catch (error) {
    console.error("給油ログの更新に失敗しました:", error);
    throw error;
  }
};

// 給油ログを削除（論理削除）
export const deleteFuelLog = async (id: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("ユーザーがログインしていません");
  }

  try {
    // 論理削除を実装
    await updateDoc(doc(db, "users", user.uid, "fuelLogs", id), {
      userId: user.uid,     // セキュリティルールで必須
      deletedAt: Timestamp.now(),
      updatedBy: user.uid,
      updatedAt: Timestamp.now(),
    });
    
    console.log("給油ログを論理削除しました:", id);
    
    // 監査ログを記録
    await logAudit({
      entityType: 'fuelLog',
      entityId: id,
      action: 'delete'
    });
    
    // 物理削除が必要な場合はコメントアウトを解除
    // await deleteDoc(doc(db, "users", user.uid, "fuelLogs", id));
  } catch (error) {
    console.error("給油ログの削除に失敗しました:", error);
    throw error;
  }
};

/**
 * ページング対応: 給油ログを取得
 */
export async function fetchFuelLogsPaginated(
  carId?: string,
  lastDoc: QueryDocumentSnapshot<DocumentData> | null = null,
  pageSize: number = 20
): Promise<{
  items: FuelLog[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}> {
  const user = auth.currentUser;
  if (!user) throw new Error("ユーザーがログインしていません");

  try {
    const ref = collection(db, "users", user.uid, "fuelLogs");
    
    // ベースクエリを構築
    let baseQuery = carId
      ? query(ref, where("carId", "==", carId), where("deletedAt", "==", null), orderBy("date", "desc"))
      : query(ref, where("deletedAt", "==", null), orderBy("date", "desc"));

    // ページング適用
    const result = await fetchPaginatedData<any>(baseQuery, lastDoc, { pageSize });

    // Timestampを変換
    const items = result.items.map((item) => ({
      ...item,
      date: item.date?.toDate ? item.date.toDate() : new Date(item.date)
    })) as FuelLog[];

    return {
      items,
      lastDoc: result.lastDoc,
      hasMore: result.hasMore
    };
  } catch (error) {
    console.error("Error fetching paginated fuel logs:", error);
    throw error;
  }
}

// 特定の車両の給油ログを取得
export const getFuelLogs = async (carId: string): Promise<FuelLog[]> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("ユーザーがログインしていません");
  }

  try {
    // インデックスエラーを回避するため、carIdでフィルタリングしてからクライアント側でソート
    const q = query(
      collection(db, "users", user.uid, "fuelLogs"),
      where("carId", "==", carId)
    );

    const snapshot = await getDocs(q);
    const fuelLogs: FuelLog[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as FuelLog;
    });
    
    // クライアント側で日付順にソート（新しい順）
    fuelLogs.sort((a, b) => {
      const aSeconds = a.date?.seconds || 0;
      const bSeconds = b.date?.seconds || 0;
      return bSeconds - aSeconds;
    });

    return fuelLogs;
  } catch (error) {
    console.error("給油ログの取得に失敗しました:", error);
    throw error;
  }
};

// 特定の車両の給油ログを監視
export const watchFuelLogs = (
  carId: string,
  callback: (fuelLogs: FuelLog[]) => void
): (() => void) => {
  const user = auth.currentUser;
  if (!user) {
    console.warn("ユーザーがログインしていません");
    callback([]);
    return () => {};
  }

  console.log("Setting up fuel logs watcher for car:", carId);
  console.log("User ID:", user.uid);
  console.log("Collection path:", `users/${user.uid}/fuelLogs`);

  // インデックスエラーを回避するため、まずcarIdでフィルタリングしてからクライアント側でソート
  const q = query(
    collection(db, "users", user.uid, "fuelLogs"),
    where("carId", "==", carId)
  );

  return onSnapshot(q, (snapshot) => {
    console.log("Fuel logs snapshot received:", {
      docsCount: snapshot.docs.length,
      fromCache: snapshot.metadata.fromCache,
      hasPendingWrites: snapshot.metadata.hasPendingWrites
    });
    
    const fuelLogs: FuelLog[] = snapshot.docs
      .filter((doc) => {
        // 論理削除されたレコードを除外
        const data = doc.data();
        return !data.deletedAt;
      })
      .map((doc) => {
        const data = doc.data();
        // 後方互換性: 旧形式を新形式に変換
        const migratedData = migrateLegacyFuelLog(data);
        
        return {
          id: doc.id,
          ...migratedData,
          date: migratedData.date,  // Timestampをそのまま返す
          deletedAt: migratedData.deletedAt || null,  // null統一
          createdAt: migratedData.createdAt,
          updatedAt: migratedData.updatedAt,
        } as FuelLog;
      });
    
    // クライアント側で日付順にソート
    fuelLogs.sort((a, b) => {
      const aSeconds = a.date?.seconds || 0;
      const bSeconds = b.date?.seconds || 0;
      return bSeconds - aSeconds;
    });
    callback(fuelLogs);
  }, (error) => {
    console.error("給油ログの監視に失敗しました:", error);
    console.error("Error details:", {
      code: (error as any)?.code,
      message: (error as any)?.message,
      stack: (error as any)?.stack
    });
    callback([]);
  });
};

// 全車両の給油ログを監視
export const watchAllFuelLogs = (
  callback: (fuelLogs: FuelLog[]) => void
): (() => void) => {
  const user = auth.currentUser;
  if (!user) {
    console.warn("ユーザーがログインしていません");
    callback([]);
    return () => {};
  }

  // インデックスエラーを回避するため、クライアント側でソート
  const q = query(
    collection(db, "users", user.uid, "fuelLogs")
  );

  return onSnapshot(q, (snapshot) => {
    const fuelLogs: FuelLog[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as FuelLog;
    });
    
    // クライアント側で日付順にソート
    fuelLogs.sort((a, b) => {
      const aSeconds = a.date?.seconds || 0;
      const bSeconds = b.date?.seconds || 0;
      return bSeconds - aSeconds;
    });
    callback(fuelLogs);
  }, (error) => {
    console.error("全給油ログの監視に失敗しました:", error);
    callback([]);
  });
};

/**
 * 給油量を取得（物理量統一対応）
 * 新形式: quantity/unit → L変換
 * 旧形式: fuelAmount → そのまま使用
 */
function getFuelAmountInLiters(log: FuelLog): number | null {
  // 新形式
  if (log.quantity !== undefined && log.unit) {
    if (log.unit === 'ml') {
      return millilitersToLiters(log.quantity);
    } else if (log.unit === 'wh') {
      // EVの場合はkWh → L相当に変換（燃費計算不可のため null）
      return null;
    }
  }
  
  // 旧形式（後方互換性）
  if (log.fuelAmount !== undefined) {
    return log.fuelAmount;
  }
  
  return null;
}

// 燃費計算（満タン間の燃費）
export const calculateFuelEfficiency = (fuelLogs: FuelLog[]): number | null => {
  console.log("calculateFuelEfficiency called with:", fuelLogs.length, "logs");
  console.log("All fuel logs:", fuelLogs.map(log => ({
    date: (log.date?.toDate ? log.date.toDate() : new Date()).toLocaleDateString(),
    odoKm: log.odoKm,
    quantity: log.quantity,
    unit: log.unit,
    fuelAmount: log.fuelAmount,  // 後方互換
    isFullTank: log.isFullTank
  })));
  
  if (fuelLogs.length < 2) {
    console.log("Not enough fuel logs for efficiency calculation");
    return null;
  }

  // 満タンのログのみを抽出し、日付順でソート（Timestampの秒数で比較）
  const fullTankLogs = fuelLogs
    .filter(log => log.isFullTank)
    .sort((a, b) => {
      const aSeconds = a.date?.seconds || 0;
      const bSeconds = b.date?.seconds || 0;
      return aSeconds - bSeconds;
    });

  console.log("Full tank logs:", fullTankLogs.length);
  console.log("Full tank logs details:", fullTankLogs.map(log => ({
    date: (log.date?.toDate ? log.date.toDate() : new Date()).toLocaleDateString(),
    odoKm: log.odoKm,
    fuelAmount: log.fuelAmount
  })));

  if (fullTankLogs.length < 2) {
    console.log("Not enough full tank logs for efficiency calculation");
    return null;
  }

  // 最新の満タンログとその前の満タンログを取得
  const latest = fullTankLogs[fullTankLogs.length - 1];
  const previous = fullTankLogs[fullTankLogs.length - 2];

  // 物理量統一対応: 給油量をL単位で取得
  const latestFuelInLiters = getFuelAmountInLiters(latest);
  const previousFuelInLiters = getFuelAmountInLiters(previous);

  console.log("Latest log:", { odoKm: latest.odoKm, fuelInLiters: latestFuelInLiters });
  console.log("Previous log:", { odoKm: previous.odoKm, fuelInLiters: previousFuelInLiters });

  // EVの場合は燃費計算不可
  if (latestFuelInLiters === null || previousFuelInLiters === null) {
    console.log("EV fuel log detected, fuel efficiency calculation not applicable");
    return null;
  }

  const distance = latest.odoKm - previous.odoKm;
  const fuelUsed = latestFuelInLiters; // 今回の給油量が今回の走行で消費した燃料

  console.log("Distance:", distance, "Fuel used:", fuelUsed);

  if (distance <= 0) {
    console.log("Invalid distance: ODO distance decreased or same");
    return null;
  }

  if (fuelUsed <= 0) {
    console.log("Invalid fuel amount:", fuelUsed);
    return null;
  }

  const efficiency = Math.round((distance / fuelUsed) * 10) / 10;
  console.log("Calculated efficiency:", efficiency, "km/L");
  
  return efficiency;
};

// 月間ガソリン代の計算（物理量統一対応）
export const calculateMonthlyFuelCosts = (fuelLogs: FuelLog[]): { month: string; cost: number }[] => {
  const monthlyCosts: { [key: string]: number } = {};

  fuelLogs.forEach(log => {
    const dateObj = log.date?.toDate ? log.date.toDate() : new Date();
    const month = dateObj.toISOString().slice(0, 7); // YYYY-MM形式
    // 新形式: totalCostJpy、旧形式: cost（後方互換性）
    const cost = log.totalCostJpy ?? log.cost ?? 0;
    monthlyCosts[month] = (monthlyCosts[month] || 0) + cost;
  });

  return Object.entries(monthlyCosts)
    .map(([month, cost]) => ({ month, cost }))
    .sort((a, b) => a.month.localeCompare(b.month));
};

// 平均燃費の計算（全期間）
export const calculateAverageFuelEfficiency = (fuelLogs: FuelLog[]): number | null => {
  console.log("calculateAverageFuelEfficiency called with:", fuelLogs.length, "logs");
  
  if (fuelLogs.length < 2) {
    console.log("Not enough fuel logs for average efficiency calculation");
    return null;
  }

  const fullTankLogs = fuelLogs
    .filter(log => log.isFullTank)
    .sort((a, b) => {
      const aSeconds = a.date?.seconds || 0;
      const bSeconds = b.date?.seconds || 0;
      return aSeconds - bSeconds;
    });

  console.log("Full tank logs for average:", fullTankLogs.length);

  if (fullTankLogs.length < 2) {
    console.log("Not enough full tank logs for average efficiency calculation");
    return null;
  }

  let totalDistance = 0;
  let totalFuel = 0;

  for (let i = 1; i < fullTankLogs.length; i++) {
    const current = fullTankLogs[i];
    const previous = fullTankLogs[i - 1];
    
    const distance = current.odoKm - previous.odoKm;
    const fuelUsed = getFuelAmountInLiters(current); // 物理量統一対応

    console.log(`Segment ${i}: distance=${distance}, fuel=${fuelUsed}`);

    if (distance > 0 && fuelUsed && fuelUsed > 0) {
      totalDistance += distance;
      totalFuel += fuelUsed;
    }
  }

  console.log("Total distance:", totalDistance, "Total fuel:", totalFuel);

  if (totalFuel <= 0) {
    console.log("No valid fuel data for average calculation");
    return null;
  }

  const averageEfficiency = Math.round((totalDistance / totalFuel) * 10) / 10;
  console.log("Calculated average efficiency:", averageEfficiency, "km/L");
  
  return averageEfficiency;
};
