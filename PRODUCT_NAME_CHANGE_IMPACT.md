# 製品名変更の影響範囲レポート

製品名を「**Smart Garage**」から「**garage log**」に変更する場合の影響範囲を詳細に調査しました。

## 📋 変更概要

- **現在の製品名**: Smart Garage
- **新しい製品名**: garage log
- **影響するファイル数**: 約35ファイル以上
- **必須変更箇所**: 約20ファイル（UI、メタデータ、法的文書、テスト）
- **推奨変更時間**: 2〜4時間（テスト込み）

## 🎯 クイックサマリー

### 必ず変更すべき箇所（優先度：高）
| カテゴリ | ファイル数 | 主な影響 |
|---------|----------|---------|
| メタデータ・SEO | 3 | ページタイトル、OGP、Twitter Card |
| UI表示 | 10+ | ランディングページ、ダッシュボード、ナビゲーション |
| 法的文書 | 3 | 利用規約、プライバシーポリシー、特商法 |
| E2Eテスト | 1 | 自動テストの検証ロジック |

### 検討が必要な箇所（優先度：中）
- バックエンド（PDF、通知）
- Service Worker、IndexedDB（既存データへの影響あり）
- Cloud Functions のデフォルトURL

### 任意の変更（優先度：低）
- ドキュメントファイル（README等）
- 設定ファイル（package.json等）
- Stripe商品名（ダッシュボードで手動変更）

---

## 🎯 主な影響範囲

### 1. メタデータ・SEO関連 (優先度: 高)

#### `src/app/layout.tsx`
- Line 18: ページタイトル `"Smart Garage - 愛車の履歴を、資産に。"`
- Line 21: authors `[{ name: "Smart Garage" }]`
- Line 26: siteName `"Smart Garage"`
- Line 27: OG title `"Smart Garage - 愛車の履歴を、資産に。"`
- Line 34: OG image alt `"Smart Garage - Turn Your Car History into Value"`
- Line 40: Twitter title `"Smart Garage - 愛車の履歴を、資産に。"`

#### `src/app/landing/metadata.ts`
- Line 4: ページタイトル
- Line 7: authors
- Line 12: siteName
- Line 13: OG title
- Line 20: OG image alt
- Line 26: Twitter title

#### `src/app/share/[token]/metadata.ts`
- Line 8: ページタイトル `'メンテナンス履歴共有 | Smart Garage'`
- Line 15: OG title
- Line 18: siteName `'Smart Garage'`

### 2. UI表示（ユーザー向け） (優先度: 高)

#### ランディングページ
**`src/app/landing/page.tsx`** と **`src/app/page.tsx`** (同一コンテンツ)
- Line 37: ロゴ・ブランド名 `"Smart Garage"`
- Line 38: サブタイトル `"Turn Your Car History into Value"`
- Line 91: デモ画面タイトル `"Smart Garage Demo"`
- Line 145: セクション見出し `"Smart Garage なら"`
- Line 293: セキュリティ説明文 `"Smart Garageは、あなたの愛車データを安全に守ります。"`
- Line 355: フッター `"Smart Garage"`
- Line 356: コピーライト `"© {year} Smart Garage"`

**`src/app/page.tsx.backup`** (バックアップファイル)
- 同様の内容を含む（削除検討可能）

#### ダッシュボード
**`src/app/dashboard/page.tsx`**
- Line 533: ブランド名 `"Smart Garage"`
- Line 1017: ページタイトル `"ダッシュボード - Smart Garage"`
- Line 2624: 通知タイトル `'Smart Garage'`
- Line 2631: 通知タイトル（パーミッション後）`'Smart Garage'`

#### 認証画面
**`src/components/AuthGate.tsx`**
- Line 70: タイトル `"Smart Garage"`

### 3. 法的文書 (優先度: 高)

#### 利用規約
**`src/app/legal/terms/page.tsx`**
- Line 12: パンくずリンク `"← Smart Garageに戻る"`
- Line 25: 本文 `"Smart Garage（以下「当サービス」）"`
- Line 34: 定義 `"「当サービス」とは、Smart Garageという名称の..."`

#### プライバシーポリシー
**`src/app/legal/privacy/page.tsx`**
- Line 11: パンくずリンク `"← Smart Garageに戻る"`
- Line 24: 本文 `"Smart Garage（以下「当サービス」）"`

#### 特定商取引法表記
**`src/app/legal/tokusho/page.tsx`**
- Line 49: サービス名 `"Smart Garage プレミアムプラン"`

### 4. サポート・その他ページ (優先度: 中)

#### サポートページ
**`src/app/support/page.tsx`**
- Line 24: メール件名 `"[Smart Garage] ${category}"`
- Line 201: FAQ回答 `"これは Smart Garage プレミアムプランの..."`

#### メンテナンスモードページ
**`src/app/maintenance-mode/page.tsx`**
- Line 65: フッター `"© {year} Smart Garage. All rights reserved."`

#### 共有ページ
**`src/app/share/[token]/page.tsx`**
- プロダクト名の表示がある可能性

### 5. バックエンド・ライブラリ (優先度: 中)

#### PDF出力
**`src/lib/pdfExport.ts`**
- Line 280: PDF内タイトル `"Maintenance History Report"` (製品名との関連性は低いが、必要に応じて変更検討)
- PDF生成時のヘッダー・フッター部分に製品名は含まれていない（確認済み）

#### 通知
**`src/lib/notifications.ts`**
- Line 50: テスト通知のタイトル `'Smart Garage'`

#### その他コンポーネント
**`src/components/dashboard/Navigation.tsx`**
- Line 15: ナビゲーションバーのブランド名 `"Smart Garage"`

**`src/components/EmptyStateGuide.tsx`**
- 空状態メッセージ内の製品名参照（要確認）

### 6. ドキュメンテーション (優先度: 低)

以下のMarkdownドキュメントにも「Smart Garage」が含まれています：

- `README.md` - Line 1: タイトル、プロジェクト説明全般
- `SPECIFICATION.md` - Line 1: 仕様書タイトル、概要セクション
- `RELEASE_NOTES_v2.3.0.md` - Line 1: リリースノートタイトル
- `STRIPE_SETUP_GUIDE.md` - Line 3: セットアップガイド
- `QUICK_START.md` - 複数箇所: Stripe商品名など
- `LP_IMPLEMENTATION.md` - 複数箇所: LP実装ドキュメント
- `setup-stripe.sh` - Line 4: スクリプトヘッダー、商品作成コマンド
- `public/robots.txt` - Line 1: コメント

### 7. 設定ファイル・技術的な識別子 (優先度: 低〜中)

#### パッケージ設定
**`package.json`**
- Line 2: `"name": "smart-garage"` (npmパッケージ名、通常は変更不要)

**`functions/package.json`**
- Line 2: `"name": "smart-garage-functions"` (Cloud Functions パッケージ名)

#### Service Worker・キャッシュ
**`public/sw.js`**
- Line 2: `const CACHE_NAME = 'smart-garage-v1';` (キャッシュ名、変更すると既存キャッシュがクリアされる)
- Line 44: `tag: 'smart-garage-notification'` (通知タグ)

#### データベース・ストレージ識別子
**`src/lib/ocrWorker.ts`**
- Line 26: `const IDB_NAME = 'smart-garage-ocr';` (IndexedDB データベース名)

**`src/lib/signatureToken.ts`**
- Line 32: デフォルトシークレットキー `'smart-garage-default-secret-key'`

#### Cloud Functions
**`functions/src/index.ts`**
- Line 90: デフォルトURL `'https://smart-garage.app'`
- Line 189: デフォルトURL `'https://smart-garage.app'`

#### Firebase関連の識別子（変更不要）
以下は Firebase プロジェクトIDで、変更の必要はありません：
- `smart-garage-74ad1.firebaseapp.com`
- `smart-garage-74ad1` (プロジェクトID)
- `smart-garage-74ad1.appspot.com` (ストレージバケット)

### 8. その他の検討事項

#### OG画像
**`public/og-image.jpg`**
- OGP画像に「Smart Garage」のテキストが含まれている可能性があります
- 画像ファイルの場合は再作成が必要

#### ファビコン・アイコン類
- ブランドロゴやアイコンに製品名が含まれている場合は更新が必要

---

## ✅ 推奨される変更手順

### フェーズ1: コア機能（必須）
1. **メタデータファイル** (`layout.tsx`, `metadata.ts` 等)
2. **ランディングページ** (`page.tsx`, `landing/page.tsx`)
3. **認証画面** (`AuthGate.tsx`)
4. **法的文書** (利用規約、プライバシーポリシー、特商法)

### フェーズ2: UI/UX（必須）
5. **ダッシュボード** (`dashboard/page.tsx`)
6. **サポートページ** (`support/page.tsx`)
7. **共有ページ** (`share/[token]/`)
8. **その他コンポーネント** (Navigation, EmptyState等)

### フェーズ3: バックエンド（重要）
9. **PDF出力機能** (`pdfExport.ts`)
10. **通知機能** (`notifications.ts`) - テスト通知のタイトル

### フェーズ4: テスト（必須）
11. **E2Eテスト** (`tests/e2e/01-auth.spec.ts`) - 製品名の検証コード

### フェーズ5: 技術的識別子（慎重に検討）
12. **Service Worker** (`sw.js`) - キャッシュ名、通知タグ
13. **データベース名** (`ocrWorker.ts`) - IndexedDB名
14. **Cloud Functions** (`functions/src/index.ts`) - デフォルトURL

⚠️ **注意**: フェーズ5の項目は既存データへの影響があるため、変更は推奨しません

### フェーズ6: ドキュメント・設定（任意）
15. **ドキュメントファイル** (README, SPEC等)
16. **設定ファイル** (package.json等)
17. **Stripe商品名** - Stripeダッシュボードで手動変更

### フェーズ7: アセット（必要に応じて）
18. **OG画像** の再作成
19. **ファビコン/ロゴ** の更新

---

## ⚠️ 注意事項

1. **大文字・小文字の統一**
   - 新製品名「garage log」の表記ルールを明確にする
   - 例: "garage log", "Garage Log", "GarageLog"
   - サブタイトル「Turn Your Car History into Value」も変更するか検討
   - 日本語キャッチコピー「愛車の履歴を、資産に。」も変更するか検討

2. **SEO影響**
   - ページタイトル、メタデータの変更は検索エンジンランキングに影響
   - 既存の検索結果やリンクが無効になる可能性

3. **外部サービス**
   - Stripe商品名は手動で変更が必要
   - Google Search Console、Analytics等の設定更新が必要な場合あり

4. **ユーザー通知**
   - 既存ユーザーへのブランド変更の告知を検討

5. **キャッシュクリア**
   - デプロイ後、CDNキャッシュのクリアが必要

6. **技術的識別子の変更判断**
   - **Service Worker のキャッシュ名**: 変更すると既存ユーザーのキャッシュがクリアされる
   - **IndexedDB 名**: 変更すると既存のOCRデータが失われる可能性
   - **通知タグ**: 変更すると既存の通知がグループ化されなくなる
   - **package.json の name**: npmに公開していない限り変更不要
   - → これらは**ブランド名の変更では通常変更しない**ことを推奨

7. **E2Eテスト**
   - **`tests/e2e/01-auth.spec.ts`** に製品名の検証が含まれる
     - Line 11: `await expect(page.getByText('Smart Garage')).toBeVisible();`
     - Line 19: `await expect(page).toHaveTitle(/Smart Garage/);`
   - テストコードも併せて更新が必要

8. **その他テスト**
   - メール通知、PDF出力等の動作確認
   - Service Workerの動作確認（キャッシュ、通知）

---

## 📊 変更影響の統計

| カテゴリ | ファイル数（概算） | 影響度 |
|---------|------------------|-------|
| メタデータ・SEO | 3 | 高 |
| UI表示 | 10+ | 高 |
| 法的文書 | 3 | 高 |
| バックエンド | 2 | 中 |
| E2Eテスト | 1 | 高 |
| 技術的識別子 | 4+ | 低〜中 |
| ドキュメント | 8+ | 低 |
| 設定ファイル | 2+ | 低 |
| **合計** | **35+** | - |

---

## 🔄 次のステップ

1. **製品名表記ルールの確定**
   - 正式名称: 「garage log」「Garage Log」「GarageLog」のいずれか
   - 略称、英語表記の統一
   - 大文字・小文字のガイドライン策定
   - サブタイトル・キャッチコピーの検討
     - 英語: "Turn Your Car History into Value" → 変更するか？
     - 日本語: "愛車の履歴を、資産に。" → 変更するか？

2. **影響範囲の最終確認**
   - 実際にコードを検索して漏れがないか確認
   - 特にコメント内の製品名も変更するか決定

3. **一括置換の検討**
   - VSCodeの一括置換機能を使用
   - ただし、法的文書等は慎重に確認が必要

4. **ブランドアセットの準備**
   - 新ロゴ、OG画像等のデザイン作成

5. **変更実施のタイミング決定**
   - メンテナンスウィンドウの設定
   - ユーザー告知のタイミング

---

**作成日**: 2025年11月10日  
**対象プロジェクト**: smart-garage (garagelog.jp)

