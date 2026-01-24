# クイックスタートガイド

## ✅ セットアップ完了

- ✅ Expo SDK 54.0.0にアップグレード済み
- ✅ Firebase設定（`.env`ファイル）が作成されている
- ✅ 依存関係がインストール済み
- ✅ Expo Go（SDK 54）で動作確認可能

## 🚀 アプリの起動（3ステップ）

### ステップ1: 開発サーバーを起動

```bash
cd mobile-app
npm start
```

### ステップ2: QRコードを確認

ターミナルにQRコードが表示されます。

### ステップ3: スマートフォンでスキャン

**iOS（iPhone）:**
1. App Storeから「Expo Go」をインストール（まだの場合）
2. iPhoneのカメラアプリを開く
3. QRコードをスキャン
4. 「Expo Goで開く」をタップ

**Android:**
1. Google Playから「Expo Go」をインストール（まだの場合）
2. Expo Goアプリを開く
3. 「Scan QR code」をタップ
4. QRコードをスキャン

## 📱 動作確認

アプリが起動したら、以下を確認：

1. ✅ オンボーディング画面が表示される
2. ✅ 「ログイン」または「新規登録」が動作する
3. ✅ Web版で作成したアカウントでログインできる
4. ✅ 車選択画面でWeb版で登録した車が表示される
5. ✅ ホーム画面で次回メンテが表示される

## 🔧 トラブルシューティング

### QRコードが表示されない

```bash
# キャッシュをクリアして再起動
npx expo start -c
```

### Expo Goでアプリが読み込まれない

1. **同じWi-Fiネットワークに接続**: PCとスマートフォンが同じWi-Fiに接続されているか確認
2. **Expo Goのバージョン**: App Store/Google Playで最新版に更新
3. **ファイアウォール**: ファイアウォールがポートをブロックしていないか確認

### エラー: "Unable to resolve module"

```bash
# 依存関係を再インストール
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Firebase接続エラー

`.env`ファイルの設定を確認：

```bash
cat mobile-app/.env
```

## 💡 便利なショートカット

開発サーバー起動中に、ターミナルで以下のキーが使えます：

- `r` - アプリをリロード
- `m` - メニューを開く
- `j` - デバッガーを開く（Chrome DevTools）
- `Ctrl+C` - サーバーを停止

## 📚 詳細情報

- [README.md](./README.md) - 詳細なセットアップガイド
- [UPGRADE_NOTES.md](./UPGRADE_NOTES.md) - SDK 54アップグレードの詳細
