#!/usr/bin/env node

/**
 * Stripe 商品と価格を自動作成するスクリプト
 * 使用方法: node scripts/create-stripe-products.js
 * 
 * 前提条件:
 * - STRIPE_SECRET_KEY が環境変数に設定されていること
 * - Stripe CLI または Stripe ダッシュボードでテストモードに切り替えていること
 */

require('dotenv').config({ path: '.env.local' });

const Stripe = require('stripe');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY が環境変数に設定されていません');
  console.error('   .env.local に STRIPE_SECRET_KEY=sk_test_xxxxx を設定してください');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

async function createProducts() {
  console.log('==========================================');
  console.log('Stripe 商品と価格を作成中...');
  console.log('==========================================');
  console.log('');

  try {
    // 月額プランの商品を作成
    console.log('📦 月額プランの商品を作成中...');
    const monthlyProduct = await stripe.products.create({
      name: 'GarageLog Premium (Monthly)',
      description: 'GarageLog プレミアムプラン - 月額',
    });

    console.log(`✅ 商品作成完了: ${monthlyProduct.id}`);
    console.log(`   商品名: ${monthlyProduct.name}`);

    // 月額プランの価格を作成
    const monthlyPrice = await stripe.prices.create({
      product: monthlyProduct.id,
      unit_amount: 35000, // ¥350 = 35000 円（最小通貨単位）
      currency: 'jpy',
      recurring: {
        interval: 'month',
      },
    });

    console.log(`✅ 価格作成完了: ${monthlyPrice.id}`);
    console.log(`   価格ID: ${monthlyPrice.id}`);
    console.log(`   価格: ¥${monthlyPrice.unit_amount / 100} / 月`);
    console.log('');

    // 年額プランの商品を作成
    console.log('📦 年額プランの商品を作成中...');
    const yearlyProduct = await stripe.products.create({
      name: 'GarageLog Premium (Yearly)',
      description: 'GarageLog プレミアムプラン - 年額',
    });

    console.log(`✅ 商品作成完了: ${yearlyProduct.id}`);
    console.log(`   商品名: ${yearlyProduct.name}`);

    // 年額プランの価格を作成
    const yearlyPrice = await stripe.prices.create({
      product: yearlyProduct.id,
      unit_amount: 350000, // ¥3,500 = 350000 円（最小通貨単位）
      currency: 'jpy',
      recurring: {
        interval: 'year',
      },
    });

    console.log(`✅ 価格作成完了: ${yearlyPrice.id}`);
    console.log(`   価格ID: ${yearlyPrice.id}`);
    console.log(`   価格: ¥${yearlyPrice.unit_amount / 100} / 年`);
    console.log('');

    // 結果を表示
    console.log('==========================================');
    console.log('✅ 商品と価格の作成が完了しました');
    console.log('==========================================');
    console.log('');
    console.log('以下の環境変数を .env.local に追加してください:');
    console.log('');
    console.log(`NEXT_PUBLIC_PRICE_MONTHLY=${monthlyPrice.id}`);
    console.log(`NEXT_PUBLIC_PRICE_YEARLY=${yearlyPrice.id}`);
    console.log('');
    console.log('または、既存の値を更新してください。');
    console.log('');

  } catch (error) {
    console.error('❌ エラーが発生しました:');
    console.error(error.message);
    
    if (error.type === 'StripeAuthenticationError') {
      console.error('');
      console.error('Stripe認証エラー: STRIPE_SECRET_KEY が正しく設定されているか確認してください');
    } else if (error.type === 'StripeInvalidRequestError') {
      console.error('');
      console.error('Stripeリクエストエラー: 商品や価格が既に存在する可能性があります');
    }
    
    process.exit(1);
  }
}

// スクリプトを実行
createProducts();

