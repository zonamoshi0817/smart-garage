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
// Stripe SDKの初期化時に詳細なログを出力
console.log('Initializing Stripe SDK:', {
  hasKey: !!stripeSecretKey,
  keyPrefix: stripeSecretKey?.substring(0, 10) || 'N/A',
  keyType: stripeSecretKey?.startsWith('sk_live_') ? 'live' : stripeSecretKey?.startsWith('sk_test_') ? 'test' : 'unknown',
  keyLength: stripeSecretKey?.length || 0,
  nodeEnv: process.env.NODE_ENV,
});

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-10-29.clover',
  typescript: true,
  // リトライ設定（接続エラー時の自動リトライ）
  maxNetworkRetries: 3, // リトライ回数を3回に増やす
  timeout: 30000, // 30秒のタイムアウト（Vercelのサーバーレス関数の制限を考慮、maxDuration=30と合わせる）
  // HTTPエージェントの設定は削除（以前の動作していた状態に戻す）
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
  // APP_URLが設定されていない場合は、デフォルトでlocalhostを使用（開発環境）
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://garagelog.jp');
  
  console.log('Stripe Checkout Session create request:', {
    priceId,
    customerId: customerId || 'new',
    userUid,
    appUrl,
    trialDays,
  });

  try {
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
    success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/billing/cancel`,
    allow_promotion_codes: true, // プロモーションコードの入力を許可
    billing_address_collection: 'auto', // 住所情報を自動収集
    // 3Dセキュア（EMV 3-D Secure）を有効化（日本では推奨/実質必須）
    payment_method_options: {
      card: {
        request_three_d_secure: 'automatic', // 自動的に3Dセキュアを要求
      },
    },
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
    // subscription モードでは customer_creation は不要（自動的に作成される）
    // customer_creation は payment モードでのみ使用可能
    metadata: {
      firebaseUid: userUid,
    },
    // 日本の税設定（将来的に対応する場合）
    // automatic_tax: {
    //   enabled: true,
    // },
  });
    
    console.log('Stripe Checkout Session created successfully:', {
      sessionId: session.id,
      url: session.url,
    });

  return session;
  } catch (error: any) {
    console.error('Stripe API call failed in createCheckoutSession:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      requestId: error.requestId,
      name: error.name,
      cause: error.cause,
      errno: error.errno,
      syscall: error.syscall,
      hostname: error.hostname,
      code: error.code,
      // ネットワークエラーの詳細
      ...(error.errno && {
        errno: error.errno,
        syscall: error.syscall,
        hostname: error.hostname,
        code: error.code,
      }),
      // スタックトレースの最初の数行
      stack: error.stack?.split('\n').slice(0, 10).join('\n'),
    });
    
    // より詳細なエラー情報をログに出力
    if (error.cause) {
      console.error('Stripe error cause:', error.cause);
    }
    
    // ネットワークエラーの場合、より詳細な情報を出力
    if (error.errno || error.syscall) {
      console.error('Network error details:', {
        errno: error.errno,
        syscall: error.syscall,
        hostname: error.hostname,
        code: error.code,
        message: error.message,
      });
    }
    
    throw error;
  }
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
  // APP_URLが設定されていない場合は、デフォルトでlocalhostを使用（開発環境）
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://garagelog.jp');
  
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl || `${appUrl}/settings/billing`,
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

