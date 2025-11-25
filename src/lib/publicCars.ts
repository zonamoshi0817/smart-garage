// src/lib/publicCars.ts
"use client";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import type { Car, Customization, MaintenanceRecord } from "@/types";
import { timestampToDate } from "./converters";

export interface PublicCarData {
  carId: string;
  userId: string;
  name: string;
  modelCode?: string;
  year?: number;
  odoKm?: number;
  imagePath?: string;
  publicTagline?: string;
  ownerHandle?: string;
  ownerRegion?: string;
  ownerPicks?: string[];
  ownerSocialLinks?: { instagram?: string; twitter?: string };
  driveType?: 'FF' | 'FR' | '4WD' | 'MR' | 'RR' | 'AWD';
  transmission?: string;
  bodyColor?: string;
  ownedSince?: any; // Timestamp
  updatedAt?: any; // Timestamp
}

/**
 * 公開マイカーページのデータを取得
 */
export async function getPublicCarData(carId: string): Promise<{
  car: Car | null;
  customizations: Customization[];
  maintenanceRecords: MaintenanceRecord[];
} | null> {
  try {
    // publicCarsコレクションから車両情報を取得
    const publicCarRef = doc(db, "publicCars", carId);
    const publicCarSnap = await getDoc(publicCarRef);
    
    if (!publicCarSnap.exists()) {
      return null;
    }
    
    const publicCarData = publicCarSnap.data() as PublicCarData;
    
    // 元の車両データを取得
    const carRef = doc(db, "users", publicCarData.userId, "cars", carId);
    const carSnap = await getDoc(carRef);
    
    if (!carSnap.exists()) {
      return null;
    }
    
    const carData = carSnap.data();
    
    // 公開設定がOFFの場合はnullを返す
    if (!carData.isPublic) {
      return null;
    }
    
    // Carオブジェクトを構築
    const car: Car = {
      id: carSnap.id,
      name: carData.name,
      modelCode: carData.modelCode,
      year: carData.year,
      odoKm: carData.odoKm,
      imagePath: carData.imagePath,
      inspectionExpiry: carData.inspectionExpiry,
      firstRegYm: carData.firstRegYm,
      avgKmPerMonth: carData.avgKmPerMonth,
      vehicleClass: carData.vehicleClass,
      status: carData.status,
      soldDate: carData.soldDate,
      soldPrice: carData.soldPrice,
      soldTo: carData.soldTo,
      soldNotes: carData.soldNotes,
      downgradedAt: carData.downgradedAt,
      chassisNumber: carData.chassisNumber,
      registrationNumber: carData.registrationNumber,
      bodyType: carData.bodyType,
      // 公開設定フィールド
      isPublic: carData.isPublic,
      publicTagline: publicCarData.publicTagline,
      ownerHandle: publicCarData.ownerHandle,
      ownerRegion: publicCarData.ownerRegion,
      ownerPicks: publicCarData.ownerPicks,
      ownerSocialLinks: publicCarData.ownerSocialLinks,
      driveType: publicCarData.driveType || carData.driveType,
      transmission: publicCarData.transmission || carData.transmission,
      bodyColor: publicCarData.bodyColor || carData.bodyColor,
      ownedSince: publicCarData.ownedSince || carData.ownedSince,
      ownerUid: carData.ownerUid,
      createdBy: carData.createdBy,
      updatedBy: carData.updatedBy,
      deletedAt: carData.deletedAt,
      createdAt: carData.createdAt,
      updatedAt: carData.updatedAt,
    };
    
    // 公開設定されているカスタマイズを取得
    const customizationsRef = collection(db, "users", publicCarData.userId, "cars", carId, "customizations");
    const customizationsQuery = query(
      customizationsRef,
      where("isPublic", "==", true),
      where("deletedAt", "==", null)
    );
    const customizationsSnap = await getDocs(customizationsQuery);
    
    const customizations: Customization[] = customizationsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        carId: data.carId,
        title: data.title,
        brand: data.brand,
        modelCode: data.modelCode,
        categories: data.categories,
        status: data.status,
        date: data.date,
        odoKm: data.odoKm,
        vendorType: data.vendorType,
        vendorName: data.vendorName,
        partsCostJpy: data.partsCostJpy,
        laborCostJpy: data.laborCostJpy,
        otherCostJpy: data.otherCostJpy,
        currency: data.currency,
        link: data.link,
        memo: data.memo,
        isPublic: data.isPublic,
        ownerUid: data.ownerUid,
        createdBy: data.createdBy,
        updatedBy: data.updatedBy,
        deletedAt: data.deletedAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as Customization;
    });
    
    // メンテナンス記録を取得（最新10件）
    // メンテナンス記録は users/{userId}/maintenance に保存され、carIdでフィルタリング
    const maintenanceRef = collection(db, "users", publicCarData.userId, "maintenance");
    const maintenanceQuery = query(
      maintenanceRef,
      where("carId", "==", carId),
      where("deletedAt", "==", null)
    );
    const maintenanceSnap = await getDocs(maintenanceQuery);
    
    const maintenanceRecords: MaintenanceRecord[] = maintenanceSnap.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          carId: data.carId,
          title: data.title,
          description: data.description,
          cost: data.cost,
          mileage: data.mileage,
          date: data.date,
          location: data.location,
          items: data.items,
          attachments: data.attachments,
          ownerUid: data.ownerUid,
          createdBy: data.createdBy,
          updatedBy: data.updatedBy,
          deletedAt: data.deletedAt,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as MaintenanceRecord;
      })
      .sort((a, b) => {
        const aDate = timestampToDate(a.date)?.getTime() || 0;
        const bDate = timestampToDate(b.date)?.getTime() || 0;
        return bDate - aDate;
      })
      .slice(0, 10);
    
    return {
      car,
      customizations,
      maintenanceRecords,
    };
  } catch (error) {
    console.error("Error fetching public car data:", error);
    return null;
  }
}

