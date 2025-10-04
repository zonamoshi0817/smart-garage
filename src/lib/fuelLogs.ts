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
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log("給油ログを追加しました:", docRef.id);
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
      updatedAt: Timestamp.now(),
    });

    console.log("給油ログを更新しました:", id);
  } catch (error) {
    console.error("給油ログの更新に失敗しました:", error);
    throw error;
  }
};

// 給油ログを削除
export const deleteFuelLog = async (id: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("ユーザーがログインしていません");
  }

  try {
    await deleteDoc(doc(db, "users", user.uid, "fuelLogs", id));
    console.log("給油ログを削除しました:", id);
  } catch (error) {
    console.error("給油ログの削除に失敗しました:", error);
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
  if (fuelLogs.length < 2) return null;

  // 満タンのログのみを抽出し、日付順でソート
  const fullTankLogs = fuelLogs
    .filter(log => log.isFullTank)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (fullTankLogs.length < 2) return null;

  // 最新の満タンログとその前の満タンログを取得
  const latest = fullTankLogs[fullTankLogs.length - 1];
  const previous = fullTankLogs[fullTankLogs.length - 2];

  const distance = latest.odoKm - previous.odoKm;
  const fuelUsed = previous.fuelAmount; // 前回の給油量が今回の走行で消費した燃料

  if (distance <= 0 || fuelUsed <= 0) return null;

  return Math.round((distance / fuelUsed) * 10) / 10; // km/L
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
  if (fuelLogs.length < 2) return null;

  const fullTankLogs = fuelLogs
    .filter(log => log.isFullTank)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (fullTankLogs.length < 2) return null;

  let totalDistance = 0;
  let totalFuel = 0;

  for (let i = 1; i < fullTankLogs.length; i++) {
    const current = fullTankLogs[i];
    const previous = fullTankLogs[i - 1];
    
    const distance = current.odoKm - previous.odoKm;
    const fuelUsed = previous.fuelAmount;

    if (distance > 0 && fuelUsed > 0) {
      totalDistance += distance;
      totalFuel += fuelUsed;
    }
  }

  if (totalFuel <= 0) return null;

  return Math.round((totalDistance / totalFuel) * 10) / 10;
};
