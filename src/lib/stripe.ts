/**
 * Stripe SDK の初期化とユーティリティ
 * サーバーサイド専用（クライアントでは使用しない）
 */

import Stripe from 'stripe';

// ビルド時はダミー値を使用
// 環境変数から改行文字や空白を削除（Vercelの環境変数に改行が含まれる可能性があるため）
const rawStripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_build';
const stripeSecretKey = typeof rawStripeSecretKey === 'string' 
  ? rawStripeSecretKey.trim().replace(/\r?\n/g, '').replace(/\s+/g, '') 
  : rawStripeSecretKey;

if (!process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV === 'production') {
  console.warn('STRIPE_SECRET_KEY is not set in environment variables');
}

// デバッグ用：Stripeキーに無効な文字が含まれていないか確認
if (stripeSecretKey && typeof stripeSecretKey === 'string') {
  const invalidChars = stripeSecretKey.match(/[^\x20-\x7E]/);
  if (invalidChars) {
    console.warn('Stripe secret key contains invalid characters:', {
      invalidChars: invalidChars,
      keyLength: stripeSecretKey.length,
      keyPrefix: stripeSecretKey.substring(0, 10),
    });
  }
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
  maxNetworkRetries: 2, // リトライ回数を2回に減らす（以前の設定に戻す）
  timeout: 20000, // 20秒のタイムアウト（以前の設定に戻す）
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
  userEmail,
  userName,
  trialDays = 7, // デフォルトで7日間の無料トライアル
}: {
  priceId: string;
  customerId?: string;
  userUid: string;
  userEmail?: string;
  userName?: string;
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
    // subscription モードでは、customer または customer_email を指定する
    // customer が指定されている場合: 既存の顧客を使用
    // customer が指定されていない場合: customer_email から新しい顧客が自動作成される
    // customer_creation パラメータは subscription モードでは使用不可（payment モードでのみ使用可能）
    ...(customerId ? { customer: customerId } : { customer_email: userEmail }),
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
    // Stripe SDKの内部エラーを詳細にログ出力
    const errorDetails: any = {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      requestId: error.requestId,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 15).join('\n'),
    };
    
    // エラーオブジェクトのすべてのプロパティを確認
    const errorKeys = Object.keys(error);
    console.error('Stripe error all properties:', errorKeys);
    
    // エラーオブジェクトをシリアライズ可能な形式に変換
    try {
      const errorObj: any = {};
      for (const key of Object.getOwnPropertyNames(error)) {
        try {
          errorObj[key] = (error as any)[key];
        } catch (e) {
          errorObj[key] = '[Unable to serialize]';
        }
      }
      console.error('Stripe error full object:', JSON.stringify(errorObj, null, 2));
    } catch (serializeError) {
      console.error('Failed to serialize error object:', serializeError);
    }
    
    // causeプロパティがある場合
    if (error.cause) {
      errorDetails.cause = error.cause;
      console.error('Stripe error cause:', error.cause);
      
      // causeがエラーオブジェクトの場合、その詳細も出力
      if (error.cause instanceof Error) {
        console.error('Stripe error cause details:', {
          message: error.cause.message,
          name: error.cause.name,
          stack: error.cause.stack,
          ...(error.cause as any).errno && { errno: (error.cause as any).errno },
          ...(error.cause as any).syscall && { syscall: (error.cause as any).syscall },
          ...(error.cause as any).hostname && { hostname: (error.cause as any).hostname },
          ...(error.cause as any).code && { code: (error.cause as any).code },
        });
      }
    }
    
    // ネットワークエラーのプロパティを確認
    if (error.errno || error.syscall || error.hostname) {
      errorDetails.networkError = {
        errno: error.errno,
        syscall: error.syscall,
        hostname: error.hostname,
        code: error.code,
      };
      console.error('Network error details:', errorDetails.networkError);
    }
    
    console.error('Stripe API call failed in createCheckoutSession:', errorDetails);
    
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

