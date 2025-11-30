#!/bin/bash

# Stripe シークレットキーを .env.local に設定するスクリプト
# 使用方法: ./scripts/set-stripe-key.sh <key>

KEY=$1

if [ -z "$KEY" ]; then
  echo "使用方法: $0 <stripe_secret_key>"
  echo ""
  echo "例: $0 <your_stripe_secret_key>"
  echo "   Stripe Dashboard > Developers > API keys から取得してください"
  exit 1
fi

# .env.local ファイルが存在しない場合は作成
if [ ! -f ".env.local" ]; then
  touch .env.local
  echo "✅ .env.local ファイルを作成しました"
fi

# STRIPE_SECRET_KEY が既に存在するか確認
if grep -q "^STRIPE_SECRET_KEY=" .env.local 2>/dev/null; then
  # 既存の値を置き換え
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|^STRIPE_SECRET_KEY=.*|STRIPE_SECRET_KEY=$KEY|" .env.local
  else
    # Linux
    sed -i "s|^STRIPE_SECRET_KEY=.*|STRIPE_SECRET_KEY=$KEY|" .env.local
  fi
  echo "✅ STRIPE_SECRET_KEY を更新しました"
else
  # 新規追加
  echo "" >> .env.local
  echo "# Stripe" >> .env.local
  echo "STRIPE_SECRET_KEY=$KEY" >> .env.local
  echo "✅ STRIPE_SECRET_KEY を追加しました"
fi

echo ""
echo "設定されたキー:"
grep "^STRIPE_SECRET_KEY=" .env.local

