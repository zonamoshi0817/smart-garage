# Capacitor iOS セットアップガイド

## 現状確認結果

- **CocoaPods**: 未インストール
- **Xcode**: 未インストール（Command Line Tools のみ）
- **iOS プロジェクト**: 正常に作成済み（`ios/` ディレクトリが存在）

## 必要な手順

### 1. Xcode のインストール（必須）

Xcode がインストールされていないため、まず Xcode をインストールする必要があります。

**手順**:
1. App Store を開く
2. "Xcode" を検索
3. インストール（数GBのサイズで時間がかかります）

**確認コマンド**:
```bash
ls /Applications/Xcode.app
```

### 2. Xcode の設定

Xcode をインストールした後、開発者ディレクトリを設定します。

**実行コマンド**（パスワード入力が必要）:
```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

### 3. CocoaPods のインストール

**実行コマンド**（パスワード入力が必要）:
```bash
sudo gem install cocoapods
```

**確認コマンド**:
```bash
pod --version
```

### 4. CocoaPods で依存関係をインストール

**実行コマンド**:
```bash
cd ios/App/App
pod install
```

または、Capacitor CLI から実行:
```bash
npx cap sync ios
```

### 5. Xcode でプロジェクトを開く

**実行コマンド**:
```bash
npx cap open ios
```

## 注意事項

- Xcode のインストールには時間がかかります（数GBのサイズ）
- sudo コマンドは管理者パスワードが必要です
- CocoaPods のインストールにはインターネット接続が必要です

## トラブルシューティング

### CocoaPods のインストールでエラーが出る場合

Ruby のバージョンを確認:
```bash
ruby --version
```

必要に応じて、Homebrew 経由でインストール:
```bash
brew install cocoapods
```

### Xcode のライセンスに同意できない場合

Xcode を一度開いて、ライセンスに同意してください:
```bash
open /Applications/Xcode.app
```

## 次のステップ

上記の手順を完了した後、`npx cap open ios` で Xcode を開き、シミュレーターまたは実機でアプリを実行できます。
