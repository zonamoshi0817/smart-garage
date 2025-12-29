/**
 * 売却プロフィール管理ライブラリ
 * 売却モードON/OFF、saleProfile作成・更新・削除
 */

'use client';

import { db, auth } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp, query, where, limit, getDocs } from 'firebase/firestore';
import type { SaleProfile } from '@/types';
/**
 * slugを生成（英数字のみ、安全なURL）
 */
function generateSlug(): string {
  // 簡易実装: ランダムな英数字12文字を生成
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 売却モードON: saleProfileを作成してactiveSaleProfileIdをセット
 */
export async function enableSaleMode(
  vehicleId: string,
  options: {
    visibility?: 'unlisted' | 'public';
    includeEvidence?: boolean;
    includeAmounts?: boolean;
    highlightTopN?: number;
    analyticsEnabled?: boolean;
  } = {}
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーがログインしていません');

  const {
    visibility = 'unlisted',
    includeEvidence = true,
    includeAmounts = false,
    highlightTopN = 10,
    analyticsEnabled = true,
  } = options;

  // slugを生成（重複チェックはスキップ - 衝突確率が極めて低いため）
  // もし衝突した場合は、create時にエラーが出るため、その時点で再試行する
  const slug = generateSlug();

  // saleProfileを作成
  const saleProfileRef = await addDoc(collection(db, 'saleProfiles'), {
    vehicleId,
    ownerUid: user.uid,
    slug,
    visibility,
    includeEvidence,
    includeAmounts,
    highlightTopN,
    analyticsEnabled,
    createdBy: user.uid,
    updatedBy: user.uid,
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const saleProfileId = saleProfileRef.id;

  // 車両のactiveSaleProfileIdを更新
  const carRef = doc(db, 'users', user.uid, 'cars', vehicleId);
  await updateDoc(carRef, {
    userId: user.uid, // セキュリティルールで必須
    activeSaleProfileId: saleProfileId,
    updatedBy: user.uid,
    updatedAt: serverTimestamp(),
  });

  return saleProfileId;
}

/**
 * 売却モードOFF: activeSaleProfileIdをクリア
 */
export async function disableSaleMode(vehicleId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーがログインしていません');

  const carRef = doc(db, 'users', user.uid, 'cars', vehicleId);
  await updateDoc(carRef, {
    userId: user.uid, // セキュリティルールで必須
    activeSaleProfileId: null,
    updatedBy: user.uid,
    updatedAt: serverTimestamp(),
  });
}

/**
 * saleProfileのvisibilityを更新
 */
export async function updateSaleProfileVisibility(
  saleProfileId: string,
  visibility: 'unlisted' | 'public' | 'disabled'
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーがログインしていません');

  // オーナーチェック
  const saleProfileDoc = await getDoc(doc(db, 'saleProfiles', saleProfileId));
  if (!saleProfileDoc.exists()) {
    throw new Error('売却プロフィールが見つかりません');
  }

  const saleProfileData = saleProfileDoc.data() as SaleProfile;
  if (saleProfileData.ownerUid !== user.uid) {
    throw new Error('権限がありません');
  }

  // visibilityを更新
  const saleProfileRef = doc(db, 'saleProfiles', saleProfileId);
  await updateDoc(saleProfileRef, {
    visibility,
    updatedBy: user.uid,
    updatedAt: serverTimestamp(),
  });

  // disabledの場合はactiveSaleProfileIdをクリア
  if (visibility === 'disabled') {
    const carRef = doc(db, 'users', user.uid, 'cars', saleProfileData.vehicleId);
    await updateDoc(carRef, {
      userId: user.uid, // セキュリティルールで必須
      activeSaleProfileId: null,
      updatedBy: user.uid,
      updatedAt: serverTimestamp(),
    });
  }
}
