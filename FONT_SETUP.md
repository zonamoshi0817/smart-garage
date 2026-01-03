# 日本語フォント設定手順

PDF生成で日本語を正しく表示するには、Noto Sans JPフォントファイル（TTF形式）が必要です。

## 手動セットアップ手順

### 方法1: Google Fontsから直接ダウンロード（推奨）

1. **フォントファイルをダウンロード**
   - ブラウザで以下のURLを開いてください：
     https://fonts.google.com/noto/specimen/Noto+Sans+JP
   - 「Download family」ボタンをクリック
   - ZIPファイル（例：`Noto_Sans_JP.zip`）をダウンロード
   - ZIPを解凍し、`NotoSansJP-Regular.ttf`ファイルを探す
     - 通常は `Noto_Sans_JP/static/NotoSansJP-Regular.ttf` にあります

2. **フォントファイルを配置**
   ```bash
   mkdir -p public/fonts
   cp [ダウンロードしたNotoSansJP-Regular.ttf] public/fonts/
   ```

### 方法2: コマンドラインでダウンロード（macOS/Linux）

```bash
# 一時ディレクトリを作成
mkdir -p /tmp/font-download
cd /tmp/font-download

# Google FontsからZIPをダウンロード（ブラウザでURLを取得）
# または、以下のコマンドで直接ダウンロードを試みる
curl -L -o noto-sans-jp.zip "https://github.com/google/fonts/archive/refs/heads/main.zip"

# ZIPを解凍
unzip -q noto-sans-jp.zip

# TTFファイルをコピー
cp fonts-main/ofl/notosansjp/NotoSansJP-Regular.ttf ~/smart-garage/public/fonts/

# クリーンアップ
cd ~
rm -rf /tmp/font-download
```

3. **Base64エンコードファイルを生成**
   ```bash
   node -e "
   const fs = require('fs');
   const path = require('path');
   const fontPath = path.join(process.cwd(), 'public/fonts/NotoSansJP-Regular.ttf');
   const fontData = fs.readFileSync(fontPath);
   const base64 = fontData.toString('base64');
   const outputPath = path.join(process.cwd(), 'src/lib/fonts/notoSansJP.ts');
   const outputDir = path.dirname(outputPath);
   if (!fs.existsSync(outputDir)) {
     fs.mkdirSync(outputDir, { recursive: true });
   }
   const content = \`// Noto Sans JPフォント（Base64エンコード済み）
// 生成日: \${new Date().toISOString()}
export const NotoSansJPBase64 = '\${base64}';
export const NotoSansJPName = 'NotoSansJP';
\`;
   fs.writeFileSync(outputPath, content);
   console.log('Base64エンコードファイルを生成しました: src/lib/fonts/notoSansJP.ts');
   "
   ```

4. **確認**
   - `src/lib/fonts/notoSansJP.ts`ファイルが生成されていることを確認
   - PDF生成をテストして、日本語が正しく表示されることを確認

## 注意事項

- フォントファイルが準備されていない場合、PDFの日本語は文字化けします
- フォントファイルは約290KBのサイズです
- Base64エンコードされたファイルは約390KBになります

