#!/bin/bash

# Stripe Webhook Secret を取得して .env.local に設定するスクリプト
# 使用方法: ./scripts/setup-stripe-webhook.sh

echo "=========================================="
echo "Stripe Webhook Secret の取得"
echo "=========================================="
echo ""

# Stripe CLIがインストールされているか確認
if ! command -v stripe &> /dev/null; then
  echo "❌ Stripe CLI がインストールされていません"
  echo "   以下のコマンドでインストールしてください:"
  echo "   brew install stripe/stripe-cli/stripe"
  exit 1
fi

echo "✅ Stripe CLI がインストールされています"
echo ""

# ログイン状態を確認
if ! stripe config --list &> /dev/null; then
  echo "⚠️  Stripe CLI にログインしていません"
  echo "   以下のコマンドでログインしてください:"
  echo "   stripe login"
  echo ""
  read -p "ログインを続行しますか？ (y/N): " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    stripe login
  else
    echo "ログインをスキップしました"
    exit 1
  fi
fi

echo "✅ Stripe CLI にログイン済み"
echo ""

# Webhookシークレットを取得
echo "Webhookシークレットを取得中..."
echo "（Ctrl+C でキャンセルできます）"
echo ""

# stripe listen を実行して、最初の数行からWebhookシークレットを抽出
# タイムアウトを設定して、シークレットを取得したら終了
timeout 10 stripe listen --forward-to localhost:3000/api/stripe/webhook 2>&1 | while IFS= read -r line; do
  echo "$line"
  
  # Webhookシークレットを検出
  if [[ $line =~ whsec_[a-zA-Z0-9]+ ]]; then
    WEBHOOK_SECRET=$(echo "$line" | grep -o 'whsec_[a-zA-Z0-9]*' | head -1)
    
    if [ ! -z "$WEBHOOK_SECRET" ]; then
      echo ""
      echo "=========================================="
      echo "Webhookシークレットを検出しました:"
      echo "=========================================="
      echo "$WEBHOOK_SECRET"
      echo ""
      
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
      echo "=========================================="
      echo "✅ 設定が完了しました"
      echo "=========================================="
      echo ""
      echo "注意: stripe listen は別のターミナルで実行してください:"
      echo "  stripe listen --forward-to localhost:3000/api/stripe/webhook"
      echo ""
      
      # プロセスを終了
      pkill -f "stripe listen" 2>/dev/null
      exit 0
    fi
  fi
done

echo ""
echo "⚠️  Webhookシークレットを取得できませんでした"
echo "   手動で以下を実行してください:"
echo "   stripe listen --forward-to localhost:3000/api/stripe/webhook"
echo "   表示された whsec_xxxxx を .env.local に追加してください"

