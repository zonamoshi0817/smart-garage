#!/usr/bin/env node

/**
 * Stripe 価格IDを検証するスクリプト
 * 使用方法: node scripts/verify-stripe-price.js <price_id>
 */

require('dotenv').config({ path: '.env.local' });

const Stripe = require('stripe');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const PRICE_ID = process.argv[2] || process.env.NEXT_PUBLIC_PRICE_MONTHLY;

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY が環境変数に設定されていません');
  process.exit(1);
}

if (!PRICE_ID) {
  console.error('❌ 価格IDが指定されていません');
  console.error('   使用方法: node scripts/verify-stripe-price.js <price_id>');
  console.error('   または、環境変数 NEXT_PUBLIC_PRICE_MONTHLY を設定してください');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

async function verifyPrice() {
  console.log('==========================================');
  console.log('Stripe 価格IDを検証中...');
  console.log('==========================================');
  console.log('');
  console.log(`価格ID: ${PRICE_ID}`);
  console.log('');

  try {
    const price = await stripe.prices.retrieve(PRICE_ID);
    
    console.log('✅ 価格が見つかりました');
    console.log('');
    console.log('価格情報:');
    console.log(`  価格ID: ${price.id}`);
    console.log(`  商品名: ${price.nickname || '（未設定）'}`);
    console.log(`  金額: ¥${price.unit_amount ? (price.unit_amount / 100).toLocaleString() : 'N/A'}`);
    console.log(`  通貨: ${price.currency.toUpperCase()}`);
    
    if (price.recurring) {
      console.log(`  課金間隔: ${price.recurring.interval === 'month' ? '月額' : price.recurring.interval === 'year' ? '年額' : price.recurring.interval}`);
      console.log(`  間隔数: ${price.recurring.interval_count}`);
    }
    
    console.log(`  アクティブ: ${price.active ? 'はい' : 'いいえ'}`);
    console.log('');
    
    // 商品情報を取得
    if (price.product) {
      const product = typeof price.product === 'string' 
        ? await stripe.products.retrieve(price.product)
        : price.product;
      
      console.log('商品情報:');
      console.log(`  商品ID: ${product.id}`);
      console.log(`  商品名: ${product.name}`);
      console.log(`  説明: ${product.description || '（未設定）'}`);
      console.log(`  アクティブ: ${product.active ? 'はい' : 'いいえ'}`);
      console.log('');
    }
    
    console.log('==========================================');
    console.log('✅ 価格IDの検証が完了しました');
    console.log('==========================================');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:');
    console.error(error.message);
    
    if (error.type === 'StripeInvalidRequestError' && error.code === 'resource_missing') {
      console.error('');
      console.error('価格が見つかりません。以下を確認してください:');
      console.error('1. 価格IDが正しいか');
      console.error('2. Stripeアカウントが正しいか（テストモード/本番モード）');
      console.error('3. STRIPE_SECRET_KEY が正しいか');
    }
    
    process.exit(1);
  }
}

verifyPrice();

