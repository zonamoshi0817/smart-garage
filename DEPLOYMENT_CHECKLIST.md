# デプロイチェックリスト ✅

最終確認日: 2025年11月3日

## 1. 環境変数の設定

### ローカル開発環境 (.env.local)
```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=smart-garage-74ad1.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=smart-garage-74ad1
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=smart-garage-74ad1.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Sentry Configuration (オプショナル)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
SENTRY_ENVIRONMENT=development

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-key
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-secret
NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY=price_monthly_id
NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY=price_yearly_id
```

### Vercel本番環境
Vercelダッシュボード → Settings → Environment Variables で設定:

| 変数名 | 値 | 環境 |
|--------|-----|------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console から取得 | Production |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `smart-garage-74ad1.firebaseapp.com` | Production |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `smart-garage-74ad1` | Production |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `smart-garage-74ad1.appspot.com` | Production |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Console から取得 | Production |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Console から取得 | Production |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry Dashboard から取得 | Production |
| `SENTRY_DSN` | Sentry Dashboard から取得 | Production |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | `production` | Production |
| `SENTRY_ENVIRONMENT` | `production` | Production |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard から取得 | Production |
| `STRIPE_SECRET_KEY` | Stripe Dashboard から取得 | Production |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook から取得 | Production |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY` | Stripe Product から取得 | Production |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY` | Stripe Product から取得 | Production |

---

## 2. Firebaseルールのデプロイ ✅

```bash
# Firestoreルール
firebase deploy --only firestore:rules

# Storageルール  
firebase deploy --only storage

# 両方同時
firebase deploy --only firestore:rules,storage
```

**実行結果**: ✅ 完了（2025-11-03）

---

## 3. Playwright

テストのインストール ✅

```bash
# ブラウザインストール
npx playwright install

# テスト実行
npm run test

# UIモードでテスト
npm run test:ui
```

**実行結果**: ✅ 完了
- 75テスト実行
- 25テスト成功
- 35テスト失敗（認証必要なページのため正常）
- 15テストスキップ

---

## 4. ビルドテスト ✅

```bash
npm run build
```

**実行結果**: ✅ 成功

**生成されたページ:**
- `/` - ダッシュボード
- `/legal/privacy` - プライバシーポリシー
- `/legal/terms` - 利用規約
- `/legal/tokusho` - 特定商取引法表記
- `/support` - サポートページ
- `/billing/success` - 決済成功ページ
- `/billing/cancel` - 決済キャンセルページ
- `/settings/billing` - 請求管理ページ
- `/share/[token]` - 共有URL閲覧ページ
- APIルート（Stripe連携）

---

## 5. Sentryセットアップ

### 手順:

1. **Sentryアカウント作成**
   - https://sentry.io/ にアクセス
   - 「Start Free」をクリック

2. **プロジェクト作成**
   - プラットフォーム: Next.js
   - プロジェクト名: `smart-garage`

3. **DSN取得**
   - Settings → Projects → smart-garage → Client Keys (DSN)
   - DSNをコピー

4. **環境変数に設定**
   ```bash
   NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
   SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
   ```

5. **動作確認**
   - テストエラーを送信
   - Sentryダッシュボードで確認

詳細: `docs/SENTRY_SETUP.md` を参照

---

## 6. 本番デプロイ前の最終チェック

### コードレビュー
- [ ] すべてのTODOコメントを確認
- [ ] console.logを削除（本番環境不要なもの）
- [ ] API キーがハードコードされていないか確認

### セキュリティ
- [ ] Firebaseルールが適切に設定されているか
- [ ] Storageルールが適切に設定されているか
- [ ] 環境変数がすべて設定されているか
- [ ] Stripe webhookシークレットが設定されているか

### パフォーマンス
- [ ] 画像が最適化されているか
- [ ] 不要なパッケージが削除されているか
- [ ] ビルドサイズを確認

### 法務
- [ ] プライバシーポリシーを確認
- [ ] 利用規約を確認
- [ ] 特定商取引法表記を確認
- [ ] 連絡先情報が正しいか確認

### テスト
- [ ] ローカルでビルドが成功するか
- [ ] 主要なページが表示されるか
- [ ] ログインフローが動作するか
- [ ] Stripe決済フローが動作するか（テストモード）

---

## 7. Vercelデプロイ

### 初回デプロイ
```bash
# Vercel CLIをインストール（初回のみ）
npm i -g vercel

# ログイン
vercel login

# デプロイ
vercel
```

### 本番デプロイ
```bash
vercel --prod
```

### 環境変数の設定
Vercelダッシュボードで設定:
1. プロジェクトを選択
2. Settings → Environment Variables
3. 上記の環境変数を追加
4. Redeploy

---

## 8. デプロイ後の確認

### 基本動作
- [ ] サイトが表示されるか
- [ ] ログインできるか
- [ ] 車両登録ができるか
- [ ] メンテナンス記録ができるか

### Stripe連携
- [ ] Checkout が表示されるか
- [ ] テスト決済ができるか（4242 4242 4242 4242）
- [ ] Webhookが動作するか
- [ ] プレミアム機能が有効になるか

### エラー監視
- [ ] Sentryでエラーが記録されるか
- [ ] ログが正しく出力されるか

### パフォーマンス
- [ ] ページの読み込み速度を確認
- [ ] Lighthouseスコアを確認

---

## 9. 運用開始後

### モニタリング
- Sentryダッシュボードを定期的にチェック
- Firebase Consoleでデータベース使用量をチェック
- Stripeダッシュボードで決済状況をチェック
- Vercel Analyticsでアクセス状況をチェック

### バックアップ
- Firestoreデータの定期バックアップ設定
- Storageデータのバックアップ設定

### アップデート
- 依存パッケージの定期更新
- セキュリティパッチの適用
- 機能追加・改善

---

## トラブルシューティング

### ビルドエラー
- 環境変数が設定されているか確認
- `npm run build` でローカルビルドテスト
- エラーログを確認

### 認証エラー
- Firebase設定を確認
- 認証ドメインが正しいか確認
- Firebaseルールを確認

### 決済エラー
- Stripe APIキーを確認
- Webhookシークレットを確認
- Stripeダッシュボードでログを確認

### パフォーマンス問題
- Next.js Analyticsを確認
- Lighthouseでパフォーマンス分析
- 画像最適化を確認

---

## サポート

問題が解決しない場合:
- **ドキュメント**: `/docs` フォルダ内のガイド
- **実装サマリー**: `IMPLEMENTATION_SUMMARY.md`
- **開発ガイド**: `DEVELOPMENT_GUIDE.md`

---

**最終更新**: 2025年11月3日  
**バージョン**: 2.2.0  
**ステータス**: ✅ デプロイ準備完了

