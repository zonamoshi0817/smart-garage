#!/bin/bash
# Noto Sans JP TTFファイルをダウンロードしてBase64エンコードするスクリプト

FONT_DIR="public/fonts"
# jsDelivr CDNからダウンロード（GitHubのrawファイルの代替）
FONT_URL="https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansjp/NotoSansJP-Regular.ttf"

# フォントディレクトリを作成
mkdir -p "$FONT_DIR"

echo "Noto Sans JPフォントをダウンロード中..."
# curlを使用してダウンロード（SSL証明書検証をスキップ - 開発環境のみ）
# 注意: 本番環境では適切なSSL証明書設定が必要です

FONT_PATH="$FONT_DIR/NotoSansJP-Regular.ttf"

# 既存のフォントファイルがあるか確認
FONT_EXISTS=0
if [ -f "$FONT_PATH" ]; then
  FILE_SIZE=$(stat -f%z "$FONT_PATH" 2>/dev/null || stat -c%s "$FONT_PATH" 2>/dev/null || echo "0")
  if [ "$FILE_SIZE" -gt 100000 ]; then
    echo "既存のフォントファイルが見つかりました: $FONT_PATH"
    FONT_EXISTS=1
  else
    echo "既存のフォントファイルが無効なため、再ダウンロードします..."
    rm -f "$FONT_PATH"
  fi
fi

# GitHubのZIPアーカイブからダウンロード（より確実）
echo "Google Fontsリポジトリからダウンロード中..."
curl -k -L -o /tmp/google-fonts-main.zip "https://github.com/google/fonts/archive/refs/heads/main.zip" 2>/dev/null

if [ $? -eq 0 ] && [ -f /tmp/google-fonts-main.zip ]; then
  echo "ZIPファイルを解凍中..."
  unzip -q -o /tmp/google-fonts-main.zip -d /tmp/ 2>/dev/null
  
  # フォントファイルを探す（複数のパスを試す）
  FONT_SOURCE=""
  for path in "/tmp/fonts-main/ofl/notosansjp/NotoSansJP-Regular.ttf" \
              "/tmp/fonts-main/ofl/notosansjapanese/NotoSansJapanese-Regular.ttf" \
              "/tmp/fonts-main/apache/notosansjapanese/NotoSansJapanese-Regular.ttf"; do
    if [ -f "$path" ]; then
      FONT_SOURCE="$path"
      break
    fi
  done
  
  if [ -n "$FONT_SOURCE" ]; then
    cp "$FONT_SOURCE" "$FONT_PATH"
    rm -rf /tmp/google-fonts-main.zip /tmp/fonts-main
    echo "フォントファイルのダウンロードが完了しました: $FONT_PATH"
  else
    echo "エラー: ZIPファイル内にフォントファイルが見つかりませんでした"
    echo ""
    echo "手動でフォントファイルを準備してください:"
    echo "1. ブラウザで https://fonts.google.com/noto/specimen/Noto+Sans+JP を開く"
    echo "2. 「Download family」をクリックしてZIPファイルをダウンロード"
    echo "3. ZIPを解凍し、NotoSansJP-Regular.ttfを public/fonts/ にコピー"
    echo "4. その後、このスクリプトを再実行してBase64エンコードファイルを生成"
    echo ""
    echo "詳しくは FONT_SETUP.md を参照してください"
    rm -rf /tmp/google-fonts-main.zip /tmp/fonts-main
    exit 1
  fi
else
  if [ "$FONT_EXISTS" -eq 0 ]; then
    echo "エラー: ZIPファイルのダウンロードに失敗しました"
    echo "手動でフォントファイルを準備してください（FONT_SETUP.mdを参照）"
    exit 1
  fi
fi

# フォントファイルが存在するか確認（ダウンロード成功時、または既に存在する場合）
if [ -f "$FONT_DIR/NotoSansJP-Regular.ttf" ]; then
  FILE_SIZE=$(stat -f%z "$FONT_DIR/NotoSansJP-Regular.ttf" 2>/dev/null || stat -c%s "$FONT_DIR/NotoSansJP-Regular.ttf" 2>/dev/null || echo "0")
  if [ "$FILE_SIZE" -gt 100000 ]; then
    echo "フォントファイルが見つかりました: $FONT_DIR/NotoSansJP-Regular.ttf"
    echo "Base64エンコードを生成中..."
  
  # Base64エンコードされたフォントファイルを生成
  node -e "
    const fs = require('fs');
    const path = require('path');
    const fontPath = path.join(process.cwd(), '$FONT_DIR/NotoSansJP-Regular.ttf');
    const fontData = fs.readFileSync(fontPath);
    const base64 = fontData.toString('base64');
    const outputPath = path.join(process.cwd(), 'src/lib/fonts/notoSansJP.ts');
    
    // ディレクトリを作成
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // TypeScriptファイルを生成
    const content = \`// Noto Sans JPフォント（Base64エンコード済み）
// 生成日: \${new Date().toISOString()}
export const NotoSansJPBase64 = '\${base64}';
export const NotoSansJPName = 'NotoSansJP';
\`;
    
    fs.writeFileSync(outputPath, content);
    console.log('Base64エンコードファイルを生成しました: src/lib/fonts/notoSansJP.ts');
  "
else
  echo "エラー: フォントファイルが見つかりませんでした"
  echo "手動でフォントファイルを準備してください（FONT_SETUP.mdを参照）"
  exit 1
fi
