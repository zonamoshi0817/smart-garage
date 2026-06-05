"use client";

import type { Car } from "@/types";

/**
 * オリジンを取得（ブラウザ環境でのみ）
 */
export function getOrigin(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

/**
 * 車両に最適な共有URLを取得（優先順位に従う）
 * 
 * 優先順位：
 * 1. /s/{slug}（activeShareProfileIds.normal から取得）
 * 2. /c/{publicVanityUrl} または /c/{carId}（car.isPublic === true の場合のみ）
 * 3. window.location.href（フォールバック）
 */
export async function getBestShareUrlForCar(car: Car): Promise<string> {
  const origin = getOrigin();
  
  // 優先順位1: /s/{slug}（ShareProfile.slug）
  if (car.activeShareProfileIds?.normal) {
    try {
      const { db } = await import("@/lib/firebase");
      const { doc, getDoc } = await import("firebase/firestore");
      
      const profileId = car.activeShareProfileIds.normal;
      const profileDoc = await getDoc(doc(db, "saleProfiles", profileId));
      
      if (profileDoc.exists()) {
        const profileData = profileDoc.data();
        const slug = profileData.slug;
        
        if (slug && typeof slug === 'string') {
          return `${origin}/s/${slug}`;
        }
      }
    } catch (error) {
      console.error('Failed to get ShareProfile slug:', error);
      // エラー時は次の優先順位にフォールバック
    }
  }
  
  // 優先順位2: /c/{publicVanityUrl} または /c/{carId}（car.isPublic === true の場合のみ）
  if (car.isPublic === true) {
    if (car.publicVanityUrl && typeof car.publicVanityUrl === 'string') {
      return `${origin}/c/${car.publicVanityUrl}`;
    }
    if (car.id) {
      return `${origin}/c/${car.id}`;
    }
  }
  
  // 優先順位3: window.location.href（フォールバック）
  if (typeof window !== 'undefined') {
    return window.location.href;
  }
  
  // 最後のフォールバック（SSR環境など）
  return origin || '';
}
