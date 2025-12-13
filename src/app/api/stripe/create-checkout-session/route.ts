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

export async function POST(req: NextRequest) {
  try {
    // リクエストボディをパース
    const body = await req.json();
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
    
    console.log('Creating checkout session:', {
      plan,
      priceId,
      userUid,
      hasCustomerId: !!customerId,
      stripeKeySet: !!process.env.STRIPE_SECRET_KEY,
      priceMonthly: process.env.NEXT_PUBLIC_PRICE_MONTHLY,
      priceYearly: process.env.NEXT_PUBLIC_PRICE_YEARLY,
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
      });
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
      stack: error.stack?.split('\n').slice(0, 10).join('\n'),
    });
    
    // 開発環境ではより詳細なエラー情報を返す
    if (process.env.NODE_ENV === 'development') {
      let errorMessage = '決済セッションの作成に失敗しました。';
      
      if (error.message) {
        errorMessage += `\n\nエラー詳細: ${error.message}`;
      }
      
      if (error.code) {
        errorMessage += `\nエラーコード: ${error.code}`;
      }
      
      // Stripe関連のエラーの場合
      if (error.type && error.type.startsWith('Stripe')) {
        errorMessage += '\n\nStripe APIエラーが発生しました。環境変数STRIPE_SECRET_KEYが正しく設定されているか確認してください。';
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
    
    // 本番環境では一般的なメッセージのみ返す（セキュリティ対策）
    return NextResponse.json(
      { error: '決済セッションの作成に失敗しました。しばらく待ってから再度お試しください。' },
      { status: 500 }
    );
  }
}






