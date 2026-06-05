# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # 開発サーバー起動 (localhost:3000)
npm run build        # プロダクションビルド
npm run lint         # ESLint
npm test             # Playwright E2Eテスト全件実行
npx playwright test tests/foo.spec.ts  # 特定テストのみ実行
```

Firebase デプロイ:
```bash
firebase deploy --only firestore:indexes
firebase deploy --only firestore:rules,storage:rules
firebase deploy --only functions
```

## アーキテクチャ概要

### ルートグループ構成

```
src/app/
  (app)/          # 認証必須ルート（layout.tsx で AuthGate を通す）
  (marketing)/    # LP・法的ページ（未認証でアクセス可）
  api/            # Route Handlers（Stripe webhook, 公開API, アカウント操作）
```

認証はサーバーサイドでは行わず、`src/app/(app)/layout.tsx` の `AuthGate` コンポーネントがクライアント側で制御する。

### データフロー

- **クライアント → Firestore**: `src/lib/` 配下の関数（`cars.ts`, `fuelLogs.ts` 等）を経由。直接 Firestore を叩かない。
- **サーバー処理が必要な操作**: `src/app/api/` の Route Handlers 経由（Stripe, アカウント削除 等）
- **認証状態**: `useAuth` フック（`src/hooks/useAuth.ts`）で Firebase Auth を購読
- **選択中の車両**: `SelectedCarContext`（`src/contexts/SelectedCarContext.tsx`）でアプリ全体に共有

### プレミアム判定

`usePremium` フック（`src/hooks/usePremium.ts`）が Firestore の `users/{uid}` ドキュメントを購読して判定。`NEXT_PUBLIC_DEV_ALL_PREMIUM=true` を `.env.local` に設定すると全ユーザーをプレミアム扱いにできる。

## 必須規約

### Timestamp統一

**すべての日時フィールドは Firestore Timestamp で統一**。`src/lib/converters.ts` の関数を必ず使うこと。

```typescript
import { toTimestamp, timestampToDate } from '@/lib/converters';

// Firestore 書き込み前（Date/string を Timestamp に変換）
const data = { ...input, date: toTimestamp(input.date) };

// UI 表示用のみ（Timestamp → Date）
const display = timestampToDate(record.date);
```

`Date` や `string` を直接 Firestore に保存しない。

### FuelLog 単位変換

UI は L / kWh で入力を受け取るが、Firestore には整数（ml / Wh）で保存する。

```typescript
import { litersToMilliliters, kilowatthoursToWatthours, getDisplayFuelAmount } from '@/lib/converters';

// 保存時
const quantityMl = litersToMilliliters(inputLiters);   // L → ml
const quantityWh = kilowatthoursToWatthours(inputKwh); // kWh → Wh

// 表示時
const display = getDisplayFuelAmount(fuelLog); // 必ずこの関数を通す
```

### BaseEntity

すべてのエンティティは `BaseEntity`（`src/types/index.ts`）を継承し、`userId` フィールドを必ず含める。Firestore セキュリティルールが `userId` で読み書きを制御している。

### 共有URL

外部共有 URL は `/s/[slug]` 形式のみ正規。slug は 32 文字のランダム英数字。有効/無効の管理は `Car.activeShareProfileIds` と `ShareProfile.status` で行う。

## 環境変数

`.env.local` に以下を設定する（本番は Vercel の環境変数）:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_DEV_ALL_PREMIUM=true   # 開発時に全ユーザーをプレミアムにする
NEXT_PUBLIC_DEVELOPER_EMAILS=      # カンマ区切りで開発者アカウントを指定
```
