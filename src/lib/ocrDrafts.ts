// src/lib/ocrDrafts.ts
"use client";

import { db, auth } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import type { FuelLogDraft, MaintenanceDraft, InsurancePolicyDraft, FieldMetadata } from '@/types';

/**
 * 信頼度スコアの計算
 * Tesseract.jsのconfidenceスコアを0-1の範囲に正規化
 */
export function calculateConfidence(tesseractConfidence: number): number {
  // Tesseractは0-100の範囲なので、0-1に変換
  return Math.min(Math.max(tesseractConfidence / 100, 0), 1);
}

/**
 * フィールドが要確認かどうかを判定
 * 信頼度が閾値未満、または値が空の場合は要確認
 */
export function needsReview(metadata: FieldMetadata | undefined, value: any, threshold: number = 0.7): boolean {
  if (!value) return true;
  if (!metadata || metadata.source === 'user') return false;
  if (metadata.confidence === undefined) return true;
  return metadata.confidence < threshold;
}

/**
 * FuelLogDraftを作成
 */
export async function createFuelLogDraft(
  carId: string,
  ocrData: Partial<FuelLogDraft>,
  rawText: string,
  receiptImageUrl?: string
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');

  const draftData: Partial<FuelLogDraft> = {
    carId,
    ...ocrData,
    status: 'pending_review',
    ocrRawText: rawText,
    receiptImageUrl,
    ownerUid: user.uid,
    createdBy: user.uid,
    updatedBy: user.uid,
    deletedAt: null,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  const docRef = await addDoc(
    collection(db, 'users', user.uid, 'fuelLogDrafts'),
    draftData
  );

  return docRef.id;
}

/**
 * InsurancePolicyDraftを作成
 */
export async function createInsurancePolicyDraft(
  carId: string,
  ocrData: Partial<InsurancePolicyDraft>,
  rawText: string
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');

  const draftData: Partial<InsurancePolicyDraft> = {
    carId,
    ...ocrData,
    status: 'pending_review',
    ocrRawText: rawText,
    ownerUid: user.uid,
    createdBy: user.uid,
    updatedBy: user.uid,
    deletedAt: null,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  const docRef = await addDoc(
    collection(db, 'users', user.uid, 'insurancePolicyDrafts'),
    draftData
  );

  return docRef.id;
}

/**
 * MaintenanceDraftを作成
 */
export async function createMaintenanceDraft(
  carId: string,
  ocrData: Partial<MaintenanceDraft>,
  rawText: string
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');

  const draftData: Partial<MaintenanceDraft> = {
    carId,
    ...ocrData,
    status: 'pending_review',
    ocrRawText: rawText,
    ownerUid: user.uid,
    createdBy: user.uid,
    updatedBy: user.uid,
    deletedAt: null,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  const docRef = await addDoc(
    collection(db, 'users', user.uid, 'maintenanceDrafts'),
    draftData
  );

  return docRef.id;
}

/**
 * ドラフトを確定（正式データとして保存）
 */
export async function confirmDraft(draftId: string, draftType: 'fuel' | 'maintenance' | 'insurance'): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');

  const collectionName = draftType === 'fuel' 
    ? 'fuelLogDrafts' 
    : draftType === 'maintenance' 
    ? 'maintenanceDrafts' 
    : 'insurancePolicyDrafts';

  await updateDoc(doc(db, 'users', user.uid, collectionName, draftId), {
    status: 'confirmed',
    confirmedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * ドラフトを拒否（削除）
 */
export async function rejectDraft(draftId: string, draftType: 'fuel' | 'maintenance' | 'insurance'): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');

  const collectionName = draftType === 'fuel' 
    ? 'fuelLogDrafts' 
    : draftType === 'maintenance' 
    ? 'maintenanceDrafts' 
    : 'insurancePolicyDrafts';

  // 論理削除
  await updateDoc(doc(db, 'users', user.uid, collectionName, draftId), {
    status: 'rejected',
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * ドラフトを監視
 */
export function watchDrafts<T>(
  draftType: 'fuel' | 'maintenance' | 'insurance',
  callback: (drafts: T[]) => void
): () => void {
  const user = auth.currentUser;
  if (!user) {
    callback([]);
    return () => {};
  }

  const collectionName = draftType === 'fuel' 
    ? 'fuelLogDrafts' 
    : draftType === 'maintenance' 
    ? 'maintenanceDrafts' 
    : 'insurancePolicyDrafts';

  const q = query(
    collection(db, 'users', user.uid, collectionName),
    where('status', '==', 'pending_review'),
    where('deletedAt', '==', null)
  );

  return onSnapshot(q, (snapshot) => {
    const drafts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];
    
    callback(drafts);
  });
}

