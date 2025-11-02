'use client';

import { useState, useEffect, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import { UserPlan, canUseFeature, PremiumFeature } from '@/lib/premium';

// 開発者アカウント（プレミアムプラン）
// 環境変数またはハードコードで設定
const DEVELOPER_EMAILS = (
  process.env.NEXT_PUBLIC_DEVELOPER_EMAILS?.split(',').map(e => e.trim()) || [
    'kentakobayashi@example.com',
    'kentakobayashi@gmail.com',
    // 他の開発者メールアドレスをここに追加
  ]
);

/**
 * プレミアムプランの状態を管理するフック
 */
export function usePremium() {
  const [userPlan, setUserPlan] = useState<UserPlan>('free');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setUserPlan('free');
      setIsLoading(false);
      return;
    }

    // 開発モードで全員プレミアムにする場合（環境変数で制御）
    if (process.env.NEXT_PUBLIC_DEV_ALL_PREMIUM === 'true') {
      console.log('[Premium] Dev mode: All users are premium');
      setUserPlan('premium');
      setIsLoading(false);
      return;
    }

    // 開発者アカウントは自動的にプレミアムプラン
    if (user.email && DEVELOPER_EMAILS.includes(user.email.toLowerCase())) {
      console.log('[Premium] Developer account detected:', user.email);
      setUserPlan('premium');
      setIsLoading(false);
      return;
    }

    // TODO: Firestoreから実際のプラン情報を取得
    // 現在は開発用として全員無料プラン
    setUserPlan('free');
    setIsLoading(false);
  }, []);

  return { userPlan, isLoading };
}

/**
 * プレミアム機能のガード機能を提供するフック
 */
export function usePremiumGuard() {
  const { userPlan } = usePremium();
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<PremiumFeature | undefined>();
  const [paywallVariant, setPaywallVariant] = useState<'default' | 'minimal' | 'hero'>('default');

  /**
   * プレミアム機能の使用をチェックし、必要に応じてペイウォールを表示
   */
  const checkFeature = useCallback(
    (
      feature: PremiumFeature,
      currentUsage?: { [key: string]: number },
      variant: 'default' | 'minimal' | 'hero' = 'default'
    ): boolean => {
      const result = canUseFeature(feature, userPlan, currentUsage);
      
      if (!result.canUse && result.upgradeRequired) {
        setPaywallFeature(feature);
        setPaywallVariant(variant);
        setShowPaywall(true);
        return false;
      }
      
      return true;
    },
    [userPlan]
  );

  const closePaywall = useCallback(() => {
    setShowPaywall(false);
    setPaywallFeature(undefined);
  }, []);

  return {
    userPlan,
    checkFeature,
    showPaywall,
    closePaywall,
    paywallFeature,
    paywallVariant
  };
}

