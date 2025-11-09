#!/bin/bash
set -e

echo "🚀 Smart Garage - Stripe セットアップスクリプト"
echo "================================================"
echo ""

# Stripe CLI がインストールされているか確認
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI がインストールされていません"
    echo "以下のコマンドでインストールしてください:"
    echo "  brew install stripe/stripe-cli/stripe"
    exit 1
fi

echo "✅ Stripe CLI が見つかりました"
echo ""

# Stripe にログインしているか確認
if ! stripe config --list &> /dev/null; then
    echo "🔐 Stripe にログインしてください..."
    stripe login
fi

echo ""
echo "📝 環境変数を設定します"
echo ""

# .env.local が既に存在する場合はバックアップ
if [ -f .env.local ]; then
    echo "⚠️  既存の .env.local をバックアップします"
    cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
fi

# API キーを取得
echo "🔑 Stripe API キーを取得中..."
PUBLISHABLE_KEY=$(stripe config --list | grep "publishable_key" | awk '{print $3}' || echo "")
SECRET_KEY=$(stripe config --list | grep "secret_key" | awk '{print $3}' || echo "")

if [ -z "$PUBLISHABLE_KEY" ] || [ -z "$SECRET_KEY" ]; then
    echo "⚠️  API キーを自動取得できませんでした"
    echo "Stripe Dashboard から手動で取得してください:"
    echo "  https://dashboard.stripe.com/test/apikeys"
    PUBLISHABLE_KEY="pk_test_YOUR_KEY_HERE"
    SECRET_KEY="sk_test_YOUR_KEY_HERE"
fi

# .env.local を作成
cat > .env.local << ENVEOF
# ==========================================
# Stripe 設定
# ==========================================
STRIPE_SECRET_KEY=$SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_WILL_BE_SET_BY_WEBHOOK_LISTENER
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$PUBLISHABLE_KEY

# Stripe 価格ID（後で設定してください）
NEXT_PUBLIC_PRICE_MONTHLY=price_YOUR_MONTHLY_ID
NEXT_PUBLIC_PRICE_YEARLY=price_YOUR_YEARLY_ID

# アプリURL（本番: https://garagelog.jp）
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ==========================================
# Firebase Admin SDK 設定
# ==========================================
# 以下を設定してください:
# 1. Firebase Console → Project Settings → Service Accounts
# 2. Generate new private key → JSON をダウンロード
# 3. cat serviceAccountKey.json | base64 | tr -d '\\n'
FIREBASE_SERVICE_ACCOUNT_BASE64=YOUR_BASE64_HERE
FIREBASE_PROJECT_ID=your-project-id

# ==========================================
# 開発モード設定
# ==========================================
# 開発時に全員プレミアムにする場合は true に設定
NEXT_PUBLIC_DEV_ALL_PREMIUM=true
NEXT_PUBLIC_DEVELOPER_EMAILS=kentakobayashi@example.com,kentakobayashi@gmail.com
ENVEOF

echo ""
echo "✅ .env.local ファイルを作成しました"
echo ""
echo "📋 次のステップ:"
echo ""
echo "1. Stripe で商品と価格を作成:"
echo "   stripe products create --name='Smart Garage プレミアム（月額）'"
echo "   stripe prices create --product=prod_xxx --unit-amount=480 --currency=jpy --recurring-interval=month"
echo ""
echo "2. 取得した Price ID を .env.local に設定"
echo ""
echo "3. Firebase Service Account を設定:"
echo "   - Firebase Console でダウンロード"
echo "   - cat serviceAccountKey.json | base64 | tr -d '\\n'"
echo "   - 出力を .env.local の FIREBASE_SERVICE_ACCOUNT_BASE64 に設定"
echo ""
echo "4. 新しいターミナルで Webhook リスニングを開始:"
echo "   stripe listen --forward-to localhost:3000/api/stripe/webhook"
echo ""
echo "5. 開発サーバーを起動:"
echo "   npm run dev"
echo ""
echo "詳細は QUICK_START.md を参照してください 📖"
echo ""

