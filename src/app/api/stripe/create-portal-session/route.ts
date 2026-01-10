/**
 * Stripe カスタマーポータルセッション作成 API
 * 
 * ユーザーがサブスクリプションを管理（解約、プラン変更など）する際に呼び出される
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPortalSession } from '@/lib/stripe';
import { getAdminAuth, getUserDocument } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // リクエストボディをパース
    const body = await req.json();
    const { idToken, returnUrl } = body as {
      idToken: string;
      returnUrl?: string;
    };

    // バリデーション
    if (!idToken) {
      return NextResponse.json(
        { error: 'Authentication required. Please provide idToken.' },
        { status: 401 }
      );
    }

    // Firebase ID Token を検証
    let userUid: string;
    try {
      const auth = getAdminAuth();
      const decodedToken = await auth.verifyIdToken(idToken);
      userUid = decodedToken.uid;
    } catch (error) {
      console.error('Failed to verify ID token:', error);
      return NextResponse.json(
        { error: 'Invalid authentication token.' },
        { status: 401 }
      );
    }

    // ユーザードキュメントから Stripe Customer ID を取得
    const userData = await getUserDocument(userUid);
    const customerId = userData?.stripeCustomerId;

    if (!customerId) {
      return NextResponse.json(
        { error: 'No Stripe customer found. Please subscribe first.' },
        { status: 404 }
      );
    }

    // カスタマーポータルセッションを作成
    const session = await createPortalSession({
      customerId,
      returnUrl,
    });

    // ポータル URL を返す
    return NextResponse.json({
      url: session.url,
    });
  } catch (error: any) {
    console.error('Failed to create portal session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    );
  }
}






