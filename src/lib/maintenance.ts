// src/lib/maintenance.ts
"use client";
import { db, auth } from "@/lib/firebase";
import {
  collection, addDoc, serverTimestamp, onSnapshot, query, orderBy,
  doc, updateDoc, deleteDoc, where, limit, startAfter, getDocs,
  QueryDocumentSnapshot, DocumentData, Timestamp
} from "firebase/firestore";
import { validateMileageConsistency } from "@/lib/validators";
import { getDoc } from "firebase/firestore";
import { logAudit } from "./auditLog";
import { logMaintenanceCreated } from "./analytics";
import { fetchPaginatedData, PaginationState } from "./pagination";
import type { MaintenanceRecord, MaintenanceInput } from "@/types";
// 統一変換ヘルパーをインポート（唯一の経路）
import { toTimestamp, timestampToDate, normalizeDeletedAt } from "./converters";

// 車両の現在走行距離を取得
async function getCurrentCarMileage(carId: string): Promise<number> {
  const u = auth.currentUser;
  if (!u) throw new Error("not signed in");
  
  try {
    const carDoc = await getDoc(doc(db, "users", u.uid, "cars", carId));
    if (carDoc.exists()) {
      const carData = carDoc.data() as { odoKm?: number };
      return carData.odoKm || 0;
    }
    return 0;
  } catch (error) {
    console.error("Error fetching current car mileage:", error);
    return 0;
  }
}

// 車両の既存メンテナンス記録を取得（ODO整合チェック用）
async function getExistingMaintenanceRecords(carId: string): Promise<Array<{ mileage: number; date: Date }>> {
  const u = auth.currentUser;
  if (!u) throw new Error("not signed in");
  
  try {
    // インデックスエラーを回避するため、orderByを削除してクライアント側でソート
    const q = query(
      collection(db, "users", u.uid, "maintenance"),
      where("carId", "==", carId)
    );
    
    const snapshot = await new Promise((resolve, reject) => {
      const unsubscribe = onSnapshot(q, resolve, reject);
      // 一度だけ取得してunsubscribe
      setTimeout(() => unsubscribe(), 100);
    }) as any;
    
    const records: Array<{ mileage: number; date: Date }> = [];
    snapshot.forEach((doc: any) => {
      const data = doc.data() as { mileage?: number; date?: Timestamp };
      if (data.mileage && data.date) {
        // ✅ この関数のみ例外的にDate型を使用（バリデーション用）
        // timestampToDate()ヘルパーを使用
        const date = timestampToDate(data.date) || new Date();
        records.push({
          mileage: data.mileage,
          date: date
        });
      }
    });
    
    // クライアント側で日付順にソート（降順）
    records.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    return records;
  } catch (error) {
    console.error("Error fetching existing maintenance records:", error);
    return [];
  }
}

// メンテナンス履歴を追加
export async function addMaintenanceRecord(data: MaintenanceInput) {
  const u = auth.currentUser;
  if (!u) throw new Error("not signed in");
  
  try {
    // ODO整合チェック
    const existingRecords = await getExistingMaintenanceRecords(data.carId);
    const currentCarMileage = await getCurrentCarMileage(data.carId);
    
    const validation = validateMileageConsistency(
      data.mileage,
      currentCarMileage,
      existingRecords
    );
    
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    
    const ref = collection(db, "users", u.uid, "maintenance");
    
    // 統一変換ヘルパーを使用（唯一の経路）
    const cleanData: any = {
      carId: data.carId,
      title: data.title,
      description: data.description,
      cost: data.cost,
      mileage: data.mileage,
      date: toTimestamp(data.date),  // Date/Timestamp統一
      location: data.location,
    };
    
    // undefinedをnullに変換
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === undefined) {
        cleanData[key] = null;
      }
    });
    
    // データを準備
    const recordData = {
      ...cleanData,
      userId: u.uid,       // セキュリティルールで必須
      ownerUid: u.uid,
      createdBy: u.uid,
      updatedBy: u.uid,
      deletedAt: null,     // 未削除はnullで統一
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
    
    // 監査ログを記録
    await logAudit({
      entityType: 'maintenance',
      entityId: docRef.id,
      action: 'create',
      after: recordData
    });
    
    // アナリティクスイベントを記録
    logMaintenanceCreated(data.carId, data.title);
    
    // 車両の走行距離を更新
    try {
      const { updateCarMileage } = await import("@/lib/cars");
      await updateCarMileage(data.carId, data.mileage);
      console.log("車両の走行距離を更新しました:", data.mileage);
    } catch (mileageError) {
      console.error("車両の走行距離更新に失敗しました:", mileageError);
      // 走行距離更新の失敗はメンテナンス記録の作成を阻害しない
    }

    // 作成されたレコードの情報を返す
    return {
      id: docRef.id,
      carId: data.carId,
      title: data.title,
      description: data.description,
      cost: data.cost,
      mileage: data.mileage,
      date: data.date,
      location: data.location,
    };
  } catch (error) {
    console.error("Error adding maintenance record:", error);
    throw error;
  }
}

// 特定の車のメンテナンス履歴をリアルタイム購読
export function watchMaintenanceRecords(carId: string, cb: (records: MaintenanceRecord[]) => void, limitCount: number = 100) {
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
    // limitを追加してパフォーマンスを向上
    const q = query(
      ref, 
      where("carId", "==", carId),
      limit(limitCount)
    );
    console.log("Query created for carId:", carId, "with limit:", limitCount);
    
    return onSnapshot(q, (snap) => {
      console.log("Snapshot received for carId", carId, ":", snap.docs.length, "documents");
      const list = snap.docs
        .filter((d) => {
          // 論理削除されたレコードを除外
          const data = d.data();
          return !data.deletedAt;
        })
        .map((d) => {
          const data = d.data();
          console.log("Document data:", d.id, data);
          return { 
            id: d.id, 
            ...data,
            date: data.date,  // Timestampをそのまま返す（BaseEntity完全統一）
            deletedAt: normalizeDeletedAt(data.deletedAt),  // 統一ヘルパー使用
          } as MaintenanceRecord;
        });
      // クライアント側でソート（Timestampの秒数で比較）
      list.sort((a, b) => {
        const aSeconds = a.date?.seconds || 0;
        const bSeconds = b.date?.seconds || 0;
        return bSeconds - aSeconds;
      });
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
    // 統一変換ヘルパーを使用（唯一の経路）
    const cleanData: any = {};
    
    // 各フィールドをチェックしてundefinedでないもののみ追加
    if (data.carId !== undefined) cleanData.carId = data.carId;
    if (data.title !== undefined) cleanData.title = data.title;
    if (data.description !== undefined) cleanData.description = data.description || null;
    if (data.cost !== undefined) cleanData.cost = data.cost || null;
    if (data.mileage !== undefined) cleanData.mileage = data.mileage || null;
    if (data.date !== undefined) {
      cleanData.date = toTimestamp(data.date);  // Date/Timestamp統一
    }
    if (data.location !== undefined) cleanData.location = data.location || null;
    
    const updateData = {
      ...cleanData,
      userId: u.uid,        // セキュリティルールで必須
      updatedBy: u.uid,
      updatedAt: serverTimestamp(),
    };
    
    console.log("Updating maintenance record with data:", updateData);
    await updateDoc(doc(db, "users", u.uid, "maintenance", recordId), updateData);
    console.log("Maintenance record updated successfully");
    
    // 監査ログを記録
    await logAudit({
      entityType: 'maintenance',
      entityId: recordId,
      action: 'update',
      after: updateData
    });
    
    // 走行距離が更新された場合は車両の走行距離も更新
    if (data.mileage !== undefined && data.carId) {
      try {
        const { updateCarMileage } = await import("@/lib/cars");
        await updateCarMileage(data.carId, data.mileage);
        console.log("車両の走行距離を更新しました:", data.mileage);
      } catch (mileageError) {
        console.error("車両の走行距離更新に失敗しました:", mileageError);
        // 走行距離更新の失敗はメンテナンス記録の更新を阻害しない
      }
    }
  } catch (error) {
    console.error("Error updating maintenance record:", error);
    throw error;
  }
}

// メンテナンス履歴を削除（論理削除）
export async function deleteMaintenanceRecord(recordId: string) {
  const u = auth.currentUser;
  if (!u) throw new Error("not signed in");
  
  try {
    // 論理削除を実装
    await updateDoc(doc(db, "users", u.uid, "maintenance", recordId), {
      userId: u.uid,        // セキュリティルールで必須
      deletedAt: serverTimestamp(),
      updatedBy: u.uid,
      updatedAt: serverTimestamp(),
    });
    
    // 監査ログを記録
    await logAudit({
      entityType: 'maintenance',
      entityId: recordId,
      action: 'delete'
    });
    
    // 物理削除が必要な場合はコメントアウトを解除
    // await deleteDoc(doc(db, "users", u.uid, "maintenance", recordId));
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

/**
 * ページング対応: メンテナンス履歴を取得
 */
export async function fetchMaintenanceRecordsPaginated(
  carId?: string,
  lastDoc: QueryDocumentSnapshot<DocumentData> | null = null,
  pageSize: number = 20
): Promise<{
  items: MaintenanceRecord[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}> {
  const u = auth.currentUser;
  if (!u) throw new Error("not signed in");

  try {
    const ref = collection(db, "users", u.uid, "maintenance");
    
    // ベースクエリを構築
    let baseQuery = carId
      ? query(ref, where("carId", "==", carId), where("deletedAt", "==", null), orderBy("date", "desc"))
      : query(ref, where("deletedAt", "==", null), orderBy("date", "desc"));

    // ページング適用
    const result = await fetchPaginatedData<any>(baseQuery, lastDoc, { pageSize });

    // Timestampを変換
    const items = result.items.map((item) => ({
      ...item,
      date: item.date instanceof Date ? item.date : (item.date?.toDate ? item.date.toDate() : new Date())
    })) as MaintenanceRecord[];

    return {
      items,
      lastDoc: result.lastDoc,
      hasMore: result.hasMore
    };
  } catch (error) {
    console.error("Error fetching paginated maintenance records:", error);
    throw error;
  }
}

// すべてのメンテナンス履歴をリアルタイム購読（上限付き）
export function watchAllMaintenanceRecords(cb: (records: MaintenanceRecord[]) => void, limitCount: number = 50) {
  const u = auth.currentUser;
  if (!u) {
    console.log("No user authenticated, cannot watch all maintenance records");
    return () => {};
  }
  
  console.log("Setting up all maintenance records watcher for user:", u.uid);
  
  try {
    const ref = collection(db, "users", u.uid, "maintenance");
    console.log("All maintenance collection reference created:", ref.path);
    
    // limit付きでクエリを作成
    const q = query(ref, where("deletedAt", "==", null), orderBy("date", "desc"), limit(limitCount));
    console.log("All maintenance query created with limit:", limitCount);
    
    return onSnapshot(q, (snap) => {
      console.log("All maintenance snapshot received:", snap.docs.length, "documents");
      const list = snap.docs
        .map((d) => {
          const data = d.data();
          console.log("All maintenance document data:", d.id, data);
          return { 
            id: d.id, 
            ...data,
            date: data.date,  // Timestampをそのまま返す
            deletedAt: normalizeDeletedAt(data.deletedAt),  // 統一ヘルパー使用
          } as MaintenanceRecord;
        });
      // クライアント側でソート（Timestampの秒数で比較）
      list.sort((a, b) => {
        const aSeconds = a.date?.seconds || 0;
        const bSeconds = b.date?.seconds || 0;
        return bSeconds - aSeconds;
      });
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
