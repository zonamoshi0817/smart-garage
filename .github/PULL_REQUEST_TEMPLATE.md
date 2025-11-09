## 概要
このPRの目的と背景を簡潔に記載してください。

## 変更点
- 主要な変更点を箇条書きで

## 出荷前チェック（必須）
- [ ] 価格表示は単一ソースから取得（UI/特商法/規約/FAQ 一致）
- [ ] Stripe Price ID は環境変数で管理（本番/開発の切替確認）
- [ ] Webhook 署名検証を実施（失敗時 4xx）
- [ ] Webhook の冪等性保証（event.id の重複処理防止）
- [ ] 日付型は Firestore Timestamp に統一（CRUDで変換・保存）
- [ ] FuelLog は物理量ベース（quantity + unit + totalCostJpy）
- [ ] 売却車両の ReadOnly 表示（編集操作不可・共有/PDF 可）
- [ ] ペイウォール文言と制御の整合（confidence: high/mid/low）
- [ ] 法務文書（特商法/利用規約/FAQ）の価格・解約条項を最新化

## 追加の高インパクト改善（該当時）
- [ ] 初回OCR1枚無料のドラフト保存（編集不可ガード）
- [ ] 年額「実質2ヶ月無料」表記と比較表
- [ ] ダウングレード時 ReadOnly への自動移行（再開で解除）
- [ ] KPI 計測の固定化（paywall funnel / OCR 成功率 / 1st value time）
- [ ] 画像圧縮/変換の最適化（1600px/85%/WebP/AVIF）
- [ ] Sentry PII 除去と環境別DSN/サンプリング
- [ ] /share/[token] の OGP 最適化（noindex 維持）
- [ ] アクセシビリティ（モーダル focus trap / ARIA）

## 動作確認
- テスト観点・E2Eシナリオを列挙（課金/解約/再開・オフライン等）

## スクリーンショット（UI差分がある場合）
<!-- 必要に応じて貼付 -->

## リリースノート
- ユーザー向けの一行まとめ


