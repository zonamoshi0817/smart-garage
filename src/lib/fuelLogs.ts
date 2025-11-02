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
  Timestamp 
} from "firebase/firestore";
import { db } from "./firebase";
import { auth } from "./firebase";
import type { FuelLog, FuelLogInput } from "@/types";
import { logAudit } from "./auditLog";

// 型をエクスポート
export type { FuelLog, FuelLogInput };

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
    // undefined値をnullに変換（Firestoreではundefinedは保存できない）
    const cleanData = Object.fromEntries(
      Object.entries(fuelLogData).map(([key, value]) => [key, value === undefined ? null : value])
    );
    
    const docRef = await addDoc(collection(db, "users", user.uid, "fuelLogs"), {
      ...cleanData,
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
    // undefined値をnullに変換（Firestoreではundefinedは保存できない）
    const cleanData = Object.fromEntries(
      Object.entries(fuelLogData).map(([key, value]) => [key, value === undefined ? null : value])
    );
    
    const docRef = doc(db, "users", user.uid, "fuelLogs", id);
    await updateDoc(docRef, {
      ...cleanData,
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
    fuelLogs.sort((a, b) => b.date.getTime() - a.date.getTime());

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
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as FuelLog;
      });
    
    // クライアント側で日付順にソート
    fuelLogs.sort((a, b) => b.date.getTime() - a.date.getTime());
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
    fuelLogs.sort((a, b) => b.date.getTime() - a.date.getTime());
    callback(fuelLogs);
  }, (error) => {
    console.error("全給油ログの監視に失敗しました:", error);
    callback([]);
  });
};

// 燃費計算（満タン間の燃費）
export const calculateFuelEfficiency = (fuelLogs: FuelLog[]): number | null => {
  console.log("calculateFuelEfficiency called with:", fuelLogs.length, "logs");
  console.log("All fuel logs:", fuelLogs.map(log => ({
    date: log.date.toLocaleDateString(),
    odoKm: log.odoKm,
    fuelAmount: log.fuelAmount,
    isFullTank: log.isFullTank
  })));
  
  if (fuelLogs.length < 2) {
    console.log("Not enough fuel logs for efficiency calculation");
    return null;
  }

  // 満タンのログのみを抽出し、日付順でソート
  const fullTankLogs = fuelLogs
    .filter(log => log.isFullTank)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  console.log("Full tank logs:", fullTankLogs.length);
  console.log("Full tank logs details:", fullTankLogs.map(log => ({
    date: log.date.toLocaleDateString(),
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

  console.log("Latest log:", { date: latest.date, odoKm: latest.odoKm, fuelAmount: latest.fuelAmount });
  console.log("Previous log:", { date: previous.date, odoKm: previous.odoKm, fuelAmount: previous.fuelAmount });

  const distance = latest.odoKm - previous.odoKm;
  const fuelUsed = latest.fuelAmount; // 今回の給油量が今回の走行で消費した燃料

  console.log("Distance:", distance, "Fuel used:", fuelUsed);

  if (distance <= 0) {
    console.log("Invalid distance: ODO distance decreased or same. Latest:", latest.odoKm, "Previous:", previous.odoKm);
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

// 月間ガソリン代の計算
export const calculateMonthlyFuelCosts = (fuelLogs: FuelLog[]): { month: string; cost: number }[] => {
  const monthlyCosts: { [key: string]: number } = {};

  fuelLogs.forEach(log => {
    const month = log.date.toISOString().slice(0, 7); // YYYY-MM形式
    monthlyCosts[month] = (monthlyCosts[month] || 0) + log.cost;
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
    .sort((a, b) => a.date.getTime() - b.date.getTime());

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
    const fuelUsed = current.fuelAmount; // 今回の給油量が今回の走行で消費した燃料

    console.log(`Segment ${i}: distance=${distance}, fuel=${fuelUsed}`);

    if (distance > 0 && fuelUsed > 0) {
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
