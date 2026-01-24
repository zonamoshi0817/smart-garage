# Expo SDK 54 アップグレードノート

## アップグレード完了 ✅

プロジェクトをExpo SDK 51からSDK 54にアップグレードしました。

## 主な変更点

### 依存関係の更新

- **Expo**: `~51.0.0` → `~54.0.0`
- **React**: `18.2.0` → `19.1.0` ⚠️ メジャーバージョンアップ
- **React Native**: `0.74.0` → `0.81.5` ⚠️ メジャーバージョンアップ
- **Expo Router**: `~3.5.0` → `~6.0.21` ⚠️ メジャーバージョンアップ
- **Expo Status Bar**: `~1.12.0` → `~3.0.9`
- **Expo Notifications**: `~0.28.0` → `~0.32.16`
- **Expo Sharing**: `~12.0.0` → `~14.0.8`
- **Expo Constants**: `~16.0.0` → `~18.0.13`
- **React Native Safe Area Context**: `4.10.0` → `~5.6.0`
- **React Native Screens**: `~3.31.0` → `~4.16.0`
- **AsyncStorage**: `1.23.0` → `2.2.0`

### 新規追加

- **expo-linking**: Expo Routerの必須依存関係として追加

## 破壊的変更と対応

### 1. React 19へのアップグレード

**影響:**
- React 19は新しい機能とパフォーマンス改善を含みます
- TypeScriptの型定義も更新が必要（`@types/react@~19.1.10`）

**対応:**
- 既存のコンポーネントコードは基本的に互換性があります
- TypeScriptの型エラーが出る場合は、型定義を確認してください

### 2. React Native 0.81.5へのアップグレード

**影響:**
- 新しいアーキテクチャ（New Architecture）のサポートが改善
- パフォーマンスとメモリ使用量の改善

**対応:**
- 既存のコードは基本的に動作しますが、カスタムネイティブモジュールを使用している場合は確認が必要です

### 3. Expo Router 6へのアップグレード

**影響:**
- ルーティングのパフォーマンスが改善
- 新しいAPIが追加されています

**対応:**
- 既存のルーティング設定（`app/`ディレクトリ構造）はそのまま動作します
- `expo-linking`が必須依存関係として追加されました

## 確認事項

### ✅ 完了した作業

1. ✅ `package.json`の依存関係をSDK 54対応に更新
2. ✅ `expo-linking`をインストール
3. ✅ `@types/react`をReact 19対応に更新
4. ✅ `app.json`からアセット参照を一時的に削除（後で追加可能）
5. ✅ 依存関係のインストール完了

### ⚠️ 注意事項

1. **アセットファイル**: 
   - `app.json`からアセット参照を一時的に削除しました
   - 後でアイコン画像を追加する場合は、`assets/`ディレクトリに配置してください

2. **React重複依存関係**:
   - 親ディレクトリの`node_modules`にReactが存在する場合、重複警告が出る可能性があります
   - これは通常問題ありませんが、問題が発生する場合は`npm dedupe`を実行してください

## 動作確認

### 1. 開発サーバーの起動

```bash
cd mobile-app
npm start
```

### 2. Expo Goでの実行

- **iOS**: iPhoneのカメラアプリでQRコードをスキャン
- **Android**: Expo GoアプリでQRコードをスキャン

### 3. エラーの確認

アプリが起動しない場合：

1. キャッシュをクリア: `npx expo start -c`
2. `node_modules`を再インストール: `rm -rf node_modules && npm install --legacy-peer-deps`
3. `expo-doctor`で問題を確認: `npx expo-doctor`

## トラブルシューティング

### エラー: "Cannot find module 'expo-linking'"

```bash
npx expo install expo-linking
```

### エラー: "React version mismatch"

親ディレクトリの`node_modules`が干渉している可能性があります。`mobile-app`ディレクトリ内で作業していることを確認してください。

### Expo Goでアプリが読み込まれない

1. Expo Goアプリが最新バージョンか確認
2. 同じWi-Fiネットワークに接続しているか確認
3. `npx expo start --clear`でキャッシュをクリア

## 代替案: Development Build（EAS Build）

Expo Goを使用せず、カスタム開発ビルドを作成する方法：

```bash
# EAS CLIをインストール
npm install -g eas-cli

# EASを初期化
eas init

# 開発用ビルドを作成
eas build --profile development --platform ios
```

詳細は[EAS Build Documentation](https://docs.expo.dev/build/introduction/)を参照してください。
