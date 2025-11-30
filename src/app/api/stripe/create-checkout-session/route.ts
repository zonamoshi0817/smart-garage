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
    const { plan, customerId, idToken } = body as {
      plan: 'monthly' | 'yearly';
      customerId?: string;
      idToken: string;
    };

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
        idTokenLength: idToken?.length,
        idTokenPrefix: idToken?.substring(0, 20),
      });
      
      // より詳細なエラーメッセージを返す
      let errorMessage = 'Invalid authentication token.';
      if (error.code === 'auth/id-token-expired') {
        errorMessage = '認証トークンの有効期限が切れています。再度ログインしてください。';
      } else if (error.code === 'auth/argument-error') {
        errorMessage = '認証トークンの形式が正しくありません。';
      } else if (error.message?.includes('FIREBASE_SERVICE_ACCOUNT_BASE64')) {
        errorMessage = 'サーバー設定エラーが発生しました。開発環境では環境変数の設定が必要です。';
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

    // Price ID を取得
    const priceId = getPriceId(plan);

    // Checkout セッションを作成
    const session = await createCheckoutSession({
      priceId,
      customerId,
      userUid,
      trialDays: 7, // 7日間無料トライアル
    });

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
      stack: error.stack,
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






