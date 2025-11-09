# 🚀 リリース前チェックリスト

このチェックリストは、**出荷前に絶対直すべき矛盾/漏れ**と**高インパクト改善**をまとめたものです。

---

## ✅ 出荷前ブロッカー（必ず直す）

### 1. 料金の一致確認
- [x] 本文とStripeの料金が一致している（月額480円 / 年額4,800円）
- [x] `PRICING.ts` の単一ソース化完了
- [x] Stripe Price IDを `.env` に集約
- [x] UI/ヘルプ/特商法/利用規約の金額が自動反映
- [ ] **実際のStripe Price IDが正しい金額（480円/4,800円）で作成されているか確認**

### 2. 日付型の統一
- [x] `BaseEntity` を Timestamp に統一
- [x] CRUD層で `toTs()` を適用
- [x] 型定義を全面 Timestamp に一本化
- [ ] 既存データの初回読み込みでオンザフライ変換テスト

### 3. FuelLogの単位フィールド統一
- [x] 新フィールド（quantity/unit/totalCostJpy）を実装
- [x] フォーム/チャート/計算に貫通
- [x] 旧フィールドを `@deprecated` 化
- [ ] マイグレーション動作確認（旧データ→新形式）

### 4. 売却車両の到達性
- [x] ReadOnlyモードを実装（バナー＋編集無効）
- [x] ダッシュボードから売却済み車両へのアクセス可能に
- [x] 共有URLの `readOnly: true` 再発行機能
- [ ] PDF出力が売却車両でも動作するか確認

### 5. ペイウォールの体験順序
- [x] 信頼度ベースの発火（65%閾値）を実装
- [x] 初回OCR1枚無料（ドラフト保存のみ）
- [ ] A/Bテスト用の閾値をRemote Configで外出し（将来対応）

### 6. 法務の金額・解約条項の再整合
- [x] 価格決定後、利用規約/特商法の文言を修正
- [ ] 返金ポリシーの明確化（サービス瑕疵時の対応）
- [ ] 自動更新停止の期限を明記（利用規約に追記）
- [ ] 日割り計算の有無を明記

---

## 🔧 高インパクト改善（すぐ効く）

### A. 課金CVR
- [x] 初回OCR1枚無料の実装
- [ ] 年額の"実質2ヶ月無料"表記をペイウォールに追加
- [ ] Free vs Premium 比較表をペイウォールに常時表示

### B. ダウングレード時のデータ挙動
- [ ] Premium→Free時の2台目以降/OCR/PDFの挙動を明文化
- [ ] 編集不可＋閲覧可（ReadOnly）への自動移行実装
- [ ] Stripeの `customer.subscription.updated` でフラグ同期

### C. アナリティクスの事業KPI化
- [x] イベント実装済み（paywall/ocr/subscribe）
- [ ] BigQuery Export設定（GA4 or 自前）
- [ ] 週次集計テンプレ作成
- [ ] ダッシュボード指標の固定化
  - [ ] `paywall_shown → subscribe_started → success` のステップCVR
  - [ ] `ocr_started → autofill_done` の成功率/平均confidence
  - [ ] 1st valueまでの時間（Sign-up→初回記録）

### D. コスト管理（Firestore/Storage）
- [ ] 平均月間コスト見積りをREADMEに追記
- [ ] DAU×読取/書込/ストレージ/帯域の概算式
- [ ] WebP/AVIF自動変換検討（StorageトリガでCloud Functions）

### E. セキュリティ/運用
- [x] Stripe Webhook署名検証 + Idempotency実装済み
- [ ] JWTの `kid` ローテーション手順を `SRE.md` で明文化
- [x] Sentryの PII除去実装済み
- [x] 環境別サンプリング設定済み（dev: 1.0, prod: 0.1, edge: 0.05）

### F. SEO/シェア
- [x] `/share/[token]` のOGP最適化（基本メタデータ）
- [ ] 車名/年式/サムネ/主な記録数を動的に反映（server component化）
- [x] `noindex` 維持、シェア先プレビュー対応
- [x] `sitemap.xml` / `robots.txt` 作成

### G. アクセシビリティ
- [x] PaywallModalにfocus trap実装済み
- [ ] 全モーダルにfocus trap適用（FuelLogModal, MaintenanceModal等）
- [ ] ARIAラベルのユニットテスト（ペイウォール/モーダル）
- [ ] キーボード操作/コントラスト検査の追加

---

## 🧩 仕様の"継ぎ目"を滑らかに

### 1. 情報アーキテクチャ（ダッシュボードvsマイカー）
- [x] URLクエリの契約表を作成（`src/lib/urlParams.ts`）
- [x] `tab`, `action`, `draft`, `template` の型定義とバリデーション

### 2. Vehicle Class補正の初期値
- [ ] `vehicleClass` 未設定車両に基準1.0を自動補完
- [ ] `onCarLoad()` でデフォルト補完を実装

### 3. 理想サイクル定義の拡張性
- [ ] サイクル表をJSON（バージョン付き）に外出し
- [ ] `version` と `source` を記録してUIに「推奨の根拠」を明示
- [ ] 将来のサーバー配布/車種別差分を可能に

### 4. OCRドラフトの"学習"導線
- [x] `ocr_field_edited` イベント実装済み
- [ ] `docs/OCR_TRAINING.md` に定期手動チューニング手順を記載
- [ ] 次回の正規表現/ルール更新に反映できる仕組み

### 5. 広告とプライバシー
- [x] 無料プランのみ表示方針実装済み
- [ ] CMP（コンセント管理）の導入（AdSense導入時）
- [ ] 「興味関心ベースは未使用」をポリシーに明記

---

## 🧪 テスト観点（抜けがちポイント）

### 課金ガードの境界テスト
- [ ] トライアル→失敗課金→成功課金→解約→再開の全遷移でOCR/PDF/複数車両/広告非表示がON/OFF
- [ ] E2Eシナリオ化

### 過去日/未来日
- [ ] Storage/Firestoreルールで±境界1日の拒否/許可をテスト

### 低帯域/オフライン
- [ ] OCRワーカー・画像アップロードの再送/再開動作をテスト

### HEIC対応
- [ ] iOS実機でのアップロード→変換→表示までを1本テスト

---

## 📝 スペックの微修正（記述のヨレ）

- [x] セクション番号の重複修正（「次回メンテ提案」が2回）
- [x] 「最新バージョン: 2.2.0」と「v1.x系の見出し」混在を整理
- [ ] `IMPLEMENTATION_SUMMARY.md`/`FINAL_SUMMARY.md` に"変更の単一真実"を寄せ、他ドキュメントはリンク参照に

---

## ✨ 実装順序（最短CVR＆安全性）

### Phase 1: 基盤整備 ✅ 完了
1. ✅ 価格の単一ソース化＋法務文書一括更新
2. ✅ Timestamp統一＆FuelLog新型式の貫通
3. ✅ ReadOnly車両とダウングレード時の挙動
4. ✅ URLクエリ契約の型定義・ガード
5. ✅ 初回OCR1枚無料の導線

### Phase 2: 運用・監視強化 🚧 進行中
6. ✅ Sentry PII除去＋環境別サンプリング
7. ✅ SEO基盤（robots.txt/sitemap.xml）
8. ✅ Focus trap（PaywallModal）
9. [ ] 全モーダルにfocus trap適用
10. [ ] アナリティクスKPIダッシュボード

### Phase 3: CVR最適化 📋 未着手
11. [ ] 比較表（Free vs Premium）
12. [ ] 年額の実質割引表記
13. [ ] ダウングレード時の自動ReadOnly化
14. [ ] A/Bテスト基盤（Remote Config）

### Phase 4: 最終検証 📋 未着手
15. [ ] 境界値テスト（課金/日付/オフライン）
16. [ ] iOS実機テスト（HEIC）
17. [ ] 本番Stripe Price ID確認
18. [ ] マイグレーション動作確認

---

## 🎯 次のアクション

### 今すぐやること
- [ ] Stripe Price IDの実物確認（テスト環境/本番環境で480円・4,800円か）
- [ ] 既存データでTimestamp/FuelLog新形式のマイグレーション動作確認

### 今週中にやること
- [ ] 全モーダルにfocus trap適用
- [ ] 比較表（Free vs Premium）をペイウォールに追加
- [ ] ダウングレード時の挙動テスト

### リリース前にやること
- [ ] iOS実機でのHEICアップロードテスト
- [ ] 課金フローの全パターンE2Eテスト
- [ ] ドキュメントの最終整合性チェック
- [ ] カスタムドメイン設定（garagelog.jp）
  - [ ] Vercel Domains設定
  - [ ] DNS設定（Aレコード/CNAME）
  - [ ] Firebase Authorized domains追加
  - [ ] Stripe リダイレクトURL更新
  - [ ] Stripe Webhook URL更新

---

**最終更新: 2025年11月9日**

