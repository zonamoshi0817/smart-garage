// src/lib/storage.ts
"use client";
import { storage, auth } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject, uploadBytesResumable } from "firebase/storage";

/**
 * 画像ファイルをFirebase Storageにアップロードし、ダウンロードURLを取得
 */
export async function uploadCarImage(file: File, carId?: string): Promise<string> {
  console.log("=== UPLOAD START ===");
  console.log("File:", file.name, "Size:", file.size);
  
  const user = auth.currentUser;
  if (!user) {
    console.error("No user found");
    throw new Error("ユーザーがログインしていません");
  }
  
  console.log("User ID:", user.uid);

  try {
    // ファイル名を生成（タイムスタンプ + 元のファイル名）
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    
    // ストレージパスを生成
    const storagePath = carId 
      ? `users/${user.uid}/cars/${carId}/${fileName}`
      : `users/${user.uid}/temp/${fileName}`;
    
    console.log("Storage path:", storagePath);
    
    const storageRef = ref(storage, storagePath);
    console.log("Uploading to Firebase Storage...");
    
    // メタデータにownerUidとcontentTypeを追加（Storage Rulesで検証）
    const metadata = {
      contentType: file.type || 'image/png',
      customMetadata: {
        ownerUid: user.uid,
        uploadedAt: new Date().toISOString()
      }
    };
    
    const snapshot = await uploadBytes(storageRef, file, metadata);
    console.log("Upload successful:", snapshot.metadata.fullPath);
    
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log("Download URL:", downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error("Upload failed:", error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    throw new Error(`画像のアップロードに失敗しました: ${errorMessage}`);
  }
}

/**
 * 進捗監視付きで画像ファイルをアップロード
 */
export async function uploadCarImageWithProgress(
  file: File, 
  carId: string | undefined, 
  onProgress?: (progress: number) => void
): Promise<string> {
  console.log("=== UPLOAD WITH PROGRESS START ===");
  console.log("File:", file.name, "Size:", file.size);
  
  const user = auth.currentUser;
  if (!user) {
    console.error("No user found");
    throw new Error("ユーザーがログインしていません");
  }
  
  console.log("User ID:", user.uid);

  try {
    // ファイル名を生成（タイムスタンプ + 元のファイル名）
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    
    // ストレージパスを生成
    const storagePath = carId 
      ? `users/${user.uid}/cars/${carId}/${fileName}`
      : `users/${user.uid}/temp/${fileName}`;
    
    console.log("Storage path:", storagePath);
    
    const storageRef = ref(storage, storagePath);
    console.log("Starting resumable upload...");
    
    // メタデータにownerUidとcontentTypeを追加（Storage Rulesで検証）
    const metadata = {
      contentType: file.type || 'image/png',
      customMetadata: {
        ownerUid: user.uid,
        uploadedAt: new Date().toISOString()
      }
    };
    
    // 進捗監視付きアップロード
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);
    console.log("Upload task created");
  
    return new Promise((resolve, reject) => {
      // タイムアウトを設定（30秒）
      const timeout = setTimeout(() => {
        console.error("Upload timeout after 30 seconds");
        uploadTask.cancel();
        reject(new Error("アップロードがタイムアウトしました"));
      }, 30000);
      
      uploadTask.on('state_changed',
        (snapshot) => {
          console.log('Upload state changed:', snapshot.state);
          console.log('Bytes transferred:', snapshot.bytesTransferred);
          console.log('Total bytes:', snapshot.totalBytes);
          
          // 進捗を計算
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload progress:', progress + '%');
          
          // 進捗コールバックを呼び出し
          if (onProgress) {
            onProgress(progress);
          }
          
          // アップロードが完了したらタイムアウトをクリア
          if (snapshot.state === 'success') {
            clearTimeout(timeout);
          }
        },
        (error) => {
          console.error("Upload failed:", error);
          clearTimeout(timeout);
          reject(new Error(`画像のアップロードに失敗しました: ${error.message}`));
        },
        async () => {
          try {
            console.log("Upload completed, getting download URL...");
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log("Download URL:", downloadURL);
            clearTimeout(timeout);
            resolve(downloadURL);
          } catch (error) {
            console.error("Failed to get download URL:", error);
            clearTimeout(timeout);
            reject(new Error(`ダウンロードURLの取得に失敗しました: ${error}`));
          }
        }
      );
    });
  } catch (error) {
    console.error("Upload setup failed:", error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    throw new Error(`画像のアップロードに失敗しました: ${errorMessage}`);
  }
}

/**
 * 画像ファイルを削除
 */
export async function deleteCarImage(imageUrl: string): Promise<void> {
  try {
    // URLからストレージ参照を取得
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
    console.log("Image deleted successfully");
  } catch (error) {
    console.error("Delete failed:", error);
    // 削除に失敗してもエラーを投げない（既に削除されている可能性があるため）
  }
}

/**
 * ファイルが画像かどうかをチェック
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * ファイルサイズをチェック（最大5MB）
 */
export function validateFileSize(file: File, maxSizeMB: number = 5): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * 原本とサムネイルを両方アップロード（将来対応）
 * 現在は原本のみアップロード、将来的にCloud Functionsでサムネイル生成
 */
export async function uploadCarImageWithThumbnail(
  file: File,
  carId: string | undefined,
  onProgress?: (progress: number) => void
): Promise<{
  originalUrl: string;
  thumbnailUrl?: string;
}> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("ユーザーがログインしていません");
  }

  try {
    // 原本をアップロード
    const originalUrl = await uploadCarImageWithProgress(file, carId, onProgress);
    
    // 将来: Cloud Functions トリガでサムネイル自動生成
    // 現在は原本のみを返す
    return {
      originalUrl,
      thumbnailUrl: undefined  // 将来的にCloud Functionsで生成
    };
  } catch (error) {
    console.error("Upload with thumbnail failed:", error);
    throw error;
  }
}

/**
 * ストレージパス生成のヘルパー関数
 */
export function generateStoragePath(
  userId: string,
  carId: string | undefined,
  fileName: string,
  variant: 'original' | 'thumbnail' = 'original'
): string {
  const timestamp = Date.now();
  const prefix = variant === 'thumbnail' ? 'thumbnails/' : 'original/';
  
  if (carId) {
    return `users/${userId}/cars/${carId}/${prefix}${timestamp}_${fileName}`;
  } else {
    return `users/${userId}/temp/${prefix}${timestamp}_${fileName}`;
  }
}
