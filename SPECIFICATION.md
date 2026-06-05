# GarageLog 仕様書

最終更新: 2025年1月25日

## 目次

1. [概要](#1-概要)
2. [ルート設計（Current Spec）](#2-ルート設計current-spec)
3. [データモデル（Current Spec）](#3-データモデルcurrent-spec)
4. [機能仕様（Current Spec）](#4-機能仕様current-spec)
5. [セキュリティ・権限（Current Spec）](#5-セキュリティ権限current-spec)
6. [Implementation Notes](#6-implementation-notes)
7. [Future / Design Memo](#7-future--design-memo)

---

## 1. 概要

### 1.1 プロダクトの目的

GarageLog（ガレージログ）は、車両のメンテナンス管理と整備計画機能を提供するWebアプリケーションです。複数の車両を一元管理し、給油記録、メンテナンス履歴、カスタマイズ記録をデジタル化して「見える化」します。

### 1.2 アーキテクチャ概要

- **フロントエンド**: Next.js 15 (App Router)
- **バックエンド**: Firebase (Firestore, Storage, Functions)
- **認証**: Firebase Authentication
- **決済**: Stripe
- **デプロイ**: Vercel

### 1.3 役割分担

- **マイカー（/mycar）**: 編集/分析の作戦室
- **ダッシュボード（/home）**: 横断ハブ
- **プレミアムの価値**: OCR/PDF/共有を主導線に配置

---

## 2. ルート設計（Current Spec）

### 2.1 正規ルート一覧

#### 認証必須ルート（(app)グループ）

| ルート | 説明 | 用途 |
|--------|------|------|
| `/home` | ホーム/ダッシュボード | 横断ハブ、全車両の概要表示 |
| `/mycar` | マイカーページ | 選択中車両の詳細・編集・分析 |
| `/cars` | 車両管理ページ | 車両一覧・追加・編集 |
| `/cars/[carId]` | 車両詳細ページ | 特定車両の詳細表示 |
| `/cars/[carId]/fuel` | 給油記録ページ | 特定車両の給油記録 |
| `/cars/[carId]/maintenance` | メンテナンス記録ページ | 特定車両のメンテナンス記録 |
| `/maintenance` | メンテナンス記録一覧 | 全車両のメンテナンス記録 |
| `/customizations` | カスタマイズ記録 | 全車両のカスタマイズ記録 |
| `/gas` | 給油記録一覧 | 全車両の給油記録 |
| `/share` | 共有設定 | 車両の共有リンク管理 |
| `/data` | データエクスポート | CSV/PDFエクスポート |
| `/settings/account` | アカウント設定 | ユーザー情報管理 |
| `/settings/billing` | 課金設定 | プレミアムプラン管理 |
| `/vehicles/[vehicleId]/sale-mode` | 売却モード管理ページ | 売却用リンクの作成・管理 |
| `/vehicles/[vehicleId]/evidence` | 証跡一覧ページ | 証跡の一覧・管理 |
| `/vehicles/[vehicleId]/evidence/upload` | 証跡アップロードページ | 証跡のアップロード |

#### リダイレクトルート

| ルート | 説明 | 遷移先 |
|--------|------|--------|
| `/dashboard` | ダッシュボード（旧） | `/home`に自動リダイレクト |

#### システムルート

| ルート | 説明 | 用途 |
|--------|------|------|
| `/maintenance-mode` | メンテナンスモードページ | システムメンテナンス時の表示 |

#### 公開ルート

| ルート | 説明 | 用途 |
|--------|------|------|
| `/s/[slug]` | 公開共有ページ | 外部共有用（slug方式） |
| `/c/[carId]` | 公開車両ページ | 公開設定された車両の表示 |

#### 認証関連ルート

| ルート | 説明 |
|--------|------|
| `/login` | ログインページ |
| `/signup` | サインアップページ |
| `/reset-password` | パスワードリセット |

#### 決済関連ルート

| ルート | 説明 |
|--------|------|
| `/billing/success` | 決済成功ページ |
| `/billing/cancel` | 決済キャンセルページ |

### 2.2 深リンク契約

#### クエリパラメータ仕様

**車両選択**
- `?car={carId}` - 特定の車両を選択して表示

**タブ・アクション指定**
- `/cars/[carId]?tab=fuel&action=add` - 給油記録追加モーダルを開く
- `/cars/[carId]?tab=maintenance&action=add` - メンテナンス記録追加モーダルを開く
- `/home?tab=dashboard` - ダッシュボードタブを表示
- `/home?tab=customizations` - カスタマイズタブを表示

### 2.3 非推奨ルート

以下のルートは仕様外です（採用する場合は全面改定が必要）:
- `/vehicle/{carId}` - 未実装
- `/share/[token]` - 未実装（署名トークンは別用途）

**注意**: `/vehicles/[vehicleId]/*` ルートは実装されていますが、将来的に `/cars/[carId]/*` への統一を検討中です。

---

## 3. データモデル（Current Spec）

### 3.1 BaseEntity（すべてのエンティティの基底型）

**重要**: すべてのエンティティは `BaseEntity` を継承します。例外はありません。

**Firestoreセキュリティルール**: `userId`フィールドは必須です。すべてのCRUD操作で`userId: user.uid`を設定してください。

```typescript
export interface BaseEntity {
  id?: string;                    // ドキュメントID
  userId?: string;                 // ユーザーID（Firestoreセキュリティルールで必須）
  ownerUid?: string;              // 所有者UID（マルチテナンシー対応）
  createdBy?: string;             // 作成者UID（監査ログ用）
  updatedBy?: string;             // 更新者UID（監査ログ用）
  deletedAt: Timestamp | null;    // 論理削除（null=未削除、Timestamp=削除済み）
  createdAt: Timestamp;           // 作成日時（serverTimestamp）
  updatedAt: Timestamp;           // 更新日時（serverTimestamp）
}
```

**注意**: `userId`と`ownerUid`は通常同じ値ですが、Firestoreセキュリティルールでは`userId`が必須です。

### 3.2 Timestamp統一規約

**重要**: 日時フィールドはFirestore Timestampに完全統一されています。

- **Firestoreに保存**: `Timestamp`（`serverTimestamp()`使用）
- **クライアント表示**: `Timestamp.toDate()` でDateに変換
- **Date | string 型は廃止**（バグの温床）
- **deletedAtは null（未削除）で統一**（クエリ最適化）

**変換規約**:
- Firestore書き込み前: `toTimestamp()` を必ず通す（`src/lib/converters.ts`）
- UI層へ渡す直前: `timestampToDate()` を使用（表示用途のみ）

### 3.3 車両（Car）

```typescript
export interface Car extends BaseEntity {
  name: string;
  modelCode?: string;
  year?: number;
  odoKm?: number;
  imagePath?: string;
  inspectionExpiry?: Timestamp;   // 車検期限（Timestamp統一）
  firstRegYm?: string;
  avgKmPerMonth?: number;
  vehicleClass?: VehicleClass;
  status?: CarStatus;              // 'active' | 'sold' | 'scrapped' | 'downgraded_premium' | 'other'
  soldDate?: Timestamp;            // 売却日（Timestamp統一）
  soldPrice?: number;
  soldTo?: string;
  soldNotes?: string;
  downgradedAt?: Timestamp;        // ダウングレード日時（Timestamp統一）
  chassisNumber?: string;
  registrationNumber?: string;
  bodyType?: 'sedan' | 'hatchback' | 'suv' | 'wagon' | 'coupe' | 'convertible' | 'pickup' | 'minivan' | 'sports' | 'other';
  // 公開マイカーページ設定
  isPublic?: boolean;
  publicVanityUrl?: string;
  publicTagline?: string;
  ownerPicks?: string[];
  ownerHandle?: string;
  ownerRegion?: string;
  ownerSocialLinks?: { instagram?: string; twitter?: string };
  // 基本スペック（公開用）
  driveType?: 'FF' | 'FR' | '4WD' | 'MR' | 'RR' | 'AWD';
  transmission?: string;
  bodyColor?: string;
  ownedSince?: Timestamp;          // 所有開始年月（Timestamp統一）
  // 共有プロフィール
  activeShareProfileIds?: {
    normal?: string;
    sale?: string;
    appraisal?: string;
  };
}
```

**Firestoreコレクション**: `users/{userId}/cars/{carId}`

### 3.4 給油記録（FuelLog）

```typescript
export interface FuelLog extends BaseEntity {
  carId: string;
  odoKm: number;
  
  // 【物理量統一】EVとガソリンを共通化
  quantity: number;                // 物理量（ml or Wh の整数）
  unit: EnergyUnit;                // 単位（'ml' | 'wh'）
  totalCostJpy: number;            // 総額（円）
  pricePerUnit?: number;            // 単価（¥/L or ¥/kWh、表示用）
  
  // メタデータ
  isFullTank: boolean;              // 満タンかどうか（EVの場合は100%充電）
  fuelType: FuelType;               // 'regular' | 'premium' | 'diesel' | 'ev'
  stationName?: string;
  memo?: string;
  date: Timestamp;                  // 給油/充電日時（Timestamp統一）
  
  // 【後方互換性】旧フィールド（非推奨、将来削除）
  fuelAmount?: number;              // @deprecated quantity/unitを使用
  cost?: number;                    // @deprecated totalCostJpyを使用
  pricePerLiter?: number;           // @deprecated pricePerUnitを使用
}
```

**Firestoreコレクション**: `users/{userId}/fuelLogs/{fuelLogId}`

#### FuelLogの単位規約

**UI入力単位**:
- ガソリン: L（小数1位まで）
- EV: kWh（小数2位まで可）

**Firestore保存単位**:
- `quantity`: 整数（ml or Wh）
- `unit`: 'ml' | 'wh'

**変換規約**:
- L -> ml: `round(L * 1000)`
- kWh -> Wh: `round(kWh * 1000)`

**表示規約**:
- 表示は `getDisplayFuelAmount()` を必ず経由（`src/lib/converters.ts`）
- 旧フィールド（`fuelAmount`）は表示フォールバックのみ

**燃費計算**:
- ガソリンのみ（現仕様通り）

### 3.5 メンテナンス記録（MaintenanceRecord）

```typescript
export interface MaintenanceRecord extends BaseEntity {
  carId: string;
  title: string;
  description?: string;
  cost?: number;
  mileage?: number;
  date: Timestamp;                  // メンテナンス実施日（Timestamp統一）
  location?: string;
  items?: MaintenanceItem[];
  attachments?: MaintenanceAttachment[];
  imageUrl?: string;
  category?: string;
  isPreventive?: boolean;
  typeTag?: 'receipt_backed' | 'owner_log' | 'other';
}

export interface MaintenanceAttachment {
  type: 'photo' | 'pdf' | 'receipt';
  url: string;
  fileName: string;
  uploadedAt: Timestamp;           // アップロード日時（Timestamp統一）
}
```

**Firestoreコレクション**: `users/{userId}/maintenanceRecords/{maintenanceRecordId}`

### 3.6 カスタマイズ記録（Customization）

```typescript
export interface Customization extends BaseEntity {
  carId: string;
  title: string;
  brand?: string;
  modelCode?: string;
  categories: CustomCategory[];
  status: CustomStatus;
  date: Timestamp;                  // 実施日（Timestamp統一）
  odoKm?: number;
  vendorType?: 'self' | 'shop' | 'dealer';
  vendorName?: string;
  partsCostJpy?: number;
  laborCostJpy?: number;
  otherCostJpy?: number;
  currency: 'JPY';
  link?: string;
  memo?: string;
  isPublic: boolean;
  imageUrl?: string;
}
```

**Firestoreコレクション**: `users/{userId}/customizations/{customizationId}`

### 3.7 共有プロフィール（ShareProfile）

```typescript
export interface ShareProfile extends BaseEntity {
  vehicleId: string;                // 車両ID（users/{userId}/cars/{carId}のcarId）
  ownerUid: string;                 // オーナーUID
  type: 'normal' | 'sale' | 'appraisal' | 'sale_buyer' | 'sale_appraiser';
  status: 'active' | 'disabled';
  slug: string;                     // URLスラッグ（例: "abc123"）
  
  // 後方互換性のため、既存フィールドも維持
  visibility?: 'unlisted' | 'public' | 'disabled';  // 非推奨、statusで代替
  includeEvidence: boolean;
  includeAmounts: boolean;
  highlightTopN: number;
  analyticsEnabled: boolean;
  
  // 新規追加フィールド
  title?: string;
  maskPolicy?: 'auto' | 'strict' | 'custom';
  sections?: string[];
  viewCount?: number;
  lastPublishedAt?: Timestamp;      // 最終公開日時（Timestamp統一）
  
  // SNS共有（通常リンク）用フィールド（type="normal"のみ利用）
  sns?: {
    settings?: {
      showPricesInDetails?: boolean;
    };
    conceptTitle?: string;
    conceptBody?: string;
    highlightParts?: Array<{ label: string; value: string }>;
    gallery?: Array<{ id: string; path: string; caption?: string }>;
    socialLinks?: { youtube?: string; instagram?: string; x?: string; web?: string };
    build?: {
      featured?: Array<{ label: string; value: string; priceAmount?: number; ... }>;
      categories?: Array<{ name: string; items: Array<{ name: string; note?: string }> }>;
    };
  };
}
```

**Firestoreコレクション**: `shareProfiles/{shareProfileId}`

---

## 4. 機能仕様（Current Spec）

### 4.1 車両管理

#### 4.1.1 車両登録

- **無料プラン**: 1台まで
- **プレミアムプラン**: 無制限

#### 4.1.2 車両情報管理

- 車名、メーカー、モデル、年式
- 走行距離（ODO）
- 車検期限（Timestamp）
- 車両画像（Firebase Storage）

### 4.2 給油記録（Fuel Logs）

#### 4.2.1 記録の登録・編集・削除

- 走行距離（ODOメーター or トリップメーター）
- 給油量（UI入力: L、保存: ml）
- 金額（円）
- L価格（単価、円/L）
- 燃料種別（レギュラー・ハイオク・軽油・EV充電）
- スタンド名
- 満タンフラグ
- 給油日時（Timestamp）
- メモ

#### 4.2.2 OCR機能（プレミアム）

- レシート自動読み取り
- 給油量（L）の自動抽出
- 金額（円）の自動抽出
- L価格（単価）の自動抽出
- 初回無料体験: 1枚のみ無料体験

### 4.3 メンテナンス記録

#### 4.3.1 記録の登録・編集・削除

- タイトル（選択式: オイル交換、ブレーキフルード交換など）
- 説明（自由記述）
- 費用（円）
- 走行距離（必須、現在の車両走行距離以上）
- 日付（Timestamp）
- 場所（自由記述）

### 4.4 カスタマイズ記録

#### 4.4.1 記録の登録・編集・削除

- タイトル（カスタマイズ名）
- ブランド、型番
- カテゴリ（複数選択可）
- ステータス（計画中、注文済み、取付済み、一時取外し、取外し）
- 実施日（Timestamp）
- 走行距離（km、オプション）
- 実施場所（自分で実施、整備工場、ディーラー）
- 費用内訳（部品代、工賃、その他）
- 商品リンク（URL）
- メモ
- 公開設定

### 4.5 共有機能

#### 4.5.1 共有URL方式（Current Spec）

**正規方式**: `/s/[slug]`（slug方式）

- **URL形式**: `https://garagelog.jp/s/{slug}`
- **slug生成**: 十分長いランダム値（例: 32文字の英数字）
- **アクセス制御**: サーバ側で期限/失効判定
- **失効**: `status: 'disabled'` または `activeShareProfileIds` から削除
- **有効期限**: slug自体に期限は持たない（サーバ側で管理）

**一致条件**:
- `vehicle.activeShareProfileIds[type] === shareProfile.id` の場合のみ有効

#### 4.5.2 署名トークン（別用途）

- **用途**: PDF生成や機密操作（APIアクセス用）
- **生成**: Cloud Functionsでのみ生成（JWT、HS256）
- **有効期限**: 7日間（PDFエクスポート）、30日間（共有URL）
- **失効機能**: `revokedAt`による即座の無効化

---

## 5. セキュリティ・権限（Current Spec）

### 5.1 認証・アクセス制御

- Firebase Authenticationによる認証
- Firebase Storageの権限管理（ユーザー別アクセス制御）
- ユーザー別データ分離（マルチテナンシー）
- 論理削除（deletedAt）による安全なデータ削除
- 監査ログ（Audit Log）による操作履歴の追跡

### 5.2 Firestoreルール

- すべてのエンティティで `userId` または `ownerUid` が必須
- ユーザーは自分のデータのみアクセス可能
- 論理削除されたデータはクエリで除外

### 5.3 データ保護

- 入力値の検証（Zod）
- エラーハンドリング
- PDF署名埋め込み（エクスポート元の正当性証明）

---

## 6. Implementation Notes

### 6.1 Timestamp変換の実装

**必須**: `src/lib/converters.ts` の関数を使用すること。

```typescript
import { toTimestamp, timestampToDate } from '@/lib/converters';

// Firestore書き込み前
const cleanData = {
  ...data,
  date: toTimestamp(data.date),
};

// UI表示用
const displayDate = timestampToDate(timestamp);
```

### 6.2 FuelLog単位変換の実装

**必須**: `src/lib/converters.ts` の関数を使用すること。

```typescript
import { 
  litersToMilliliters, 
  kilowatthoursToWatthours,
  getDisplayFuelAmount 
} from '@/lib/converters';

// UI入力（L）→ Firestore保存（ml）
const quantityMl = litersToMilliliters(inputLiters);

// UI入力（kWh）→ Firestore保存（Wh）
const quantityWh = kilowatthoursToWatthours(inputKwh);

// 表示用
const display = getDisplayFuelAmount(fuelLog);
```

### 6.3 ルート遷移の実装

```typescript
import { useRouter } from 'next/navigation';

const router = useRouter();

// 車両選択付きで遷移
router.push(`/mycar?car=${carId}`);

// 深リンクでモーダルを開く
router.push(`/cars/${carId}?tab=fuel&action=add`);
```

### 6.4 Share機能の実装

```typescript
// ShareProfileの作成
const shareProfile = {
  vehicleId: carId,
  ownerUid: userId,
  type: 'normal',
  status: 'active',
  slug: generateRandomSlug(32),  // 十分長いランダム値
  // ...
};

// 共有URLの生成
const shareUrl = `https://garagelog.jp/s/${shareProfile.slug}`;

// 車両のactiveShareProfileIdsを更新
await updateCar(carId, {
  activeShareProfileIds: {
    normal: shareProfile.id,
  },
});
```

---

## 7. Future / Design Memo

**注意**: 以下の内容は現仕様ではありません。将来の設計案です。

### 7.1 ルート設計の将来案

- `/vehicle/{carId}` 形式への統一化を検討中
- 採用する場合は、現行の `/cars/[carId]` を後方互換（リダイレクト）として維持

### 7.2 データモデルの将来案

- メンテナンス記録の明細行（items）の詳細仕様
- 添付ファイル（attachments）の詳細仕様
- 証跡（Evidence）の詳細仕様

### 7.3 機能の将来案

- 保険管理機能の詳細仕様
- リマインダー機能の詳細仕様
- 広告非表示機能の詳細仕様

---

## 付録

### A. すぐ反映すべき仕様の追記テンプレ

#### A.1 FuelLogの単位規約

```
UI入力：ガソリンはL（小数1位）、EVはkWh（小数2位まで可）
Firestore保存：quantity は整数、unit は ml | wh
変換：
  quantityMl = round(inputLiters * 1000)
  quantityWh = round(inputKwh * 1000)
表示：getDisplayFuelAmount() を必ず使用（旧フィールドは表示フォールバックのみ）
```

#### A.2 Timestamp統一規約

```
全エンティティの date/createdAt/updatedAt/soldDate/... は Firestore Timestamp
UI層へ渡す直前のみ toDate(ts) を使用
Firestore書き込み前に toTs(input) を必ず通す（Date/string混入禁止）
```

#### A.3 ルート統一規約

```
正規ルート：/cars/[carId] を採用
深リンク契約：/cars/[carId]?tab=fuel&action=add 等
旧 /vehicle 形式は仕様外（採用するなら表を全面改定）
```

#### A.4 Share URL方式規約

```
外部共有はすべて /s/[slug]（人に送るURLは短く・安定）
アクセス制御・失効・期限は slug 自体を「十分長いランダム値」にし、サーバ側で期限/失効判定
PDF生成や機密操作は別途署名トークン（APIアクセス用）
```

---

## 変更履歴

- 2025-01-25: 実装との差分を修正
  - BaseEntityに`userId`フィールドを追加（Firestoreセキュリティルールで必須）
  - ルート一覧を更新（/dashboard, /maintenance-mode, /vehicles/[vehicleId]/*を追加）
  - `/vehicles/[vehicleId]/sale-mode`をCurrent Specに移動

- 2025-01-25: 初版作成（コードベースから再構築）
  - ルート設計を統一（/home, /mycar, /cars/[carId]を正規として明記）
  - Timestamp方針を完全統一
  - FuelLogの単位規約を明文化
  - Share機能のURL方式を統一（/s/[slug]を正規として明記）
  - BaseEntity継承を完全統一
  - セクション番号を正規化
