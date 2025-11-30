#!/usr/bin/env node

/**
 * すべてのStripe価格IDを検証するスクリプト
 * 使用方法: node scripts/verify-all-prices.js
 */

require('dotenv').config({ path: '.env.local' });

const Stripe = require('stripe');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_PRICE_MONTHLY;
const YEARLY_PRICE_ID = process.env.NEXT_PUBLIC_PRICE_YEARLY;

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY が環境変数に設定されていません');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

async function verifyPrice(priceId, planName) {
  try {
    const price = await stripe.prices.retrieve(priceId);
    const product = typeof price.product === 'string' 
      ? await stripe.products.retrieve(price.product)
      : price.product;
    
    console.log(`✅ ${planName}:`);
    console.log(`   価格ID: ${price.id}`);
    console.log(`   商品名: ${product.name}`);
    console.log(`   金額: ¥${price.unit_amount ? (price.unit_amount / 100).toLocaleString() : 'N/A'}`);
    console.log(`   課金間隔: ${price.recurring?.interval === 'month' ? '月額' : price.recurring?.interval === 'year' ? '年額' : price.recurring?.interval || 'N/A'}`);
    console.log(`   アクティブ: ${price.active ? 'はい' : 'いいえ'}`);
    console.log('');
    return true;
  } catch (error) {
    console.error(`❌ ${planName}:`);
    console.error(`   エラー: ${error.message}`);
    console.log('');
    return false;
  }
}

async function verifyAllPrices() {
  console.log('==========================================');
  console.log('Stripe 価格IDを検証中...');
  console.log('==========================================');
  console.log('');

  let allValid = true;

  if (MONTHLY_PRICE_ID) {
    const valid = await verifyPrice(MONTHLY_PRICE_ID, '月額プラン');
    if (!valid) allValid = false;
  } else {
    console.log('⚠️  月額プランの価格IDが設定されていません');
    console.log('   NEXT_PUBLIC_PRICE_MONTHLY を .env.local に設定してください');
    console.log('');
    allValid = false;
  }

  if (YEARLY_PRICE_ID) {
    const valid = await verifyPrice(YEARLY_PRICE_ID, '年額プラン');
    if (!valid) allValid = false;
  } else {
    console.log('⚠️  年額プランの価格IDが設定されていません');
    console.log('   NEXT_PUBLIC_PRICE_YEARLY を .env.local に設定してください');
    console.log('');
    allValid = false;
  }

  console.log('==========================================');
  if (allValid) {
    console.log('✅ すべての価格IDが有効です');
    console.log('==========================================');
    process.exit(0);
  } else {
    console.log('❌ 一部の価格IDに問題があります');
    console.log('==========================================');
    process.exit(1);
  }
}

verifyAllPrices();

