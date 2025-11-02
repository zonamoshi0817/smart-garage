# Smart Garage 仕様書

## 概要
Smart Garageは、車両のメンテナンス管理と整備計画機能を提供するWebアプリケーションです。ユーザーは車両情報の管理、メンテナンス履歴の記録、整備計画の設定・管理を行うことができます。

## 技術スタック
- **フロントエンド**: Next.js 15.5.3, React 19.1.0, TypeScript
- **バックエンド**: Firebase 12.3.0 (Firestore, Authentication, Storage)
- **スタイリング**: Tailwind CSS 4
- **バリデーション**: Zod 4.1.11
- **OCR**: Tesseract.js（日本語・英語対応）
- **画像処理**: クライアントサイド圧縮、Firebase Storage
- **グラフ**: Recharts 3.2.1
- **PDF生成**: jsPDF 3.0.3, jsPDF-AutoTable 5.0.2
- **デプロイ**: Vercel

## 機能仕様

### 1. 認証・ユーザー管理
- Firebase Authenticationを使用
- ユーザー情報表示（名前、プラン）
- ユーザー名の最初の文字をアイコンとして表示

### 2. ナビゲーション
#### メニュー構成
1. **ダッシュボード** - メイン画面
2. **車両** - 車両管理画面
3. **メンテナンス履歴** - 整備記録画面
4. **保険** - 保険管理画面
5. **エクスポート** - データ管理画面

### 3. 車両管理
#### 車両情報
- 車両名
- メーカー・モデル・年式
- 走行距離（odoKm）
- 車検期限
- エンジンコード
- オイル仕様（粘度、API規格、容量）

#### 車両追加機能
- TypeaheadCarSelectorによる車種選択
- 車両データベースからの自動補完（国内外100車種以上）
- 画像アップロード機能（Firebase Storage）
- クライアントサイド画像圧縮
- 進捗監視付きアップロード
- デフォルト画像選択機能（6種類のデフォルト画像）
- 「+ 車を追加」ボタン（統一されたUI）

### 4. 給油記録（Fuel Logs）
#### 記録項目
- **走行距離**: ODOメーター or トリップメーター（km）
- **給油量**: リットル（小数点第1位まで）
- **金額**: 円
- **L価格**: 円/L（オプション）
- **燃料種別**: レギュラー・ハイオク・軽油・EV充電
- **スタンド名**: 給油場所（オプション）
- **満タンフラグ**: チェックボックス
- **給油日時**: 日時選択
- **メモ**: 自由記述（オプション）

#### OCR機能（レシート自動読み取り）🔒 プレミアム機能
- **対応画像**: カメラ撮影・ファイル選択
- **読み取り項目**: 
  - 給油量（L、リットル、ℓ）
  - 金額（円、¥、合計）
  - L価格（単価）
- **技術**: Tesseract.js（日本語特化）
- **自動計算**: 金額と給油量からL価格を算出
- **バリデーション**: 
  - 給油量は小数点第1位で四捨五入
  - 前回給油時より走行距離が少ない場合は警告
- **UX**: 
  - 読み取り進捗表示（スピナー）
  - 成功時の通知
  - 自動入力後の手動修正可能
- **制限**: 無料プランでは利用不可、プレミアムプランで無制限利用

#### 自動機能
- 給油記録追加時に車両の走行距離を自動更新
- 走行距離の整合性チェック（前回給油時との比較）
- トリップメーター選択時の自動計算
- 燃費の自動計算と表示

### 5. メンテナンス記録
#### 記録項目
- **タイトル**: 選択式（オイル交換、ブレーキフルード交換、タイヤローテーション、エアフィルター交換など）
- **説明**: 自由記述
- **費用**: 数値入力
- **走行距離**: 必須項目（現在の車両走行距離以上）
- **日付**: 日付選択
- **場所**: 自由記述

#### フィルター機能
- 車両別フィルター
- 検索（タイトル・説明・場所）
- カテゴリフィルター（エンジン、タイヤ、ブレーキ、排気、ボディ、内装）
- ステータスフィルター
- 並び替え（日付、費用、走行距離、タイトル）

#### 自動機能
- メンテナンス記録追加時に車両の走行距離を自動更新
- 走行距離の整合性チェック

### 6. カスタマイズ記録
#### 記録項目
- **タイトル**: カスタマイズ名
- **ブランド**: 製品ブランド
- **型番**: 製品型番
- **カテゴリ**: 複数選択可（外装、内装、吸気、排気、ECU、サスペンション等）
- **ステータス**: 計画中、注文済み、取付済み、一時取外し、取外し
- **実施日**: 日付
- **走行距離**: km（オプション）
- **実施場所**: 自分で実施、整備工場、ディーラー
- **費用**: 部品代、工賃、その他
- **商品リンク**: URL
- **メモ**: 詳細説明
- **公開設定**: チェックボックス

#### フィルター・検索機能
- 車両別フィルター
- 検索（タイトル、ブランド、メモ）
- カテゴリフィルター
- ステータスフィルター
- 並び替え（実施日、費用、タイトル）

### 7. 保険管理

#### 保険契約情報
- **基本情報**: 保険会社、証券番号、商品名
- **契約期間**: 開始日、満期日、契約日
- **契約者情報**: 氏名、住所、記名被保険者
- **車両情報**: ナンバー、車台番号、所有者、用途車種
- **保険料**: 年間合計、初回、2回目以降、分割回数
- **等級・割引**: ノンフリート等級、事故係数、適用割引
- **補償内容**: 対人・対物・人身傷害・車両保険・特約
- **運転者条件**: 運転者限定、年齢条件、家族限定
- **使用条件**: 使用目的、年間走行距離、距離区分

#### OCR機能（保険証券自動読み取り）🔒 プレミアム機能
- **対応形式**: 画像（JPG, PNG等）
- **読み取り項目**:
  - 保険会社名（12社対応）
  - 証券番号
  - 契約期間（開始日・満期日）
  - 保険料（年額・分割払い対応）
  - 商品名、契約者氏名
  - ナンバー、車台番号
  - ノンフリート等級
  - 割引情報（8種類自動検出）
- **画像前処理**:
  - 3倍アップスケール（小さい文字対策）
  - シャープネスフィルタ（文字鮮明化）
  - 適応的ヒストグラム平坦化
- **自動入力**: 基本情報→フォーム、詳細情報→メモ欄
- **制限**: 無料プランでは利用不可、プレミアムプランで無制限利用

#### その他機能
- 事故記録の管理
- 保険通知設定
- 期限リマインダー

### 8. データ管理・エクスポート
#### エクスポート機能（統合）
- **基本エクスポート**:
  - 車両データ（CSV）
  - メンテナンス履歴（CSV）
  - カスタマイズ履歴（CSV）
  - 全データ（JSON）
- **履歴証明書・共有**:
  - 全車両履歴書（PDF）
  - 車両別履歴書（PDF）
  - 履歴共有URL生成
- **データ統計表示**:
  - 登録車両数
  - メンテナンス記録数
  - 総データサイズ

#### UI改善
- カスタマイズ画面からCSV出力ボタンを削除
- エクスポート機能をデータページに集約
- 車両別PDF出力機能

### 9. 通知設定
- テスト通知機能
- Service Worker統合（Push通知対応）

## データモデル

### 共通フィールド（BaseEntity）
```typescript
interface BaseEntity {
  id?: string;
  ownerUid?: string;        // 所有者UID（マルチテナンシー対応）
  createdBy?: string;       // 作成者UID
  updatedBy?: string;       // 更新者UID
  deletedAt?: Date | null;  // 論理削除タイムスタンプ
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
```

### 車両（cars）
```typescript
interface Car extends BaseEntity {
  name: string;
  modelCode?: string;
  year?: number;
  odoKm?: number;
  imagePath?: string;
  inspectionExpiry?: Date;    // Date型に統一
  firstRegYm?: string;
  avgKmPerMonth?: number;     // 平均月間走行距離（リマインダー用）
  engineCode?: string;
  oilSpec?: {
    viscosity: string;
    api: string;
    volumeL: number;
  };
}
```

### 給油記録（fuelLogs）
```typescript
type FuelType = 'regular' | 'premium' | 'diesel' | 'ev';

interface FuelLog extends BaseEntity {
  carId: string;
  odoKm: number;          // 走行距離（km）
  fuelAmount: number;     // 給油量（L、小数点第1位まで）
  cost: number;           // 金額（円）
  pricePerLiter?: number; // L価格（円/L）
  isFullTank: boolean;    // 満タンフラグ
  fuelType?: FuelType;    // 燃料種別
  stationName?: string;   // スタンド名
  unit: string;           // 単位（デフォルト: 'JPY/L'、将来の外貨対応）
  memo?: string;          // メモ
  date: Date;             // 給油日時
}
```

### メンテナンス記録（maintenance）
```typescript
interface MaintenanceItem {
  type: 'part' | 'labor' | 'other';
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface MaintenanceAttachment {
  type: 'photo' | 'pdf' | 'receipt';
  url: string;
  fileName: string;
  uploadedAt: Date;
}

interface MaintenanceRecord extends BaseEntity {
  carId: string;
  title: string;
  description?: string;
  cost?: number;
  mileage?: number;       // 必須項目（現在の車両走行距離以上）
  date: Date;
  location?: string;
  items?: MaintenanceItem[];        // 明細行（将来対応）
  attachments?: MaintenanceAttachment[]; // 添付ファイル（将来対応）
}
```

### カスタマイズ記録（customizations）
```typescript
interface Customization {
  id: string;
  carId: string;
  title: string;                    // タイトル
  brand?: string;                   // ブランド
  modelCode?: string;               // 型番
  categories: CustomCategory[];     // カテゴリ（複数選択）
  status: CustomStatus;             // ステータス
  date: Date;                       // 実施日
  odoKm?: number;                   // 走行距離
  vendorType?: 'self' | 'shop' | 'dealer';  // 実施場所タイプ
  vendorName?: string;              // 実施場所名
  partsCostJpy?: number;            // 部品代
  laborCostJpy?: number;            // 工賃
  otherCostJpy?: number;            // その他費用
  currency: string;                 // 通貨（デフォルト: JPY）
  link?: string;                    // 商品リンク
  memo?: string;                    // メモ
  isPublic: boolean;                // 公開設定
  createdAt: Date;
  updatedAt: Date;
}

type CustomCategory = 'exterior' | 'interior' | 'intake' | 'exhaust' | 'ecu' | 
                      'suspension' | 'brake' | 'reinforcement' | 'drivetrain' | 
                      'tire_wheel' | 'electrical' | 'audio' | 'safety' | 'other';

type CustomStatus = 'planned' | 'ordered' | 'installed' | 'removed_temp' | 'removed';
```


## UI/UX仕様

### デザイン原則
- モダンでクリーンなデザイン
- レスポンシブ対応
- 直感的なナビゲーション
- 一貫性のあるカラーテーマ（青系）

### レイアウト
- サイドバーナビゲーション
- メインコンテンツエリア
- モーダルダイアログ
- カード形式の情報表示

### インタラクション
- フィルター機能（車両別、検索）
- 一括操作（削除など）
- リアルタイム更新
- エラーハンドリング
- プラン制限の表示（車両数制限、機能制限）
- アップグレード促進UI

## ビジネスロジック

### データ整合性
- 走行距離の整合性チェック（過去記録 ≤ 新規記録 ≤ 現在車両走行距離）
- 関連データの自動更新
- Zodスキーマによる型安全なバリデーション

### 車両制限ロジック
- **無料プラン**: 1台まで車両登録可能
- **2代目以降**: プレミアムプラン（月額480円）が必要
- **車両追加時の制限チェック**: プランに応じた車両数の制限
- **画像アップロード制限**: 無料プランは1台分のみ、プレミアムは全車両対応

### アフィリエイト機能
- Amazon/Rakutenへのリンク生成
- UTMパラメータ付与
- 車種適合商品の自動選択

## セキュリティ

### 認証・アクセス制御
- Firebase Authenticationによる認証
- Firebase Storageの権限管理（ユーザー別アクセス制御）
- ユーザー別データ分離（マルチテナンシー）
- 論理削除（deletedAt）による安全なデータ削除
- 監査ログ（Audit Log）による操作履歴の追跡

### データ保護
- **エクスポート署名**: HMAC-SHA256ベースの改ざん防止
- **共有URL署名トークン**: 30日有効期限付きトークン
- **PDF署名埋め込み**: エクスポート元の正当性証明
- 入力値の検証（Zod）
- エラーハンドリング
- 画像アップロードのセキュリティ（認証済みユーザーのみ）

### 監査証跡
```typescript
interface AuditLog {
  entityType: 'car' | 'maintenance' | 'fuelLog' | 'customization' | 'user';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  actorUid: string;
  at: Timestamp;
  before?: any;  // 変更前データ
  after?: any;   // 変更後データ
}
```

## パフォーマンス

### Firestoreクエリ最適化
- **ページング実装**: カーソルベースのページネーション（limit付きクエリ）
  - cars: 50件/ページ
  - maintenance: 100件/ページ
  - fuelLogs: リアルタイムリスナーでlimit適用
- **複合インデックス設計**: 
  - carId + date + deletedAt
  - ownerUid + date + deletedAt
  - カテゴリ + ステータス + date
- **論理削除フィルタリング**: クエリレベルでdeletedAt除外

### クライアントサイド最適化
- リアルタイムデータ同期（onSnapshot）
- 効率的なクエリ設計
- クライアントサイドキャッシュ
- **画像圧縮**: 最長辺1600px、品質85%、最大800KB
- Firebase Storageの最適化されたアップロード
- **OCR Web Worker化**: メインスレッドをブロックしない非同期処理
- **IndexedDBキャッシュ**: traineddataのローカルキャッシュ

## プレミアム機能（月額480円 / 年額4,800円）

### 無料プランの制限
- **車両登録**: 1台まで（2台目以降はプレミアム必須）
- **OCRスキャン**: 利用不可 🔒
- **PDFエクスポート**: 利用不可
- **履歴共有URL**: 利用不可
- **リマインダー**: 車両あたり5件まで
- **スヌーズ**: 3回まで
- **広告**: 表示あり

### プレミアム機能（主要4機能）
1. **複数車両登録**: 無制限の車両を登録・管理
2. **OCRスキャン**: レシート・保険証券を自動読み取り 🎯
3. **PDFエクスポート**: 全車両の履歴書生成
4. **履歴共有URL**: 署名付き安全な共有リンク

### プレミアム機能（追加）
- **高度なリマインダー**: 無制限、走行距離ベースの推定表示
- **スヌーズ無制限**: リマインダーのスヌーズ回数制限なし
- **領収書自動保存**: OCRスキャン結果の自動保存
- **自動次回予定登録**: メンテナンス完了時に次回を自動設定
- **複数候補レコメンド**: オイル交換時に複数の商品候補
- **フィルター同時表示**: 複数フィルタの組み合わせ
- **詳細データ分析**: 高度な統計レポート
- **優先サポート**: 優先的なカスタマーサポート
- **広告非表示**: アプリ内広告の非表示

### ペイウォールUI
- **3つのvariant**: 
  - `default`: 標準的なペイウォール（全機能表示）
  - `minimal`: シンプルな1機能訴求
  - `hero`: 大きなヒーロー訴求
- **A/Bテスト対応**: variant切り替えによる効果測定
- **インライン訴求**: 車両管理画面での自然なアップグレード誘導
- **機能制限時の表示**: 利用不可機能へのアクセス時にペイウォール表示

### 課金転換ファネル追跡
```typescript
// アナリティクスイベント
- paywall_shown: ペイウォール表示
- paywall_click: アップグレードボタンクリック
- subscribe_started: 購読開始
- subscribe_success: 購読成功
- subscribe_failed: 購読失敗
```

## 実装済み機能

### コア機能
- ✅ 車両管理（CRUD）
  - ✅ TypeaheadCarSelectorによる車種選択
  - ✅ 画像アップロード（Firebase Storage）
  - ✅ デフォルト画像選択
- ✅ 給油記録（CRUD）
  - ✅ **OCR機能**: レシート自動読み取り（Tesseract.js）
  - ✅ 給油量・金額・L価格の自動抽出
  - ✅ 小数点第1位制限
  - ✅ 燃料種別（レギュラー・ハイオク・軽油・EV充電）
  - ✅ スタンド名記録
  - ✅ 燃費自動計算
- ✅ メンテナンス記録（CRUD）
  - ✅ フィルター機能（車両、カテゴリ、ステータス、検索）
  - ✅ 並び替え機能
  - ✅ 走行距離整合性チェック
  - ✅ 明細行・添付ファイル対応（データモデル準備済み）
- ✅ カスタマイズ記録（CRUD）
  - ✅ 複数カテゴリ選択
  - ✅ ステータス管理
  - ✅ 費用内訳（部品代・工賃・その他）

### データ管理・エクスポート
- ✅ データエクスポート（CSV、JSON、PDF）
  - ✅ エクスポート機能の統合（データページに集約）
  - ✅ **PDF署名埋め込み**: HMAC-SHA256署名
  - ✅ **共有URL署名トークン**: 30日有効期限
  - ✅ 改ざん防止・真正性証明
- ✅ クライアントサイド画像圧縮（1600px、85%品質、最大800KB）
- ✅ 進捗監視付きアップロード
- ✅ アフィリエイトリンク生成

### プレミアム機能・収益化
- ✅ **ペイウォールUI**
  - ✅ 3つのvariant（default, minimal, hero）
  - ✅ 車両数制限チェック（無料: 1台、プレミアム: 無制限）
  - ✅ PDF/共有機能の制限
  - ✅ インライン訴求（車両管理画面）
- ✅ **課金転換ファネル追跡**
  - ✅ アナリティクスイベント実装
  - ✅ paywall_shown, paywall_click, subscribe_*

### パフォーマンス・セキュリティ
- ✅ **Firestoreページング**
  - ✅ limit付きクエリ（cars: 50件、maintenance: 100件）
  - ✅ 複合インデックス設計（firestore.indexes.json）
  - ✅ カーソルベースのページネーション基盤
- ✅ **データ整合性・監査**
  - ✅ 論理削除（deletedAt）
  - ✅ 所有権フィールド（ownerUid, createdBy, updatedBy）
  - ✅ 監査ログ（Audit Log）
  - ✅ データ型統一（inspectionExpiry: Date型）
- ✅ **OCR最適化**
  - ✅ Web Worker基盤実装
  - ✅ IndexedDBキャッシュ機能
  - ✅ オフライン対応準備

### UI/UX改善
- ✅ 統一された追加ボタン（+ アイコン）
- ✅ CustomizationModalのcontrolled/uncontrolledエラー修正
- ✅ **リマインダー機能強化**
  - ✅ avgKmPerMonthによる推定日数表示
  - ✅ 車検期限の推定走行距離表示
- ✅ 通知設定
- ✅ 保険管理
- ✅ データバリデーション（Zod）

## 実装予定機能
- 🔄 メンテナンス記録のOCR機能（費用・日付・店舗名の読み取り）
- 🔄 OCR WorkerのFuelLogModalへの完全統合
- 🔄 決済システム統合（Stripe/PayPal）
- 🔄 共有URL閲覧ページの実装
- 🔄 署名検証ページの実装
- 🔄 サムネイル生成（Cloud Functions）
- 🔄 複合インデックスの作成（Firebase Console）

## 開発・運用
- Git によるバージョン管理
- **最新コミット**: ee29998（高影響度改善実装）
- 開発環境でのテストデータ対応
- 本番環境でのFirebase設定
- ESLint設定（警告レベルでの開発）
- TypeScript型安全性の確保

## 技術的改善
- ✅ Zodスキーマによるバリデーション
- ✅ 型安全なイベント追跡システム（アナリティクス）
- ✅ 証明性データ生成（ハッシュ化、署名）
- ✅ プレミアム機能ガード（usePremiumGuard）
- ✅ メニュー名称の最適化
- ✅ データモデル拡張（BaseEntity、論理削除、監査）
- ✅ パフォーマンス最適化（ページング、インデックス）
- ✅ セキュリティ強化（署名トークン、監査ログ）

## 新規作成ファイル（v1.4.0）
- `src/lib/signatureToken.ts`: エクスポート署名システム
- `src/lib/firestorePagination.ts`: ページネーション機能
- `src/lib/ocrWorker.ts`: OCR Web Worker基盤
- `src/lib/auditLog.ts`: 監査ログシステム
- `src/lib/analytics.ts`: アナリティクスイベント追跡
- `src/components/modals/PaywallModal.tsx`: ペイウォールUI
- `src/hooks/usePremium.ts`: プレミアム機能フック
- `firestore.indexes.json`: 複合インデックス定義

---

## OCR機能の技術詳細

### 給油レシートOCR
#### 対応パターン
```typescript
// 給油量の抽出パターン
/(\d+\.?\d*)\s*[LℓＬ]/i
/(\d+\.?\d*)\s*リットル/i
/数量.*?(\d+\.?\d*)/i

// 金額の抽出パターン
/合計.*?[¥￥]?\s*(\d{1,3}(?:,?\d{3})*)/i
/金額.*?[¥￥]?\s*(\d{1,3}(?:,?\d{3})*)/i
/[¥￥]\s*(\d{1,3}(?:,?\d{3})*)/
/(\d{1,3}(?:,?\d{3})*)\s*円/

// L価格の抽出パターン
/単価.*?[¥￥]?\s*(\d+\.?\d*)/i
/(\d+\.?\d*)\s*円\s*[/／]\s*[LℓＬ]/i
/[LℓＬ]\s*[¥￥]?\s*(\d+\.?\d*)/i
```

#### 処理フロー
1. 画像ファイルの読み込み（カメラ or ファイル選択）
2. Tesseract.jsによるOCR処理（日本語+英語）
3. 正規表現による数値抽出
4. バリデーション（妥当性チェック）
5. フォームへの自動入力
6. ユーザーによる確認・修正

#### 精度向上策
- 複数パターンマッチング
- フォールバック処理
- 金額と給油量からL価格を自動計算
- 小数点第1位での四捨五入

### 将来のOCR拡張（メンテナンス記録）
- 費用（合計金額）
- 作業日（日付）
- 店舗名/作業場所
- 走行距離（オプション）
- 作業内容の推定（オプション）

*最終更新: 2025年11月1日*
## 画像管理機能の詳細

### Firebase Storage統合
- **認証ベースのアクセス制御**: ユーザーごとのディレクトリ分離
- **セキュアなアップロード**: 認証済みユーザーのみアクセス可能
- **進捗監視**: リアルタイムアップロード進捗表示
- **タイムアウト処理**: 30秒のタイムアウト設定
- **エラーハンドリング**: アップロード失敗時の適切な処理

### クライアントサイド画像処理
- **自動圧縮**: アップロード前の画像最適化
- **品質調整**: ファイルサイズと画質のバランス
- **形式変換**: 最適な画像形式への変換
- **プレビュー機能**: アップロード前の画像確認

### ストレージ構造
```
users/{userId}/cars/{carId}/{timestamp}_{filename}
users/{userId}/temp/{timestamp}_{filename}  // 一時ファイル
```

## バージョン履歴

### v1.5.0 (2025-11-02) 🎯
**OCR機能のプレミアム化＆保険管理強化**

#### OCR機能の収益化
- **プレミアム化**: OCRスキャン機能を有料化
  - 給油レシートスキャン 🔒
  - 保険証券スキャン 🔒
  - 無料ユーザー → ペイウォール表示
- **主要機能に昇格**: ペイウォールの1番目に表示
- **課金誘導**: minimal variantで効果的な訴求

#### 保険管理の大幅強化
- **データモデル拡張**: 20以上のフィールド追加
  - 契約者情報、車両詳細、分割払い情報
  - ノンフリート等級、割引情報（配列）
  - 補償詳細（搭乗者傷害、弁護士特約等）
- **OCR抽出強化**: 
  - 商品名、契約者氏名、ナンバー、車台番号
  - 等級、分割払い（初回・2回目以降・回数）
  - 割引8種類の自動検出
- **実際の保険証券対応**: ソニー損保形式を参考に設計

#### OCR精度向上
- **画像前処理2段階**:
  - imagePreprocessor: 基本的な前処理
  - imageEnhancer: 保険証券特化の高度処理
- **3倍アップスケール**: 小さい文字対策
- **シャープネスフィルタ**: 3x3カーネルでエッジ強調
- **適応的ヒストグラム平坦化**: コントラスト自動最適化
- **日本語特化設定**: Tesseract.js（jpn言語）

#### UX改善
- 🔒アイコンでプレミアム機能を明示
- 読み取り結果の詳細表示（展開可能）
- 撮影ガイドの強化
- 手動入力推奨の案内

#### 新規ファイル
- src/lib/imageEnhancer.ts: 高度な画像強化
- src/lib/imagePreprocessor.ts: 基本的な前処理

### v1.4.0 (2025-11-02) 🎉
**高影響度改善の実装**

#### 収益化・ビジネス
- **ペイウォールUI**: 3つのvariant（default, minimal, hero）でA/Bテスト対応
- **車両数制限**: 無料プラン1台、プレミアムプラン無制限
- **課金転換ファネル追跡**: アナリティクスイベント実装
- **インライン訴求**: 車両管理画面でのアップグレード誘導

#### セキュリティ・データ保護
- **エクスポート署名**: HMAC-SHA256ベースの改ざん防止
- **共有URL署名トークン**: 30日有効期限付き安全な共有
- **PDF署名埋め込み**: エクスポート元の正当性証明
- **監査ログ**: 全データ操作の追跡（create/update/delete）
- **論理削除**: deletedAtによる安全なデータ削除

#### パフォーマンス最適化
- **Firestoreページング**: limit付きクエリ（cars: 50件、maintenance: 100件）
- **複合インデックス設計**: firestore.indexes.jsonによる定義
- **OCR Web Worker基盤**: メインスレッドをブロックしない非同期処理
- **IndexedDBキャッシュ**: traineddataのローカルキャッシュ

#### データモデル拡張
- **BaseEntity**: 所有権・監査フィールドの統一
- **FuelLog拡張**: fuelType, stationName, unit追加
- **MaintenanceRecord拡張**: 明細行・添付ファイル対応
- **データ型統一**: inspectionExpiryをDate型に統一

#### UI/UX改善
- **リマインダー強化**: avgKmPerMonthによる推定日数表示
- **車検期限表示**: 推定走行距離の表示
- **画像圧縮最適化**: 1600px、85%品質、最大800KB

#### 新規ファイル（8個）
- `src/lib/signatureToken.ts`
- `src/lib/firestorePagination.ts`
- `src/lib/ocrWorker.ts`
- `src/lib/auditLog.ts`
- `src/lib/analytics.ts`
- `src/components/modals/PaywallModal.tsx`
- `src/hooks/usePremium.ts`
- `firestore.indexes.json`

### v1.3.0 (2025-11-01)
- **新機能**: 給油記録のOCR機能（レシート自動読み取り）
- **UI改善**: 統一された追加ボタン、エクスポート機能統合
- **バグ修正**: CustomizationModalエラー修正

### v1.2.0 (2025-09)
- **新機能**: 画像アップロード機能（Firebase Storage統合）
- **新機能**: クライアントサイド画像圧縮

### v1.1.0
- 基本的な車両管理・メンテナンス記録機能

**最新バージョン: 1.5.0**  
**コミットID: 075b106**
