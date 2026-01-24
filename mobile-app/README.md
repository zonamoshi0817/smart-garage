# GarageLog Mobile App

GarageLogのiOS/Android向けネイティブアプリ（React Native + Expo）。

## 概要

既存のWeb版（Next.js + Firebase）とは別に、React Native（Expo）で構築されたモバイルアプリです。
最初のMVPは「ログイン→車選択→次回メンテ表示→通知→PDF共有」に限定しています。

## 技術スタック

- **フレームワーク**: Expo + TypeScript
- **ルーティング**: Expo Router
- **認証・データベース**: Firebase Auth / Firestore（Web版と同じプロジェクトを使用）
- **通知**: Expo Notifications
- **共有**: Expo Sharing

## セットアップ

### 1. 依存関係のインストール

```bash
cd mobile-app
npm install
```

### 2. Firebase設定

**自動設定（推奨）:**

Web版の`.env.local`から自動的にFirebase設定をコピーするスクリプトを実行：

```bash
cd mobile-app
./setup-env.sh
```

これで`mobile-app/.env`ファイルが自動生成されます。

**手動設定:**

自動設定が失敗した場合、または`MESSAGING_SENDER_ID`が不足している場合は、手動で設定してください：

```bash
cp .env.example .env
```

`.env`ファイルを編集して、Web版の`.env.local`から以下の値をコピー（`NEXT_PUBLIC_`を`EXPO_PUBLIC_`に変更）：

```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id  # 必要に応じてFirebase Consoleから取得
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**注意:** `MESSAGING_SENDER_ID`はWeb版の`.env.local`に含まれていない場合があります。その場合はFirebase Consoleから取得して追加してください。

### 3. アプリの起動

```bash
npm start
```

その後、以下のいずれかの方法でアプリを実行：

**方法1: Expo Goアプリを使用（推奨・SDK 54対応）**

1. **iOS**: App Storeから「Expo Go」をインストール
2. **Android**: Google Playから「Expo Go」をインストール
3. ターミナルに表示されるQRコードをスキャン：
   - **iOS**: iPhoneのカメラアプリでQRコードをスキャン → Expo Goが自動的に開く
   - **Android**: Expo Goアプリ内の「Scan QR code」ボタンでスキャン

**方法2: シミュレーター/エミュレーター**

- iOS: `npm run ios` （Xcodeが必要）
- Android: `npm run android` （Android Studioが必要）

## MVP機能

### 実装済み

1. **認証**
   - メール/パスワードでのログイン・新規登録
   - Firebase Authを使用

2. **車選択**
   - ログインユーザーの車一覧をFirestoreから取得
   - 選択した車IDをAsyncStorageに保存

3. **ホーム画面**
   - 選択中の車の情報を表示
   - 次回メンテの残りkmを表示（仮のロジック）

4. **通知**
   - 通知権限のリクエスト
   - デバッグ用の「5秒後に通知」ボタン

5. **PDF共有**
   - 共有シートを開く導線（ダミー実装）

## 画面構成

- `/` - スプラッシュ/認証状態チェック
- `/onboarding` - オンボーディング画面
- `/(auth)/login` - ログイン画面
- `/(auth)/signup` - 新規登録画面
- `/cars/select` - 車選択画面
- `/home` - ホーム画面（次回メンテ表示）

## データ構造

Web版と同じFirestoreデータ構造を使用：

- `cars` コレクション: `userId`でフィルタリング
- `maintenanceRecords` コレクション: 今後実装予定
- `fuelLogs` コレクション: 今後実装予定
- `customizations` コレクション: 今後実装予定

## 今後の拡張方針

### Phase 2（次回実装予定）

- [ ] メンテナンス記録の一覧表示
- [ ] メンテナンス記録の追加
- [ ] 次回メンテの正確な計算（maintenanceRecordsから）

### Phase 3（将来）

- [ ] 給油記録の管理
- [ ] カスタマイズ記録の管理
- [ ] PDFエクスポート機能の実装
- [ ] Apple Sign-In対応
- [ ] プッシュ通知（Firebase Cloud Messaging）

### Phase 4（将来）

- [ ] レシートOCR機能
- [ ] 画像アップロード
- [ ] オフライン対応
- [ ] データ同期の改善

## 注意事項

- **Web版のUIをそのまま再現しない**: モバイルアプリは独自のUI/UXで設計
- **MVP以外の機能は後回し**: レシートOCR等の高度な機能は将来実装
- **既存データとの互換性**: Web版と同じFirestoreデータ構造を使用

## トラブルシューティング

### Firebase接続エラー

`.env`ファイルの設定値を確認してください。Web版の`.env.local`と同じ値を使用します。

### 通知が動作しない

iOS/Androidの設定で通知権限が有効になっているか確認してください。

### 車が表示されない

Web版で車を登録してから、アプリで再度ログインしてください。

## ライセンス

既存のWeb版と同じライセンスに準拠します。
