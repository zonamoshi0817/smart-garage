/**
 * プラン変更API（有料→無料）
 * 
 * - Stripe のサブスクリプションを解約
 * - Firestore のプラン情報を更新
 * - データは保持される
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebaseAdmin';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { error: 'ID token is required' },
        { status: 400 }
      );
    }

    let auth, firestore;
    try {
      auth = getAdminAuth();
      firestore = getAdminFirestore();
    } catch (error: any) {
      console.error('[Plan Downgrade] Firebase Admin initialization error:', error);
      return NextResponse.json(
        { error: 'サーバー設定エラーが発生しました。管理者にお問い合わせください。' },
        { status: 500 }
      );
    }

    // ID Token を検証してユーザーIDを取得
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    console.log(`[Plan Downgrade] Starting downgrade for user: ${uid}`);

    // 1. Firestore からユーザー情報を取得
    const userRef = firestore.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User document not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const stripeCustomerId = userData?.stripeCustomerId;
    const subscriptionId = userData?.subscriptionId;

    // 2. Stripe のサブスクリプションを解約
    if (subscriptionId) {
      try {
        console.log(`[Plan Downgrade] Cancelling subscription: ${subscriptionId}`);
        await stripe.subscriptions.cancel(subscriptionId);
        console.log(`[Plan Downgrade] Cancelled subscription: ${subscriptionId}`);
      } catch (stripeError: any) {
        console.error(`[Plan Downgrade] Stripe cancellation error:`, stripeError);
        // サブスクリプションが見つからない場合は続行
        if (stripeError.code !== 'resource_missing') {
          throw stripeError;
        }
      }
    } else if (stripeCustomerId) {
      // subscriptionIdがない場合は、顧客IDからサブスクリプションを検索
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: 'active',
        });

        for (const subscription of subscriptions.data) {
          console.log(`[Plan Downgrade] Cancelling subscription: ${subscription.id}`);
          await stripe.subscriptions.cancel(subscription.id);
          console.log(`[Plan Downgrade] Cancelled subscription: ${subscription.id}`);
        }
      } catch (stripeError: any) {
        console.error(`[Plan Downgrade] Stripe cancellation error:`, stripeError);
        throw stripeError;
      }
    }

    // 3. Firestore のプラン情報を更新
    await userRef.update({
      plan: 'free',
      subscriptionStatus: null,
      subscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    });

    console.log(`[Plan Downgrade] Successfully downgraded user: ${uid} to free plan`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Plan Downgrade] Error:', error);
    return NextResponse.json(
      { error: error.message || 'プラン変更に失敗しました' },
      { status: 500 }
    );
  }
}

