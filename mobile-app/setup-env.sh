#!/bin/bash

# Web版の.env.localからFirebase設定を読み込んで、モバイルアプリ用の.envファイルを作成するスクリプト

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_ENV_FILE="$SCRIPT_DIR/../.env.local"
MOBILE_ENV_FILE="$SCRIPT_DIR/.env"

if [ ! -f "$WEB_ENV_FILE" ]; then
  echo "⚠️  エラー: $WEB_ENV_FILE が見つかりません"
  echo "Web版の.env.localファイルが存在することを確認してください"
  exit 1
fi

echo "📝 Web版の.env.localからFirebase設定を読み込んでいます..."

# Firebase設定を抽出してEXPO_PUBLIC_に変換
{
  echo "# Firebase設定（Web版の.env.localから自動変換）"
  echo "# 生成日時: $(date)"
  echo ""
  
  grep -E "^NEXT_PUBLIC_FIREBASE" "$WEB_ENV_FILE" | sed 's/^NEXT_PUBLIC_/EXPO_PUBLIC_/g'
  
  # MESSAGING_SENDER_IDが存在しない場合は警告を表示
  if ! grep -q "MESSAGING_SENDER_ID" "$WEB_ENV_FILE"; then
    echo ""
    echo "# ⚠️  MESSAGING_SENDER_IDが見つかりませんでした"
    echo "# Firebase Consoleから取得して手動で追加してください:"
    echo "# EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id"
  fi
} > "$MOBILE_ENV_FILE"

if [ $? -eq 0 ]; then
  echo "✅ $MOBILE_ENV_FILE を作成しました"
  echo ""
  echo "設定内容:"
  cat "$MOBILE_ENV_FILE"
  echo ""
  echo "⚠️  注意: .envファイルは.gitignoreに含まれているため、Gitにはコミットされません"
else
  echo "❌ エラー: .envファイルの作成に失敗しました"
  exit 1
fi
