// src/lib/maintenance.ts
"use client";
import { db, auth } from "@/lib/firebase";
import {
  collection, addDoc, serverTimestamp, onSnapshot, query, orderBy,
  doc, updateDoc, deleteDoc, where
} from "firebase/firestore";

export type MaintenanceType = 
  | "オイル交換"
  | "タイヤ交換"
  | "ブレーキパッド交換"
  | "エアフィルター交換"
  | "バッテリー交換"
  | "車検"
  | "その他";

export type MaintenanceRecord = {
  id?: string;
  carId: string;
  type: MaintenanceType;
  title: string;
  description?: string;
  cost?: number;
  mileage?: number; // 走行距離
  date: Date;
  location?: string; // 作業場所
  createdAt?: any;
  updatedAt?: any;
};

export type MaintenanceInput = {
  carId: string;
  type: MaintenanceType;
  title: string;
  description?: string;
  cost?: number;
  mileage?: number;
  date: Date;
  location?: string;
};

// メンテナンス履歴を追加
export async function addMaintenanceRecord(data: MaintenanceInput) {
  const u = auth.currentUser;
  if (!u) throw new Error("not signed in");
  
  try {
    const ref = collection(db, "users", u.uid, "maintenance");
    
    // データを準備（Dateオブジェクトを適切に処理）
    const recordData = {
      carId: data.carId,
      type: data.type,
      title: data.title,
      description: data.description || null,
      cost: data.cost || null,
      mileage: data.mileage || null,
      date: data.date, // Dateオブジェクトのまま（Firestoreが自動変換）
      location: data.location || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    // undefinedの値をチェックしてログ出力
    Object.keys(recordData).forEach(key => {
      if (recordData[key as keyof typeof recordData] === undefined) {
        console.warn(`Warning: ${key} is undefined, this may cause Firestore errors`);
      }
    });
    
    console.log("Adding maintenance record:", recordData);
    const docRef = await addDoc(ref, recordData);
    console.log("Maintenance record added successfully with ID:", docRef.id);
    console.log("Document path:", docRef.path);
  } catch (error) {
    console.error("Error adding maintenance record:", error);
    throw error;
  }
}

// 特定の車のメンテナンス履歴をリアルタイム購読
export function watchMaintenanceRecords(carId: string, cb: (records: MaintenanceRecord[]) => void) {
  const u = auth.currentUser;
  if (!u) {
    console.log("No user authenticated, cannot watch maintenance records");
    return () => {};
  }
  
  console.log("Setting up maintenance watcher for carId:", carId, "user:", u.uid);
  
  try {
    const ref = collection(db, "users", u.uid, "maintenance");
    console.log("Collection reference created:", ref.path);
    
    // 一時的にインデックスエラーを回避するため、orderByを削除
    const q = query(
      ref, 
      where("carId", "==", carId)
    );
    console.log("Query created for carId:", carId);
    
    return onSnapshot(q, (snap) => {
      console.log("Snapshot received for carId", carId, ":", snap.docs.length, "documents");
      const list = snap.docs.map((d) => {
        const data = d.data();
        console.log("Document data:", d.id, data);
        return { 
          id: d.id, 
          ...data,
          date: data.date?.toDate() || new Date()
        } as MaintenanceRecord;
      });
      // クライアント側でソート
      list.sort((a, b) => b.date.getTime() - a.date.getTime());
      console.log("Processed records for carId", carId, ":", list);
      cb(list);
    }, (error) => {
      console.error("Firestore error for carId", carId, ":", error);
      cb([]);
    });
  } catch (error) {
    console.error("Error setting up maintenance watcher for carId", carId, ":", error);
    return () => {};
  }
}

// メンテナンス履歴を更新
export async function updateMaintenanceRecord(recordId: string, data: Partial<MaintenanceInput>) {
  const u = auth.currentUser;
  if (!u) throw new Error("not signed in");
  
  try {
    // undefinedの値をnullに変換またはフィールドから除外
    const updateData: any = {
      updatedAt: serverTimestamp(),
    };
    
    // 各フィールドをチェックしてundefinedでないもののみ追加
    if (data.carId !== undefined) updateData.carId = data.carId;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.cost !== undefined) updateData.cost = data.cost || null;
    if (data.mileage !== undefined) updateData.mileage = data.mileage || null;
    if (data.date !== undefined) updateData.date = data.date;
    if (data.location !== undefined) updateData.location = data.location || null;
    
    console.log("Updating maintenance record with data:", updateData);
    await updateDoc(doc(db, "users", u.uid, "maintenance", recordId), updateData);
    console.log("Maintenance record updated successfully");
  } catch (error) {
    console.error("Error updating maintenance record:", error);
    throw error;
  }
}

// メンテナンス履歴を削除
export async function deleteMaintenanceRecord(recordId: string) {
  const u = auth.currentUser;
  if (!u) throw new Error("not signed in");
  
  try {
    await deleteDoc(doc(db, "users", u.uid, "maintenance", recordId));
  } catch (error) {
    console.error("Error deleting maintenance record:", error);
    throw error;
  }
}

// 複数のメンテナンス履歴を一括削除
export async function deleteMultipleMaintenanceRecords(recordIds: string[]) {
  const u = auth.currentUser;
  if (!u) throw new Error("not signed in");
  
  try {
    console.log("Deleting multiple maintenance records:", recordIds);
    
    // 並列で削除を実行
    const deletePromises = recordIds.map(recordId => 
      deleteDoc(doc(db, "users", u.uid, "maintenance", recordId))
    );
    
    await Promise.all(deletePromises);
    console.log("Successfully deleted", recordIds.length, "maintenance records");
  } catch (error) {
    console.error("Error deleting multiple maintenance records:", error);
    throw error;
  }
}

// すべてのメンテナンス履歴をリアルタイム購読
export function watchAllMaintenanceRecords(cb: (records: MaintenanceRecord[]) => void) {
  const u = auth.currentUser;
  if (!u) {
    console.log("No user authenticated, cannot watch all maintenance records");
    return () => {};
  }
  
  console.log("Setting up all maintenance records watcher for user:", u.uid);
  
  try {
    const ref = collection(db, "users", u.uid, "maintenance");
    console.log("All maintenance collection reference created:", ref.path);
    
    // 一時的にインデックスエラーを回避するため、orderByを削除
    const q = query(ref);
    console.log("All maintenance query created");
    
    return onSnapshot(q, (snap) => {
      console.log("All maintenance snapshot received:", snap.docs.length, "documents");
      const list = snap.docs.map((d) => {
        const data = d.data();
        console.log("All maintenance document data:", d.id, data);
        return { 
          id: d.id, 
          ...data,
          date: data.date?.toDate() || new Date()
        } as MaintenanceRecord;
      });
      // クライアント側でソート
      list.sort((a, b) => b.date.getTime() - a.date.getTime());
      console.log("All maintenance processed records:", list);
      cb(list);
    }, (error) => {
      console.error("Firestore error in all maintenance watcher:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      cb([]);
    });
  } catch (error) {
    console.error("Error setting up all maintenance watcher:", error);
    return () => {};
  }
}
