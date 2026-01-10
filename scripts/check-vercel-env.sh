#!/bin/bash

# Vercel環境変数の確認スクリプト
# 使用方法: ./scripts/check-vercel-env.sh

echo "🔍 Vercel環境変数の確認"
echo "================================"
echo ""

# Vercel CLIがインストールされているか確認
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLIがインストールされていません"
    echo "   インストール: npm i -g vercel"
    exit 1
fi

echo "✅ Vercel CLIが見つかりました"
echo ""

# ログイン状態を確認
if ! vercel whoami &> /dev/null; then
    echo "⚠️  Vercelにログインしていません"
    echo "   ログイン: vercel login"
    exit 1
fi

echo "✅ Vercelにログイン済み"
echo ""

# プロジェクトがリンクされているか確認
if [ ! -f ".vercel/project.json" ]; then
    echo "⚠️  プロジェクトがリンクされていません"
    echo "   リンク: vercel link"
    exit 1
fi

echo "✅ プロジェクトがリンク済み"
echo ""

# 環境変数を確認
echo "📋 設定されている環境変数:"
echo "================================"
vercel env ls

echo ""
echo "🔍 Google Analytics関連の環境変数:"
echo "================================"
vercel env ls | grep -i "GA_MEASUREMENT_ID" || echo "❌ NEXT_PUBLIC_GA_MEASUREMENT_ID が見つかりません"

echo ""
echo "💡 環境変数を設定するには:"
echo "   vercel env add NEXT_PUBLIC_GA_MEASUREMENT_ID"
echo ""

