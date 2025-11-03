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

    // バリデーション
    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "monthly" or "yearly".' },
        { status: 400 }
      );
    }

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
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

