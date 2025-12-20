/**
 * Stripe Checkout セッション作成 API
 * 
 * ユーザーがプレミアムプランにアップグレードする際に呼び出される
 */

import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe';
import { getPriceId } from '@/lib/plan';
import { getAdminAuth } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const maxDuration = 30; // Vercelのサーバーレス関数の最大実行時間（秒）

export async function POST(req: NextRequest) {
  try {
    console.log('Checkout session creation request received:', {
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
    });
    
    // リクエストボディをパース
    let body: any;
    try {
      body = await req.json();
      console.log('Request body parsed:', {
        hasPlan: !!body.plan,
        plan: body.plan,
        hasIdToken: !!body.idToken,
        idTokenLength: body.idToken?.length,
        hasCustomerId: !!body.customerId,
      });
    } catch (jsonError: any) {
      console.error('Failed to parse request body as JSON:', {
        error: jsonError.message,
        name: jsonError.name,
      });
      return NextResponse.json(
        { error: 'リクエストボディの解析に失敗しました。', details: jsonError.message },
        { status: 400 }
      );
    }
    const { plan, customerId, idToken: rawIdToken } = body as {
      plan: 'monthly' | 'yearly';
      customerId?: string;
      idToken: string;
    };
    
    // ID Tokenの前後の空白を削除
    let idToken = typeof rawIdToken === 'string' ? rawIdToken.trim() : rawIdToken;

    // バリデーション（XSS対策、SQLインジェクション対策）
    if (!plan || typeof plan !== 'string' || !['monthly', 'yearly'].includes(plan)) {
      return NextResponse.json(
        { error: '無効なプランです。' },
        { status: 400 }
      );
    }

    if (!idToken || typeof idToken !== 'string' || idToken.length > 2000) {
      return NextResponse.json(
        { error: '認証が必要です。' },
        { status: 401 }
      );
    }

    // customerIdのバリデーション（オプション）
    if (customerId && (typeof customerId !== 'string' || customerId.length > 200)) {
      return NextResponse.json(
        { error: '無効な顧客IDです。' },
        { status: 400 }
      );
    }

    // Firebase ID Token を検証
    let userUid: string;
    let userEmail: string | undefined;
    try {
      // Firebase Admin SDKの初期化を試みる
      let auth;
      try {
        auth = getAdminAuth();
      } catch (initError: any) {
        console.error('Failed to initialize Firebase Admin SDK:', initError);
        // 開発環境でのエラーメッセージ
        if (process.env.NODE_ENV === 'development') {
          return NextResponse.json(
            { error: 'Firebase Admin SDKの初期化に失敗しました。環境変数FIREBASE_SERVICE_ACCOUNT_BASE64が設定されているか確認してください。' },
            { status: 500 }
          );
        }
        return NextResponse.json(
          { error: 'サーバー設定エラーが発生しました。' },
          { status: 500 }
        );
      }
      
      if (!idToken || typeof idToken !== 'string') {
        console.error('ID Token is missing or invalid type:', typeof idToken);
        return NextResponse.json(
          { error: 'ID Token is required.' },
          { status: 401 }
        );
      }

      // ID Tokenの形式を確認（JWT形式: header.payload.signature）
      if (idToken.split('.').length !== 3) {
        console.error('Invalid ID Token format:', {
          length: idToken.length,
          parts: idToken.split('.').length,
          prefix: idToken.substring(0, 30),
        });
        return NextResponse.json(
          { error: '認証トークンの形式が正しくありません。' },
          { status: 401 }
        );
      }
      
      console.log('Verifying ID Token:', {
        length: idToken.length,
        parts: idToken.split('.').length,
        prefix: idToken.substring(0, 30),
      });
      
      const decodedToken = await auth.verifyIdToken(idToken);
      userUid = decodedToken.uid;
      userEmail = decodedToken.email;
      
      if (!userUid) {
        console.error('User UID is missing from decoded token');
        return NextResponse.json(
          { error: 'User UID is missing from token.' },
          { status: 401 }
        );
      }
    } catch (error: any) {
      console.error('Failed to verify ID token:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        name: error.name,
        idTokenLength: idToken?.length,
        idTokenPrefix: idToken?.substring(0, 30),
        idTokenParts: idToken?.split('.').length,
        stack: error.stack?.split('\n').slice(0, 5).join('\n'),
      });

      // Firebase Admin SDKの初期化状態を確認
      try {
        const testAuth = getAdminAuth();
        console.log('Firebase Admin Auth initialized successfully');
      } catch (authError: any) {
        console.error('Firebase Admin Auth initialization error:', authError);
      }
      
      // より詳細なエラーメッセージを返す
      let errorMessage = '認証トークンの検証に失敗しました。';
      
      if (error.code === 'auth/id-token-expired') {
        errorMessage = '認証トークンの有効期限が切れています。再度ログインしてください。';
      } else if (error.code === 'auth/argument-error') {
        // argument-errorの場合、より詳細な情報をログに出力
        console.error('Auth argument error - possible causes:', {
          tokenLength: idToken?.length,
          tokenParts: idToken?.split('.').length,
          tokenFormat: idToken?.match(/^[A-Za-z0-9\-_.]+$/g) ? 'valid chars' : 'invalid chars',
          projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
        errorMessage = '認証トークンの形式が正しくありません。ページをリロードして再度お試しください。';
      } else if (error.code === 'auth/project-not-found') {
        errorMessage = 'Firebaseプロジェクトが見つかりません。サーバー設定を確認してください。';
      } else if (error.message?.includes('FIREBASE_SERVICE_ACCOUNT_BASE64')) {
        errorMessage = 'サーバー設定エラーが発生しました。開発環境では環境変数の設定が必要です。';
      } else if (error.message?.includes('project')) {
        errorMessage = 'Firebaseプロジェクトの設定に問題があります。管理者にお問い合わせください。';
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 401 }
      );
    }

    // 検証用アカウントのチェック（常に無料プラン）
    const TEST_USER_EMAILS = (
      process.env.NEXT_PUBLIC_TEST_USER_EMAILS?.split(',').map(e => e.trim()) || [
        'kobayan0817@gmail.com',
      ]
    );
    
    if (userEmail && TEST_USER_EMAILS.includes(userEmail.toLowerCase())) {
      console.log('[Checkout] Test user account detected, blocking checkout:', userEmail);
      return NextResponse.json(
        { error: 'このアカウントは検証用のため、プレミアムプランへのアップグレードはできません。' },
        { status: 403 }
      );
    }

    // Stripe環境変数の確認
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not set in environment variables');
      return NextResponse.json(
        { error: '決済機能の設定が完了していません。管理者にお問い合わせください。' },
        { status: 500 }
      );
    }

    // Price ID を取得
    let priceId: string;
    try {
      priceId = getPriceId(plan);
    } catch (priceError: any) {
      console.error('Failed to get Price ID:', priceError);
      return NextResponse.json(
        { error: `プランの価格IDが設定されていません: ${plan}` },
        { status: 500 }
      );
    }
    
    // Stripe設定の詳細ログ（本番環境でも出力してトラブルシューティング）
    console.log('Creating checkout session:', {
      plan,
      priceId,
      userUid,
      hasCustomerId: !!customerId,
      stripeKeySet: !!process.env.STRIPE_SECRET_KEY,
      stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 10),
      stripeKeyType: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? 'live' : process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 'unknown',
      priceMonthly: process.env.NEXT_PUBLIC_PRICE_MONTHLY,
      priceYearly: process.env.NEXT_PUBLIC_PRICE_YEARLY,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });

    // Checkout セッションを作成
    let session;
    try {
      session = await createCheckoutSession({
      priceId,
      customerId,
      userUid,
      trialDays: 7, // 7日間無料トライアル
    });
    } catch (stripeError: any) {
      console.error('Stripe Checkout Session creation failed:', {
        message: stripeError.message,
        code: stripeError.code,
        type: stripeError.type,
        statusCode: stripeError.statusCode,
        requestId: stripeError.requestId,
        priceId,
        userUid,
        stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7),
      });
      
      // Stripe APIエラーの場合、より詳細な情報を返す
      if (stripeError.type && stripeError.type.startsWith('Stripe')) {
        const errorDetails: any = {
          error: 'Stripe APIエラーが発生しました。',
          code: stripeError.code || 'unknown',
          type: stripeError.type,
        };
        
        // 接続エラーの場合
        if (stripeError.type === 'StripeConnectionError' || stripeError.type === 'StripeAPIError') {
          errorDetails.error = 'Stripeへの接続に失敗しました。しばらく待ってから再度お試しください。';
          errorDetails.details = stripeError.message || 'An error occurred with our connection to Stripe.';
          errorDetails.retryable = true;
          
          // 接続エラーの詳細ログ
          console.error('Stripe connection error details:', {
            message: stripeError.message,
            type: stripeError.type,
            statusCode: stripeError.statusCode,
            requestId: stripeError.requestId,
            stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 10),
            stripeKeyLength: process.env.STRIPE_SECRET_KEY?.length,
            stripeKeyType: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? 'live' : process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 'unknown',
            priceId,
            userUid,
            nodeEnv: process.env.NODE_ENV,
          });
        } else if (stripeError.code === 'resource_missing') {
          errorDetails.error = '価格情報が見つかりません。Stripeの価格IDを確認してください。';
          errorDetails.details = `Price ID: ${priceId}`;
        } else if (stripeError.code === 'invalid_request_error') {
          errorDetails.error = 'Stripeリクエストエラーが発生しました。';
          errorDetails.details = stripeError.message;
        } else if (stripeError.message) {
          errorDetails.details = stripeError.message;
        }
        
        // Stripeエラーの場合はここで返す（再スローしない）
        return NextResponse.json(errorDetails, { status: 500 });
      }
      
      // Stripeエラー以外の場合は再スローして外側のcatchで処理
      throw stripeError;
    }

    // Checkout URL を返す
    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error('Failed to create checkout session:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      type: error.type,
      statusCode: error.statusCode,
      requestId: error.requestId,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 20).join('\n'),
      cause: error.cause,
      // 環境変数の状態を確認（機密情報は含めない）
      envCheck: {
        hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
        stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 10),
        hasFirebaseServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
        hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
        hasPriceMonthly: !!process.env.NEXT_PUBLIC_PRICE_MONTHLY,
        hasPriceYearly: !!process.env.NEXT_PUBLIC_PRICE_YEARLY,
      },
    });
    
    // Stripeエラーの場合（既に内側のcatchで処理されているはずだが、念のため）
    if (error.type && error.type.startsWith('Stripe')) {
      const errorDetails: any = {
        error: 'Stripe APIエラーが発生しました。',
        code: error.code || 'unknown',
        type: error.type,
      };
      
      if (error.code === 'resource_missing') {
        errorDetails.error = '価格情報が見つかりません。管理者にお問い合わせください。';
      } else if (error.code === 'invalid_request_error') {
        errorDetails.error = 'Stripeリクエストエラーが発生しました。';
      } else if (error.type === 'StripeConnectionError') {
        errorDetails.error = 'Stripeへの接続に失敗しました。しばらく待ってから再度お試しください。';
        errorDetails.retryable = true;
      }
      
      // 本番環境でも接続エラーの場合は詳細を返す
      if (error.type === 'StripeConnectionError' || process.env.NODE_ENV === 'development') {
        errorDetails.details = error.message;
        errorDetails.requestId = error.requestId;
      }
      
      return NextResponse.json(errorDetails, { status: 500 });
    }
    
    // その他のエラーの場合
    const errorResponse: any = {
      error: '決済セッションの作成に失敗しました。',
      code: error.code || 'unknown',
    };
    
    // 開発環境または特定のエラーでは詳細情報を含める
    if (process.env.NODE_ENV === 'development' || error.message?.includes('Price ID')) {
      errorResponse.details = error.message;
      if (error.stack) {
        errorResponse.stack = error.stack.split('\n').slice(0, 5).join('\n');
      }
    }
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}






