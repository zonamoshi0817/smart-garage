/**
 * Stripe Webhook ハンドラー
 * 
 * Stripe のイベント（サブスクリプション作成、更新、削除など）を受け取り、
 * Firestore のユーザードキュメントを更新する
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { constructWebhookEvent } from '@/lib/stripe';
import { planFromPriceId } from '@/lib/plan';
import {
  getAdminFirestore,
  updateUserDocument,
  findUserByCustomerId,
} from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Webhook Secret を取得
 */
function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  }
  return secret;
}

/**
 * Checkout セッション完了時の処理
 */
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  console.log('🎉 Checkout session completed:', session.id);

  const uid = session.client_reference_id;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!uid) {
    console.error('No client_reference_id (Firebase UID) found in session');
    return;
  }

  // ユーザードキュメントに Stripe 情報を保存
  await updateUserDocument(uid, {
    stripeCustomerId: customerId,
    subscriptionId: subscriptionId,
    updatedAt: new Date(),
  });

  console.log(`✅ Updated user ${uid} with Stripe info`);
}

/**
 * サブスクリプション作成・更新時の処理
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  console.log('🔄 Subscription updated:', subscription.id);

  const customerId = subscription.customer as string;
  const status = subscription.status;
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  const cancelAtPeriodEnd = subscription.cancel_at_period_end;

  // Price ID からプランを判定
  const priceId = subscription.items.data[0]?.price?.id;
  const plan = priceId ? planFromPriceId(priceId) : 'free';

  // Customer ID からユーザーを検索
  const user = await findUserByCustomerId(customerId);
  if (!user) {
    console.error(`No user found for customer ${customerId}`);
    return;
  }

  // 既存プランを確認（アップグレード/ダウングレード検知）
  const userData = user.data as any;
  const previousPlan = userData?.plan || 'free';
  const isPreviousPremium = previousPlan !== 'free';
  const isNowPremium = plan !== 'free';

  // プレミアムからの復帰時: downgraded車両を自動的にactiveに戻す
  if (!isPreviousPremium && isNowPremium) {
    console.log(`User ${user.uid} upgraded to premium, restoring downgraded vehicles`);
    await restoreDowngradedVehicles(user.uid);
  }

  // ユーザードキュメントを更新
  await updateUserDocument(user.uid, {
    plan,
    subscriptionStatus: status,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    priceId,
    updatedAt: new Date(),
  });

  console.log(`✅ Updated user ${user.uid} with plan ${plan} and status ${status}`);
}

/**
 * サブスクリプション削除時の処理
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('❌ Subscription deleted:', subscription.id);

  const customerId = subscription.customer as string;

  // Customer ID からユーザーを検索
  const user = await findUserByCustomerId(customerId);
  if (!user) {
    console.error(`No user found for customer ${customerId}`);
    return;
  }

  // ダウングレード時の車両処理: 2台目以降を自動的にReadOnlyに
  await handleDowngradeVehicles(user.uid);

  // ユーザードキュメントを更新（無料プランに戻す）
  await updateUserDocument(user.uid, {
    plan: 'free',
    subscriptionStatus: 'canceled',
    cancelAtPeriodEnd: false,
    updatedAt: new Date(),
  });

  console.log(`✅ Reverted user ${user.uid} to free plan with downgrade handling`);
}

/**
 * ダウングレード時の車両処理
 * 2台目以降の車両を自動的にReadOnly状態にする
 */
async function handleDowngradeVehicles(userId: string) {
  const db = getAdminFirestore();
  
  try {
    // ユーザーの全車両を取得（アクティブな車両のみ）
    const carsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('cars')
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'asc')
      .get();
    
    if (carsSnapshot.empty || carsSnapshot.size <= 1) {
      console.log(`User ${userId} has ${carsSnapshot.size} cars, no downgrade action needed`);
      return;
    }
    
    // アクティブな車両のみをフィルタ（sold/scrappedは除外）
    const activeCars = carsSnapshot.docs.filter(doc => {
      const data = doc.data();
      return !data.status || data.status === 'active';
    });
    
    if (activeCars.length <= 1) {
      console.log(`User ${userId} has only ${activeCars.length} active cars, no downgrade action needed`);
      return;
    }
    
    // 1台目以外をReadOnlyステータスに（売却済みとは異なる新ステータス）
    const batch = db.batch();
    let downgradedCount = 0;
    
    activeCars.forEach((doc, index) => {
      if (index === 0) {
        // 1台目はそのまま（アクティブ維持）
        return;
      }
      
      // 2台目以降: downgraded_premiumステータスに変更
      // 注意: 'sold'/'scrapped'とは別の専用ステータス
      const carRef = db.collection('users').doc(userId).collection('cars').doc(doc.id);
      batch.update(carRef, {
        status: 'downgraded_premium', // 新ステータス
        downgradedAt: new Date(),
        updatedAt: new Date(),
      });
      downgradedCount++;
    });
    
    if (downgradedCount > 0) {
      await batch.commit();
      console.log(`✅ Downgraded ${downgradedCount} vehicles for user ${userId} (2nd+ cars marked as downgraded_premium)`);
    }
  } catch (error) {
    console.error(`Failed to handle downgrade for user ${userId}:`, error);
    // エラーでも処理は続行（車両のダウングレードは補助的な処理）
  }
}

/**
 * アップグレード時の車両復元処理
 * downgraded_premiumステータスの車両をactiveに戻す
 */
async function restoreDowngradedVehicles(userId: string) {
  const db = getAdminFirestore();
  
  try {
    // downgraded_premium ステータスの車両を取得
    const carsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('cars')
      .where('status', '==', 'downgraded_premium')
      .where('deletedAt', '==', null)
      .get();
    
    if (carsSnapshot.empty) {
      console.log(`User ${userId} has no downgraded vehicles to restore`);
      return;
    }
    
    const batch = db.batch();
    let restoredCount = 0;
    
    carsSnapshot.docs.forEach((doc) => {
      const carRef = db.collection('users').doc(userId).collection('cars').doc(doc.id);
      batch.update(carRef, {
        status: 'active',
        downgradedAt: null,
        updatedAt: new Date(),
      });
      restoredCount++;
    });
    
    await batch.commit();
    console.log(`✅ Restored ${restoredCount} downgraded vehicles for user ${userId}`);
  } catch (error) {
    console.error(`Failed to restore vehicles for user ${userId}:`, error);
  }
}

/**
 * 請求書支払い失敗時の処理
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('⚠️ Invoice payment failed:', invoice.id);

  const customerId = invoice.customer as string;

  // Customer ID からユーザーを検索
  const user = await findUserByCustomerId(customerId);
  if (!user) {
    console.error(`No user found for customer ${customerId}`);
    return;
  }

  // ユーザードキュメントを更新
  await updateUserDocument(user.uid, {
    subscriptionStatus: 'past_due',
    updatedAt: new Date(),
  });

  console.log(`✅ Updated user ${user.uid} status to past_due`);

  // TODO: ユーザーにメール通知を送信
}

/**
 * Customer 更新時の処理
 */
async function handleCustomerUpdated(customer: Stripe.Customer) {
  console.log('👤 Customer updated:', customer.id);

  // Customer ID からユーザーを検索
  const user = await findUserByCustomerId(customer.id);
  if (!user) {
    console.error(`No user found for customer ${customer.id}`);
    return;
  }

  // メールアドレスが更新された場合など、必要に応じて情報を同期
  await updateUserDocument(user.uid, {
    stripeCustomerEmail: customer.email,
    updatedAt: new Date(),
  });

  console.log(`✅ Updated user ${user.uid} customer info`);
}

/**
 * POST ハンドラー
 */
export async function POST(req: NextRequest) {
  try {
    // リクエストボディを取得
    const body = await req.text();
    const signature = (await headers()).get('stripe-signature');

    if (!signature) {
      console.error('Missing stripe-signature header');
      return new NextResponse('Missing signature', { status: 400 });
    }

    // Webhook イベントを検証
    let event: Stripe.Event;
    try {
      const secret = getWebhookSecret();
      event = constructWebhookEvent(body, signature, secret);
    } catch (error: any) {
      console.error('Webhook signature verification failed:', error.message);
      return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
    }

    console.log(`📨 Received webhook event: ${event.type}`);

    // Idempotency: 同一イベントの重複処理を防止
    const db = getAdminFirestore();
    const eventRef = db.collection('stripe_webhook_events').doc(event.id);
    try {
      // 既存ならエラー（already-exists）になる create を使用
      await eventRef.create({
        createdAt: new Date(),
        type: event.type,
      });
    } catch (e: any) {
      if (e?.code === 6 || e?.code === 'already-exists') {
        // Firestore ALREADY_EXISTS
        console.log(`🔁 Event ${event.id} already processed. Skipping.`);
        return NextResponse.json({ received: true, duplicate: true });
      }
      console.error('Idempotency check failed:', e);
      return NextResponse.json({ error: 'Idempotency check failed' }, { status: 500 });
    }

    // イベントタイプごとに処理
    switch (event.type) {
      // Checkout 完了
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;

      // サブスクリプション作成・更新
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      // サブスクリプション削除
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      // 請求書支払い失敗
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      // Customer 更新
      case 'customer.updated':
        await handleCustomerUpdated(event.data.object as Stripe.Customer);
        break;

      // その他のイベント（ログのみ）
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // 成功レスポンス
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


