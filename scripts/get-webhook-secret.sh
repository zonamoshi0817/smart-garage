#!/bin/bash

# Stripe Webhook Secret を取得するスクリプト
# 使用方法: ./scripts/get-webhook-secret.sh

echo "=========================================="
echo "Stripe Webhook Secret を取得中..."
echo "=========================================="
echo ""

# Stripe CLIがログインしているか確認
if ! stripe config --list &> /dev/null; then
  echo "❌ Stripe CLI にログインしていません"
  echo "   まず以下を実行してください:"
  echo "   stripe login"
  exit 1
fi

echo "✅ Stripe CLI にログイン済み"
echo ""
echo "Webhookシークレットを取得します..."
echo "（数秒かかる場合があります）"
echo ""

# stripe listen を実行して、最初の数行からWebhookシークレットを抽出
WEBHOOK_SECRET=$(timeout 8 stripe listen --forward-to localhost:3000/api/stripe/webhook 2>&1 | grep -m 1 -o 'whsec_[a-zA-Z0-9]*' | head -1)

if [ ! -z "$WEBHOOK_SECRET" ]; then
  echo ""
  echo "=========================================="
  echo "✅ Webhookシークレットを取得しました"
  echo "=========================================="
  echo ""
  echo "$WEBHOOK_SECRET"
  echo ""
  echo "このシークレットを .env.local に追加しますか？ (y/N)"
  read -p "> " -n 1 -r
  echo ""
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
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
  else
    echo ""
    echo "手動で .env.local に追加してください:"
    echo "STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET"
  fi
else
  echo ""
  echo "⚠️  Webhookシークレットを取得できませんでした"
  echo ""
  echo "手動で取得するには、別のターミナルで以下を実行してください:"
  echo "  stripe listen --forward-to localhost:3000/api/stripe/webhook"
  echo ""
  echo "表示された whsec_xxxxx をコピーして、以下で追加してください:"
  echo "  ./scripts/add-webhook-secret.sh whsec_xxxxx"
fi

