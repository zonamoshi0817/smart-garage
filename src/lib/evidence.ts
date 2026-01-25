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

/**
 * 既存のメンテナンス記録とカスタマイズ記録をスキャンして、画像があるのにEvidenceが登録されていないものを登録
 */
export async function backfillEvidenceForExistingRecords(): Promise<{
  maintenanceCreated: number;
  customizationCreated: number;
  errors: number;
}> {
  const u = auth.currentUser;
  if (!u) {
    throw new Error('ユーザーがログインしていません');
  }

  let maintenanceCreated = 0;
  let customizationCreated = 0;
  let errors = 0;

  try {
    // 既存のEvidenceレコードのrecordIdを取得（重複チェック用）
    const allEvidencesQuery = query(
      collection(db, 'evidences'),
      where('deletedAt', '==', null)
    );
    const allEvidencesSnapshot = await getDocs(allEvidencesQuery);
    const existingRecordIds = new Set<string>();
    allEvidencesSnapshot.forEach(doc => {
      const recordId = doc.data().recordId;
      if (recordId) {
        existingRecordIds.add(recordId);
      }
    });

    // メンテナンス記録をスキャン
    try {
      const maintenanceQuery = query(
        collection(db, 'users', u.uid, 'maintenance'),
        where('deletedAt', '==', null)
      );
      const maintenanceSnapshot = await getDocs(maintenanceQuery);
      
      for (const doc of maintenanceSnapshot.docs) {
        const data = doc.data();
        const recordId = doc.id;
        const imageUrl = data.imageUrl;
        const carId = data.carId;

        if (imageUrl && carId && !existingRecordIds.has(recordId)) {
          try {
            await createEvidenceFromImage(u.uid, carId, recordId, imageUrl);
            maintenanceCreated++;
            existingRecordIds.add(recordId); // 重複チェック用に追加
          } catch (error) {
            console.error(`Failed to create evidence for maintenance record ${recordId}:`, error);
            errors++;
          }
        }
      }
    } catch (error) {
      console.error('Failed to scan maintenance records:', error);
      errors++;
    }

    // カスタマイズ記録をスキャン（全車両）
    try {
      const carsQuery = query(
        collection(db, 'users', u.uid, 'cars'),
        where('deletedAt', '==', null)
      );
      const carsSnapshot = await getDocs(carsQuery);
      
      for (const carDoc of carsSnapshot.docs) {
        const carId = carDoc.id;
        try {
          const customizationsQuery = query(
            collection(db, 'users', u.uid, 'cars', carId, 'customizations'),
            where('deletedAt', '==', null)
          );
          const customizationsSnapshot = await getDocs(customizationsQuery);
          
          for (const doc of customizationsSnapshot.docs) {
            const data = doc.data();
            const recordId = doc.id;
            const imageUrl = data.imageUrl;

            if (imageUrl && !existingRecordIds.has(recordId)) {
              try {
                await createEvidenceFromImage(u.uid, carId, recordId, imageUrl);
                customizationCreated++;
                existingRecordIds.add(recordId); // 重複チェック用に追加
              } catch (error) {
                console.error(`Failed to create evidence for customization ${recordId}:`, error);
                errors++;
              }
            }
          }
        } catch (error) {
          console.error(`Failed to scan customizations for car ${carId}:`, error);
          errors++;
        }
      }
    } catch (error) {
      console.error('Failed to scan customization records:', error);
      errors++;
    }

    console.log(`Backfill completed: ${maintenanceCreated} maintenance, ${customizationCreated} customizations, ${errors} errors`);
    return { maintenanceCreated, customizationCreated, errors };
  } catch (error) {
    console.error('Backfill failed:', error);
    throw error;
  }
}
