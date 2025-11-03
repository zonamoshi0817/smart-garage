'use client';

import { useState, useEffect, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { UserPlan, canUseFeature, PremiumFeature } from '@/lib/premium';
import { isPremiumPlan, isSubscriptionActive } from '@/lib/plan';
import type { UserDocument, SubscriptionStatus } from '@/types';

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
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | undefined>();
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<Date | undefined>();
  const [stripeCustomerId, setStripeCustomerId] = useState<string | undefined>();
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState<boolean>(false);
  
  useEffect(() => {
    // 認証状態の変化を監視
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        setUserPlan('free');
        setIsLoading(false);
        return;
      }

      // 開発モードで全員プレミアムにする場合（環境変数で制御）
      if (process.env.NEXT_PUBLIC_DEV_ALL_PREMIUM === 'true') {
        console.log('[Premium] Dev mode: All users are premium');
        setUserPlan('premium_monthly'); // 'premium' から変更
        setIsLoading(false);
        return;
      }

      // 開発者アカウントは自動的にプレミアムプラン
      if (user.email && DEVELOPER_EMAILS.includes(user.email.toLowerCase())) {
        console.log('[Premium] Developer account detected:', user.email);
        setUserPlan('premium_monthly'); // 'premium' から変更
        setIsLoading(false);
        return;
      }

      // Firestore からプラン情報をリアルタイム取得
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeSnapshot = onSnapshot(
        userDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as Partial<UserDocument>;
            
            // プラン情報を取得
            const plan = data.plan || 'free';
            const status = data.subscriptionStatus;
            const periodEnd = data.currentPeriodEnd;
            
            // サブスクリプションがアクティブでない場合は無料プランに戻す
            if (isPremiumPlan(plan) && status && !isSubscriptionActive(status)) {
              console.log('[Premium] Subscription not active, reverting to free:', status);
              setUserPlan('free');
            } else {
              setUserPlan(plan);
            }
            
            setSubscriptionStatus(status);
            setCurrentPeriodEnd(
              periodEnd ? (periodEnd instanceof Date ? periodEnd : periodEnd.toDate()) : undefined
            );
            setStripeCustomerId(data.stripeCustomerId);
            setCancelAtPeriodEnd(data.cancelAtPeriodEnd || false);
          } else {
            // ドキュメントが存在しない場合は無料プラン
            setUserPlan('free');
          }
          
          setIsLoading(false);
        },
        (error) => {
          console.error('[Premium] Error fetching user plan:', error);
          setUserPlan('free');
          setIsLoading(false);
        }
      );

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribe();
  }, []);

  return {
    userPlan,
    isLoading,
    subscriptionStatus,
    currentPeriodEnd,
    stripeCustomerId,
    cancelAtPeriodEnd,
    isPremium: isPremiumPlan(userPlan),
  };
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

