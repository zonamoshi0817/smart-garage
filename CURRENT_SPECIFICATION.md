# garage log 現行仕様（実装準拠）

最終更新: 2025-12-26  
対象: `/workspace/src` の現状実装（Next.js + Firebase + Stripe）

本書は、既存の「構想/予定」ではなく、**現在のコードが提供している挙動**を仕様としてまとめたものです。

---

## 概要

garage log は、車両ごとの **メンテナンス・給油・カスタマイズ** を記録し、月別コストや燃費などを可視化する Web アプリです。  
認証は Firebase Authentication（Googleログイン）を使用し、データは Firestore（ユーザー単位で分離）に保存します。

---

## 技術スタック（現状）

- **フロント**: Next.js（App Router）, React, TypeScript, Tailwind CSS
- **認証**: Firebase Authentication（Google）
- **DB**: Firestore
- **ストレージ**: Firebase Storage（車両画像）
- **決済**: Stripe Subscription（Checkout/Customer Portal/Webhook）
- **PDF出力**: jsPDF + html2canvas（クライアント生成）
- **OCR**: Tesseract.js（給油レシート向け）

---

## 画面・ルーティング

### 公開ページ（ログイン不要）

- **LP**: `/landing`
- **法務**:
  - `/legal/privacy`
  - `/legal/terms`
  - `/legal/tokusho`
- **サポート**: `/support`（mailto 送信の簡易フォーム）

### ルート遷移

- `/` → `/home` にリダイレクト

### アプリ本体（ログイン必須）

#### 1) `/home`（メインの統合画面）

`AuthGate` により Google ログインを要求します（未ログイン時はログインカードを表示）。  
ログイン後は、**URL遷移ではなく内部状態** `currentPage` の切替で以下を表示します:

- **ホーム**（`dashboard`）
- **マイカー**（`my-car`）
- **ガソリン**（`fuel-logs`）
- **メンテナンス**（`maintenance-history`）
- **カスタマイズ**（`customizations`）
- **車両管理**（`car-management`）
- **データ**（`data-management`）
- **通知**（`notifications`）

ヘッダー右上に **車両ドロップダウン** を表示（現在保有中のみ）。  
サイドバーの「プレミアム」カードは **無料プランのみ** 表示されます。

#### 2) `/cars/*`（ページ分割されたビュー）

`/cars` と `/cars/[carId]` は `AppShell` ベースの UI で提供されています（`/home` とは別の UI レイヤー）。  
主に以下が存在します:

- `/cars` 車両一覧（無い場合は「ホームから追加」誘導）
- `/cars/[carId]` マイカー（`MyCarPage`）
- `/cars/[carId]/fuel` 給油一覧 + 統計
- `/cars/[carId]/maintenance` メンテ一覧

#### 3) 請求管理

- `/settings/billing`（プラン表示、Stripeポータル遷移、アップグレード導線）
- `/billing/success`（決済成功）
- `/billing/cancel`（決済キャンセル）

---

## 認証仕様

- **ログイン方式**: Google（`signInWithPopup`）
- **アプリのログインゲート**: `AuthGate`
  - 認証状態購読 `watchAuth` を使用
  - 認証チェックが一定時間応答しない場合も UI を進めるタイムアウトが存在（3秒）

---

## プラン（無料 / プレミアム）

### プラン種別

- **無料**: `free`
- **プレミアム（月額）**: `premium_monthly`
- **プレミアム（年額）**: `premium_yearly`

### プラン情報の参照

- Firestore `users/{uid}` ドキュメントの `plan` / `subscriptionStatus` 等を `usePremium()` が監視します。
- 開発用の上書き:
  - `NEXT_PUBLIC_DEV_ALL_PREMIUM=true` → 全ユーザーをプレミアム扱い
  - `NEXT_PUBLIC_DEVELOPER_EMAILS` に含まれるメール → プレミアム扱い

### 無料プランの主な制限（現状の意図）

- **車両登録**: 1台まで（それ以降はペイウォール誘導）
- **PDF出力**: プレミアム機能（`pdf_export`）
- **給油レシートOCR自動入力**: プレミアム機能（`ocr_scan`）

補足:
- 共有URL機能はコード/Functionsが残っていますが、**現状UIでは「共有URL生成」は提供していません**（PDF出力のみ）。

---

## データモデル（実装の前提）

### 共通方針

- **日時は Firestore `Timestamp` に統一**
- **論理削除**: `deletedAt: null` が未削除（削除時は `Timestamp`）
- **所有者フィールド**: `userId` が必須（Firestoreルール要件）

### Firestore 主要コレクション（実装で使用しているもの）

- **ユーザー**: `users/{uid}`
  - 課金情報: `plan`, `subscriptionStatus`, `currentPeriodEnd`, `stripeCustomerId` 等
- **車両**: `users/{uid}/cars/{carId}`
- **メンテ**: `users/{uid}/maintenance/{maintenanceId}`
- **給油**: `users/{uid}/fuelLogs/{fuelLogId}`
- **カスタマイズ**: `users/{uid}/cars/{carId}/customizations/{customizationId}`
- **OCRドラフト**
  - `users/{uid}/fuelLogDrafts/{draftId}`
  - `users/{uid}/maintenanceDrafts/{draftId}`

### 車両ステータス

`status` は以下を想定（`CarStatus`）:

- `active`: 現在保有中（デフォルト）
- `sold`: 売却済み（閲覧専用）
- `scrapped`: 廃車済み（閲覧専用）
- `downgraded_premium`: ダウングレードにより **編集不可**（閲覧専用）
- `other`: その他

`/home` の車両ドロップダウンには **active のみ**表示し、`sold/scrapped/downgraded_premium` は除外します。

---

## 機能仕様（現状）

### 1. 車両管理

- **追加**: `AddCarModal` → `users/{uid}/cars` に保存
  - `userId/ownerUid/createdAt/updatedAt/deletedAt` を付与
- **編集**: `updateCar()`
- **削除**: `removeCar()` により論理削除
- **売却**: `markCarAsSold()`（`status='sold'` と売却情報を保存）
- **復元**: `restoreCarToActive()`（`status='active'` に戻し売却情報をクリア）
- **画像アップロード**: Firebase Storage（圧縮 + 進捗表示の仕組みを利用）

### 2. 車両の選択（アクティブ車両）

- `activeCarId` が未設定、または無効な場合は **最初の active 車両を自動選択**
- `activeCarId` に紐づき、給油・メンテ・カスタマイズの読み込み対象が切り替わります

### 3. メンテナンス記録

- **追加**: `addMaintenanceRecord()`
  - 走行距離の整合チェック（過去記録/現在車両ODOとの整合）
  - 登録成功時に車両の `odoKm` を更新（失敗してもメンテ保存は成功扱い）
- **一覧**: `watchMaintenanceRecords(carId)`（現状はインデックス回避のためクライアント側ソート）
- **全件監視**: `watchAllMaintenanceRecords()`（通知/データ画面向け）
- **更新**: `updateMaintenanceRecord()`
- **削除**: `deleteMaintenanceRecord()` は論理削除（※一括削除は物理削除コードが存在）

### 4. 給油記録（物理量統一）

- **入力**: ODO/トリップ選択に対応
- **保存形式**:
  - `quantity`（ml または Wh）/ `unit`（`ml` or `wh`）
  - `totalCostJpy`
  - 旧フィールド（`fuelAmount/cost/pricePerLiter`）は後方互換として残存
- **燃費計算**:
  - 満タン同士の区間を用いて km/L を計算
  - EV（`unit='wh'`）は燃費計算対象外

### 5. 給油レシートOCR（FuelLogModal 内）

- **実装箇所**: `FuelLogModal`
- **エンジン**: Tesseract.js（`jpn+eng`）
- **抽出項目**: 給油量・金額・単価（正規表現 + 補完計算）
- **プレミアム制御（フリーミアム）**
  - OCR結果の信頼度が高い場合（閾値 0.65）にプレミアム判定
  - **初回のみ**: 無料でも「ドラフト保存（編集不可想定）」を行い体験させる
  - 2回目以降はペイウォール誘導

補足:
- `OCRModal`（別モーダル）も存在しますが、こちらは現状「開発中」のプレースホルダです。

### 6. カスタマイズ記録

- **保存先**: `users/{uid}/cars/{carId}/customizations`
- **操作**: 追加/更新/論理削除
- **一覧取得**: `getCustomizations()`（インデックス回避のためクライアント側フィルタ/ソート）
- **カテゴリ/ステータス**: 定義済み（`CATEGORY_LABELS`, `STATUS_LABELS`, `STATUS_COLORS`）

### 7. PDF出力（メンテ履歴書）

- **UI**: `ShareAndPDFModal`（※共有URL生成は削除済み）
- **生成**: クライアントで PDF を生成（html2canvas → jsPDF）
- **証跡**:
  - データの proof（ハッシュ等）を生成し埋め込み
  - Cloud Functions で JWT 署名トークン（`generatePdfExportToken`）を発行し、PDFに短縮署名として埋め込み
- **プラン制御**: `/home` 側で `pdf_export` としてプレミアム判定

### 8. 車検期限アラート（軽量）

- 車両の `inspectionExpiry` を元にアラート表示
  - 期限切れ: 赤
  - 60日以内: 黄
- CTA はメンテナンス画面（`maintenance-history`）へ誘導

---

## Stripe（課金）仕様

### Checkout（購入）

- クライアント（`PaywallModal` / 請求管理ページ）→ `/api/stripe/create-checkout-session`
- 送信: `plan`（monthly/yearly）, `idToken`
- Checkout セッション:
  - `mode=subscription`
  - `trial_period_days=7`
  - `client_reference_id` に Firebase UID を格納

### Customer Portal（請求管理・解約）

- `/api/stripe/create-portal-session` に `idToken` を送信し、返却された `url` へ遷移

### Webhook

- `/api/stripe/webhook`
  - `customer.subscription.created/updated` → `users/{uid}.plan` 等を更新
  - `customer.subscription.deleted` → `plan=free` に戻し、**2台目以降の active 車両を `downgraded_premium` に変更**
  - idempotency のため `stripe_webhook_events/{eventId}` を作成して重複処理を抑止

---

## セキュリティ（Firestore）

`firestore.rules` の方針（要点）:

- ユーザー配下のデータは `users/{userId}/...` に保存し **パスベースでオーナー検証**
- `cars` / `maintenance` などは **`userId` 必須**（`request.resource.data.userId == request.auth.uid`）
- データサイズ制限・文字列長制限などを実施
- 互換のためのトップレベル `cars` / `maintenance` 等ルールも存在（移行・後方互換向け）

---

## 仕様上の注意（現状の実装ギャップ）

- **共有URL**: Cloud Functions 等の名残はありますが、UIとしては「共有URL生成」は削除済みです（PDF出力のみ提供）。
- **OCR（汎用モーダル）**: `OCRModal` は存在するが、現状は「開発中」表示で実処理は `FuelLogModal` 側にあります。
- **UI経路の二重化**: `/home`（内部タブ）と `/cars/*`（ページ分割）が併存しています。どちらも同一の Firestore データを参照します。

