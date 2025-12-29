#!/bin/bash
# Noto Sans JP TTFファイルをダウンロードしてBase64エンコードするスクリプト

FONT_DIR="public/fonts"
FONT_URL="https://github.com/google/fonts/raw/main/ofl/notosansjp/NotoSansJP-Regular.ttf"

# フォントディレクトリを作成
mkdir -p "$FONT_DIR"

echo "Noto Sans JPフォントをダウンロード中..."
curl -L -o "$FONT_DIR/NotoSansJP-Regular.ttf" "$FONT_URL"

if [ $? -eq 0 ]; then
  echo "フォントファイルのダウンロードが完了しました: $FONT_DIR/NotoSansJP-Regular.ttf"
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
  echo "エラー: フォントファイルのダウンロードに失敗しました"
  exit 1
fi
