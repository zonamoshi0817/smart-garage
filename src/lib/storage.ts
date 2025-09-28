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

  // Firebase Storage の料金プランアップグレードが必要な場合の警告
  console.warn("⚠️ Firebase Storage の料金プランアップグレードが必要です");
  console.warn("現在はデフォルト画像を返します");
  
  // 一時的にデフォルト画像を返す（Storage プランアップグレードまで）
  return "/car.jpg";
  
  /* Storage プランアップグレード後に有効化
  // ファイル名を生成（タイムスタンプ + 元のファイル名）
  const timestamp = Date.now();
  const fileName = `${timestamp}_${file.name}`;
  
  // ストレージパスを生成
  const storagePath = carId 
    ? `users/${user.uid}/cars/${carId}/${fileName}`
    : `users/${user.uid}/temp/${fileName}`;
  
  console.log("Storage path:", storagePath);
  
  const storageRef = ref(storage, storagePath);
  console.log("Storage ref created");
  
  try {
    console.log("Starting upload...");
    // ファイルをアップロード
    const snapshot = await uploadBytes(storageRef, file);
    console.log("Upload successful:", snapshot.metadata.fullPath);
    
    console.log("Getting download URL...");
    // ダウンロードURLを取得
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log("Download URL:", downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error("Upload failed:", error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    console.error("Error details:", {
      code: (error as any)?.code,
      message: errorMessage,
      stack: (error as any)?.stack
    });
    throw new Error(`画像のアップロードに失敗しました: ${errorMessage}`);
  }
  */
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

  // Firebase Storage の料金プランアップグレードが必要な場合の警告
  console.warn("⚠️ Firebase Storage の料金プランアップグレードが必要です");
  console.warn("現在はデフォルト画像を返します");
  
  // 進捗をシミュレート（100%まで）
  if (onProgress) {
    onProgress(100);
  }
  
  // 一時的にデフォルト画像を返す（Storage プランアップグレードまで）
  return "/car.jpg";
  
  /* Storage プランアップグレード後に有効化
  // ファイル名を生成（タイムスタンプ + 元のファイル名）
  const timestamp = Date.now();
  const fileName = `${timestamp}_${file.name}`;
  
  // ストレージパスを生成
  const storagePath = carId 
    ? `users/${user.uid}/cars/${carId}/${fileName}`
    : `users/${user.uid}/temp/${fileName}`;
  
  console.log("Storage path:", storagePath);
  
  const storageRef = ref(storage, storagePath);
  console.log("Storage ref created");
  
  try {
    console.log("Starting resumable upload...");
    
    // 進捗監視付きアップロード
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          // 進捗を計算
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload progress:', progress + '%');
          
          // 進捗コールバックを呼び出し
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          console.error("Upload failed:", error);
          reject(new Error(`画像のアップロードに失敗しました: ${error.message}`));
        },
        async () => {
          try {
            console.log("Upload completed, getting download URL...");
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log("Download URL:", downloadURL);
            resolve(downloadURL);
          } catch (error) {
            console.error("Failed to get download URL:", error);
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
  */
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
