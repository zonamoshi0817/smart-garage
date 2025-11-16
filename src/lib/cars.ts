// src/lib/cars.ts
"use client";
import { db, auth } from "@/lib/firebase";
import {
  collection, addDoc, serverTimestamp, onSnapshot, query, orderBy,
  doc, updateDoc, deleteDoc, Timestamp, limit
} from "firebase/firestore";
import { logAudit } from "./auditLog";
import { logCarAdded, logCarDeleted } from "./analytics";
import type { Car, CarInput } from "@/types";
// 統一変換ヘルパーをインポート（唯一の経路）
import { toTimestamp, normalizeDeletedAt } from "./converters";

// 追加
export async function addCar(data: CarInput) {
  const u = auth.currentUser;
  if (!u) throw new Error("not signed in");
  
  console.log("Adding car with data:", data);
  console.log("User ID:", u.uid);
  
  try {
    const ref = collection(db, "users", u.uid, "cars");
    
    // 統一変換ヘルパーを使用（唯一の経路）
    const firestoreData: any = {
      ...data,
      inspectionExpiry: toTimestamp(data.inspectionExpiry),
      soldDate: toTimestamp(data.soldDate),
    };
    
    // undefinedをnullに変換
    Object.keys(firestoreData).forEach(key => {
      if (firestoreData[key] === undefined) {
        firestoreData[key] = null;
      }
    });
    
    const docRef = await addDoc(ref, {
      ...firestoreData,
      userId: u.uid,        // セキュリティルールで必須
      ownerUid: u.uid,
      createdBy: u.uid,
      updatedBy: u.uid,
      deletedAt: null,      // 未削除はnullで統一
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log("Car added successfully with ID:", docRef.id);
    
    // 監査ログを記録
    await logAudit({
      entityType: 'car',
      entityId: docRef.id,
      action: 'create',
      after: firestoreData
    });
    
    // アナリティクスイベントを記録
    logCarAdded(1, true); // 車両数は後で実装
    
    return docRef.id;
  } catch (error) {
    console.error("Error adding car:", error);
    throw error;
  }
}

// リアルタイム購読
export function watchCars(cb: (cars: Car[]) => void, limitCount: number = 50) {
  const u = auth.currentUser;
  if (!u) {
    console.log("No user found, cannot watch cars");
    return () => {};
  }
  
  console.log("Setting up cars watcher for user:", u.uid);
  console.log("User email:", u.email);
  
  try {
    const ref = collection(db, "users", u.uid, "cars");
    console.log("Collection reference created:", ref.path);
    
    const q = query(ref, orderBy("createdAt", "desc"), limit(limitCount));
    console.log("Query created with limit:", limitCount, "setting up snapshot listener...");
    
    return onSnapshot(q, (snap) => {
      console.log("=== Cars Snapshot Received ===");
      console.log("Docs count:", snap.docs.length);
      console.log("Snapshot metadata:", snap.metadata);
      console.log("From cache:", snap.metadata.fromCache);
      console.log("Has pending writes:", snap.metadata.hasPendingWrites);
      
      if (snap.empty) {
        console.log("No cars found in database");
        console.log("This could mean:");
        console.log("1. No cars have been added yet");
        console.log("2. Security rules are blocking access");
        console.log("3. User is not properly authenticated");
      }
      
      const list = snap.docs
        .filter((d) => {
          // 論理削除されたレコードを除外
          const data = d.data();
          return !data.deletedAt;
        })
        .map((d) => {
          const data = d.data();
          console.log("Car data:", { id: d.id, ...data });
          
          // Timestampはそのまま返す（BaseEntity完全統一）
          const car: Car = {
            id: d.id,
            name: data.name,
            modelCode: data.modelCode,
            year: data.year,
            odoKm: data.odoKm,
            imagePath: data.imagePath,
            inspectionExpiry: data.inspectionExpiry,
            firstRegYm: data.firstRegYm,
            avgKmPerMonth: data.avgKmPerMonth,
            vehicleClass: data.vehicleClass,
            status: data.status,
            soldDate: data.soldDate,
            soldPrice: data.soldPrice,
            soldTo: data.soldTo,
            soldNotes: data.soldNotes,
            downgradedAt: data.downgradedAt,
            ownerUid: data.ownerUid,
            createdBy: data.createdBy,
            updatedBy: data.updatedBy,
            deletedAt: normalizeDeletedAt(data.deletedAt),  // 統一ヘルパー使用
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
          
          return car;
        });
      
      console.log("Final cars list:", list);
      cb(list);
    }, (error) => {
      console.error("=== Firestore Error ===");
      console.error("Error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("This could be a security rules issue");
      cb([]); // エラー時は空配列を返す
    });
  } catch (error) {
    console.error("Error setting up cars watcher:", error);
    return () => {};
  }
}

// 更新・削除（必要になったら）
export async function updateCar(carId: string, data: Partial<Car>) {
  const u = auth.currentUser;
  if (!u) throw new Error("not signed in");
  
  // 統一変換ヘルパーを使用（唯一の経路）
  const firestoreData: any = {
    ...data,
  };
  
  // 日付フィールドの変換
  if (firestoreData.inspectionExpiry) {
    firestoreData.inspectionExpiry = toTimestamp(firestoreData.inspectionExpiry);
  }
  if (firestoreData.soldDate) {
    firestoreData.soldDate = toTimestamp(firestoreData.soldDate);
  }
  if (firestoreData.downgradedAt) {
    firestoreData.downgradedAt = toTimestamp(firestoreData.downgradedAt);
  }
  
  // undefinedをnullに変換
  Object.keys(firestoreData).forEach(key => {
    if (firestoreData[key] === undefined) {
      firestoreData[key] = null;
    }
  });
  
  // Firestoreセキュリティルールの要件を満たすため、userIdを明示的に含める
  await updateDoc(doc(db, "users", u.uid, "cars", carId), {
    ...firestoreData,
    userId: u.uid,        // セキュリティルールで必須
    updatedBy: u.uid,
    updatedAt: serverTimestamp(),
  });
  
  // 監査ログを記録
  await logAudit({
    entityType: 'car',
    entityId: carId,
    action: 'update',
    after: firestoreData
  });
}

export async function removeCar(carId: string) {
  const u = auth.currentUser;
  if (!u) throw new Error("not signed in");
  
  // 論理削除を実装（物理削除の代わり）
  await updateDoc(doc(db, "users", u.uid, "cars", carId), {
    userId: u.uid,        // セキュリティルールで必須
    deletedAt: serverTimestamp(),
    updatedBy: u.uid,
    updatedAt: serverTimestamp(),
  });
  
  // 監査ログを記録
  await logAudit({
    entityType: 'car',
    entityId: carId,
    action: 'delete'
  });
  
  // アナリティクスイベントを記録
  logCarDeleted(0); // 車両数は後で実装
  
  // 物理削除が必要な場合はコメントアウトを解除
  // await deleteDoc(doc(db, "users", u.uid, "cars", carId));
}

// 車両の走行距離を更新
export async function updateCarMileage(carId: string, newMileage: number) {
  const u = auth.currentUser;
  if (!u) throw new Error("not signed in");
  
  console.log(`Updating car ${carId} mileage to ${newMileage}`);
  
  const carRef = doc(db, "users", u.uid, "cars", carId);
  await updateDoc(carRef, {
    userId: u.uid,        // セキュリティルールで必須
    odoKm: newMileage,
    updatedAt: serverTimestamp()
  });
  
  console.log(`Successfully updated car ${carId} mileage to ${newMileage}`);
}

// 車両を売却済みにする
export async function markCarAsSold(
  carId: string,
  soldData: {
    soldDate: Date | Timestamp;  // Date | Timestamp 両対応
    soldPrice?: number;
    soldTo?: string;
    soldNotes?: string;
  }
) {
  const u = auth.currentUser;
  if (!u) throw new Error("not signed in");
  
  console.log(`Marking car ${carId} as sold`);
  
  // 統一変換ヘルパーを使用（唯一の経路）
  const updateData: any = {
    userId: u.uid,        // セキュリティルールで必須
    status: 'sold',
    soldDate: toTimestamp(soldData.soldDate),  // Date/Timestamp統一
    updatedBy: u.uid,
    updatedAt: serverTimestamp(),
  };
  
  // 任意フィールドは値が存在する場合のみ追加
  if (soldData.soldPrice !== undefined) {
    updateData.soldPrice = soldData.soldPrice;
  }
  if (soldData.soldTo !== undefined) {
    updateData.soldTo = soldData.soldTo;
  }
  if (soldData.soldNotes !== undefined) {
    updateData.soldNotes = soldData.soldNotes;
  }
  
  const carRef = doc(db, "users", u.uid, "cars", carId);
  await updateDoc(carRef, updateData);
  
  // 監査ログを記録
  await logAudit({
    entityType: 'car',
    entityId: carId,
    action: 'update',
    after: { status: 'sold', ...soldData }
  });
  
  console.log(`Successfully marked car ${carId} as sold`);
}

// 車両を現在保有中に戻す（売却済み・廃車済みから復元）
export async function restoreCarToActive(carId: string) {
  const u = auth.currentUser;
  if (!u) throw new Error("not signed in");
  
  console.log(`Restoring car ${carId} to active status`);
  
  const carRef = doc(db, "users", u.uid, "cars", carId);
  await updateDoc(carRef, {
    userId: u.uid,        // セキュリティルールで必須
    status: 'active',
    soldDate: null,
    soldPrice: null,
    soldTo: null,
    soldNotes: null,
    updatedBy: u.uid,
    updatedAt: serverTimestamp(),
  });
  
  // 監査ログを記録
  await logAudit({
    entityType: 'car',
    entityId: carId,
    action: 'update',
    after: { status: 'active' }
  });
  
  console.log(`Successfully restored car ${carId} to active status`);
}
