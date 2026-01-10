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

    console.log('Stripe connection test started:', {
      keyInfo,
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
    });

    // 複数のStripe API呼び出しをテストして、どのAPIが失敗するかを確認
    const testResults: any = {
      accountRetrieve: null,
      balanceRetrieve: null,
      priceList: null,
    };

    // 1. アカウント情報の取得をテスト
    try {
      console.log('Testing stripe.accounts.retrieve()...');
      const account = await stripe.accounts.retrieve();
      testResults.accountRetrieve = {
        success: true,
        accountId: account.id,
        type: account.type,
        country: account.country,
      };
      console.log('stripe.accounts.retrieve() succeeded');
    } catch (error: any) {
      console.error('stripe.accounts.retrieve() failed:', {
        message: error.message,
        type: error.type,
        code: error.code,
        statusCode: error.statusCode,
        requestId: error.requestId,
        stack: error.stack?.split('\n').slice(0, 5).join('\n'),
      });
      testResults.accountRetrieve = {
        success: false,
        error: {
          message: error.message,
          type: error.type,
          code: error.code,
          statusCode: error.statusCode,
          requestId: error.requestId,
        },
      };
    }

    // 2. バランス情報の取得をテスト（より軽量なAPI）
    try {
      console.log('Testing stripe.balance.retrieve()...');
      const balance = await stripe.balance.retrieve();
      testResults.balanceRetrieve = {
        success: true,
        available: balance.available.length,
        pending: balance.pending.length,
      };
      console.log('stripe.balance.retrieve() succeeded');
    } catch (error: any) {
      console.error('stripe.balance.retrieve() failed:', {
        message: error.message,
        type: error.type,
        code: error.code,
        statusCode: error.statusCode,
        requestId: error.requestId,
      });
      testResults.balanceRetrieve = {
        success: false,
        error: {
          message: error.message,
          type: error.type,
          code: error.code,
          statusCode: error.statusCode,
          requestId: error.requestId,
        },
      };
    }

    // 3. 価格一覧の取得をテスト（実際に使用しているAPI）
    try {
      console.log('Testing stripe.prices.list()...');
      const prices = await stripe.prices.list({ limit: 1 });
      testResults.priceList = {
        success: true,
        count: prices.data.length,
      };
      console.log('stripe.prices.list() succeeded');
    } catch (error: any) {
      console.error('stripe.prices.list() failed:', {
        message: error.message,
        type: error.type,
        code: error.code,
        statusCode: error.statusCode,
        requestId: error.requestId,
      });
      testResults.priceList = {
        success: false,
        error: {
          message: error.message,
          type: error.type,
          code: error.code,
          statusCode: error.statusCode,
          requestId: error.requestId,
        },
      };
    }

    // 4. fetch APIを使用してStripe APIへの直接接続をテスト（SDKを経由しない）
    let fetchTestResult: any = null;
    try {
      console.log('Testing direct fetch to Stripe API...');
      const fetchResponse = await fetch('https://api.stripe.com/v1/account', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        // Vercelのサーバーレス関数での接続問題を回避するための設定
        signal: AbortSignal.timeout(30000), // 30秒のタイムアウト
      });
      
      if (fetchResponse.ok) {
        const fetchData = await fetchResponse.json();
        fetchTestResult = {
          success: true,
          accountId: fetchData.id,
          type: fetchData.type,
        };
        console.log('Direct fetch to Stripe API succeeded');
      } else {
        const errorText = await fetchResponse.text();
        fetchTestResult = {
          success: false,
          error: {
            status: fetchResponse.status,
            statusText: fetchResponse.statusText,
            body: errorText.substring(0, 200),
          },
        };
        console.error('Direct fetch to Stripe API failed:', fetchTestResult.error);
      }
    } catch (fetchError: any) {
      console.error('Direct fetch to Stripe API error:', {
        message: fetchError.message,
        name: fetchError.name,
        cause: fetchError.cause,
        stack: fetchError.stack?.split('\n').slice(0, 5).join('\n'),
      });
      fetchTestResult = {
        success: false,
        error: {
          message: fetchError.message,
          name: fetchError.name,
          cause: fetchError.cause,
        },
      };
    }
    testResults.directFetch = fetchTestResult;

    // すべてのテストが失敗した場合
    const allFailed = Object.values(testResults).every((result: any) => result && !result.success);
    
    if (allFailed) {
      return NextResponse.json({
        success: false,
        keyInfo,
        testResults,
        message: 'すべてのStripe API呼び出しが失敗しました。ネットワーク接続の問題の可能性があります。',
        suggestions: [
          'VercelからStripe APIへのネットワーク接続を確認してください',
          'Stripe DashboardでAPIキーが有効か確認してください',
          'Stripeのステータスページ（https://status.stripe.com/）で障害がないか確認してください',
          'Vercelのネットワーク設定を確認してください',
          'Vercelサポートに問い合わせて、egressネットワークブロックがないか確認してください',
        ],
        networkDiagnostics: {
          directFetchFailed: fetchTestResult && !fetchTestResult.success,
          stripeSDKFailed: testResults.accountRetrieve && !testResults.accountRetrieve.success,
        },
      }, { status: 500 });
    }

    // 少なくとも1つのテストが成功した場合
    return NextResponse.json({
      success: true,
      keyInfo,
      testResults,
      message: '一部のStripe API呼び出しが成功しました',
    });
  } catch (error: any) {
    console.error('Unexpected error in test-connection:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 10).join('\n'),
    });
    return NextResponse.json({
      success: false,
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack?.split('\n').slice(0, 5).join('\n'),
      },
      message: '予期しないエラーが発生しました',
    }, { status: 500 });
  }
}
