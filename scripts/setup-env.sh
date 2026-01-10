#!/bin/bash

# .env.local ファイルのセットアップスクリプト
# 使用方法: ./scripts/setup-env.sh

echo "=========================================="
echo ".env.local ファイルのセットアップ"
echo "=========================================="
echo ""

# .env.local ファイルが存在するか確認
if [ -f ".env.local" ]; then
  echo "⚠️  .env.local ファイルが既に存在します"
  read -p "上書きしますか？ (y/N): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "キャンセルしました"
    exit 0
  fi
fi

# .env.local.example からコピー
if [ -f ".env.local.example" ]; then
  cp .env.local.example .env.local
  echo "✅ .env.local ファイルを作成しました"
  echo ""
  echo "以下の環境変数を設定してください："
  echo ""
  echo "1. STRIPE_SECRET_KEY"
  echo "   Stripeダッシュボード > Developers > API keys から取得"
  echo "   テストモード: sk_test_xxxxx"
  echo ""
  echo "2. FIREBASE_SERVICE_ACCOUNT_BASE64"
  echo "   Firebase Console > Project Settings > Service accounts から取得"
  echo "   ./scripts/setup-firebase-admin.sh を使用してBase64エンコード"
  echo ""
  echo "3. FIREBASE_PROJECT_ID"
  echo "   Firebase Console のプロジェクトID"
  echo ""
  echo "4. STRIPE_WEBHOOK_SECRET"
  echo "   開発環境: Stripe CLI で取得"
  echo "   stripe listen --forward-to localhost:3000/api/stripe/webhook"
  echo ""
  echo "価格IDは既に設定済みです："
  echo "  NEXT_PUBLIC_PRICE_MONTHLY=price_1SYSM387dnl6b7lwZW208B8K"
  echo "  NEXT_PUBLIC_PRICE_YEARLY=price_1SYSNR87dnl6b7lwAqHkCBdh"
  echo ""
else
  echo "❌ .env.local.example ファイルが見つかりません"
  echo "   手動で .env.local ファイルを作成してください"
  exit 1
fi

