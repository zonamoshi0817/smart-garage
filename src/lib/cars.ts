// src/lib/cars.ts
"use client";
import { db, auth } from "@/lib/firebase";
import {
  collection, addDoc, serverTimestamp, onSnapshot, query, orderBy,
  doc, updateDoc, deleteDoc
} from "firebase/firestore";
import { generateInitialReminders, saveAutoReminders, updateShakenReminders, type VehicleData } from "./reminders";

export type Car = {
  id?: string;
  name: string;
  modelCode?: string;
  year?: number;
  odoKm?: number;
  imagePath?: string;      // 例: "users/<uid>/cars/<carId>/main.jpg" or "/car.jpg"
  inspectionExpiry?: string; // 車検期限 (例: "2026-04-15")
  firstRegYm?: string;     // 初度登録年月 (例: "2020-03")
  avgKmPerMonth?: number;  // 平均月間走行距離
  createdAt?: any;
  updatedAt?: any;
};

export type CarInput = {
  name: string;
  modelCode?: string;
  year?: number;
  odoKm?: number;
  imagePath?: string;
  inspectionExpiry?: string;
  firstRegYm?: string;
  avgKmPerMonth?: number;
};

// 追加
export async function addCar(data: CarInput) {
  const u = auth.currentUser;
  if (!u) throw new Error("not signed in");
  
  console.log("Adding car with data:", data);
  console.log("User ID:", u.uid);
  
  try {
    const ref = collection(db, "users", u.uid, "cars");
    const docRef = await addDoc(ref, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log("Car added successfully with ID:", docRef.id);
    
    // 自動リマインダーを生成
    try {
      const vehicleData: VehicleData = {
        id: docRef.id,
        name: data.name,
        nextShakenDate: data.inspectionExpiry ? new Date(data.inspectionExpiry) : undefined,
        firstRegYm: data.firstRegYm,
        odoAtReg: data.odoKm,
        avgKmPerMonth: data.avgKmPerMonth,
        currentOdoKm: data.odoKm,
      };
      
      const autoReminders = generateInitialReminders(vehicleData);
      await saveAutoReminders(docRef.id, autoReminders);
      console.log("Auto reminders generated:", autoReminders.length);
    } catch (reminderError) {
      console.error("Error generating auto reminders:", reminderError);
      // リマインダー生成エラーは車両作成を阻害しない
    }
    
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
      
      const list = snap.docs.map((d) => {
        const data = d.data();
        console.log("Car data:", { id: d.id, ...data });
        return { id: d.id, ...data } as Car;
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
  
  await updateDoc(doc(db, "users", u.uid, "cars", carId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
  
  // 車検満了日が変更された場合はリマインダーを再生成
  if (data.inspectionExpiry) {
    try {
      const newShakenDate = new Date(data.inspectionExpiry);
      await updateShakenReminders(carId, newShakenDate);
      console.log("Shaken reminders updated for car:", carId);
    } catch (reminderError) {
      console.error("Error updating shaken reminders:", reminderError);
      // リマインダー更新エラーは車両更新を阻害しない
    }
  }
}

export async function removeCar(carId: string) {
  const u = auth.currentUser;
  if (!u) throw new Error("not signed in");
  await deleteDoc(doc(db, "users", u.uid, "cars", carId));
}
