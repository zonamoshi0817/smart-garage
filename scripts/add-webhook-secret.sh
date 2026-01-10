#!/bin/bash

# Stripe Webhook Secret を .env.local に追加するスクリプト
# 使用方法: ./scripts/add-webhook-secret.sh whsec_xxxxx

WEBHOOK_SECRET=$1

if [ -z "$WEBHOOK_SECRET" ]; then
  echo "使用方法: $0 <webhook_secret>"
  echo ""
  echo "例: $0 whsec_xxxxx"
  echo ""
  echo "Webhookシークレットを取得するには:"
  echo "  stripe listen --forward-to localhost:3000/api/stripe/webhook"
  echo "  表示された whsec_xxxxx をコピーして、このスクリプトに渡してください"
  exit 1
fi

# 形式チェック
if [[ ! $WEBHOOK_SECRET =~ ^whsec_ ]]; then
  echo "⚠️  Webhookシークレットの形式が正しくありません（whsec_ で始まる必要があります）"
  read -p "続行しますか？ (y/N): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# .env.local に追加
if grep -q "^STRIPE_WEBHOOK_SECRET=" .env.local 2>/dev/null; then
  # 既存の値を更新
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|^STRIPE_WEBHOOK_SECRET=.*|STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET|" .env.local
  else
    sed -i "s|^STRIPE_WEBHOOK_SECRET=.*|STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET|" .env.local
  fi
  echo "✅ STRIPE_WEBHOOK_SECRET を更新しました"
else
  # 新規追加
  echo "" >> .env.local
  echo "# Stripe Webhook Secret" >> .env.local
  echo "STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET" >> .env.local
  echo "✅ STRIPE_WEBHOOK_SECRET を追加しました"
fi

echo ""
echo "設定された値:"
grep "^STRIPE_WEBHOOK_SECRET=" .env.local

