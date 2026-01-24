# Firebase Storage CORS設定

Firebase StorageでCORSエラーが発生している場合、以下の手順でCORS設定を適用してください。

**注意:** プロジェクトがSPARKプラン（無料プラン）の場合、請求アカウントが無効になっている可能性があり、`gsutil`コマンドでCORS設定を適用できない場合があります。その場合は、Firebaseコンソールから設定するか、コード側でCORSエラーを回避する実装を行ってください。

## 前提条件

1. Google Cloud SDK (`gcloud` と `gsutil`) がインストールされていること
2. Firebase プロジェクトにアクセス権限があること

## Google Cloud SDKのインストール（macOS）

### Homebrewを使用する場合（推奨）

```bash
# 1. HomebrewでGoogle Cloud SDKをインストール
brew install --cask google-cloud-sdk

# 2. PATHに追加（~/.zshrcに追加）
echo 'export PATH="/opt/homebrew/share/google-cloud-sdk/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 3. インストールを初期化
gcloud init
```

### 手動インストールの場合

1. [Google Cloud SDKのダウンロードページ](https://cloud.google.com/sdk/docs/install)からmacOS用のインストーラーをダウンロード
2. ダウンロードした`.pkg`ファイルを実行してインストール
3. ターミナルを再起動

## 設定手順

### 1. Google Cloud SDKでログイン

```bash
gcloud auth login
```

### 2. プロジェクトを設定

```bash
gcloud config set project smart-garage-74ad1
```

### 3. CORS設定を適用

**正しいバケット名を使用してください：**

```bash
# バケット名を確認
gsutil ls

# CORS設定を適用（実際のバケット名: smart-garage-74ad1.firebasestorage.app）
gsutil cors set storage-cors.json gs://smart-garage-74ad1.firebasestorage.app
```

**注意:** 請求アカウントが無効な場合、`gsutil`コマンドでエラーが発生する可能性があります。その場合は、Firebaseコンソールから設定するか、請求アカウントを有効化してください。

### 4. 設定を確認

```bash
gsutil cors get gs://smart-garage-74ad1.firebasestorage.app
```

## 代替方法: Firebaseコンソールから設定

`gsutil`コマンドが使用できない場合：

1. [Google Cloud Console](https://console.cloud.google.com/storage/browser) にアクセス
2. プロジェクト `smart-garage-74ad1` を選択
3. 「Storage」→「ブラウザ」を開く
4. バケット `smart-garage-74ad1.firebasestorage.app` を選択
5. 「設定」タブを開く
6. 「CORS設定」セクションで `storage-cors.json` の内容を貼り付け

## 設定内容

`storage-cors.json` には以下の設定が含まれています：

- **origin**: すべてのオリジンからアクセスを許可（本番環境では特定のドメインに制限することを推奨）
- **method**: GET, HEAD, PUT, POST, DELETE を許可
- **responseHeader**: Content-Type, Authorization, x-goog-resumable を許可
- **maxAgeSeconds**: プリフライトリクエストのキャッシュ時間（3600秒 = 1時間）

## 本番環境での推奨設定

本番環境では、`origin` を特定のドメインに制限することを推奨します：

```json
[
  {
    "origin": [
      "https://your-domain.com",
      "https://www.your-domain.com"
    ],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "responseHeader": ["Content-Type", "Authorization", "x-goog-resumable"],
    "maxAgeSeconds": 3600
  }
]
```

## トラブルシューティング

### CORSエラーが続く場合

1. 設定が正しく適用されているか確認：
   ```bash
   gsutil cors get gs://smart-garage-74ad1.appspot.com
   ```

2. ブラウザのキャッシュをクリア

3. Firebase Storageのルールが正しく設定されているか確認（`storage.rules`）

4. 認証状態を確認（ログインしているか）

## 参考

- [Firebase Storage CORS設定](https://firebase.google.com/docs/storage/web/download-files#cors_configuration)
- [gsutil cors コマンド](https://cloud.google.com/storage/docs/gsutil/commands/cors)
