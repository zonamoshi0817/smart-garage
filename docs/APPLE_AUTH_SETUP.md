# Apple認証の設定手順

Firebase AuthenticationでApple認証を有効化するための詳細な手順です。

## 前提条件

- Apple Developerアカウント（有料、年額$99）
- Firebaseプロジェクトが作成済みであること

## 手順1: Apple DeveloperでサービスIDとキーを作成

### 1-1. Apple Developer Portalにログイン

1. [Apple Developer Portal](https://developer.apple.com/account/)にログイン
2. 「Certificates, Identifiers & Profiles」を選択

### 1-2. サービスID（Service ID）を作成

1. 左メニューから「Identifiers」を選択
2. 右上の「+」ボタンをクリック
3. 「Services IDs」を選択して「Continue」
4. 「Description」にサービス名を入力（例: `GarageLog`）
5. 「Identifier」に一意のIDを入力（例: `com.yourcompany.garagelog`）
6. 「Continue」→「Register」
7. 作成したサービスIDをクリック
8. 「Sign in with Apple」にチェックを入れて「Configure」
9. 「Primary App ID」でアプリを選択（なければ先にApp IDを作成）
10. 「Website URLs」セクションで：
    - 「Domains and Subdomains」: Firebase プロジェクトのドメイン（例: `your-project.firebaseapp.com`）
    - 「Return URLs」: `https://your-project.firebaseapp.com/__/auth/handler`
11. 「Next」→「Done」→「Continue」→「Save」

### 1-3. キー（Key）を作成

1. 左メニューから「Keys」を選択
2. 右上の「+」ボタンをクリック
3. 「Key Name」を入力（例: `GarageLog Sign In Key`）
4. 「Sign in with Apple」にチェックを入れて「Configure」
5. 「Primary App ID」を選択して「Save」
6. 「Continue」→「Register」
7. **重要**: キーファイル（`.p8`）をダウンロード（一度しかダウンロードできないため、必ず保存）
8. 「Key ID」をメモ（後で使用）

## 手順2: Firebase ConsoleでApple認証を有効化

### 2-1. Firebase Consoleにアクセス

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. プロジェクトを選択

### 2-2. Authenticationを開く

1. 左メニューから「Authentication」を選択
2. 「Sign-in method」タブをクリック

### 2-3. Apple認証を有効化

1. プロバイダー一覧から「Apple」を選択
2. 「Enable」トグルをONにする
3. 以下の情報を入力：

   **OAuth code flow configuration:**
   - **Services ID**: 手順1-2で作成したサービスID（例: `com.yourcompany.garagelog`）
   - **Apple Team ID**: Apple DeveloperアカウントのTeam ID（Apple Developer Portalの右上に表示）
   - **Key ID**: 手順1-3で作成したキーのKey ID
   - **Private Key**: 手順1-3でダウンロードした`.p8`ファイルの内容を貼り付け

4. 「Save」をクリック

### 2-4. 認証ドメインの確認

1. 「Authentication」→「Settings」タブ
2. 「Authorized domains」セクションを確認
3. 必要に応じて、カスタムドメインを追加

## 手順3: コード側の確認

### 3-1. Firebase設定の確認

`.env.local`ファイルに以下の環境変数が設定されていることを確認：

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 3-2. 実装の確認

`src/lib/firebase.ts`に以下のコードが実装されていることを確認：

```typescript
import { OAuthProvider } from "firebase/auth";

const appleProvider = new OAuthProvider('apple.com');
export const loginWithApple = async () => {
  try {
    const result = await signInWithPopup(auth, appleProvider);
    return result;
  } catch (error) {
    console.error("Apple login failed:", error);
    throw error;
  }
};
```

## トラブルシューティング

### エラー: "auth/operation-not-allowed"

- Firebase ConsoleでApple認証が有効化されているか確認
- プロバイダーの設定が正しいか確認

### エラー: "auth/invalid-credential"

- サービスID、Team ID、Key IDが正しいか確認
- プライベートキーが正しく設定されているか確認

### エラー: "auth/popup-blocked"

- ブラウザのポップアップブロッカーを無効化
- または、`signInWithRedirect`を使用する方法に変更

### Apple認証が動作しない

1. **ブラウザの確認**: Apple認証はSafariで最も安定して動作します
2. **HTTPSの確認**: 本番環境ではHTTPSが必要です（localhostは例外）
3. **ドメインの確認**: Firebase Consoleの「Authorized domains」にドメインが追加されているか確認

## 注意事項

1. **プライベートキーの管理**: `.p8`ファイルは機密情報です。Gitにコミットしないでください
2. **キーの再ダウンロード不可**: キーファイルは一度しかダウンロードできないため、安全に保管してください
3. **テスト環境**: 開発環境ではlocalhostでも動作しますが、本番環境ではHTTPSが必要です
4. **Apple審査**: App Storeに公開する場合は、Appleの審査が必要な場合があります

## 参考リンク

- [Firebase公式ドキュメント: Apple認証](https://firebase.google.com/docs/auth/web/apple)
- [Apple公式ドキュメント: Sign in with Apple](https://developer.apple.com/sign-in-with-apple/)
- [Firebase Console](https://console.firebase.google.com/)
- [Apple Developer Portal](https://developer.apple.com/account/)

## 次のステップ

設定が完了したら、以下をテストしてください：

1. `/signup`ページでAppleボタンをクリック
2. Apple IDでログイン
3. `/login`ページでも同様にテスト
4. ログイン後のリダイレクトが正常に動作するか確認

