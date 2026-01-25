/**
 * Evidenceコレクションへの自動登録処理
 * メンテナンス記録やカスタマイズ記録の画像から自動的にEvidenceを作成
 */

"use client";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Firebase StorageのダウンロードURLからストレージパスを抽出
 */
export function extractStoragePathFromUrl(downloadUrl: string): string | null {
  try {
    // Firebase StorageのURL形式: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media&token={token}
    const url = new URL(downloadUrl);
    if (url.hostname !== 'firebasestorage.googleapis.com') {
      return null;
    }
    
    const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
    if (!pathMatch) {
      return null;
    }
    
    // URLデコード
    const encodedPath = pathMatch[1];
    const decodedPath = decodeURIComponent(encodedPath);
    
    return decodedPath;
  } catch (error) {
    console.error('Failed to extract storage path from URL:', error);
    return null;
  }
}

/**
 * メンテナンス記録またはカスタマイズ記録の画像からEvidenceコレクションにレコードを作成
 */
export async function createEvidenceFromImage(
  userId: string,
  carId: string,
  recordId: string,
  imageUrl: string
): Promise<void> {
  const u = auth.currentUser;
  if (!u) {
    console.warn('User not authenticated, skipping evidence creation');
    return;
  }

  try {
    // ストレージパスを抽出
    const storagePath = extractStoragePathFromUrl(imageUrl);
    if (!storagePath) {
      console.warn('Failed to extract storage path from imageUrl:', imageUrl);
      // ストレージパスが抽出できない場合はスキップ
      return;
    }

    // 既存のEvidenceレコードをチェック（同じrecordIdで既に存在するか）
    const existingEvidencesQuery = query(
      collection(db, 'evidences'),
      where('recordId', '==', recordId),
      where('deletedAt', '==', null)
    );
    const existingSnapshot = await getDocs(existingEvidencesQuery);
    
    if (!existingSnapshot.empty) {
      // 既に存在する場合は更新
      const existingDoc = existingSnapshot.docs[0];
      await updateDoc(existingDoc.ref, {
        storagePath,
        updatedBy: u.uid,
        updatedAt: serverTimestamp(),
      });
      console.log('Updated existing evidence for record:', recordId);
      return;
    }

    // 新規作成
    const evidenceData = {
      vehicleId: carId,
      recordId: recordId,
      storagePath,
      maskStatus: 'none' as const,
      maskPolicyVersion: '1.0',
      ownerUid: u.uid,
      createdBy: u.uid,
      updatedBy: u.uid,
      deletedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await addDoc(collection(db, 'evidences'), evidenceData);
    console.log('Created evidence for record:', recordId);
  } catch (error) {
    console.error('Failed to create evidence from image:', error);
    // エラーが発生しても元の記録の保存は成功とする（エラーを再スローしない）
  }
}

/**
 * メンテナンス記録またはカスタマイズ記録の画像が削除された場合、対応するEvidenceを論理削除
 */
export async function deleteEvidenceForRecord(recordId: string): Promise<void> {
  const u = auth.currentUser;
  if (!u) {
    console.warn('User not authenticated, skipping evidence deletion');
    return;
  }

  try {
    const existingEvidencesQuery = query(
      collection(db, 'evidences'),
      where('recordId', '==', recordId),
      where('deletedAt', '==', null)
    );
    const existingSnapshot = await getDocs(existingEvidencesQuery);
    
    for (const evidenceDoc of existingSnapshot.docs) {
      await updateDoc(evidenceDoc.ref, {
        deletedAt: serverTimestamp(),
        updatedBy: u.uid,
        updatedAt: serverTimestamp(),
      });
    }
    
    if (!existingSnapshot.empty) {
      console.log('Deleted evidence for record:', recordId);
    }
  } catch (error) {
    console.error('Failed to delete evidence for record:', error);
    // エラーが発生しても元の記録の更新は成功とする
  }
}
