# garage log

車両のメンテナンス管理と整備計画機能を提供するWebアプリケーション

## 特徴

- 🚗 複数車両管理（プレミアム）
- 📊 マイカーページ v3.0 - アクション中心の車両詳細ページ 🆕
- 💡 スマートメンテナンス提案 - 履歴なしでも自動提案 🆕
- 📄 OCRスキャン機能（給油レシート・保険証券）
- 📈 メンテナンス履歴管理
- ⛽ 給油記録・燃費計算
- 🎨 カスタマイズ記録
- 📱 プッシュ通知対応
- 📤 PDFエクスポート（実装済み✅）・共有URL（開発中）
- 🎯 初回ユーザー体験の最適化 - データがなくてもスムーズに開始 🆕

## Getting Started

### 環境設定

`.env.local` ファイルを作成して環境変数を設定:

```bash
# 開発モード: 全ユーザーをプレミアムプランにする
NEXT_PUBLIC_DEV_ALL_PREMIUM=true

# 開発者メールアドレス（自動的にプレミアムプラン）
NEXT_PUBLIC_DEVELOPER_EMAILS=your-email@example.com,another@example.com
```

### 開発サーバー起動

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Firebase設定

### 1. Firestoreインデックスのデプロイ

```bash
# Firebase CLIにログイン
firebase login

# インデックスをデプロイ
firebase deploy --only firestore:indexes

# セキュリティルールもデプロイする場合
firebase deploy --only firestore:rules,storage:rules
```

### 2. Cloud Functionsのセットアップ

```bash
# functionsディレクトリに移動
cd functions

# 依存関係をインストール
npm install

# ビルド
npm run build

# Cloud Functionsをデプロイ
cd ..
firebase deploy --only functions
```

### 環境変数の設定（Cloud Functions）

```bash
# JWT秘密鍵を設定（本番環境で必須）
firebase functions:config:set jwt.secret="your-super-secret-key-change-this"

# アプリURLを設定（本番: https://garagelog.jp）
firebase functions:config:set app.url="https://your-app.web.app"

# 設定を確認
firebase functions:config:get
```

### 必要なFirebase機能

- Authentication（認証）
- Firestore Database（データベース）
- Storage（画像保存）
- **Cloud Functions**（署名・共有URL生成）
- Analytics（オプション）

## プレミアム機能のテスト

### 方法1: 環境変数で全員プレミアム

`.env.local`:
```bash
NEXT_PUBLIC_DEV_ALL_PREMIUM=true
```

### 方法2: 開発者メールアドレスを登録

`.env.local`:
```bash
NEXT_PUBLIC_DEVELOPER_EMAILS=your-email@gmail.com
```

または `src/hooks/usePremium.ts` の `DEVELOPER_EMAILS` 配列に直接追加

### 確認方法

ブラウザのコンソールに以下が表示されます:
```
[Premium] Developer account detected: your-email@gmail.com
```
または
```
[Premium] Dev mode: All users are premium
```

## Deploy on Vercel

**本番ドメイン**: https://garagelog.jp

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

環境変数をVercelで設定:
- `NEXT_PUBLIC_DEVELOPER_EMAILS`
- `NEXT_PUBLIC_SIGNATURE_SECRET`

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
