/**
 * Stripe SDK の初期化とユーティリティ
 * サーバーサイド専用（クライアントでは使用しない）
 */

import Stripe from 'stripe';

// ビルド時はダミー値を使用
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_build';

if (!process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV === 'production') {
  console.warn('STRIPE_SECRET_KEY is not set in environment variables');
}

/**
 * Stripe インスタンス
 * API バージョンは最新の安定版を使用
 */
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
  typescript: true,
  // Stripe-Account ヘッダーを使用する場合はここで設定
  // stripeAccount: process.env.STRIPE_ACCOUNT_ID,
});

/**
 * Stripe Checkout セッションを作成
 */
export async function createCheckoutSession({
  priceId,
  customerId,
  userUid,
  trialDays = 7, // デフォルトで7日間の無料トライアル
}: {
  priceId: string;
  customerId?: string;
  userUid: string;
  trialDays?: number;
}) {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    customer: customerId, // 既存の顧客がいる場合は再利用
    client_reference_id: userUid, // Firebase UID を紐付け
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/cancel`,
    allow_promotion_codes: true, // プロモーションコードの入力を許可
    billing_address_collection: 'auto', // 住所情報を自動収集
    subscription_data: {
      trial_period_days: trialDays,
      // トライアル終了時の自動課金を設定
      trial_settings: {
        end_behavior: {
          missing_payment_method: 'cancel', // 支払い方法がない場合はキャンセル
        },
      },
      metadata: {
        firebaseUid: userUid, // メタデータにも UID を保存
      },
    },
    // Customer を新規作成する場合は metadata を設定
    customer_creation: customerId ? undefined : 'always',
    metadata: {
      firebaseUid: userUid,
    },
    // 日本の税設定（将来的に対応する場合）
    // automatic_tax: {
    //   enabled: true,
    // },
  });

  return session;
}

/**
 * Stripe カスタマーポータルセッションを作成
 */
export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl?: string;
}) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
  });

  return session;
}

/**
 * Stripe Customer を作成
 */
export async function createCustomer({
  email,
  name,
  firebaseUid,
}: {
  email: string;
  name?: string;
  firebaseUid: string;
}) {
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      firebaseUid,
    },
  });

  return customer;
}

/**
 * サブスクリプション情報を取得
 */
export async function getSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Failed to retrieve subscription:', error);
    return null;
  }
}

/**
 * サブスクリプションをキャンセル
 */
export async function cancelSubscription(subscriptionId: string, immediately = false) {
  if (immediately) {
    // 即座にキャンセル
    return await stripe.subscriptions.cancel(subscriptionId);
  } else {
    // 期間終了時にキャンセル
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }
}

/**
 * サブスクリプションのキャンセルを取り消し
 */
export async function resumeSubscription(subscriptionId: string) {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Webhook イベントを検証
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  secret: string
) {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw error;
  }
}

