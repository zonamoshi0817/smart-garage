# GarageLog セキュリティ実装チェックリスト

## 実装状況

### ✅ 3-1. カード情報の非保持化

- [x] Stripe Checkout を使用（カード情報はブラウザ → Stripe へ直接送信）
- [x] 自社サーバーや Firestore にカード情報を保存しない
- [x] ログやエラートラッキングにカード番号が残らないよう注意
- [x] PCI DSS 準拠は Stripe が管理

**実装ファイル**: `src/lib/stripe.ts`, `src/components/modals/PaywallModal.tsx`

### ✅ 3-2. Webアプリ側の基本セキュリティ

- [x] Vercel / Firebase Hosting の HTTPS 利用（デフォルトで有効）
- [x] 依存ライブラリを定期的に更新（`npm update`）
- [x] Stripe秘密鍵・Firebaseキーは環境変数で管理
  - 開発環境: `.env.local`
  - 本番環境: Vercel 環境変数
- [x] Firebase Security Rules で認証済みユーザーのみアクセス可能
  - 実装ファイル: `firestore.rules`
  - ユーザーは自分のデータのみアクセス可能
  - データサイズ制限を設定
- [ ] 管理用アカウント（Stripe, Firebase, GitHub）の2段階認証
  - ⚠️ **手動設定が必要**: 各サービスのダッシュボードで設定

### ✅ 3-3. 不正利用対策

- [x] 3Dセキュア（EMV 3-D Secure）を有効化
  - 実装: `payment_method_options.card.request_three_d_secure: 'automatic'`
  - 実装ファイル: `src/lib/stripe.ts`
- [ ] Stripe Radar の標準ルールを有効化
  - ⚠️ **手動設定が必要**: Stripe ダッシュボードで設定
  - 設定場所: Stripe Dashboard > Settings > Radar > Rules

### ✅ 3-4. 運用・体制

- [x] セキュリティポリシーを文書化
  - 実装ファイル: `docs/SECURITY_POLICY.md`
- [ ] ライブラリ・OS等の脆弱性情報を定期的に確認
  - ⚠️ **運用タスク**: 月1回程度の確認を推奨
- [x] インシデント対応フローを文書化
  - 実装ファイル: `docs/SECURITY_POLICY.md` の「5.2 インシデント対応」セクション
- [x] ログインID/パスワード管理、2段階認証の利用を文書化
  - 実装ファイル: `docs/SECURITY_POLICY.md` の「5.3 ログインID/パスワード管理」セクション

## 手動設定が必要な項目

### 1. Stripe Radar の有効化
1. Stripe ダッシュボードにログイン
2. Settings > Radar > Rules に移動
3. 標準ルールを有効化

### 2. 管理用アカウントの2段階認証
以下のアカウントで2段階認証を有効化：
- [ ] Stripe アカウント
- [ ] Firebase アカウント
- [ ] GitHub アカウント
- [ ] Vercel アカウント

### 3. 定期的なメンテナンス
- [ ] 月1回: 依存ライブラリの脆弱性確認と更新
- [ ] 四半期ごと: セキュリティポリシーの見直し

## 実装済みのセキュリティ機能

### 認証・認可
- Firebase Authentication による認証
- Firebase Security Rules による認可制御
- ユーザーは自分のデータのみアクセス可能

### データ保護
- データは Firebase（Firestore、Storage）に保存
- Firebase の標準的な暗号化を利用
- カード情報は Stripe にのみ保存（非保持化）

### 決済セキュリティ
- Stripe Checkout による安全な決済処理
- 3Dセキュアによる追加認証
- HTTPS による通信の暗号化

## 参考資料

- [Stripe セキュリティ](https://stripe.com/docs/security)
- [Firebase セキュリティ](https://firebase.google.com/docs/rules)
- [個人情報保護法](https://www.ppc.go.jp/)

---

**最終更新日**: 2024年12月

