/**
 * Stripe接続テスト用API
 * デバッグ用：Stripe APIへの接続をテストする
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    // Stripe APIキーの情報を確認（セキュリティのため、一部のみ表示）
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const keyInfo = {
      isSet: !!stripeKey,
      prefix: stripeKey?.substring(0, 10) || 'N/A',
      type: stripeKey?.startsWith('sk_live_') ? 'live' : stripeKey?.startsWith('sk_test_') ? 'test' : 'unknown',
      length: stripeKey?.length || 0,
    };

    // 簡単なStripe API呼び出しをテスト（アカウント情報を取得）
    try {
      const account = await stripe.accounts.retrieve();
      
      return NextResponse.json({
        success: true,
        keyInfo,
        stripeAccount: {
          id: account.id,
          type: account.type,
          country: account.country,
        },
        message: 'Stripe APIへの接続に成功しました',
      });
    } catch (stripeError: any) {
      return NextResponse.json({
        success: false,
        keyInfo,
        error: {
          message: stripeError.message,
          type: stripeError.type,
          code: stripeError.code,
          statusCode: stripeError.statusCode,
        },
        message: 'Stripe APIへの接続に失敗しました',
      }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: {
        message: error.message,
        name: error.name,
      },
      message: 'エラーが発生しました',
    }, { status: 500 });
  }
}
