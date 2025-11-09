---
name: "🚨 Release Blockers（出荷前ブロッカー）"
about: 出荷前に必ず直すべき矛盾/漏れの追跡
title: "[Release] ブロッカー修正"
labels: release-blocker, priority:high
assignees: ""
---

## 概要
出荷前に必ず解消する項目のトラッキングIssueです。

### 価格の単一ソース化
- [ ] UI/ペイウォール/特商法/利用規約/FAQ の価格表示が一致
- [ ] Stripe Price ID は `.env` に集約（本番/開発で切替）
- [ ] `lib/premium` or `lib/pricing` を単一真実として使用

### 日付型の統一
- [ ] Firestore Timestamp に統一（Date/string 不使用）
- [ ] CRUD層で `toTimestamp()` を強制適用
- [ ] 既存データは読み込み時にオンザフライ変換

### FuelLog の物理量統一
- [ ] `quantity` + `unit`（L/kWh系）+ `totalCostJpy` を使用
- [ ] 旧フィールドは非推奨として表示互換のみ
- [ ] フォーム/チャート/計算ロジックまで貫通

### 売却車両の到達性
- [ ] マイカー ReadOnly モード（編集不可・バナー表示）
- [ ] 共有URLは `readOnly: true` で再発行可能
- [ ] PDF/共有の到達性をE2Eで担保

### ペイウォール整合
- [ ] `confidence_eval()` を high/mid/low の3値へ
- [ ] Remote Config で閾値可変（A/B対応）
- [ ] メッセージとUI制御の整合テスト

### 法務文書の最新化
- [ ] 利用規約/特商法/FAQ の価格と解約条項の同期
- [ ] 自動更新停止期限の明記

### セキュリティ/運用（Stripe）
- [ ] Webhook 署名検証
- [ ] Webhook 冪等性（event.id による重複防止）

## テスト
- [ ] 課金ガード境界（トライアル→失敗→成功→解約→再開）
- [ ] 過去日/未来日境界（±1日）Firestoreルール準拠
- [ ] 低帯域/オフライン時の再送・再開
- [ ] HEIC 実機アップロード→変換→表示


