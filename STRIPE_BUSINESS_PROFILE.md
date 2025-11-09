# Stripe ビジネスプロフィール設定ガイド

## 📋 基本情報

### ビジネス名
```
Smart Garage
```

### ビジネスタイプ
```
Individual / Company（該当するものを選択）
```

### 業種カテゴリー
```
Software
```

---

## 📝 商品・サービス説明

### 日本語版
```
当社は、車両メンテナンス管理に特化したクラウドベースのSaaSアプリケーション「Smart Garage」を提供しています。ユーザーは車両情報、メンテナンス履歴、給油記録、保険情報を一元管理でき、OCRによる自動データ入力、PDF出力、共有URL生成などの機能を利用できます。月額および年額のサブスクリプション制で、7日間の無料トライアルを提供しています。
```

### English（推奨）
```
We provide "Smart Garage," a cloud-based SaaS application specialized in vehicle maintenance management. Users can centrally manage vehicle information, maintenance history, fuel logs, and insurance data, with features including OCR-based automatic data entry, PDF export, and shareable URL generation. We offer monthly and annual subscription plans with a 7-day free trial.
```

### 短縮版（文字数制限がある場合）
```
Cloud-based vehicle maintenance management SaaS application with subscription-based pricing. Features include maintenance tracking, fuel logs, OCR scanning, and PDF reports.
```

---

## 🌐 ウェブサイト情報

### ビジネスウェブサイト URL
```
https://your-domain.com
```

### サポート用メールアドレス
```
support@your-domain.com
```

### サポート用電話番号
```
+81-XX-XXXX-XXXX
```

---

## 💳 料金設定情報

### 商品1: プレミアム月額プラン
- **商品名**: Smart Garage プレミアム（月額）
- **説明**: すべての機能が使える月額プラン
- **価格**: ¥480
- **請求期間**: 月次（Monthly）
- **通貨**: JPY

### 商品2: プレミアム年額プラン
- **商品名**: Smart Garage プレミアム（年額）
- **説明**: 16%お得な年額プラン
- **価格**: ¥4,800
- **請求期間**: 年次（Yearly）
- **通貨**: JPY

---

## 🎯 ビジネスモデル詳細

### サービス提供形態
- ✅ SaaS（Software as a Service）
- ✅ サブスクリプション課金
- ✅ オンライン提供のみ
- ❌ 物理的な商品の配送なし
- ❌ ダウンロード型ソフトウェアではない

### 顧客タイプ
- **B2C（Business to Consumer）**
- 個人ユーザー
- 車両所有者

### 対象地域
- **主要**: 日本
- **将来**: その他のアジア太平洋地域

---

## 🔒 セキュリティ・コンプライアンス

### カード情報の取り扱い
- ✅ Stripe Checkout を使用
- ✅ カード情報は Stripe が管理
- ✅ 自社サーバーにカード情報を保存しない
- ✅ PCI DSS 準拠（Stripe 経由）

### 個人情報保護
- ✅ プライバシーポリシー掲載済み
- ✅ Firebase でユーザーデータを管理
- ✅ GDPR 対応（Firebase が対応）

---

## 📄 法的文書

### 必要な文書（日本）
1. **特定商取引法に基づく表記** 
   - パス: `/legal/tokusho`
   - 作成済み ✅

2. **利用規約**
   - パス: `/legal/terms`
   - 作成推奨 🔲

3. **プライバシーポリシー**
   - パス: `/legal/privacy`
   - 作成推奨 🔲

4. **返金ポリシー**
   - 特定商取引法の表記に含まれる ✅

---

## 🎨 ブランディング

### ロゴ
```
アップロード推奨:
- 形式: PNG（透過背景）
- サイズ: 512x512px 以上
- 最大: 5MB
```

### ブランドカラー
```
プライマリカラー: #3B82F6（青）
アクセントカラー: #9333EA（紫）
```

---

## 📊 想定される質問と回答

### Q: 物理的な商品を配送しますか？
**A: いいえ。** デジタルサービスのみを提供します。

### Q: ダウンロード型のソフトウェアですか？
**A: いいえ。** クラウドベースのWebアプリケーションです。

### Q: 返金ポリシーは？
**A:** デジタルサービスの性質上、原則として返金はできません。ただし、無料トライアル期間中にキャンセルした場合は料金が発生しません。

### Q: サービス提供までの期間は？
**A:** 即座に利用可能です。サインアップ後すぐにアクセスできます。

### Q: サブスクリプションのキャンセル方法は？
**A:** アプリ内のカスタマーポータルからいつでもキャンセル可能です。

---

## 🚀 Stripe Dashboard での設定手順

### 1. ビジネス情報を入力
```
Settings → Business settings → Public business information
```

### 2. 商品を作成
```
Products → Create product
```

### 3. ブランディングを設定
```
Settings → Branding
```

### 4. カスタマーポータルを有効化
```
Settings → Billing → Customer portal → Enable
```

### 5. Webhook エンドポイントを追加
```
Developers → Webhooks → Add endpoint
URL: https://your-domain.com/api/stripe/webhook
```

---

## ✅ チェックリスト

- [ ] ビジネス名を設定
- [ ] 商品・サービス説明を入力
- [ ] ウェブサイト URL を設定
- [ ] サポートメールアドレスを設定
- [ ] 月額プランを作成
- [ ] 年額プランを作成
- [ ] ロゴをアップロード
- [ ] カスタマーポータルを有効化
- [ ] Webhook エンドポイントを追加
- [ ] テスト決済で動作確認

---

## 📞 サポート

Stripe の設定でわからないことがあれば：
- [Stripe サポート](https://support.stripe.com/contact)
- [Stripe ドキュメント](https://stripe.com/docs)

---

最終更新: 2025年11月3日


