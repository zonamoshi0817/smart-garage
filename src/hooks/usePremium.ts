'use client';

import { useState, useEffect, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import { UserPlan, canUseFeature, PremiumFeature } from '@/lib/premium';

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

