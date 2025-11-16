# 🚀 開発ガイド - Stripe なしで始める

Stripe の登録をせずに、すぐに Smart Garage の開発を始めるためのガイドです。

---

## ⚡ クイックスタート（5分）

### 1. 開発用の環境変数を設定

既存の `.env.local` ファイルに以下の1行を追加するだけです：

```bash
# .env.local に追加
NEXT_PUBLIC_DEV_ALL_PREMIUM=true
```

または、以下のコマンドで自動追加：

```bash
cd /Users/kentakobayashi/smart-garage
echo "NEXT_PUBLIC_DEV_ALL_PREMIUM=true" >> .env.local
```

### 2. 開発サーバーを起動

```bash
npm run dev
```

### 3. ブラウザでアクセス

```bash
open http://localhost:3000
```

これだけです！**Stripe の設定は一切不要**で、すべてのプレミアム機能を試せます。

---

## 🎯 開発モードでできること

### ✅ プレミアム機能がすべて使える

- 🚗 複数車両登録（無制限）
- 📸 OCRスキャン（レシート・保険証券）
- 📄 PDF出力
- 🔗 共有URL生成
- 🔔 無制限のリマインダー
- 📊 詳細データ分析
- 🎯 広告非表示

### ✅ ペイウォールは表示されない

`NEXT_PUBLIC_DEV_ALL_PREMIUM=true` の状態では、ペイウォールは表示されず、すべての機能に直接アクセスできます。

### ✅ 決済フローのテストはスキップ

Stripe の設定が不要なので、決済フローのテストは後回しにできます。

---

## 📋 開発フェーズ

### Phase 1: 機能開発（今ここ！）
**目的**: アプリの核心機能を開発・テスト  
**Stripe**: ❌ 不要  
**設定**: `NEXT_PUBLIC_DEV_ALL_PREMIUM=true`

```bash
# すぐに始められます
npm run dev
```

**できること**:
- ✅ 全機能の開発
- ✅ UI/UXの調整
- ✅ バグ修正
- ✅ パフォーマンス最適化

---

### Phase 2: 決済統合（後で）
**目的**: Stripe 決済を統合してマネタイズ  
**Stripe**: ✅ 必要  
**設定**: `NEXT_PUBLIC_DEV_ALL_PREMIUM=false` + Stripe API キー

**必要な作業**:
1. Stripe アカウント作成
2. 商品と価格を設定
3. API キーを取得
4. Webhook を設定

**参考ドキュメント**:
- `QUICK_START.md` - Stripe の5分セットアップ
- `STRIPE_SETUP_GUIDE.md` - 完全なセットアップガイド
- `STRIPE_IMPLEMENTATION.md` - 実装の詳細

---

### Phase 3: 本番デプロイ（最後）
**目的**: 本番環境にデプロイして公開  
**Stripe**: ✅ 本番モードで必要  
**設定**: 本番用の環境変数

---

## 🔧 開発中によくある質問

### Q: ペイウォールをテストしたい

**A:** `.env.local` の設定を変更：

```bash
# ペイウォールを表示（無料ユーザーとして動作）
NEXT_PUBLIC_DEV_ALL_PREMIUM=false

# ペイウォールを非表示（プレミアムユーザーとして動作）
NEXT_PUBLIC_DEV_ALL_PREMIUM=true
```

変更後、ブラウザをリロードしてください。

---

### Q: Stripe の設定はいつやればいい？

**A:** 以下のタイミングがおすすめ：

1. **すべての機能が完成した後**
   - アプリの核心機能がすべて動作確認できてから

2. **UI/UXが固まった後**
   - ペイウォールのデザインが決まってから

3. **ベータテストの前**
   - 実際のユーザーにテストしてもらう前に

**今は急がなくてOKです！**

---

### Q: 開発中にプレミアム状態を確認するには？

**A:** ブラウザのコンソールを開くと、以下のログが表示されます：

```
[Premium] Dev mode: All users are premium
```

または、画面右上のプランバッジで確認できます（プレミアムユーザーには⭐が表示されます）。

---

### Q: Firebase の設定は必要？

**A:** はい、Firebase は必須です。既に設定済みのはずですが、もし未設定なら：

```bash
# Firebase プロジェクトが必要
# - Authentication（ログイン機能）
# - Firestore（データベース）
# - Storage（画像保存）
```

既に動いているなら、追加の設定は不要です。

---

## 🎨 おすすめの開発順序

### 1. まず機能を完成させる
```
✅ 車両管理
✅ メンテナンス記録
✅ 給油ログ
✅ OCRスキャン
✅ PDF出力
✅ 共有URL
```

### 2. UI/UXを磨く
```
✅ レスポンシブデザイン
✅ アニメーション
✅ ローディング状態
✅ エラーハンドリング
```

### 3. テストする
```
✅ 実機テスト
✅ クロスブラウザテスト
✅ パフォーマンステスト
```

### 4. Stripe を統合（最後）
```
✅ Stripe アカウント作成
✅ 決済フローの実装（既に完了！）
✅ Webhook のテスト
✅ 本番テスト
```

---

## 💡 便利なコマンド

### 開発サーバーを起動
```bash
npm run dev
```

### ビルドして本番モードで確認
```bash
npm run build
npm start
```

### リンターでコードチェック
```bash
npm run lint
```

### Firebase にデプロイ
```bash
firebase deploy
```

---

## 📚 参考ドキュメント

| ドキュメント | 用途 | 必要なタイミング |
|------------|------|---------------|
| `SPECIFICATION.md` | 仕様書 | 常時 |
| `README.md` | 基本的な使い方 | 今すぐ |
| **`DEVELOPMENT_GUIDE.md`** | **開発ガイド（このファイル）** | **今すぐ** |
| `QUICK_START.md` | Stripe 5分セットアップ | Stripe 統合時 |
| `STRIPE_SETUP_GUIDE.md` | Stripe 完全ガイド | Stripe 統合時 |
| `STRIPE_IMPLEMENTATION.md` | 実装の詳細 | Stripe 統合時 |
| `STRIPE_BUSINESS_PROFILE.md` | ビジネス情報設定 | Stripe 登録時 |

---

## 🎉 まとめ

### 今やること
```bash
# 1. 開発モードを有効化
echo "NEXT_PUBLIC_DEV_ALL_PREMIUM=true" >> .env.local

# 2. 開発サーバーを起動
npm run dev

# 3. ブラウザで確認
open http://localhost:3000
```

### Stripe は後回し！
- ✅ すべての機能を自由に開発・テスト
- ✅ Stripe の設定は不要
- ✅ 決済統合は機能完成後でOK

### 準備ができたら
- `QUICK_START.md` を見て Stripe を5分でセットアップ
- 既に決済機能は実装済みなので、API キーを設定するだけ

---

**Happy Coding! 🚀**

質問があれば、いつでも聞いてください！



