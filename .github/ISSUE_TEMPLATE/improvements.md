---
name: "✨ High-Impact Improvements（高インパクト改善）"
about: CVR/運用/コストに効く改善の実装トラッキング
title: "[Improve] 高インパクト改善"
labels: enhancement, priority:medium
assignees: ""
---

## 課金CVR
- [ ] 初回OCR1枚まで無料のドラフト保存（編集不可・保存のみ）
- [ ] 年額「実質2ヶ月無料」表記（比較表/差額表示）

## ダウングレード時の挙動
- [ ] Premium→Free 時に2台目以降/OCR/PDFは ReadOnly へ
- [ ] `customer.subscription.updated` でフラグ同期

## アナリティクスの事業KPI化
- [ ] `paywall_shown → subscribe_started → success` ステップCVR
- [ ] `ocr_started → autofill_done` 成功率/平均confidence
- [ ] 1st value time（Sign-up→初回記録）
- [ ] BigQuery Export で週次集計テンプレ整備

## コスト最適化（Firestore/Storage）
- [ ] README に平均月間コスト見積り式を追記
- [ ] 画像は 1600px/85%/≤800KB を基準化
- [ ] WebP/AVIF 自動変換（Storage Trigger）

## セキュリティ/運用
- [ ] Sentry PII 除去と環境別DSN（dev高サンプリング/prod 0.1）
- [ ] JWT kid ローテ手順を `docs/SRE.md` に明文化

## SEO/シェア
- [ ] `/share/[token]` の OGP 最適化（車名/年式/サムネ/記録数）
- [ ] `sitemap.xml` / `robots.txt`（公開範囲は最小）

## アクセシビリティ
- [ ] ペイウォール/モーダルの focus trap と ARIA ラベルのテスト


