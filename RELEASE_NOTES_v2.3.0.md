# 🚀 Smart Garage v2.3.0 リリースノート

**リリース日**: 2025年11月9日  
**本番ドメイン**: https://garagelog.jp  
**Vercel URL**: https://smart-garage-r6awgu5qp-kobayashis-projects-6366834f.vercel.app  
**コミット範囲**: `d055aba` → `56a95eb` (8コミット)

---

## 📋 概要

このリリースでは、**出荷前の必須ブロッカー修正**と**CVR/運用に効く高インパクト改善**を実装しました。価格統一、データ型の完全整合、ダウングレード時の自動車両制限など、プロダクションレディな基盤を整備しています。

---

## ✅ 出荷前ブロッカー修正

### 1. 料金の完全統一 (`d055aba`)
- **問題**: 本文（480円）とStripe設定ガイド（980円）の不一致
- **対応**:
  - 全ページを月額480円 / 年額4,800円に統一
  - `@/lib/premium` の `PREMIUM_PRICING` を単一ソースに
  - 法務ページ（利用規約・特商法）を定数参照に変更
  - Stripe CLI例を正しい金額に修正（JPYはゼロ小数通貨）

### 2. Date/Timestamp完全統一 (`d055aba`)
- **問題**: `BaseEntity` が `Date | string`、仕様では「Timestamp統一」と矛盾
- **対応**:
  - 全日時フィールドを Firestore `Timestamp` 型に統一
  - `CustomizationMedia.takenAt` を Timestamp に変更
  - `UserDocument` の日時フィールドを統一
  - 既存の `toTs()` ヘルパーでCRUD変換を強制

### 3. FuelLog物理量統一 (`d055aba`)
- **問題**: `unit: 'JPY/L'` が価格単位と物理単位が混在
- **対応**:
  - 新フィールド: `quantity`（ml/Wh整数）+ `unit`（'ml'|'wh'）+ `totalCostJpy`
  - `FuelLogModal` で保存時にL→ml、kWh→Wh変換
  - 既存チャート・表示は逆変換で互換性維持
  - 旧フィールド（fuelAmount/cost）は `@deprecated` 化

### 4. 売却車両の到達不能問題 (`d055aba`)
- **問題**: ドロップダウンから除外＝閲覧・PDF・共有が不可
- **対応**:
  - ReadOnlyモードを実装（バナー＋編集無効）
  - 売却/廃車カードクリックでマイカーページ閲覧可能に
  - 共有URL発行時に `?readOnly=true` フラグ付与

### 5. Stripe Webhook冪等性 (`d055aba`)
- **対応**:
  - `event.id` を Firestore に記録して重複処理を防止
  - `stripe_webhook_events/{eventId}` コレクションで管理

### 6. URLクエリ契約の型安全性 (`d055aba`)
- **対応**:
  - `src/lib/urlParams.ts` 新規作成（Zodで型定義）
  - `tab/action/draft/template` を厳格にバリデーション
  - 不正値は無視、`readOnly` 時は編集系を抑止

---

## 🚀 高インパクト改善

### A. 課金CVR向上

#### 初回OCR1枚無料 (`d055aba`)
- プレミアム未加入かつ初回時はドラフト保存まで自動実行
- 2回目以降は従来通りペイウォール表示
- `localStorage('sg_first_ocr_used')` で管理

#### Free vs Premium比較表 (`27d8acb`)
- 全PaywallModalvariantに比較表を追加
- 主要4機能の詳細比較（Free/Premium列）
- トリガー機能を自動ハイライト表示

#### 年額割引の視覚化 (`27d8acb`)
- 「💰 実質2ヶ月分無料（¥960お得）」を表示
- 年額プランに緑バッジで訴求強化
- 計算式: 月額×12 - 年額

### B. ダウングレード時の自動制限 (`ddac646`)

**新CarStatus**: `downgraded_premium`
- 無料プラン復帰時に2台目以降へ自動適用
- 売却/廃車とは異なる専用ステータス

**Stripe Webhook連携:**
```typescript
subscription.deleted → handleDowngradeVehicles()
  ↓
1台目: active維持
2台目以降: downgraded_premium（編集不可・閲覧可）
```

```typescript
subscription.updated (アップグレード検知)
  ↓
restoreDowngradedVehicles() → すべてactive復帰
```

**ユーザー体験:**
- 車両管理ページに「🔒 閲覧専用（プラン制限）」セクション
- 閲覧/PDF/共有は可能、編集のみ不可
- プレミアム復帰で即時編集可能に
- FAQに詳細説明を追加

### C. セキュリティ/運用

#### Sentry PII除去 (`256e0b2`)
- クライアント: `maskAllInputs`, メールマスク, IPアドレス除去
- サーバー: Authorization/Cookie/トークンヘッダー除去
- Edge: クエリパラメータから機密情報削除
- 環境別サンプリング（dev: 1.0, prod: 0.1, edge: 0.05）

#### SEO/シェア最適化 (`256e0b2`)
- `/share/[token]/metadata.ts` でOGPメタタグ追加
- `robots.txt` / `sitemap.xml` 作成
- `noindex` 維持、シェア先プレビュー対応

#### アクセシビリティ (`256e0b2`)
- PaywallModal に focus trap 実装
- Tab/Shift+Tab循環、Escape閉じ
- ARIA属性追加（role/aria-modal/aria-labelledby）

---

## 📁 新規ファイル

- `.github/PULL_REQUEST_TEMPLATE.md` - PR用チェックリスト
- `.github/ISSUE_TEMPLATE/release-blockers.md` - ブロッカーテンプレ
- `.github/ISSUE_TEMPLATE/improvements.md` - 改善テンプレ
- `src/lib/urlParams.ts` - URLクエリ型定義
- `src/app/share/[token]/metadata.ts` - OGPメタデータ
- `public/robots.txt` - SEO設定
- `public/sitemap.xml` - サイトマップ
- `RELEASE_CHECKLIST.md` - リリース前チェックリスト

---

## 🔧 主要変更ファイル

### バックエンド
- `src/app/api/stripe/webhook/route.ts` - 冪等性＋ダウングレード処理
- `src/lib/firebaseAdmin.ts` - ユーザードキュメント管理
- `src/lib/plan.ts` - プラン判定・価格取得

### データモデル
- `src/types/index.ts` - Timestamp統一、FuelLog新形式、CarStatus拡張
- `src/lib/fuelLogs.ts` - 物理量変換ヘルパー
- `src/lib/dateUtils.ts` - 日付変換ユーティリティ

### UI/UX
- `src/components/modals/PaywallModal.tsx` - 比較表・focus trap
- `src/components/modals/ShareAndPDFModal.tsx` - ReadOnly URL対応
- `src/components/mycar/MyCarPage.tsx` - downgraded_premium対応
- `src/app/page.tsx` - ダウングレード車両セクション

### 監視/セキュリティ
- `sentry.client.config.ts` - PII除去・beforeBreadcrumb
- `sentry.server.config.ts` - ヘッダー/クエリ除去
- `sentry.edge.config.ts` - サンプリング最適化

### 法務/サポート
- `src/app/legal/terms/page.tsx` - 価格を定数参照に
- `src/app/legal/tokusho/page.tsx` - 価格を定数参照に
- `src/app/support/page.tsx` - ダウングレードFAQ追加

---

## 🧪 テスト済み項目

- [x] ローカルビルド成功（警告のみ、エラー0件）
- [x] Lintエラー0件
- [x] TypeScript型チェック通過
- [x] 全主要ページの生成確認
- [x] Vercel本番デプロイ成功

---

## 🎯 デプロイ後の確認事項

### 即座に確認
1. [ ] サイトが表示される（https://garagelog.jp）
2. [ ] ログインできる
3. [ ] PaywallModalが表示される（比較表・年額割引表記）
4. [ ] 車両追加・編集が動作する

### Stripe連携
5. [ ] Checkout セッションが作成される
6. [ ] テスト決済が完了する（4242 4242 4242 4242）
7. [ ] Webhookが到達する（Stripeダッシュボードで確認）
8. [ ] プレミアム機能が有効化される

### ダウングレード機能
9. [ ] 解約後に2台目以降が `downgraded_premium` になる
10. [ ] ダウングレード車両が閲覧専用になる
11. [ ] 再登録で車両が自動復帰する

### セキュリティ/監視
12. [ ] Sentryでエラーが記録される
13. [ ] PII除去が動作する（メールマスク確認）
14. [ ] 共有URLの `?readOnly=true` が動作する

---

## 🐛 既知の制限事項

### 今後対応予定
- Stripe Price IDの実物確認（.env設定が正しいか）
- マイグレーション動作確認（既存データでTimestamp/FuelLog変換）
- 全モーダルへのfocus trap適用（現在はPaywallModalのみ）
- iOS実機でのHEICアップロードテスト

### 運用上の注意
- `STRIPE_SECRET_KEY` 警告はビルド時のみ（実行時は正常）
- 開発環境では `NEXT_PUBLIC_DEV_ALL_PREMIUM=true` で全員プレミアム
- Webhook テストは Stripe CLI が必要（ローカル開発時）

---

## 📊 今回の改善効果（期待値）

| 指標 | 改善前 | 改善後（期待） | 根拠 |
|------|--------|--------------|------|
| CVR | ベースライン | +15-25% | 比較表・年額割引・初回OCR無料 |
| 年額選択率 | - | +30% | 割引額の視覚化（¥960） |
| ダウングレード離脱 | - | -50% | 閲覧可・自動復帰で摩擦削減 |
| PII漏洩リスク | 中 | 低 | Sentry自動マスク実装 |
| アクセシビリティ | B | A | Focus trap・ARIA属性 |

---

## 🙏 フィードバック歓迎

このリリースに関するご意見・ご要望は、以下までお願いします:
- GitHub Issues: [新規Issue作成](https://github.com/your-repo/smart-garage/issues/new)
- サポート: support@smartgarage.jp
- PR: `.github/PULL_REQUEST_TEMPLATE.md` を使用

---

**Happy Driving! 🚗✨**

