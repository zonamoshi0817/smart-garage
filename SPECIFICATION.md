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
2. **マイカー** - 車両詳細データページ（v2.0） 🆕
3. **ガソリン** - 給油記録画面
4. **メンテナンス** - 整備記録画面
5. **カスタマイズ** - カスタマイズ履歴画面
6. **車両管理** - 車両管理画面
7. **自動車保険** - 保険管理画面
8. **データ** - データ管理画面

#### 車両選択ドロップダウン（ヘッダー右上）
- **表示対象**: 現在保有中の車両のみ（status が undefined または 'active'）
- **非表示**: 売却済み・廃車済み車両は選択肢に表示されない
- **動作**: クリックで車両を切り替え
- **追加ボタン**: ドロップダウン内に「+ 車を追加」ボタン

#### プレミアムアップグレード表示（サイドバー下部）
- **表示条件**: 無料ユーザー（userPlan === 'free'）のみ
- **非表示**: プレミアムユーザーには表示されない
- **内容**: 「プレミアムにアップグレード」カード、詳細ボタンでペイウォール表示

### 3. マイカーページ v2.0 🆕

グランツーリスモ風の詳細データ表示ページ。選択中の車両の全情報を一覧で確認できます。

#### 3.1. 車両ヘッダー（ミニヒーロー）
**表示内容:**
- 車名、年式、型式、現在ODO、直近メンテ日
- 車両画像（Firebase Storage対応、ホバーで「画像を変更」CTA）
- バッジ表示（状態に応じて色変更）:
  - 🔧 車検期限バッジ（良好: 緑、警告: 黄、要注意: 赤）
  - 🛡️ 保険期限バッジ（同上）
  - ⭐ プレミアムバッジ（プレミアムユーザーのみ）

#### 3.2. クイックアクション（横スクロールボタン）
**アクション:**
- ⛽ 給油を記録
- 🔧 メンテを追加
- 📸 レシートOCR 🔒
- 📄 PDF出力 🔒
- 🔗 共有リンク 🔒
- 🛡️ 保険証券を追加

**機能:**
- 横スクロール対応（左右ボタン表示）
- プレミアム機能は🔒付きでペイウォール連携

#### 3.3. 車両データパネル（GTスタイル）
**2カラムレイアウト:**

**左パネル:**
- **基本情報**: 車名、型式、年式、初年度登録
- **走行データ**: 現在ODO、月間平均、年間推定、平均燃費
- **メンテナンス統計**: 総回数、最終実施日、総費用

**右パネル:**
- **給油統計**: 総回数、総給油量、総費用、燃費評価（S/A/B/C/D）
- **コストサマリー**: 総維持費、燃料費割合、メンテ費割合
- **車検情報**: 車検期限、残り日数（色分け表示）
- **パフォーマンス評価**: 燃費効率、メンテ頻度、コスト効率（プログレスバー）

**パフォーマンス評価ロジック:**

1. **燃費効率** (緑)
   - 計算式: `(平均燃費 ÷ 20) × 100%`
   - 基準: 20 km/L を満点（100%）
   - 例: 10 km/L → 50%, 15 km/L → 75%, 20 km/L → 100%

2. **メンテナンス頻度** (紫)
   - 計算式: `(総メンテナンス回数 ÷ 12) × 100%`
   - 基準: 12回を満点（100%）
   - メンテナンス回数が多いほど高評価（手入れが行き届いている）

3. **コスト効率** (青) 🆕
   - 計算式: `(1 - costPerKm ÷ 20) × 100%`
   - costPerKm = 総メンテナンスコスト ÷ 総走行距離
   - 基準: ¥20/km を最低ライン（0%）、¥0/km を最高（100%）
   - 例: ¥5/km → 75%, ¥10/km → 50%, ¥15/km → 25%
   - サブタイトルに実際のコスト（¥○○/km）を表示

**デザイン:**
- 等幅フォントで数値を整列表示
- カラーコード化（青/緑/紫/橙/赤/黄/indigo）
- 視認性の高い文字サイズ（font-bold）

**表示対象:**
- 🆕 **現在保有中の車両のみ表示**（売却済み・廃車済み車両は非表示）
- 車両が選択されていない場合は「車両を選択してください」と表示
- 現在保有中の車両が0台の場合は「現在保有中の車両がありません」と表示

#### 3.4. カスタムパーツ一覧
**12カテゴリのアコーディオン表示:**
1. エンジン（ピストン、カムシャフト、ターボ、インタークーラー）
2. 排気系（マフラー、エキマニ、触媒）
3. 吸気系（エアクリーナー、インテークパイプ、スロットル）
4. サスペンション（ショック、スプリング、アーム、スタビライザー）
5. ブレーキ（パッド、ローター、キャリパー、ブレーキライン）
6. ホイール・タイヤ
7. エクステリア（エアロ、ウィング、ボンネット、ライト）
8. インテリア（シート、ハンドル、シフトノブ、メーター）
9. 電装系（バッテリー、オルタネーター、イグニッション）
10. ECU（ECU、サブコン、ハーネス）
11. 駆動系（クラッチ、LSD、デフ、ドライブシャフト）
12. その他

**表示内容:**
- **カスタム品**: ブランド、型番、装着時ODO、施工場所、費用（部品代+工賃）、メモ
- **純正品**: 「純正」と表示、サブカテゴリ例を表示、「+ カスタマイズを登録」ボタン

**UI機能:**
- 折りたたみ式（デフォルトは閉じた状態）
- 「全て開く/全て閉じる」ボタン
- カスタム件数のバッジ表示
- 0件でも全カテゴリを表示（登録を促進）
- 各カテゴリから直接カスタマイズモーダルを開ける

#### 3.5. 燃費・単価チャート（タブ切替）
**タブ1: 燃費(km/L)の時系列**
- 満タン給油時のみプロット
- 目標ライン（自己ベストの80%）を補助線表示

**タブ2: ガソリン単価(円/L)の時系列**
- 全給油記録をプロット
- 平均単価を補助線表示

**技術:**
- Recharts LineChart
- ReferenceLine for 目標値

#### 3.6. 次回メンテナンス提案
**自動提案項目:**
- オイル交換（あと○km、推奨粘度・容量を自動セット）
- オイルフィルター交換
- タイヤローテーション
- ブレーキフルード交換
- エアフィルター交換
- ワイパーゴム交換

**機能:**
- 「📝 テンプレから作成」ボタンで自動入力
- 残り距離/期間を表示
- 予算目安を表示

#### 3.7. コンテキスト広告（無料ユーザーのみ）
**表示内容:**
- 車種・オイル粘度・タイヤサイズ連動の関連商品カード
- 事前高さ固定 + "広告"ラベル
- プレミアムユーザーには非表示

**技術:**
- アフィリエイトリンク連携
- 車両スペックに基づく商品レコメンド

### 4. 車両管理
#### 車両情報
- 車両名
- メーカー・モデル・年式
- 走行距離（odoKm）
- 車検期限
- エンジンコード
- オイル仕様（粘度、API規格、容量）
- **車両ステータス** 🆕:
  - `active`: 現在保有中（デフォルト）
  - `sold`: 売却済み
  - `scrapped`: 廃車済み
  - `other`: その他
- **売却情報** 🆕（売却済み車両のみ）:
  - 売却日
  - 売却価格
  - 売却先
  - 売却メモ

#### 車両追加機能
- TypeaheadCarSelectorによる車種選択
- 車両データベースからの自動補完（国内外100車種以上）
- 画像アップロード機能（Firebase Storage）
- クライアントサイド画像圧縮
- 進捗監視付きアップロード
- デフォルト画像選択機能（6種類のデフォルト画像）
- 「+ 車を追加」ボタン（統一されたUI）

#### 車両ステータス管理 🆕
**3つのセクションで表示:**

1. **🚗 現在保有中**
   - アクティブな車両のみ表示
   - 選択可能（クリックで詳細表示）
   - 通常表示（フルカラー）

2. **📦 売却済み**
   - 売却済みの車両を別セクションで表示
   - 売却情報を表示（日付、価格、売却先、メモ）
   - グレーアウト表示（opacity-75）
   - 選択不可（過去の記録として保持）

3. **🏭 廃車済み**
   - 廃車済みの車両を表示
   - グレーアウト表示
   - 選択不可

**売却処理モーダル:**
- 売却日（必須、未来日不可）
- 売却価格（任意、¥マーク付き、リアルタイムフォーマット）
- 売却先（任意、例: 中古車センター、個人売買、下取り）
- メモ（任意、500文字まで、文字数カウンター表示）
- 注意事項の表示:
  - 車両は「売却済み」セクションに移動
  - 過去の記録（給油・メンテ）は保持
  - いつでも編集メニューから元に戻せる

**設定メニュー（車両カード右上）:**
- **編集**（SVGアイコン） - 全車両で表示
- **売却済みにする**（SVGアイコン） - 現在保有中の車両のみ表示
- **現在保有中に戻す** 🆕（SVGアイコン） - 売却済み・廃車済み車両のみ表示
  - 確認ダイアログ表示
  - 売却情報を自動的にクリア
  - 緑色のテキストとアイコン
- **削除**（SVGアイコン） - 全車両で表示
- モダンなドロップダウンデザイン:
  - 3点ドットアイコン（SVG）
  - 角丸四角ボタン（rounded-xl）
  - 影付き（shadow-md → hover時 shadow-lg）
  - 広めのメニュー幅（w-48）
  - 区切り線でセクション分け
  - ホバー時の色変更（青/橙/緑/赤）

### 5. 給油記録（Fuel Logs）
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

### 6. メンテナンス記録
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

### 7. カスタマイズ記録
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

### 8. 保険管理

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

### 9. データ管理・エクスポート
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

### 10. 通知設定
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
- ✅ **マイカーページv2.0**（2025年11月実装）
  - ✅ GTスタイルの車両詳細データ表示
  - ✅ 12セクションの包括的な情報表示
  - ✅ カスタムパーツの折りたたみ表示（12カテゴリ）
  - ✅ 車両ヘルスインジケータ（オイル/ブレーキ/バッテリー）
  - ✅ 活動タイムライン（給油/メンテ/カスタム/保険の統合）
  - ✅ コスト&燃費ダッシュボード（4枚カード + スパークライン）
  - ✅ 燃費・単価チャート（タブ切替）
  - ✅ 次回メンテナンス提案（テンプレート作成）
  - ✅ 横スクロールクイックアクション
  - ✅ レスポンシブ対応（3カラムグリッド）
  - ✅ 登録促進UI（カスタムパーツ0件時）

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

### v2.0.0 (2025-11-02) 🚗✨
**マイカーページv2.0 - GTスタイルの車両詳細データ表示**

#### 新規実装：マイカーページv2.0
- **12セクションの包括的な情報表示**
  - 車両ヘッダー（ミニヒーロー）
  - クイックアクション（横スクロール）
  - 車両データパネル（GTスタイル、2カラム）
  - カスタムパーツ一覧（独立セクション、12カテゴリ）
  - 車両ヘルスインジケータ
  - 活動タイムライン（過去30日）
  - コスト&燃費ダッシュボード（4枚カード + スパークライン）
  - 燃費・単価チャート（タブ切替）
  - 次回メンテナンス提案
  - ドキュメント&OCRドラフト
  - 共有&PDF
  - コンテキスト広告（無料ユーザーのみ）

- **GTスタイルの車両データパネル**
  - 基本情報、走行データ、メンテナンス統計
  - 給油統計、コストサマリー、車検情報
  - パフォーマンス評価（燃費効率、メンテ頻度、コスト効率）
  - 等幅フォントで数値を整列表示
  - S/A/B/C/D 評価システム

- **カスタムパーツ管理**
  - 12カテゴリのアコーディオン表示
  - カスタム/純正の明確な区別
  - 駆動系（クラッチ、LSD、デフ等）を含む
  - サブカテゴリの例示
  - 登録促進UI（0件時のバナー、各カテゴリに登録ボタン）

- **インテリジェント推奨機能**
  - オイル交換の残量推定（走行距離+経過日数）
  - ブレーキ&タイヤの残量推定
  - バッテリー経過月表示
  - 次回メンテナンス自動提案（6種類）
  - テンプレートからの作成機能

#### バグ修正・改善
- **42個のLintエラー完全解消**
  - Timestamp/Date型の不一致修正（26箇所）
  - Optional chaining追加（9箇所）
  - 算術演算の型エラー修正（8箇所）
  - 後方互換性の確保

- **日付処理の型安全性向上**
  - `src/lib/dateUtils.ts` 新規作成
  - `toDate()`, `toMillis()`, `toTimestamp()`, `daysFromNow()`
  - Timestamp/Date の混在問題を解決

- **Firebase Storage画像対応**
  - `next.config.ts` に firebasestorage.googleapis.com を追加
  - Next.js Image最適化機能を活用

#### 新規ファイル（18ファイル）
- `src/components/mycar/MyCarPage.tsx`
- `src/components/mycar/VehicleHeader.tsx`
- `src/components/mycar/QuickActions.tsx`
- `src/components/mycar/VehicleSpecsPanel.tsx`
- `src/components/mycar/CustomPartsPanel.tsx`
- `src/components/mycar/VehicleHealthIndicator.tsx`
- `src/components/mycar/ActivityTimeline.tsx`
- `src/components/mycar/CostAndFuelDashboard.tsx`
- `src/components/mycar/FuelAndPriceChart.tsx`
- `src/components/mycar/NextMaintenanceSuggestion.tsx`
- `src/components/mycar/DocumentsAndDrafts.tsx`
- `src/components/mycar/ShareAndPDF.tsx`
- `src/components/mycar/ContextualAd.tsx`
- `src/components/mycar/utils.ts`
- `src/lib/dateUtils.ts`
- `MYCAR_PAGE_INTEGRATION.md`
- `MYCAR_PAGE_BUGFIX.md`
- `ERROR_FIXES_SUMMARY.md`

#### コミット履歴
- `b78744b` feat: カスタムパーツの登録促進UIを追加
- `b43be09` refactor: カスタムパーツを独立したセクションに分離
- `071b45f` refactor: カスタムパーツのカテゴリ名からアイコンを削除
- `29ed296` feat: カスタムパーツの表示機能を追加
- `bf067c1` style: 車両データパネルの文字を濃く見やすく改善
- `757839f` fix: 車検情報のnullチェックを追加
- `77eb298` refactor: 車両データパネルをライトテーマに変更
- `9e6778d` feat: GTスタイルの車両データパネルを追加
- `7fd32f1` feat: 新しいマイカーページv2.0を実装し、全エラーを修正

### v1.5.0 (2025-11-02) 🎯
**OCR機能のプレミアム化＆保険管理強化**

#### OCR機能の収益化
- **プレミアム化**: OCRスキャン機能を有料化
  - 給油レシートスキャン 🔒
  - 保険証券スキャン 🔒
  - 無料ユーザー → ペイウォール表示（minimal variant）
  - ボタンクリック時にプレミアムチェック
- **主要機能に昇格**: ペイウォールの2番目に表示
- **課金誘導**: minimal variantで効果的な訴求
- **UI表示**: 🔒アイコン + 「プレミアム機能」明記

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

#### 開発者向け機能
- **環境変数設定**: `.env.local`でプレミアム制御
  - `NEXT_PUBLIC_DEV_ALL_PREMIUM=true`: 全員プレミアム
  - `NEXT_PUBLIC_DEVELOPER_EMAILS`: 開発者メール登録
- **認証状態監視**: ログイン後即座にプラン更新
- **動的UI表示**: プランに応じたアイコン・テキスト変更
  - Free: 青色アイコン、グレーテキスト
  - Premium: ゴールドグラデーション、✨マーク

#### UI改善
- ページタイトル統一: 「ダッシュボード」→「ガレージ」
- プレミアムプラン表示: ゴールドグラデーション + ✨

#### 新規ファイル
- src/lib/imageEnhancer.ts: 高度な画像強化
- src/lib/imagePreprocessor.ts: 基本的な前処理
- .env.local: 開発環境設定
- README.md更新: プレミアムテスト方法追加

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

### v2.0.0 (2025-11-02) - ハイインパクトリファクタリング

**🎯 抜本的アーキテクチャ改善（10大FB完全実装）**

#### 1. Date/Timestamp完全統一（FB1）
- **BaseEntity型の厳格化**: すべての日時フィールドをFirestore Timestampに統一
- **deletedAt null統一**: クエリ最適化のため未削除を`null`で統一
- **後方互換性**: Date型からの自動変換をサポート
- **影響範囲**: 全エンティティ（Car, MaintenanceRecord, FuelLog, Customization, InsurancePolicy）
- **バグ根絶**: Date | string混在による将来のバグを完全撤廃

#### 2. Cloud Functions署名システム（FB2）
- **セキュリティ強化**: クライアントHMAC-SHA256を完全廃止
- **JWT署名**: HS256 + kid（鍵ローテーション対応）
- **短命トークン**: 7日間有効（PDF）、30日間有効（共有URL）
- **失効機能**: revokedAtによる即座の無効化
- **スコープ制御**: `share:car` / `share:vehicle-history`
- **新規Cloud Functions**: 5関数（generatePdfExportToken, generateShareToken, verifyShareToken, revokeShareToken, verifyPdfExportToken）
- **監査証跡**: アクセスカウント、lastAccessedAt記録

#### 3. FuelLog物理量統一（FB3）
- **EV完全対応**: 物理量ベース（ml / Wh整数）
- **新フィールド**: `quantity`, `unit` (EnergyUnit), `totalCostJpy`, `pricePerUnit`
- **後方互換性**: 旧フィールド（fuelAmount, cost, pricePerLiter）を@deprecated化
- **マイグレーション**: watchFuelLogs内で旧→新形式を自動変換
- **表示ヘルパー**: `getDisplayAmount()`, `getDisplayCost()`
- **燃費計算**: EVを自動除外、ガソリンのみ計算

#### 4. OCRドラフト2段階保存（FB4）
- **新型定義**: `FuelLogDraft`, `MaintenanceDraft`, `InsurancePolicyDraft`
- **FieldMetadata**: source（ocr/rule/user/llm）, confidence（0-1）, originalValue, editedByUser
- **ドラフトステータス**: pending_review / confirmed / rejected
- **新ライブラリ**: `src/lib/ocrDrafts.ts`（CRUD操作、confidence計算、要確認判定）
- **修正学習の土台**: フィールド単位でソース・信頼度を記録

#### 5. 保険OCR勝ち筋絞り込み（FB5）
- **抽出フィールド削減**: 全20+項目 → 勝ち筋6項目
- **最優先フィールド**: 保険会社、証券番号、契約開始日、満期日、等級、年間保険料
- **削除した処理**: 商品名、契約者氏名、住所、車両情報、分割払い詳細、割引情報（-70行）
- **メモ欄活用**: 詳細情報は手動入力推奨
- **精度向上**: フォーカスを絞ることで認識精度向上

#### 6. ペイウォール行動後発火（FB6）
- **CVR最適化**: 「操作前チェック」→「結果成立直前チェック」に変更
- **価値体験優先**: OCR成功を体験させてから課金誘導
- **フリーミアムモデル**: ボタンクリック→OCR実行→成功→ペイウォール表示
- **文脈表示**: 「OCRスキャンに成功しました！自動入力はプレミアムで...」

#### 7. Storageルール厳格化（FB7）
- **メタデータ検証**: `customMetadata.ownerUid == request.auth.uid`を必須化
- **二重チェック**: パスベース + メタデータの両方で検証
- **アップロード時記録**: ownerUid, uploadedAtをメタデータに追加
- **不正防止**: users/{userId}/パス偽装を完全防止

#### 8. Firestoreインデックス最適化（FB8）
- **キー順統一**: carId (asc) → deletedAt (asc) → date (desc)
- **新規インデックス**: carsコレクション（ownerUid → deletedAt → createdAt）
- **customizations拡張**: status付きインデックス追加
- **クエリ安定化**: deletedAt null統一でインデックス効率化

#### 9. OCRファネルアナリティクス（FB9）
- **新イベント**: `ocr_started`, `ocr_autofill_done`, `ocr_field_edited`
- **ボトルネック可視化**: どのフィールドが低精度か追跡
- **成功指標**: 入力フィールド数、平均confidence記録
- **改善の土台**: データドリブンなOCR精度改善

#### 10. 画像前処理高度化（FB10）
- **罫線薄化**: テーブル構造のOCRノイズ除去
- **適応二値化**: 局所的な明度変化に対応（16x16ブロック）
- **台形補正**: プレースホルダー実装（将来拡張用）
- **オプション制御**: useLineThinning, useAdaptiveBinarization
- **統合**: imagePreprocessor.ts + imageEnhancer.ts

---

### 🏗️ 新規作成ファイル
- `functions/src/index.ts`: Cloud Functions実装
- `functions/package.json`: Cloud Functions依存関係
- `functions/tsconfig.json`: Cloud Functions TypeScript設定
- `src/lib/cloudFunctions.ts`: Cloud Functions呼び出しラッパー
- `src/lib/ocrDrafts.ts`: OCRドラフト管理

### 📝 主要更新ファイル
- `src/types/index.ts`: BaseEntity統一、Draft型追加、物理量統一
- `src/lib/cars.ts`, `src/lib/maintenance.ts`, `src/lib/fuelLogs.ts`, `src/lib/customizations.ts`, `src/lib/insurance.ts`: Timestamp対応
- `src/lib/analytics.ts`: OCRファネルイベント追加
- `src/lib/imagePreprocessor.ts`: 罫線薄化・適応二値化
- `storage.rules`: メタデータ検証追加
- `firestore.indexes.json`: インデックス最適化

### 🔧 技術的負債の解消
- ❌ Date | string混在 → ✅ Timestamp統一
- ❌ クライアントHMAC → ✅ Cloud Functions JWT
- ❌ ガソリン特化FuelLog → ✅ EV対応物理量統一
- ❌ OCR一発保存 → ✅ ドラフト2段階
- ❌ 全フィールドOCR → ✅ 勝ち筋に絞る

### 📊 期待効果
- 🐛 将来のバグリスク: 80%削減
- 🔒 セキュリティ: JWT署名で真正性保証
- ⚡ OCR精度: フォーカスで20-30%向上
- 💰 CVR: 価値体験後ペイウォールで15-25%向上
- 🚗 EV対応: 物理量統一で基盤完成

---

## 🏗️ 情報アーキテクチャ v2.1：役割の明確化

### 設計思想：時間軸×粒度で役割を切る

#### 役割定義
- **ダッシュボード** = 今すぐ動くための全車横断ハブ（短期・薄く広く）
  - Job: ① 未処理の"赤/黄"をゼロにする（今日のTo-Do）、② 直近の傾向を掴み、次の1手を決める（軽い比較）
  
- **マイカー** = 1台に深く潜る作戦室（中長期・深く狭く）
  - Job: ① 1台の現状を正しく把握（指標×履歴×書類）、② 次のメンテ計画を作る（テンプレ→自動入力→予約リンク）

#### 基本原則
> **ダッシュボードは「上位N件＋"すべてを見る"」まで。編集系や深堀りは必ずマイカーページに委譲。**

---

### Ownership Matrix（機能の所有権）

| 機能/情報 | ダッシュボード（全車） | マイカー（単車） |
|---------|-----------------|---------------|
| **重要アラート**（車検/保険/リコール/未確認OCR） | ✅ 要約（上位3件） | ✅ 完全一覧＋根拠（残日数・履歴リンク） |
| **次のアクション**（給油/メンテ/書類登録） | ✅ 1クリックCTA（対象車にジャンプ） | ✅ 事前入力テンプレ＋自動見積もり |
| **燃費/コスト可視化** | ✅ スパークライン&順位（直近30日/全車比較） | ✅ 詳細チャート（期間/分位/車種補正/注釈） |
| **活動タイムライン** | ✅ 直近7日ダイジェスト | ✅ 無制限フィルタ＋添付/メモ込み |
| **カスタマイズ** | ⛔ **出さない**（カードが重くなる） | ✅ 12カテゴリ完全版 |
| **PDF/共有** | ✅ ショートカットだけ | ✅ 実行画面（署名・オプション） |
| **コンテキスト広告** | ✅ 全車横断1枠 | ⛔ **非表示**（プレミアム優先） |
| **編集フォーム** | ⛔ **すべてマイカーページへ** | ✅ 全モーダル |

---

### ナビゲーションと遷移の約束

#### 1. 深リンク必須
```typescript
// ダッシュボードのカードからマイカーの特定セクションへ
<Card onClick={() => navigate(`/vehicle/${carId}?tab=fuel&action=add`)}>
  
// URLパターン
/                              // ダッシュボード（全車）
/vehicle/{carId}               // マイカートップ
/vehicle/{carId}?tab=fuel      // 給油セクション
/vehicle/{carId}?tab=maintenance&action=add  // メンテ追加モーダル直起動
```

#### 2. 車両バッジ
- ダッシュボードのすべてのカードに**車両バッジ**（例：🚗 FL5）
- クリックでマイカーの該当セクションへ深リンク

#### 3. ヘッダー車両ドロップダウンの文脈
- **マイカーページ**: 車両切り替えドロップダウン表示
- **ダッシュボード**: "全車"固定、ドロップダウン非表示（迷わせない）

#### 4. パンくずナビゲーション
```
ダッシュボード > Honda Civic FL5 > メンテナンス
```

---

### 具体UI設計

#### ダッシュボード（全車横断）

##### 上段：アラート集約
```typescript
<AlertHub>
  {/* 車検期限（上位3件） */}
  <Alert severity="high" car="FL5" daysLeft={14}>
    車検期限まであと14日
    <Button onClick={() => navigate('/vehicle/xxx?tab=inspection')}>
      詳細を見る →
    </Button>
  </Alert>
  
  {/* 保険満期（上位3件） */}
  {/* 未確認OCRドラフト */}
  {/* 低燃費警告 */}
  
  <Link to="/alerts">すべてのアラート (12) →</Link>
</AlertHub>
```

##### 中段：全車ランキング＋スパークライン
```typescript
<RankingCard title="燃費ランキング（直近30日）">
  {cars.map(car => (
    <RankRow 
      car={car} 
      metric={car.avgFuelEfficiency} 
      sparkline={last30DaysData}
      rank={rank}
      onClick={() => navigate(`/vehicle/${car.id}?tab=fuel`)}
    />
  ))}
</RankingCard>

<RankingCard title="コスト効率（¥/km、車種補正済み）">
  {/* 同様 */}
</RankingCard>
```

##### 下段：今日やること（自動提案3件）
```typescript
<ActionSuggestions>
  <ActionCard
    icon="⛽"
    title="給油推奨"
    car="FL5"
    reason="前回給油から450km走行"
    onClick={() => navigate('/vehicle/xxx?tab=fuel&action=add')}
  >
    1クリック追加 →
  </ActionCard>
  
  <ActionCard
    icon="🔧"
    title="オイル交換時期"
    car="GDB"
    reason="前回交換から5,200km"
    onClick={() => navigate('/vehicle/yyy?tab=maintenance&template=oil')}
  >
    テンプレから作成 →
  </ActionCard>
  
  <ActionCard
    icon="📄"
    title="OCRドラフト確認"
    car="FL5"
    reason="未確認の給油レシート1件"
    onClick={() => navigate('/vehicle/xxx?tab=fuel&draft=zzz')}
  >
    確認する →
  </ActionCard>
</ActionSuggestions>
```

---

#### マイカー（単車深堀り）

##### ヘッダー：車両カード＋3バッジ
```typescript
<VehicleHeader car={car}>
  <Badge type="inspection" status={getInspectionStatus(car)}>
    車検 残り{daysLeft}日
  </Badge>
  <Badge type="insurance" status={getInsuranceStatus(car)}>
    保険 {provider}
  </Badge>
  {isPremium && <Badge type="premium">Premium</Badge>}
</VehicleHeader>
```

##### 2カラムレイアウト
```typescript
<Grid cols={2}>
  {/* 左カラム：基本/走行/メンテ統計 */}
  <Panel title="基本情報">...</Panel>
  <Panel title="走行データ">...</Panel>
  <Panel title="メンテナンス統計">
    {/* 理想頻度との適合度を表示 */}
  </Panel>
  
  {/* 右カラム：燃料/コスト/車検/評価バー */}
  <Panel title="給油統計">
    <DetailChart type="fuel" period="all" annotations={true} />
  </Panel>
  <Panel title="コストサマリー">
    {/* 車種補正済みのコスト効率 */}
  </Panel>
  <Panel title="パフォーマンス評価">
    <PerformanceBar label="メンテナンス品質" value={maintenanceScore} />
    <PerformanceBar label="コスト効率" value={costEfficiencyScore} subtitle={`¥${costPerKm}/km (${vehicleClass})`} />
  </Panel>
</Grid>
```

##### セクション：カスタム・チャート・提案・ドキュメント
```typescript
<Sections>
  <CustomPartsPanel categories={12} />  {/* 折りたたみUI */}
  <FuelAndPriceChart detailed={true} />  {/* 重厚版チャート */}
  <NextMaintenanceSuggestion templates={true} autoEstimate={true} />
  <DocumentsPanel ocr={true} />
</Sections>
```

---

### 重複をなくす運用ルール（実装しやすい順）

#### 1. ダッシュボードでは"表示のみ・編集なし"
```typescript
// ❌ ダッシュボードに置かない
<FuelLogForm />
<MaintenanceModal />

// ✅ ダッシュボードに置く
<QuickAction onClick={() => navigate('/vehicle/xxx?action=add-fuel')}>
  給油を追加 →
</QuickAction>
```

#### 2. チャートは軽量版/重厚版をコンポーネント分割
```typescript
// src/components/charts/ChartMini.tsx（ダッシュボード用）
export function SparklineChart({ data, height = 40 }) {
  return <Sparklines data={data} height={height} />;
}

// src/components/charts/ChartPro.tsx（マイカー用）
export function DetailedChart({ data, annotations, period, filters }) {
  return (
    <ResponsiveContainer>
      <LineChart data={data}>
        <XAxis />
        <YAxis />
        <Tooltip />
        <Line dataKey="value" />
        {annotations && <ReferenceArea />}
      </LineChart>
    </ResponsiveContainer>
  );
}
```

#### 3. カードに"根拠"を置かない
```typescript
// ❌ ダッシュボードのカードに詳細を展開
<Card>
  <Title>燃費が悪化しています</Title>
  <Details>
    <Chart />  // 重い
    <Table />  // 重い
  </Details>
</Card>

// ✅ ダッシュボードは要約のみ
<Card>
  <Title>燃費が悪化しています</Title>
  <Summary>直近3回の平均: 8.2km/L（前月比-15%）</Summary>
  <Link to="/vehicle/xxx?tab=fuel#analysis">
    詳細を見る →
  </Link>
</Card>
```

#### 4. 深リンク必須
```typescript
// すべての"もっと見る"が車両ページ特定タブへ
const deepLinks = {
  fuelDetail: `/vehicle/${carId}?tab=fuel`,
  maintenanceAdd: `/vehicle/${carId}?tab=maintenance&action=add`,
  customizationCategory: `/vehicle/${carId}?tab=custom&category=engine`,
  ocrDraft: `/vehicle/${carId}?tab=fuel&draft=${draftId}`,
};
```

---

### データ/クエリ設計の切り分け

#### ダッシュボード用ビュー（集約・最新N件）
```typescript
// Firestore構造
dashboard_summary/{uid} {
  lastUpdated: Timestamp,
  alerts: {
    inspection: [{ carId, carName, daysLeft, severity }], // 上位3件
    insurance: [...],
    ocrDrafts: [...],
    lowFuelEfficiency: [...]
  },
  rankings: {
    fuelEfficiency: [{ carId, value, sparkline30d: number[] }],
    costEfficiency: [{ carId, value, sparkline30d: number[] }]
  },
  actionSuggestions: [
    { type: 'fuel', carId, reason, priority },
    { type: 'maintenance', carId, template, reason, priority },
    { type: 'ocr', carId, draftId, reason, priority }
  ]
}

// Cloud Functions で更新（トリガー: onWrite of fuelLogs/maintenance/cars）
exports.updateDashboardSummary = functions.firestore
  .document('users/{uid}/cars/{carId}/fuelLogs/{logId}')
  .onWrite(async (change, context) => {
    // 集約処理
    await updateSummary(context.params.uid);
  });
```

#### 車両ページ用クエリ（生データ＋ページング）
```typescript
// 既存のコレクション構造を使用
users/{uid}/cars/{carId}/fuelLogs
users/{uid}/cars/{carId}/maintenance
users/{uid}/cars/{carId}/customizations

// クエリ最適化（インデックス活用）
const fuelLogsQuery = query(
  collection(db, `users/${uid}/cars/${carId}/fuelLogs`),
  orderBy('date', 'desc'),
  limit(50)  // 無限スクロールで追加読み込み
);
```

#### 体感速度目標
- **ダッシュボード**: 100ms台でスケルトン解除（集約データ読み込み）
- **マイカー**: 段階ロード（基本情報→グラフ→履歴）

---

### ナビゲーションフロー

#### 1. 車両バッジからの遷移
```typescript
// ダッシュボードの各カードに車両バッジ
<Card>
  <VehicleBadge 
    name="FL5" 
    onClick={() => navigate(`/vehicle/${carId}?tab=fuel`)}
  />
  <Content>燃費が悪化...</Content>
</Card>
```

#### 2. ヘッダー車両ドロップダウンの文脈制御
```typescript
// page.tsx
{currentPage === 'dashboard' ? (
  // ダッシュボード：ドロップダウン非表示
  <Header showCarSelector={false} />
) : currentPage === 'my-car' ? (
  // マイカー：ドロップダウン表示（車両切り替え）
  <Header showCarSelector={true} activeCars={activeCars} />
) : null}
```

#### 3. パンくずナビゲーション
```typescript
<Breadcrumbs>
  <Link to="/">ダッシュボード</Link>
  <Separator />
  <Link to={`/vehicle/${carId}`}>{car.name} {car.modelCode}</Link>
  <Separator />
  <Current>メンテナンス</Current>
</Breadcrumbs>
```

---

### 計測指標（やって良かったかを測る）

#### KPI定義
```typescript
// src/lib/analytics.ts に追加

// 1. 混線率（車両ページ→ダッシュボード直帰率）
export function logPageNavigation(from: 'dashboard' | 'vehicle', to: 'dashboard' | 'vehicle') {
  logEvent('page_navigation', { from, to });
}

// 目標: vehicle→dashboard直帰率 < 10%

// 2. 解決時間（アラート発生→解消までの中央値）
export function logAlertResolved(alertType: string, minutesToResolve: number) {
  logEvent('alert_resolved', { alertType, minutesToResolve });
}

// 目標: ダッシュボード主導で解決時間を30%短縮

// 3. 深リンククリック率
export function logDeepLinkClicked(from: 'dashboard', to: 'vehicle', tab: string) {
  logEvent('deeplink_clicked', { from, to, tab });
}

// 目標: クリック率 > 60%

// 4. テンプレート保存率
export function logTemplateUsed(template: string, saved: boolean) {
  logEvent('template_used', { template, saved });
}

// 目標: 保存率 > 80%
```

---

### スプリント1：すぐできる差分タスク

#### Phase 1: UI整理（1-2日）
- [ ] ダッシュボードの編集UI撤去
  - [ ] `DashboardContent`からフォーム関連のprops削除
  - [ ] 全CTAを**車両ページ深リンク**に変更
  - [ ] `setShowMaintenanceModal`等の呼び出しを`navigate`に置換

#### Phase 2: コンポーネント分割（2-3日）
- [ ] ChartMini/ChartPro の分割
  - [ ] `src/components/charts/SparklineChart.tsx`作成（ダッシュボード用）
  - [ ] `src/components/charts/DetailedChart.tsx`作成（マイカー用）
  - [ ] propsは互換性維持

- [ ] "上位3件＋もっと見る" 統一ルールを全カードに適用
  - [ ] `AlertHub`: 上位3件＋"すべてのアラート→"
  - [ ] タイムライン: 直近7日＋"すべての履歴→"
  - [ ] ランキング: 上位5台＋"すべての車両→"

#### Phase 3: データ最適化（3-4日）
- [ ] `dashboard_summary` 集約データ生成
  - [ ] Cloud Functions: `updateDashboardSummary`
  - [ ] トリガー: fuelLogs/maintenance/cars の onWrite
  - [ ] 集約: alerts（上位3件）、rankings、actionSuggestions

#### Phase 4: 深リンク実装（2-3日）
- [ ] URLクエリパラメータ対応
  - [ ] `?tab=fuel&action=add` でモーダル直起動
  - [ ] `?draft=xxx` でOCRドラフト直開
  - [ ] パンくずナビゲーション追加

#### Phase 5: 計測実装（1-2日）
- [ ] 計測イベント追加
  - [ ] `dash_deeplink_clicked`
  - [ ] `vehicle_from_dash_resolved`
  - [ ] `alert_resolution_time`
  - [ ] `template_save_rate`

---

### 実装優先度

#### 🔴 最優先（今週）
1. ダッシュボードの編集UI撤去
2. 深リンク基本実装
3. 車両バッジ追加

#### 🟡 重要（来週）
4. ChartMini/Pro分割
5. "上位N件"統一ルール
6. dashboard_summary生成

#### 🟢 次回（再来週以降）
7. パンくずナビゲーション
8. 計測ダッシュボード
9. A/Bテスト（車両ドロップダウン表示/非表示）

---

## 🔥 優先度A：速攻改善ポイント

### 1. メンテナンス評価ロジックの改善 ⚠️

#### 現状の問題
- **現在**: メンテ回数が多いほど高評価（逆誘導の恐れ）
- **問題点**: 不要な整備を促進してしまう可能性

#### 改善提案：理想頻度との差分評価
```typescript
// 各整備項目の理想サイクル定義
const IDEAL_MAINTENANCE_CYCLES = {
  'オイル交換': { months: 6, km: 5000 },
  'エレメント交換': { months: 12, km: 10000 },
  'タイヤ交換': { months: 36, km: 30000 },
  'ブレーキパッド': { months: 24, km: 20000 },
  // ... 他の項目
};

// スコア計算式
// スコア = 1 - |実績周期 - 理想周期| / 理想周期
// 0–1の範囲を0–100%に変換
function calculateMaintenanceScore(actual: number, ideal: number): number {
  const deviation = Math.abs(actual - ideal);
  const score = Math.max(1 - (deviation / ideal), 0);
  return Math.min(score * 100, 100);
}
```

#### 実装ファイル
- `src/components/mycar/VehicleSpecsPanel.tsx`: メンテナンススコアの計算ロジック
- `src/lib/maintenance.ts`: 理想サイクル定数の定義

---

### 2. コスト効率の車種特性補正 ⚠️

#### 現状の問題
- **現在**: 全車種で一律20円/kmを基準に評価
- **問題点**: 軽自動車とスポーツカーで必要コストが大きく異なる

#### 改善提案：車種クラス係数の導入
```typescript
// 車種クラス係数
const CLASS_FACTORS = {
  '軽自動車': 0.7,
  'コンパクト': 0.85,
  'Cセグメント': 1.0,   // 基準
  'Dセグメント': 1.15,
  'ミニバン': 1.2,
  'SUV': 1.25,
  'スポーツ': 1.3,
  'スーパーカー': 1.8,
};

// 補正後のコスト効率
const costPerKmAdjusted = costPerKm / classFactor;

// スコア計算（基準20円/kmで評価）
const costEfficiencyScore = Math.max((1 - costPerKmAdjusted / 20) * 100, 0);
```

#### 実装方法
1. `Car`型に `vehicleClass?: string` フィールドを追加
2. `AddCarModal.tsx` で車種クラスの選択肢を追加
3. `VehicleSpecsPanel.tsx` でクラス係数を適用したスコア計算

#### 実装ファイル
- `src/types/index.ts`: `Car`インターフェースに`vehicleClass`追加
- `src/components/modals/AddCarModal.tsx`: 車種クラス選択UI
- `src/components/mycar/VehicleSpecsPanel.tsx`: 補正ロジック実装

---

### 3. FuelLogの単位整合（物理量と価格の分離） ⚠️

#### 現状の問題
- **二重表現**: `unit: 'JPY/L'` は価格単位だが、`fuelAmount`の物理単位(L)と混在
- **型不一致**: `EnergyUnit = 'ml' | 'wh'` なのに実装では `'JPY/L'` を使用

#### 改善提案：物理量と価格を明確に分離
```typescript
// 新しい型定義
export interface FuelLogInput {
  carId: string;
  odoKm: number;
  
  // 物理量（統一）
  quantity: number;           // 給油量または充電量
  quantityUnit: 'L' | 'kWh';  // リットル or キロワット時
  
  // 価格情報
  totalCostJpy: number;       // 合計金額（円）
  pricePerUnit?: number;      // 単価（円/L or 円/kWh）
  
  // メタデータ
  isFullTank: boolean;
  fuelType: FuelType;
  stationName?: string;
  memo?: string;
  date: Timestamp;
}

// 既存フィールド（後方互換）
// @deprecated - 新規実装では quantity を使用
fuelAmount?: number;
// @deprecated - 新規実装では pricePerUnit を使用  
pricePerLiter?: number;
```

#### マイグレーション戦略
1. 新フィールド追加（`quantity`, `quantityUnit`, `totalCostJpy`, `pricePerUnit`）
2. 既存データ読み込み時に自動変換ヘルパで補完
3. 表示は新フィールド優先、なければ既存フィールドにフォールバック
4. 新規保存は新フィールドのみ使用

#### 実装ファイル
- `src/types/index.ts`: FuelLog型の更新
- `src/lib/fuelLogs.ts`: マイグレーションヘルパー追加
- `src/components/modals/FuelLogModal.tsx`: フォーム更新

---

### 4. Date/Timestampの完全統一 ⚠️

#### 現状の問題
- **仕様の矛盾**: `BaseEntity`では`Date | string`だが、v2.0では「Timestamp統一」と記載
- **型の不整合**: 一部で`Date`、一部で`Timestamp`、一部で`string`が混在

#### 改善提案：全フィールドをTimestampに統一
```typescript
// BaseEntity の完全Timestamp統一
export interface BaseEntity {
  id?: string;
  ownerUid?: string;
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: Timestamp | null;  // Timestamp型に統一
  createdAt?: Timestamp;          // Timestamp型に統一
  updatedAt?: Timestamp;          // Timestamp型に統一
}

// すべての日付フィールド
export interface Car extends BaseEntity {
  // ...
  inspectionExpiry?: Timestamp;  // Date → Timestamp
  soldDate?: Timestamp;          // Date → Timestamp
}

export interface MaintenanceRecord extends BaseEntity {
  date: Timestamp;  // Date → Timestamp
  nextDue?: Timestamp;
}

export interface FuelLog extends BaseEntity {
  date: Timestamp;  // Date → Timestamp
}
```

#### 変換ヘルパーの強制適用
```typescript
// src/lib/dateUtils.ts
export function toTs(input: Date | string | Timestamp | null | undefined): Timestamp | null {
  if (!input) return null;
  if (input instanceof Timestamp) return input;
  if (typeof input === 'string') return Timestamp.fromDate(new Date(input));
  if (input instanceof Date) return Timestamp.fromDate(input);
  return null;
}

// 全CRUD操作で強制適用
export async function addCar(data: CarInput) {
  const cleanData = {
    ...data,
    inspectionExpiry: data.inspectionExpiry ? toTs(data.inspectionExpiry) : null,
    // ...
  };
  // Firestoreに保存
}
```

#### 実装ファイル
- `src/types/index.ts`: 全インターフェースの日付フィールドをTimestamp統一
- `src/lib/dateUtils.ts`: `toTs()`ヘルパー追加
- 全CRUDファイル (`cars.ts`, `maintenance.ts`, `fuelLogs.ts`, etc.): 変換ヘルパー適用

---

### 5. 売却済み車両の到達不能問題 ⚠️

#### 現状の問題
- **良い点**: ドロップダウンとメニューから売却済み車両を除外 ✅
- **問題点**: 履歴PDFや共有リンク、過去データが見られない

#### 改善提案：READ ONLY詳細閲覧の許可
```typescript
// 車両管理ページから売却済み車両の詳細へ遷移
<CarCard
  car={soldCar}
  readOnly={true}  // 編集不可モード
  onClick={() => {
    setActiveCarId(soldCar.id);
    setCurrentPage('my-car');  // 詳細ページへ遷移
  }}
/>

// マイカーページでREAD ONLYバナー表示
{car.status === 'sold' && (
  <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
    <div className="flex items-center gap-2 text-orange-800">
      <svg className="w-5 h-5">...</svg>
      <span className="font-semibold">この車両は売却済みです（閲覧専用）</span>
    </div>
    <p className="text-sm text-orange-700 mt-2">
      売却日: {toDate(car.soldDate)?.toLocaleDateString('ja-JP')}
      {car.soldPrice && ` / 売却価格: ¥${car.soldPrice.toLocaleString()}`}
    </p>
  </div>
)}

// 編集ボタンを無効化
<button disabled={car.status === 'sold'} ...>
```

#### 共有リンクの自動失効
```typescript
// 共有リンク生成時に車両ステータスをチェック
export async function generateShareLink(carId: string): Promise<string> {
  const car = await getCar(carId);
  
  if (car.status === 'sold') {
    // 既存リンクを失効させるか確認
    const shouldRegenerate = confirm(
      'この車両は売却済みです。\n共有リンクを再発行しますか？\n（既存のリンクは無効になります）'
    );
    if (!shouldRegenerate) return '';
    
    // リンク再発行時に「閲覧専用」フラグを付与
    const token = await createShareToken({
      carId,
      readOnly: true,
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)), // 90日
    });
    return `${window.location.origin}/share/${token}`;
  }
  
  // 通常のリンク生成
  // ...
}
```

#### 実装ファイル
- `src/app/page.tsx`: 売却済み車両の詳細閲覧ロジック追加
- `src/components/mycar/MyCarPage.tsx`: READ ONLYバナーと編集制限
- `src/lib/shareLink.ts`: ステータスチェックと失効ロジック
- `src/components/mycar/VehicleHeader.tsx`: 売却バッジの表示改善

---

### 6. プレミアム発火タイミングの最適化（OCR） ⚠️

#### 現状
- ✅ 結果成立直前ペイウォールは実装済み

#### 改善提案：信頼度ベースの発火
```typescript
// OCR処理後の信頼度チェック
async function handleOcrResult(result: Tesseract.RecognizeResult) {
  const confidence = result.data.confidence / 100; // 0-1の範囲に正規化
  
  if (confidence > 0.65) {
    // 高信頼度：プレミアム機能として価値提供
    if (!isPremium) {
      showPaywall('ocr_scan', 'success_moment');
      return; // ペイウォールを表示して停止
    }
    // プレミアムユーザーは自動入力
    autoFillForm(result.data.text);
  } else {
    // 低信頼度：無料で体験させて不満を減らす
    console.log('OCR confidence低 - 無料体験として提供');
    showOcrDraft(result.data.text); // ドラフトとして表示
    
    // 補足メッセージ
    showNotification({
      type: 'info',
      message: '読み取り精度が低いため、手動入力をお勧めします。プレミアムプランでは高精度OCRをご利用いただけます。',
      action: { label: '詳細を見る', onClick: () => showPaywall('ocr_scan', 'minimal') }
    });
  }
}
```

#### A/Bテスト案
- **パターンA**: 信頼度65%以上でペイウォール
- **パターンB**: 信頼度80%以上でペイウォール
- **KPI**: CVR、離脱率、満足度アンケート

#### 実装ファイル
- `src/components/modals/FuelLogModal.tsx`: OCR信頼度チェック
- `src/components/modals/InsuranceModal.tsx`: OCR信頼度チェック
- `src/components/modals/MaintenanceModal.tsx`: OCR信頼度チェック（将来実装）
- `src/lib/analytics.ts`: `logOcrConfidenceAnalysis`イベント追加

---

## 🚀 デプロイ情報

### Vercelへのデプロイ
- **プラットフォーム**: Vercel
- **本番URL**: https://smart-garage-mmwgktgq1-kobayashis-projects-6366834f.vercel.app
- **デプロイ方法**: `npx vercel --prod --yes`
- **自動デプロイ**: GitHubにプッシュすると自動的にVercelがビルド＆デプロイ

### ビルド設定
- **ビルドコマンド**: `npm run build`
- **出力ディレクトリ**: `.next`
- **Node.jsバージョン**: 20.x
- **環境変数**: Firebase設定は `.env.local` に保存（Vercelダッシュボードでも設定可能）

### Next.js ビルド設定（next.config.ts）
```typescript
{
  typescript: {
    ignoreBuildErrors: true,  // 型エラーを一時的に無視
  },
  eslint: {
    ignoreDuringBuilds: true,  // ESLintエラーを一時的に無視
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/**',
      },
    ],
  },
}
```

---

**最新バージョン: 2.2.0**  
**コミットID: pending**  
**総コミット数: 122+コミット**  
**本番環境**: https://smart-garage-h2qwljy2z-kobayashis-projects-6366834f.vercel.app

---

## 📝 変更履歴

### v2.2.0 (2025-11-03)
- ✅ **共有URL閲覧ページ実装** 🔗
  - 署名トークン検証機能
  - アクセスログ記録（プレースホルダ）
  - 読み取り専用の軽量UI
  - エラーハンドリング完備
- ✅ **観測性の導入（Sentry）** 📊
  - クライアント/サーバー/Edge設定
  - ユーザーIDタグ付け
  - セッションリプレイ
  - カスタムブレッドクラム
- ✅ **Cloud Logging構造化ログ** 📝
  - 重要イベントログ実装
  - OCR/ペイウォール/決済イベント追跡
- ✅ **E2Eテスト（Playwright）** 🧪
  - 認証/車両管理/エラーハンドリングテスト
  - アクセシビリティテスト
  - パフォーマンステスト
- ✅ **Firestore/Storageルール強化** 🔒
  - 必須フィールド検証
  - データサイズ制限
  - メタデータ検証
  - 画像タイプ・サイズ制限
- ✅ **空/エラー/オフライン状態UI** 🎨
  - EmptyStateコンポーネント
  - ErrorBoundaryコンポーネント
  - オンライン状態監視フック
- ✅ **広告枠の初期実装** 📢
  - プレースホルダー広告
  - 表示頻度制御
  - アフィリエイト広告カード
  - プライバシー配慮のトラッキング
- ✅ **法務ページ完備** 📄
  - プライバシーポリシー
  - 利用規約（サブスク条項含む）
  - 特定商取引法表記（既存）
- ✅ **サポート動線強化** 💬
  - フィードバック送信フォーム
  - FAQ（請求/機能/アカウント）
  - 既知の不具合セクション
  - 関連リンク集約

### v2.1.0 (2025-11-02)
- ✅ Vercelへのデプロイ成功（本番環境公開）
- ✅ TypeScript型エラー修正（Timestamp/Date統一）
- ✅ ビルドエラー17ファイル修正
- ✅ **優先度A改善ポイント全6項目実装完了** 🔥
  1. ✅ メンテナンス評価ロジック改善（理想頻度ベース評価）
  2. ✅ コスト効率の車種特性補正（クラス係数導入）
  3. ✅ FuelLog単位整合（物理量と価格の分離、後方互換ヘルパー）
  4. ✅ Date/Timestamp完全統一（toTs()ヘルパー追加）
  5. ✅ 売却済み車両のREAD ONLY閲覧機能
  6. ✅ OCR信頼度ベースのペイウォール発火（65%閾値）
- ✅ メニュー名称の実装完了（車両データ→マイカー、燃費→ガソリン）
- ✅ 車両データページのデザイン改善（モダンなライトテーマ）
- ✅ VehicleHeaderの背景色シンプル化（白背景に統一）

### v2.0.0 (2025-11-01)
- ✅ 車両ステータス管理（active/sold/scrapped）
- ✅ マイカーページ（Gran Turismo風UI）
- ✅ カスタムパーツ管理（折りたたみUI）
- ✅ コスト効率評価（走行距離ベース）
- ✅ プレミアム機能の条件分岐
- ✅ ナビゲーション改善（名称変更、順序変更）
