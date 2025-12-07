# 🔐 Firebase Authentication カスタムドメイン設定ガイド

認証画面のURLを `smart-garage-74ad1.firebaseapp.com` から `garagelog.jp` に変更する手順

---

## 概要

Firebase Authenticationの認証画面に表示されるURLを変更するには、Firebase Hostingにカスタムドメインを設定し、環境変数を更新する必要があります。

---

## 手順

### 1. Firebase Hostingにカスタムドメインを追加

1. **Firebase Console を開く**
   - https://console.firebase.google.com/project/smart-garage-74ad1
   - プロジェクト: `smart-garage-74ad1`

2. **Hosting を選択**
   - 左メニューから「Hosting」をクリック

3. **カスタムドメインを追加**
   - 「カスタムドメインを追加」ボタンをクリック
   - `garagelog.jp` を入力
   - 「続行」をクリック

4. **DNS設定を追加**
   - Firebaseが提示するDNSレコードをコピー
   - 通常は以下のいずれか：
     - **Aレコード**: `@` → IPアドレス
     - **CNAMEレコード**: `@` → Firebase Hostingのドメイン

5. **ドメインレジストラでDNS設定**
   - お名前.com / ムームードメインなどでDNS設定を追加
   - 反映まで数分〜数時間かかる場合があります

6. **所有権の確認**
   - Firebase Consoleで「確認」ボタンをクリック
   - 設定が正しければ「接続済み」と表示されます

---

### 2. Firebase Authenticationの承認済みドメインを追加

1. **Firebase Console → Authentication → Settings**
   - 「承認済みドメイン」タブを選択

2. **ドメインを追加**
   - 「ドメインを追加」をクリック
   - 以下を追加：
     - `garagelog.jp`
     - `www.garagelog.jp`

3. **保存**
   - 追加後、自動的に保存されます

---

### 3. Google OAuthのリダイレクトURIを更新

#### 3.1 Google Cloud Consoleにアクセス

1. **Google Cloud Console を開く**
   - 直接リンク: https://console.cloud.google.com/apis/credentials?project=smart-garage-74ad1
   - または、手動で:
     - https://console.cloud.google.com にアクセス
     - プロジェクト `smart-garage-74ad1` を選択（画面上部のプロジェクト選択ドロップダウン）
     - 左メニューから「APIとサービス」→「認証情報」を選択

#### 3.2 OAuth 2.0クライアントIDを特定

1. **認証情報ページを確認**
   - 「OAuth 2.0 クライアント ID」セクションを探す
   - 複数のクライアントIDがある場合:
     - 種類が「ウェブアプリケーション」または「Webクライアント」のものを探す
     - 名前が「Web client」または「Firebase Web App」などのものを探す

#### 3.3 クライアントIDを編集

1. **クライアントIDをクリック**
   - OAuth 2.0クライアントIDの行をクリック（名前または右側の編集アイコン）

2. **承認済みのリダイレクトURIを確認**
   - 画面を下にスクロールして「承認済みのリダイレクト URI」セクションを探す
   - 現在、以下のようなURIが設定されている可能性があります:
     - `https://smart-garage-74ad1.firebaseapp.com/__/auth/handler`
     - `http://localhost:3000/__/auth/handler` (開発環境用)

3. **新しいURIを追加**
   - 「URI を追加」または「+ URI を追加」ボタンをクリック
   - 入力フィールドに以下を入力:
     ```
     https://garagelog.jp/__/auth/handler
     ```
   - 注意: 末尾の `/` は不要です

4. **既存のURIは残す**
   - 既存の `smart-garage-74ad1.firebaseapp.com` のURIは削除しない
   - 後方互換性のため、両方を保持します

#### 3.4 保存

1. **設定を保存**
   - 画面下部の「保存」ボタンをクリック
   - または、右上の「保存」ボタンをクリック

2. **反映確認**
   - 保存後、「承認済みのリダイレクト URI」の一覧に `https://garagelog.jp/__/auth/handler` が表示されていることを確認

#### 3.5 トラブルシューティング

**複数のOAuthクライアントIDがある場合:**
- Firebaseプロジェクトの場合、通常は「Firebase Web App」という名前のクライアントIDを使用
- 複数ある場合、すべてに追加するか、Firebase Consoleから確認することをお勧めします

**Firebase Consoleから確認する方法:**
1. Firebase Console → Authentication → 設定 → OAuth設定
2. 各プロバイダ（Google）の設定を確認
3. そこからGoogle Cloud Consoleへのリンクがある場合があります

---

### 4. 環境変数を更新

#### 4.1 ローカル環境 (.env.local)

`.env.local` ファイルを編集：

```bash
# 変更前
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=smart-garage-74ad1.firebaseapp.com

# 変更後
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=garagelog.jp
```

#### 4.2 Vercel環境変数

**方法A: Vercel Dashboard（推奨）**

1. **Vercel Dashboard を開く**
   - https://vercel.com/kobayashis-projects-6366834f/smart-garage

2. **Settings → Environment Variables**
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` を探す
   - 既存の変数がある場合は「Edit」をクリック、ない場合は「Add New」をクリック
   - Key: `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - Value: `garagelog.jp`
   - Environment: `Production`, `Preview`, `Development` すべてにチェック
   - 「Save」をクリック

3. **エラーが出る場合**
   - ページをリロードして再試行
   - 既存の変数を一度削除してから新規追加
   - ブラウザのキャッシュをクリアして再試行

**方法B: Vercel CLI（Dashboardでエラーが出る場合）**

```bash
# すべての環境に設定
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production
# プロンプトが表示されたら `garagelog.jp` を入力

vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN preview
# プロンプトが表示されたら `garagelog.jp` を入力

vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN development
# プロンプトが表示されたら `garagelog.jp` を入力
```

**環境変数の確認:**
```bash
vercel env ls
```

4. **再デプロイ**
   - 環境変数変更後、自動的に再デプロイされる
   - または手動で再デプロイ:
     ```bash
     vercel --prod
     ```

---

### 5. メールテンプレートの更新（オプション）

Firebase Authenticationのメールテンプレートもカスタムドメインを使用できます。

1. **Firebase Console → Authentication → Templates**
   - 各テンプレート（メールアドレスの確認、パスワードリセットなど）を選択

2. **アクションURLをカスタマイズ**
   - 「アクションURLをカスタマイズ」を有効化
   - `https://garagelog.jp/__/auth/action` を設定

3. **保存**

---

## 動作確認

### 1. 認証画面のURL確認

1. アプリでログインを試行
2. Googleアカウント選択画面で、URLが `garagelog.jp` に変更されているか確認
3. 「ガレージログに移動」と表示されることを確認

### 2. 認証フローの確認

- [ ] Googleログインが正常に動作する
- [ ] リダイレクトエラーが発生しない
- [ ] 認証後に正しくアプリに戻る
- [ ] メール認証リンクが正常に動作する（設定した場合）

---

## トラブルシューティング

### エラー: "auth/unauthorized-domain"

**原因**: 承認済みドメインに `garagelog.jp` が追加されていない

**解決方法**:
1. Firebase Console → Authentication → Settings → 承認済みドメイン
2. `garagelog.jp` と `www.garagelog.jp` が追加されているか確認
3. 追加されていない場合は追加

### エラー: "redirect_uri_mismatch"

**原因**: Google OAuthのリダイレクトURIが正しく設定されていない

**解決方法**:
1. Google Cloud Console → APIとサービス → 認証情報
2. OAuth 2.0クライアントIDを選択
3. 「承認済みのリダイレクトURI」に `https://garagelog.jp/__/auth/handler` が追加されているか確認

### カスタムドメインが接続されない

**原因**: DNS設定が正しく反映されていない

**解決方法**:
1. `dig garagelog.jp` または `nslookup garagelog.jp` でDNS設定を確認
2. Firebase Consoleで提示されたDNSレコードと一致しているか確認
3. DNS反映まで最大48時間かかる場合があります

---

## 注意事項

1. **後方互換性**: `smart-garage-74ad1.firebaseapp.com` も承認済みドメインに残しておくことで、既存ユーザーへの影響を最小限にできます。

2. **SSL証明書**: Firebase Hostingがカスタムドメイン用のSSL証明書を自動的に発行します（数分〜数時間かかる場合があります）。

3. **環境変数の反映**: Vercelの環境変数を変更した後、必ず再デプロイを実行してください。

---

## 参考リンク

- [Firebase Hosting カスタムドメイン](https://firebase.google.com/docs/hosting/custom-domain)
- [Firebase Authentication カスタムドメイン](https://firebase.google.com/docs/auth/custom-domain)
- [Google OAuth 設定](https://console.cloud.google.com/apis/credentials)

---

**最終更新**: 2025年12月7日  
**適用プロジェクト**: smart-garage-74ad1  
**カスタムドメイン**: garagelog.jp
