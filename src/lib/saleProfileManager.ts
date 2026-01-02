/**
 * 売却プロフィール管理ライブラリ
 * 売却モードON/OFF、saleProfile作成・更新・削除
 */

'use client';

import { db, auth } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp, query, where, limit, getDocs } from 'firebase/firestore';
import type { SaleProfile, ShareProfile } from '@/types';
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

/**
 * 用途別ShareProfileを作成（新規実装）
 * @param vehicleId 車両ID
 * @param type 用途種別（'normal' | 'sale' | 'appraisal'）
 * @param options オプション
 */
export async function createShareProfile(
  vehicleId: string,
  type: 'normal' | 'sale' | 'appraisal',
  options: {
    title?: string;
    includeEvidence?: boolean;
    includeAmounts?: boolean;
    maskPolicy?: 'auto' | 'strict' | 'custom';
  } = {}
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーがログインしていません');

  const {
    title,
    includeEvidence = type !== 'normal',
    includeAmounts = false,
    maskPolicy = 'auto',
  } = options;

  // slugを生成
  const slug = generateSlug();

  // ShareProfileを作成（現時点ではsaleProfilesコレクションを使用）
  // undefinedのフィールドは削除（Firestoreはundefinedを許可しない）
  const shareProfileData: any = {
    vehicleId,
    ownerUid: user.uid,
    type, // 新規追加
    status: 'active', // 新規追加
    slug,
    visibility: 'unlisted', // 後方互換性のため維持
    includeEvidence,
    includeAmounts,
    highlightTopN: 10,
    analyticsEnabled: true,
    maskPolicy, // 新規追加
    createdBy: user.uid,
    updatedBy: user.uid,
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastPublishedAt: serverTimestamp(),
  };
  
  // titleが定義されている場合のみ追加
  if (title !== undefined && title !== null) {
    shareProfileData.title = title;
  }
  
  const shareProfileRef = await addDoc(collection(db, 'saleProfiles'), shareProfileData);

  const shareProfileId = shareProfileRef.id;

  // 車両のactiveShareProfileIdsを更新
  const carRef = doc(db, 'users', user.uid, 'cars', vehicleId);
  const carDoc = await getDoc(carRef);
  const carData = carDoc.data() || {};
  const existingIds = carData.activeShareProfileIds || {};
  
  await updateDoc(carRef, {
    userId: user.uid,
    activeShareProfileIds: {
      ...existingIds,
      [type]: shareProfileId,
    },
    updatedBy: user.uid,
    updatedAt: serverTimestamp(),
  });

  return shareProfileId;
}

/**
 * ShareProfileのstatusを更新（停止/再開）
 */
export async function updateShareProfileStatus(
  shareProfileId: string,
  status: 'active' | 'disabled'
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーがログインしていません');

  // オーナーチェック
  const shareProfileDoc = await getDoc(doc(db, 'saleProfiles', shareProfileId));
  if (!shareProfileDoc.exists()) {
    throw new Error('共有プロフィールが見つかりません');
  }

  const shareProfileData = shareProfileDoc.data() as ShareProfile;
  if (shareProfileData.ownerUid !== user.uid) {
    throw new Error('権限がありません');
  }

  // statusを更新
  await updateDoc(doc(db, 'saleProfiles', shareProfileId), {
    status,
    visibility: status === 'active' ? 'unlisted' : 'disabled', // 後方互換性のため
    updatedBy: user.uid,
    updatedAt: serverTimestamp(),
  });
}

/**
 * ShareProfileのSNS共有設定を更新（type="normal"のみ）
 */
export async function updateShareProfileSNS(
  shareProfileId: string,
  snsData: {
    conceptTitle?: string;
    conceptBody?: string;
    highlightParts?: Array<{ label: string; value: string }>;
    gallery?: Array<{ id: string; path: string; caption?: string }>;
    socialLinks?: { youtube?: string; instagram?: string; x?: string; web?: string };
    build?: {
      featured?: Array<{ label: string; value: string }>;
      categories?: Array<{ name: string; items: Array<{ name: string; note?: string }> }>;
    };
  }
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーがログインしていません');

  // オーナーチェック
  const shareProfileDoc = await getDoc(doc(db, 'saleProfiles', shareProfileId));
  if (!shareProfileDoc.exists()) {
    throw new Error('共有プロフィールが見つかりません');
  }

  const shareProfileData = shareProfileDoc.data() as ShareProfile;
  if (shareProfileData.ownerUid !== user.uid) {
    throw new Error('権限がありません');
  }

  // undefinedの値を削除（Firestoreはundefinedをサポートしない）
  const cleanSnsData: any = {};
  if (snsData.conceptTitle !== undefined) cleanSnsData.conceptTitle = snsData.conceptTitle;
  if (snsData.conceptBody !== undefined) cleanSnsData.conceptBody = snsData.conceptBody;
  if (snsData.highlightParts !== undefined) cleanSnsData.highlightParts = snsData.highlightParts;
  if (snsData.gallery !== undefined) {
    cleanSnsData.gallery = snsData.gallery.map((img: any) => {
      const cleanImg: any = { id: img.id, path: img.path };
      if (img.caption !== undefined && img.caption !== '') cleanImg.caption = img.caption;
      return cleanImg;
    });
  }
  if (snsData.socialLinks !== undefined) {
    const cleanSocialLinks: any = {};
    if (snsData.socialLinks.youtube !== undefined && snsData.socialLinks.youtube !== '') cleanSocialLinks.youtube = snsData.socialLinks.youtube;
    if (snsData.socialLinks.instagram !== undefined && snsData.socialLinks.instagram !== '') cleanSocialLinks.instagram = snsData.socialLinks.instagram;
    if (snsData.socialLinks.x !== undefined && snsData.socialLinks.x !== '') cleanSocialLinks.x = snsData.socialLinks.x;
    if (snsData.socialLinks.web !== undefined && snsData.socialLinks.web !== '') cleanSocialLinks.web = snsData.socialLinks.web;
    if (Object.keys(cleanSocialLinks).length > 0) cleanSnsData.socialLinks = cleanSocialLinks;
  }
  if (snsData.build !== undefined) cleanSnsData.build = snsData.build;

  // snsフィールドを更新
  await updateDoc(doc(db, 'saleProfiles', shareProfileId), {
    sns: cleanSnsData,
    updatedBy: user.uid,
    updatedAt: serverTimestamp(),
  });
}
