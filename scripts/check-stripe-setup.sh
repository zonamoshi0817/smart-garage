#!/bin/bash

# Stripe Checkout セットアップの確認スクリプト
# 使用方法: ./scripts/check-stripe-setup.sh

echo "=========================================="
echo "Stripe Checkout セットアップ確認"
echo "=========================================="
echo ""

# .env.local ファイルの存在確認
if [ ! -f ".env.local" ]; then
  echo "❌ .env.local ファイルが見つかりません"
  echo "   .env.local ファイルを作成してください"
  exit 1
fi

echo "✅ .env.local ファイルが見つかりました"
echo ""

# 環境変数の読み込み
source .env.local 2>/dev/null || true

# 必須環境変数のチェック
MISSING_VARS=()

check_var() {
  local var_name=$1
  local var_value=${!var_name}
  
  if [ -z "$var_value" ]; then
    echo "❌ $var_name が設定されていません"
    MISSING_VARS+=("$var_name")
    return 1
  else
    echo "✅ $var_name が設定されています"
    return 0
  fi
}

echo "環境変数の確認:"
echo ""

# Firebase Admin SDK
check_var "FIREBASE_SERVICE_ACCOUNT_BASE64"
check_var "FIREBASE_PROJECT_ID"

# Stripe
check_var "STRIPE_SECRET_KEY"
check_var "NEXT_PUBLIC_PRICE_MONTHLY"
check_var "NEXT_PUBLIC_PRICE_YEARLY"
check_var "STRIPE_WEBHOOK_SECRET"

echo ""

# 環境変数の形式チェック
if [ ! -z "$STRIPE_SECRET_KEY" ]; then
  if [[ $STRIPE_SECRET_KEY == sk_test_* ]]; then
    echo "✅ STRIPE_SECRET_KEY はテストモード用です"
  elif [[ $STRIPE_SECRET_KEY == sk_live_* ]]; then
    echo "⚠️  STRIPE_SECRET_KEY は本番モード用です（開発環境ではテストモードを推奨）"
  else
    echo "⚠️  STRIPE_SECRET_KEY の形式が正しくない可能性があります"
  fi
fi

if [ ! -z "$NEXT_PUBLIC_PRICE_MONTHLY" ]; then
  if [[ $NEXT_PUBLIC_PRICE_MONTHLY == price_* ]]; then
    echo "✅ NEXT_PUBLIC_PRICE_MONTHLY の形式は正しいです"
  else
    echo "⚠️  NEXT_PUBLIC_PRICE_MONTHLY の形式が正しくない可能性があります（price_で始まる必要があります）"
  fi
fi

if [ ! -z "$NEXT_PUBLIC_PRICE_YEARLY" ]; then
  if [[ $NEXT_PUBLIC_PRICE_YEARLY == price_* ]]; then
    echo "✅ NEXT_PUBLIC_PRICE_YEARLY の形式は正しいです"
  else
    echo "⚠️  NEXT_PUBLIC_PRICE_YEARLY の形式が正しくない可能性があります（price_で始まる必要があります）"
  fi
fi

if [ ! -z "$STRIPE_WEBHOOK_SECRET" ]; then
  if [[ $STRIPE_WEBHOOK_SECRET == whsec_* ]]; then
    echo "✅ STRIPE_WEBHOOK_SECRET の形式は正しいです"
  else
    echo "⚠️  STRIPE_WEBHOOK_SECRET の形式が正しくない可能性があります（whsec_で始まる必要があります）"
  fi
fi

if [ ! -z "$FIREBASE_SERVICE_ACCOUNT_BASE64" ]; then
  # Base64デコードを試みる
  if echo "$FIREBASE_SERVICE_ACCOUNT_BASE64" | base64 -d > /dev/null 2>&1; then
    echo "✅ FIREBASE_SERVICE_ACCOUNT_BASE64 は有効なBase64文字列です"
    
    # JSONとしてパースできるか確認
    DECODED=$(echo "$FIREBASE_SERVICE_ACCOUNT_BASE64" | base64 -d)
    if echo "$DECODED" | python3 -m json.tool > /dev/null 2>&1 || echo "$DECODED" | jq . > /dev/null 2>&1; then
      echo "✅ FIREBASE_SERVICE_ACCOUNT_BASE64 は有効なJSONです"
    else
      echo "⚠️  FIREBASE_SERVICE_ACCOUNT_BASE64 はJSONとしてパースできません"
    fi
  else
    echo "⚠️  FIREBASE_SERVICE_ACCOUNT_BASE64 は有効なBase64文字列ではない可能性があります"
  fi
fi

echo ""

# 結果のサマリー
if [ ${#MISSING_VARS[@]} -eq 0 ]; then
  echo "=========================================="
  echo "✅ すべての必須環境変数が設定されています"
  echo "=========================================="
  echo ""
  echo "次のステップ:"
  echo "1. Stripeダッシュボードで商品と価格を作成"
  echo "2. Webhookを設定"
  echo "3. 開発サーバーを起動: npm run dev"
  echo "4. PaywallModalから決済をテスト"
  exit 0
else
  echo "=========================================="
  echo "❌ 以下の環境変数が設定されていません:"
  echo "=========================================="
  for var in "${MISSING_VARS[@]}"; do
    echo "   - $var"
  done
  echo ""
  echo "詳細は docs/STRIPE_CHECKOUT_SETUP.md を参照してください"
  exit 1
fi

