# 🔐 Firebase Authentication カスタムドメイン設定ガイド

認証画面のURLを `smart-garage-74ad1.firebaseapp.com` から `garagelog.jp` に変更する手順

---

## ⚠️ 重要: 設定順序

**Firebase Hostingにカスタムドメインを設定する前に環境変数を変更すると、認証が動作しなくなります。**

`authDomain` を `garagelog.jp` に変更する前に、必ず以下を完了してください：
1. ✅ Firebase Hostingにカスタムドメイン `garagelog.jp` を追加（必須）
2. ✅ Firebase Authenticationの承認済みドメインに `garagelog.jp` を追加
3. ✅ Google OAuthのリダイレクトURIを更新
4. ✅ 環境変数を更新（最後に実行）

**現在404エラーが出ている場合:**
- 環境変数は既に `garagelog.jp` に設定済み
- Firebase Hostingの設定が未完了の可能性が高い
- まずはステップ1（Firebase Hosting設定）を完了してください

---

## 概要

Firebase Authenticationの認証画面に表示されるURLを変更するには、Firebase Hostingにカスタムドメインを設定し、環境変数を更新する必要があります。

Firebase Authenticationは、`authDomain` で指定されたドメインで認証用のエンドポイント（`/__/auth/iframe` など）を提供します。このドメインがFirebase Hostingに設定されていない場合、404エラーが発生します。

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
   - 「続行」をクリックすると、次の画面でDNS設定の指示が表示されます
   - 画面には以下のような情報が表示されます：
     - **タイプ**: Aレコード または CNAMEレコード
     - **ホスト名**: `@` または空白（ドメイン直下の場合）
     - **値**: IPアドレス または Firebase Hostingのドメイン
   
   **例：Aレコードの場合**
   ```
   タイプ: A
   ホスト名: @
   値: 151.101.1.195 (例: Firebaseが提示するIPアドレス)
   ```
   
   **例：CNAMEレコードの場合**
   ```
   タイプ: CNAME
   ホスト名: @
   値: garagelog.jp.cdn.cloudflare.net (例: Firebaseが提示するドメイン)
   ```
   
   - これらの値をコピーして控えておいてください

5. **ドメインレジストラでDNS設定を追加**
   
   **お名前.comの場合:**
   1. お名前.com Naviにログイン
   2. 「ドメイン」→「ドメイン設定」を選択
   3. `garagelog.jp` を選択
   4. 「DNSレコード設定」をクリック
   5. Firebaseが提示したタイプ（AレコードまたはCNAMEレコード）を選択
   6. ホスト名: `@` を入力（または空白）
   7. 値: Firebaseが提示したIPアドレスまたはドメインを入力
   8. 「追加」をクリック
   
   **ムームードメインの場合:**
   1. ムームードメインのコントロールパネルにログイン
   2. 「ドメイン設定」→「DNS設定」を選択
   3. `garagelog.jp` を選択
   4. 「DNSレコード設定を利用する」を選択
   5. Firebaseが提示したタイプを選択
   6. ホスト名と値を入力して保存

6. **所有権の確認**
   - DNS設定を追加した後、反映まで数分〜数時間かかります
   - Firebase Consoleの画面に「確認」または「検証」ボタンが表示されます
   - ボタンをクリックして所有権を確認
   - 設定が正しければ「接続済み」または「確認済み」と表示されます

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
   - または、「Web client (auto created by Google Service)」という名前のクライアントを選択

2. **承認済みのJavaScript生成元を追加（重要）**
   - 画面の「承認済みのJavaScript生成元」セクションを探す
   - 現在、以下のような生成元が設定されている可能性があります:
     - `http://localhost`
     - `http://localhost:5000`
     - `https://smart-garage-74ad1.firebaseapp.com`
   
   **新しい生成元を追加:**
   - 「+ URI を追加」ボタンをクリック
   - 入力フィールドに以下を入力:
     ```
     https://garagelog.jp
     ```
   - 注意: 末尾の `/` は不要です。`https://` で始まる必要があります

3. **承認済みのリダイレクトURIを追加**
   - 画面を下にスクロールして「承認済みのリダイレクト URI」セクションを探す
   - 現在、以下のようなURIが設定されている可能性があります:
     - `https://smart-garage-74ad1.firebaseapp.com/__/auth/handler`
     - `http://localhost:3000/__/auth/handler` (開発環境用)
   
   **新しいURIを追加:**
   - 「+ URI を追加」または「URI を追加」ボタンをクリック
   - 入力フィールドに以下を入力:
     ```
     https://garagelog.jp/__/auth/handler
     ```
   - 注意: 末尾の `/` は不要です。完全なURIを入力してください

4. **既存の設定は残す**
   - 既存の `smart-garage-74ad1.firebaseapp.com` の設定は削除しない
   - `localhost` の設定も開発環境で必要なので残してください
   - 後方互換性のため、すべての設定を保持します

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

### 404エラー: `/__/auth/iframe` が見つからない

**エラーメッセージ例**:
```
GET https://garagelog.jp/__/auth/iframe?apiKey=... 404 (Not Found)
Firebase: Error (auth/popup-closed-by-user)
```

**原因**: Firebase Hostingにカスタムドメイン `garagelog.jp` が設定されていない、または接続されていない

**解決方法**:
1. **Firebase Console → Hosting** を開く
   - https://console.firebase.google.com/project/smart-garage-74ad1/hosting

2. **カスタムドメインの状態を確認**
   - `garagelog.jp` がドメインリストに表示されているか確認
   - 状態が「未接続」「確認待ち」「DNS設定待ち」の場合は、設定を完了してください
   - 「接続済み」と表示されている場合は、以下を確認：
     - DNS設定が正しく反映されているか
     - SSL証明書が発行されているか（数分〜数時間かかることがあります）

3. **DNS設定が反映されていない場合**
   - ドメインレジストラでDNS設定を追加した後、反映まで最大48時間かかる場合があります
   - `dig garagelog.jp` または `nslookup garagelog.jp` でDNS設定を確認
   - Firebase Consoleで提示されたDNSレコードと一致しているか確認

4. **「接続済み」になっているのに404エラーが出る場合**
   - ブラウザのキャッシュをクリア
   - 数分待ってから再度試す（SSL証明書の発行を待つ）
   - `https://garagelog.jp` に直接アクセスして、Firebase Hostingが動作しているか確認

**一時的な回避策**（本番環境で認証が必要な場合）:
- 環境変数を一時的に `smart-garage-74ad1.firebaseapp.com` に戻す
- Firebase Hostingの設定が完了したら、再度 `garagelog.jp` に変更

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
