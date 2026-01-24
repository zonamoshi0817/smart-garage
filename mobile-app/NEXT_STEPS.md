# 次のステップ

## ✅ 完了した作業

1. ✅ Expoプロジェクトの作成
2. ✅ ルーティング設定（Expo Router）
3. ✅ Firebase接続設定
4. ✅ 認証画面の実装
5. ✅ 車選択画面の実装
6. ✅ ホーム画面の実装（次回メンテ表示）
7. ✅ 通知機能の実装
8. ✅ PDF共有導線の実装
9. ✅ 依存関係のインストール
10. ✅ Firebase設定ファイルの作成

## 🚀 アプリの起動

```bash
cd mobile-app
npm start
```

その後、以下のいずれかの方法でアプリを実行：

### 方法1: Expo Goアプリを使用（推奨）

1. **iOS**: App Storeから「Expo Go」をインストール
2. **Android**: Google Playから「Expo Go」をインストール
3. ターミナルに表示されるQRコードをスキャン

### 方法2: シミュレーター/エミュレーター

- **iOS**: `npm run ios` （Xcodeが必要）
- **Android**: `npm run android` （Android Studioが必要）

## 📋 動作確認チェックリスト

### 1. 認証
- [ ] オンボーディング画面が表示される
- [ ] 新規登録ができる
- [ ] ログインができる
- [ ] Web版で作成したアカウントでログインできる

### 2. 車選択
- [ ] Web版で登録した車が一覧表示される
- [ ] 車を選択できる
- [ ] 選択した車がホーム画面に反映される

### 3. ホーム画面
- [ ] 選択した車の情報が表示される
- [ ] 次回メンテの残りkmが表示される（仮のロジック）

### 4. 通知
- [ ] 通知権限のリクエストが表示される
- [ ] 通知を有効にできる
- [ ] 「5秒後に通知」ボタンでテスト通知が送信される

### 5. PDF共有
- [ ] PDF共有ボタンが表示される
- [ ] ボタンを押すとメッセージが表示される（ダミー実装）

## 🔧 設定の確認

### Firebase設定

`.env`ファイルに以下の設定が含まれているか確認：

```bash
cat mobile-app/.env
```

必要な設定：
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`（オプション）

### MESSAGING_SENDER_IDが不足している場合

1. Firebase Consoleにアクセス: https://console.firebase.google.com/
2. プロジェクトを選択: `smart-garage-74ad1`
3. プロジェクト設定 → 全般 → マイアプリ
4. Webアプリの設定から `messagingSenderId` をコピー
5. `.env`ファイルに追加：
   ```
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
   ```

## 🐛 トラブルシューティング

### エラー: "Firebase: Error (auth/invalid-api-key)"

`.env`ファイルの設定値を確認してください。Web版の`.env.local`から正しくコピーされているか確認。

### エラー: "Cannot find module 'expo-router'"

依存関係を再インストール：
```bash
cd mobile-app
rm -rf node_modules package-lock.json
npm install
```

### アプリが起動しない

1. Expo CLIのバージョンを確認: `npx expo --version`
2. キャッシュをクリア: `npx expo start -c`
3. ポートが使用中の場合: `npx expo start --port 8082`

## 📱 今後の拡張

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

## 📚 参考資料

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
