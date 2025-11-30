#!/bin/bash

# Firebase Service Account JSON を Base64 エンコードするスクリプト
# 使用方法: ./scripts/setup-firebase-admin.sh path/to/serviceAccountKey.json

if [ $# -eq 0 ]; then
  echo "使用方法: $0 <path/to/serviceAccountKey.json>"
  echo ""
  echo "例: $0 ~/Downloads/serviceAccountKey.json"
  exit 1
fi

JSON_FILE=$1

if [ ! -f "$JSON_FILE" ]; then
  echo "エラー: ファイルが見つかりません: $JSON_FILE"
  exit 1
fi

echo "Firebase Service Account JSON を Base64 エンコードしています..."
BASE64_ENCODED=$(base64 -i "$JSON_FILE" | tr -d '\n')

echo ""
echo "=========================================="
echo "以下の文字列を .env.local に追加してください:"
echo "=========================================="
echo ""
echo "FIREBASE_SERVICE_ACCOUNT_BASE64=$BASE64_ENCODED"
echo ""
echo "=========================================="
echo ""

# プロジェクトIDを取得
PROJECT_ID=$(cat "$JSON_FILE" | grep -o '"project_id": "[^"]*' | cut -d'"' -f4)
if [ ! -z "$PROJECT_ID" ]; then
  echo "プロジェクトIDも追加してください:"
  echo ""
  echo "FIREBASE_PROJECT_ID=$PROJECT_ID"
  echo ""
fi

echo "完了しました！"

