# Google Analytics 4 (GA4) セットアップガイド

LPのアクセス分析を有効にするためのセットアップ手順です。

## クイックリファレンス

### よく使うコマンド

```bash
# Vercel環境変数の確認（推奨）
npm run vercel:env:check

# 環境変数の一覧表示
npm run vercel:env:ls

# 環境変数の設定
vercel env add NEXT_PUBLIC_GA_MEASUREMENT_ID

# デプロイログの確認
npm run vercel:logs

# 本番環境にデプロイ
vercel --prod
```

### 開発環境での確認

開発サーバーを起動すると、コンソールにGA設定の状態が表示されます：
- ✅ 設定済み: `✅ Google Analytics: 設定済み`
- ⚠️ 未設定: `⚠️ Google Analytics: 測定IDが設定されていません`

## 1. Google Analytics 4 プロパティの作成

1. [Google Analytics](https://analytics.google.com/) にアクセス
2. 「管理」→「プロパティを作成」をクリック
3. プロパティ名を入力（例: "GarageLog"）
4. レポートのタイムゾーンと通貨を設定
5. 「ビジネス情報」を入力して「作成」をクリック

## 2. 測定IDの取得

1. 作成したプロパティの「管理」→「データストリーム」をクリック
2. 「ウェブ」を選択
3. ウェブサイトのURLを入力（例: `https://garagelog.jp`）
4. 「ストリーム名」を入力（例: "GarageLog Web"）
5. 「ストリームを作成」をクリック
6. 表示される「測定ID」（例: `G-XXXXXXXXXX`）をコピー

## 3. 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成（または既存のファイルに追加）し、以下の環境変数を設定してください：

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**重要**: 
- `NEXT_PUBLIC_` プレフィックスが必要です（Next.jsでクライアント側からアクセス可能にするため）
- `.env.local` ファイルは `.gitignore` に含まれているため、Gitにはコミットされません
- 本番環境（Vercelなど）でも同じ環境変数を設定してください

## 4. 動作確認

1. 開発サーバーを起動: `npm run dev`
2. ブラウザで `http://localhost:3000` にアクセス
3. ブラウザの開発者ツール（F12）→「ネットワーク」タブを開く
4. `gtag` または `collect` というリクエストが送信されていることを確認
5. Google Analyticsの「リアルタイム」レポートでアクセスが確認できるか確認

## 5. 追跡されるイベント

以下のイベントが自動的に追跡されます：

### ページビュー
- LPページへのアクセス

### イベント
- `lp_cta_click`: CTAボタンのクリック（location: "hero", "pricing", "features", "cta_section" など）
- `lp_login_click`: ログインボタンのクリック（location: "header", "hero", "cta_section" など）
- `lp_section_view`: セクションの表示（section_name: "hero", "features", "pricing", "faq" など）
- `lp_scroll_depth`: スクロール深度（depth: 25, 50, 75, 100）

## 6. Google Analyticsでの確認方法

1. Google Analyticsにログイン
2. 「レポート」→「エンゲージメント」→「イベント」を選択
3. イベント名でフィルタリングして、各イベントの発生回数を確認

## 7. 本番環境での設定（Vercel）

### 方法1: Vercelダッシュボードから設定

1. [Vercelダッシュボード](https://vercel.com/dashboard)にアクセス
2. プロジェクトを選択
3. 「Settings」→「Environment Variables」を選択
4. 「Add New」をクリック
5. 以下を入力：
   - Key: `NEXT_PUBLIC_GA_MEASUREMENT_ID`
   - Value: `G-XXXXXXXXXX`（実際の測定ID）
   - Environment: Production, Preview, Development（必要に応じて）
6. 「Save」をクリック
7. デプロイを再実行（または自動デプロイを待つ）

### 方法2: Vercel CLIから設定

```bash
# Vercel CLIにログイン（初回のみ）
vercel login

# プロジェクトにリンク（初回のみ）
vercel link

# 環境変数を設定
vercel env add NEXT_PUBLIC_GA_MEASUREMENT_ID

# プロンプトで以下を入力：
# - Value: G-XXXXXXXXXX（実際の測定ID）
# - Environment: Production, Preview, Development（必要に応じて選択）

# 環境変数を確認
vercel env ls

# 本番環境にデプロイ
vercel --prod
```

### 方法3: 環境変数の確認（Vercel CLI）

```bash
# 設定されている環境変数を一覧表示
vercel env ls

# 特定の環境変数の値を確認（値はマスクされます）
vercel env ls | grep NEXT_PUBLIC_GA_MEASUREMENT_ID

# 本番環境の環境変数を確認
vercel env ls production
```

### 方法4: デプロイ後の動作確認

1. **ブラウザの開発者ツールで確認**
   - 本番サイト（例: `https://garagelog.jp`）にアクセス
   - 開発者ツール（F12）→「ネットワーク」タブを開く
   - `gtag` または `collect` というリクエストが送信されていることを確認
   - フィルタに `gtag` と入力して検索

2. **Google Analyticsのリアルタイムレポートで確認**
   - [Google Analytics](https://analytics.google.com/)にログイン
   - 「レポート」→「リアルタイム」を選択
   - 本番サイトにアクセスして、リアルタイムでユーザーが表示されることを確認

3. **Vercelのログで確認**
   ```bash
   # 最新のデプロイログを確認
   vercel logs --follow
   
   # 特定のデプロイのログを確認
   vercel logs [deployment-url]
   ```

4. **環境変数が正しく読み込まれているか確認**
   - 本番サイトのHTMLソースを確認（右クリック→「ページのソースを表示」）
   - `gtag` または `G-` で始まる測定IDが含まれているか確認
   - または、ブラウザのコンソールで以下を実行：
     ```javascript
     console.log('GA Measurement ID:', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
     ```
   - **注意**: クライアント側では `process.env` はビルド時に置き換えられるため、実際の値は確認できませんが、スクリプトが読み込まれているかは確認できます

## 8. Vercel環境変数の確認方法

### スクリプトを使用した確認（推奨）

```bash
# 確認スクリプトを実行
./scripts/check-vercel-env.sh
```

このスクリプトは以下を確認します：
- Vercel CLIがインストールされているか
- Vercelにログインしているか
- プロジェクトがリンクされているか
- 環境変数が設定されているか

### 手動での確認

```bash
# 環境変数の一覧を表示
vercel env ls

# 特定の環境変数を確認
vercel env ls | grep NEXT_PUBLIC_GA_MEASUREMENT_ID

# 本番環境の環境変数を確認
vercel env ls production
```

### 開発環境での確認

開発サーバーを起動すると、コンソールに以下のメッセージが表示されます：

- ✅ **設定済みの場合**: `✅ Google Analytics: 設定済み { measurementId: "G-XXXXXXXXXX", ... }`
- ⚠️ **未設定の場合**: `⚠️ Google Analytics: 測定IDが設定されていません`

## トラブルシューティング

### イベントが記録されない
- ブラウザの広告ブロッカーがGAをブロックしている可能性があります
- プライベートブラウジングモードを無効にしてください
- 開発者ツールのコンソールでエラーがないか確認してください

### 測定IDが設定されていない
- `.env.local` ファイルが正しく作成されているか確認
- 環境変数名が `NEXT_PUBLIC_GA_MEASUREMENT_ID` であることを確認
- 開発サーバーを再起動してください（環境変数の変更は再起動が必要です）
- 開発環境のコンソールで警告メッセージを確認

### 本番環境で動作しない
- Vercelの環境変数設定を確認: `vercel env ls`
- 環境変数が正しく設定されているか確認: `./scripts/check-vercel-env.sh`
- デプロイ後に環境変数が正しく設定されているか確認
- Vercelのログでエラーがないか確認: `vercel logs --follow`
- 本番サイトのHTMLソースで `gtag` スクリプトが読み込まれているか確認

### Vercel CLIがインストールされていない
```bash
# Vercel CLIをインストール
npm i -g vercel

# または、ローカルにインストール
npm install --save-dev vercel
npx vercel env ls
```

