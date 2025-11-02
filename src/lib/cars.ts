// src/lib/cars.ts
"use client";
import { db, auth } from "@/lib/firebase";
import {
  collection, addDoc, serverTimestamp, onSnapshot, query, orderBy,
  doc, updateDoc, deleteDoc, Timestamp
} from "firebase/firestore";

export type Car = {
  id?: string;
  name: string;
  modelCode?: string;
  year?: number;
  odoKm?: number;
  imagePath?: string;      // 例: "users/<uid>/cars/<carId>/main.jpg" or "/car.jpg"
  inspectionExpiry?: Date; // 車検期限（Firestore Timestamp → Date変換済み）
  firstRegYm?: string;     // 初度登録年月 (例: "2020-03")
  avgKmPerMonth?: number;  // 平均月間走行距離
  engineCode?: string;     // エンジンコード
  oilSpec?: {              // オイル仕様
    viscosity: string;     // 粘度 (例: "0W-20")
    api: string;          // API規格 (例: "SP")
    volumeL: number;      // 容量 (例: 4.0)
  };
  createdAt?: Date;
  updatedAt?: Date;
};

export type CarInput = {
  name: string;
  modelCode?: string;
  year?: number;
  odoKm?: number;
  imagePath?: string;
  inspectionExpiry?: Date; // 車検期限（Date型で入力、Firestoreに保存時はTimestampへ変換）
  firstRegYm?: string;
  avgKmPerMonth?: number;
  engineCode?: string;
  oilSpec?: {
    viscosity: string;
    api: string;
    volumeL: number;
  };
};

// 追加
export async function addCar(data: CarInput) {
  const u = auth.currentUser;
  if (!u) throw new Error("not signed in");
  
  console.log("Adding car with data:", data);
  console.log("User ID:", u.uid);
  
  try {
    const ref = collection(db, "users", u.uid, "cars");
    
    // Date型をTimestampに変換
    const firestoreData: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) {
        firestoreData[key] = null;
      } else if (key === 'inspectionExpiry' && value instanceof Date) {
        // DateをTimestampに変換
        firestoreData[key] = Timestamp.fromDate(value);
      } else {
        firestoreData[key] = value;
      }
    }
    
    const docRef = await addDoc(ref, {
      ...firestoreData,
      ownerUid: u.uid,
      createdBy: u.uid,
      updatedBy: u.uid,
      deletedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log("Car added successfully with ID:", docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error("Error adding car:", error);
    throw error;
  }
}

// リアルタイム購読
export function watchCars(cb: (cars: Car[]) => void) {
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
    
    const q = query(ref, orderBy("createdAt", "desc"));
    console.log("Query created, setting up snapshot listener...");
    
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
          
          // Timestamp → Date変換
          const car: Car = {
            id: d.id,
            name: data.name,
            modelCode: data.modelCode,
            year: data.year,
            odoKm: data.odoKm,
            imagePath: data.imagePath,
            inspectionExpiry: data.inspectionExpiry?.toDate ? data.inspectionExpiry.toDate() : 
                             (data.inspectionExpiry ? new Date(data.inspectionExpiry) : undefined),
            firstRegYm: data.firstRegYm,
            avgKmPerMonth: data.avgKmPerMonth,
            engineCode: data.engineCode,
            oilSpec: data.oilSpec,
            ownerUid: data.ownerUid,
            createdBy: data.createdBy,
            updatedBy: data.updatedBy,
            deletedAt: data.deletedAt?.toDate ? data.deletedAt.toDate() : null,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : 
                      (data.createdAt ? new Date(data.createdAt) : undefined),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : 
                      (data.updatedAt ? new Date(data.updatedAt) : undefined),
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
  
  // Date型をTimestampに変換、undefined値をnullに変換
  const firestoreData: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      firestoreData[key] = null;
    } else if (key === 'inspectionExpiry' && value instanceof Date) {
      // DateをTimestampに変換
      firestoreData[key] = Timestamp.fromDate(value);
    } else {
      firestoreData[key] = value;
    }
  }
  
  await updateDoc(doc(db, "users", u.uid, "cars", carId), {
    ...firestoreData,
    updatedBy: u.uid,
    updatedAt: serverTimestamp(),
  });
}

export async function removeCar(carId: string) {
  const u = auth.currentUser;
  if (!u) throw new Error("not signed in");
  
  // 論理削除を実装（物理削除の代わり）
  await updateDoc(doc(db, "users", u.uid, "cars", carId), {
    deletedAt: serverTimestamp(),
    updatedBy: u.uid,
    updatedAt: serverTimestamp(),
  });
  
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
    odoKm: newMileage,
    updatedAt: serverTimestamp()
  });
  
  console.log(`Successfully updated car ${carId} mileage to ${newMileage}`);
}
