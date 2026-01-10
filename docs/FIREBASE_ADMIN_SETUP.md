# Firebase Admin SDK セットアップガイド

## 概要

Firebase Admin SDKは、サーバーサイドでFirebaseサービス（認証、Firestore、Storage）にアクセスするために必要です。Stripe CheckoutでID Tokenを検証する際にも使用されます。

## セットアップ手順

### 1. Firebase Console で Service Account を取得

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクトを選択
3. 左上の⚙️アイコン > **Project settings** をクリック
4. **Service accounts** タブを選択
5. **Generate new private key** ボタンをクリック
6. 警告ダイアログで **Generate key** をクリック
7. JSONファイルがダウンロードされます（例: `your-project-firebase-adminsdk-xxxxx.json`）

### 2. Service Account JSON を Base64 エンコード

#### 方法1: セットアップスクリプトを使用（推奨）

```bash
# ダウンロードしたJSONファイルのパスを指定
npm run firebase:setup ~/Downloads/your-project-firebase-adminsdk-xxxxx.json
```

または

```bash
./scripts/setup-firebase-admin.sh ~/Downloads/your-project-firebase-adminsdk-xxxxx.json
```

スクリプトが自動的に：
- JSONファイルをBase64エンコード
- プロジェクトIDを抽出
- `.env.local` に追加するためのコマンドを表示

#### 方法2: 手動でBase64エンコード

**macOS/Linux:**
```bash
# JSONファイルをBase64エンコード
base64 -i path/to/serviceAccountKey.json | tr -d '\n' > serviceAccountBase64.txt

# エンコードされた文字列を表示
cat serviceAccountBase64.txt
```

**Node.js:**
```bash
node -e "console.log(require('fs').readFileSync('path/to/serviceAccountKey.json').toString('base64'))"
```

**Python:**
```bash
python3 -c "import base64, json; print(base64.b64encode(open('path/to/serviceAccountKey.json', 'rb').read()).decode())"
```

### 3. .env.local に設定

#### 方法1: スクリプトの出力を使用

スクリプトが表示するコマンドをコピーして `.env.local` に追加：

```bash
FIREBASE_SERVICE_ACCOUNT_BASE64=eyJ0eXBlIjoi...（長いBase64文字列）
FIREBASE_PROJECT_ID=your-project-id
```

#### 方法2: 手動で追加

`.env.local` ファイルを開いて、以下を追加：

```bash
# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_BASE64=eyJ0eXBlIjoi...（Base64エンコードされた文字列）
FIREBASE_PROJECT_ID=your-project-id
```

**重要**: 
- `FIREBASE_SERVICE_ACCOUNT_BASE64` は、JSONファイル全体をBase64エンコードした文字列です
- 改行やスペースを含めないでください
- プロジェクトIDは、JSONファイル内の `project_id` フィールドの値です

### 4. 設定の確認

```bash
# セットアップ状況を確認
npm run stripe:setup:check
```

または、個別に確認：

```bash
# Base64文字列が正しいか確認
echo $FIREBASE_SERVICE_ACCOUNT_BASE64 | base64 -d | python3 -m json.tool > /dev/null && echo "✅ 有効なJSONです" || echo "❌ 無効なBase64文字列です"
```

## トラブルシューティング

### エラー: ファイルが見つかりません

スクリプトを実行する際に、正しいファイルパスを指定してください：

```bash
# 絶対パスを使用
./scripts/setup-firebase-admin.sh ~/Downloads/your-project-firebase-adminsdk-xxxxx.json

# または、相対パスを使用（JSONファイルをプロジェクトルートに配置した場合）
./scripts/setup-firebase-admin.sh ./serviceAccountKey.json
```

### エラー: FIREBASE_SERVICE_ACCOUNT_BASE64 is not set

`.env.local` ファイルに環境変数が正しく設定されているか確認：

```bash
# .env.local の内容を確認（機密情報は表示されないように注意）
grep "FIREBASE_SERVICE_ACCOUNT_BASE64" .env.local
```

### Base64エンコードが正しくない

- JSONファイル全体をエンコードしているか確認
- 改行文字（`\n`）が含まれていないか確認
- エンコード後の文字列が1行になっているか確認

## セキュリティ注意事項

⚠️ **重要**:
- Service Account JSONファイルは機密情報です
- Gitリポジトリにコミットしないでください（`.gitignore` に含まれています）
- `.env.local` もGitにコミットされないよう注意してください
- 本番環境では、Vercelの環境変数に設定してください

## 本番環境（Vercel）での設定

1. Vercelダッシュボード > プロジェクト > Settings > Environment Variables
2. 以下の環境変数を追加：
   - `FIREBASE_SERVICE_ACCOUNT_BASE64`: Base64エンコードされたService Account JSON
   - `FIREBASE_PROJECT_ID`: FirebaseプロジェクトID
3. **Environment** で **Production** を選択

---

**最終更新日**: 2024年12月

