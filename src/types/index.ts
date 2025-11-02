// 共通の型定義

import { Timestamp } from 'firebase/firestore';

/**
 * すべてのエンティティの基底型
 * 
 * 重要: 日時フィールドはFirestore Timestampに完全統一
 * - Firestoreに保存: Timestamp（serverTimestamp()使用）
 * - クライアント表示: Timestamp.toDate() でDateに変換
 * - Date | string 型は廃止（バグの温床）
 * - deletedAtは null（未削除）で統一（クエリ最適化）
 */
export interface BaseEntity {
  id?: string;
  ownerUid?: string;        // 所有者UID（マルチテナンシー対応）
  createdBy?: string;       // 作成者UID
  updatedBy?: string;       // 更新者UID
  deletedAt: Timestamp | null;  // 論理削除（null=未削除、Timestamp=削除済み）
  createdAt: Timestamp;     // 作成日時（serverTimestamp）
  updatedAt: Timestamp;     // 更新日時（serverTimestamp）
}

// 車両ステータス
export type CarStatus = 'active' | 'sold' | 'scrapped' | 'other';

// 車両関連の型
export type VehicleClass = '軽自動車' | 'コンパクト' | 'Cセグメント' | 'Dセグメント' | 'ミニバン' | 'SUV' | 'スポーツ' | 'スーパーカー';

export interface Car extends BaseEntity {
  name: string;
  modelCode?: string;
  year?: number;
  odoKm?: number;
  imagePath?: string;
  inspectionExpiry?: Timestamp; // 車検期限（Timestamp統一）
  firstRegYm?: string;
  avgKmPerMonth?: number;
  vehicleClass?: VehicleClass; // 車種クラス（コスト効率補正用）
  status?: CarStatus; // 車両ステータス（デフォルト: 'active'）
  soldDate?: Timestamp; // 売却日
  soldPrice?: number; // 売却価格
  soldTo?: string; // 売却先
  soldNotes?: string; // 売却メモ
}

export interface CarInput {
  name: string;
  modelCode?: string;
  year?: number;
  odoKm?: number;
  imagePath?: string;
  inspectionExpiry?: Timestamp; // 車検期限（Timestamp型で保存）
  firstRegYm?: string;
  avgKmPerMonth?: number;
  vehicleClass?: VehicleClass; // 車種クラス（コスト効率補正用）
  status?: CarStatus; // 車両ステータス
  soldDate?: Timestamp; // 売却日
  soldPrice?: number; // 売却価格
  soldTo?: string; // 売却先
  soldNotes?: string; // 売却メモ
}

// メンテナンス関連の型
export interface MaintenanceItem {
  type: 'part' | 'labor' | 'other';
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface MaintenanceAttachment {
  type: 'photo' | 'pdf' | 'receipt';
  url: string;
  fileName: string;
  uploadedAt: Timestamp;   // アップロード日時（Timestamp統一）
}

export interface MaintenanceRecord extends BaseEntity {
  carId: string;
  title: string;
  description?: string;
  cost?: number;
  mileage?: number;
  date: Timestamp;        // メンテナンス実施日（Timestamp統一）
  location?: string;
  items?: MaintenanceItem[];        // 明細行（将来対応）
  attachments?: MaintenanceAttachment[]; // 添付ファイル（将来対応）
}

export interface MaintenanceInput {
  carId: string;
  title: string;
  description?: string;
  cost?: number;
  mileage: number;
  date: Timestamp;        // メンテナンス実施日（Timestamp型で保存）
  location?: string;
  items?: MaintenanceItem[];        // 明細行（将来対応）
  attachments?: MaintenanceAttachment[]; // 添付ファイル（将来対応）
}

/**
 * メンテナンスOCRドラフト
 * OCR結果を一時保存し、ユーザー確認後に正式保存
 */
export interface MaintenanceDraft extends BaseEntity {
  carId: string;
  
  // フィールド値
  title?: string;
  description?: string;
  cost?: number;
  mileage?: number;
  date?: Timestamp;
  location?: string;
  
  // フィールドメタデータ（信頼度・ソース情報）
  fieldMetadata: {
    title?: FieldMetadata;
    description?: FieldMetadata;
    cost?: FieldMetadata;
    mileage?: FieldMetadata;
    date?: FieldMetadata;
    location?: FieldMetadata;
  };
  
  // ドラフト状態
  status: 'pending_review' | 'confirmed' | 'rejected';
  ocrRawText?: string;           // OCR元テキスト（デバッグ用）
  confirmedAt?: Timestamp;       // 確定日時
}

// 保険関連の型（簡素化版 - OCR勝ち筋フィールド重視）
export interface InsurancePolicy extends BaseEntity {
  // 【必須フィールド】
  carId: string;                       // 車両ID
  
  // 【OCR勝ち筋フィールド】高確度・高価値の6項目
  provider: string;                    // 保険会社 ★OCR最優先★
  policyNumber: string;                // 証券番号 ★OCR最優先★
  startDate: Timestamp;                // 契約開始日 ★OCR最優先★
  endDate: Timestamp;                  // 満期日 ★OCR最優先★
  noClaimGrade?: number;               // ノンフリート等級 ★OCR最優先★
  premiumAmount: number;               // 年間保険料合計 ★OCR最優先★
  
  // 【サブフィールド】（OCRでは取得しない、手動入力またはメモ欄へ）
  paymentCycle: 'annual' | 'monthly' | 'installment'; // 支払いサイクル
  productName?: string;                // 商品名
  contractDate?: Timestamp;            // 契約日
  
  // 契約者情報
  insuredName?: string;                // 契約者氏名
  insuredAddress?: string;             // 契約者住所
  namedInsured?: string;               // 記名被保険者
  relationToInsured?: string;          // 契約者との関係
  
  // 車両情報（保険証券上の情報）
  vehicleRegistration?: string;        // 登録番号（ナンバー）
  vehicleChassisNumber?: string;       // 車台番号
  vehicleOwner?: string;               // 車両所有者
  vehicleType?: string;                // 用途車種（例: 自家用普通乗用車）
  
  // 保険料詳細（オプション - OCR対象外）
  firstPayment?: number;               // 初回保険料
  subsequentPayment?: number;          // 2回目以降の保険料
  installmentCount?: number;           // 分割回数
  
  // 等級・割引詳細（オプション - OCR対象外）
  accidentSurchargeYears?: number;     // 事故あり係数適用期間
  discounts?: string[];                // 適用割引（例: インターネット割引、無事故割引）
  
  // 補償内容（オプション - OCR対象外、手動入力またはメモ欄へ）
  coverages?: {
    // 相手方への補償
    bodilyInjury: { 
      limit: string;                   // 対人賠償（例: 無制限）
    };
    propertyDamage: { 
      limit: string;                   // 対物賠償（例: 無制限）
      excessRepair?: boolean;          // 対物超過修理費用
    };
    
    // 自分・同乗者への補償
    personalInjury: { 
      limit: string;                   // 人身傷害（例: 3,000万円）
      coverageType?: string;           // 補償タイプ（例: 車内のみ）
    };
    passengerInjury?: {                // 搭乗者傷害
      temporaryPayment?: string;       // 傷害一時金
      deathDisability?: string;        // 死亡・後遺障害
    };
    uninsuredMotorist?: {              // 無保険車傷害
      limit: string;
    };
    
    // 車両保険
    vehicle: { 
      type: 'general' | 'economy' | 'none'; // 一般/エコノミー/なし
      amount?: number;                 // 保険金額
      deductible?: string;             // 免責金額
      newCarReplacement?: boolean;     // 新車買替特約
    };
    
    // 特約
    legalExpense?: {                   // 弁護士特約
      carAccident?: number;            // 自動車事故
      dailyAccident?: number;          // 日常事故
    };
    personalLiability?: number;        // 個人賠償特約
    rentalCar?: {                      // 事故時レンタカー
      dailyLimit?: number;
    };
    familyBike?: boolean;              // ファミリーバイク特約
    otherCarCoverage?: boolean;        // 他車運転危険補償
    
    riders: string[];                  // その他の特約
  };
  
  // 運転者条件（オプション - OCR対象外、手動入力またはメモ欄へ）
  drivers?: {
    restriction?: 'self' | 'self_spouse' | 'family' | 'none'; // 運転者限定
    ageLimit: string;                  // 年齢条件（例: 30歳以上）
    familyOnly: boolean;               // 家族限定
  };
  
  // 使用条件（オプション - OCR対象外、手動入力またはメモ欄へ）
  usage?: {
    purpose: 'private' | 'business' | 'commute'; // 使用目的
    annualMileageKm: number;           // 年間走行距離
    mileageCategory?: string;          // 契約距離区分
  };
  
  // その他
  notes: string;                       // メモ（住所・氏名・細かい特約はここに記載推奨）
  documentUrl?: string;                // 証券PDF/画像のURL
}

/**
 * 保険証券OCRドラフト
 * OCR結果を一時保存し、ユーザー確認後に正式保存
 */
export interface InsurancePolicyDraft extends BaseEntity {
  carId: string;
  
  // 勝ち筋フィールド値
  provider?: string;
  policyNumber?: string;
  startDate?: Timestamp;
  endDate?: Timestamp;
  noClaimGrade?: number;
  premiumAmount?: number;
  
  // フィールドメタデータ（信頼度・ソース情報）
  fieldMetadata: {
    provider?: FieldMetadata;
    policyNumber?: FieldMetadata;
    startDate?: FieldMetadata;
    endDate?: FieldMetadata;
    noClaimGrade?: FieldMetadata;
    premiumAmount?: FieldMetadata;
  };
  
  // ドラフト状態
  status: 'pending_review' | 'confirmed' | 'rejected';
  ocrRawText?: string;           // OCR元テキスト（デバッグ用）
  confirmedAt?: Timestamp;       // 確定日時
}

export interface InsuranceClaim extends BaseEntity {
  policyId: string;
  carId: string;
  claimNumber: string;
  incidentDate: Timestamp;  // 事故発生日（Timestamp統一）
  description: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  notes?: string;
}

// 保険通知関連の型
export interface InsuranceNotification extends BaseEntity {
  policyId: string;
  carId: string;
  type: 'expiry' | 'payment' | 'renewal';
  title: string;
  message: string;
  dueDate: Timestamp;      // 期限日（Timestamp統一）
  isRead: boolean;
  actionUrl?: string;
}

// 車種データベース関連の型
export interface CarModel {
  id: string;
  name: string;
  modelCode?: string;
  bodyType: 'sedan' | 'hatchback' | 'suv' | 'wagon' | 'coupe' | 'convertible' | 'pickup' | 'minivan' | 'sports' | 'other';
  fuelType: 'gasoline' | 'hybrid' | 'electric' | 'diesel' | 'other';
  displacement?: number;
  generation?: string;
  yearFrom?: number;
  yearTo?: number;
  defaultImagePath?: string;
}

export interface CarManufacturer {
  id: string;
  name: string;
  nameKana: string;
  country: 'japan' | 'germany' | 'usa' | 'korea' | 'france' | 'italy' | 'uk' | 'other';
  models: CarModel[];
}

// モーダル関連の型
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// OCRドラフト関連の型
export type FieldSource = 'ocr' | 'rule' | 'user' | 'llm';

export interface FieldMetadata {
  source: FieldSource;         // データソース
  confidence?: number;         // 信頼度（0-1）
  originalValue?: string;      // OCR元テキスト
  editedByUser?: boolean;      // ユーザー編集済みフラグ
}

// 給油ログ関連の型（物理量統一版）
export type FuelType = 'regular' | 'premium' | 'diesel' | 'ev';
export type EnergyUnit = 'ml' | 'wh';  // ミリリットル（ガソリン）or ワット時（EV）

export interface FuelLog extends BaseEntity {
  carId: string;
  odoKm: number;
  
  // 【物理量統一】EVとガソリンを共通化
  quantity: number;           // 物理量（ml or Wh の整数）
  unit: EnergyUnit;           // 単位（ml or wh）
  totalCostJpy: number;       // 総額（円）
  pricePerUnit?: number;      // 単価（¥/L or ¥/kWh、表示用）
  
  // メタデータ
  isFullTank: boolean;        // 満タンかどうか（EVの場合は100%充電）
  fuelType: FuelType;         // 燃料種別（regular/premium/diesel/ev）
  stationName?: string;       // スタンド/充電スポット名
  memo?: string;
  date: Timestamp;            // 給油/充電日時
  
  // 【後方互換性】旧フィールド（非推奨、将来削除）
  fuelAmount?: number;        // @deprecated quantity/unitを使用
  cost?: number;              // @deprecated totalCostJpyを使用
  pricePerLiter?: number;     // @deprecated pricePerUnitを使用
}

export interface FuelLogInput {
  carId: string;
  odoKm: number;
  
  // 物理量統一
  quantity: number;
  unit: EnergyUnit;
  totalCostJpy: number;
  pricePerUnit?: number;
  
  isFullTank: boolean;
  fuelType: FuelType;
  stationName?: string;
  memo?: string;
  date: Timestamp;
}

/**
 * 給油ログOCRドラフト
 * レシートOCR結果を一時保存し、ユーザー確認後に正式保存
 */
export interface FuelLogDraft extends BaseEntity {
  carId: string;
  
  // フィールド値（物理量統一）
  odoKm?: number;
  quantity?: number;          // 物理量（ml or Wh）
  unit?: EnergyUnit;          // ml or wh
  totalCostJpy?: number;      // 総額
  pricePerUnit?: number;      // 単価
  isFullTank?: boolean;
  fuelType?: FuelType;
  stationName?: string;
  date?: Timestamp;
  
  // フィールドメタデータ（信頼度・ソース情報）
  fieldMetadata: {
    odoKm?: FieldMetadata;
    quantity?: FieldMetadata;
    totalCostJpy?: FieldMetadata;
    pricePerUnit?: FieldMetadata;
    fuelType?: FieldMetadata;
    stationName?: FieldMetadata;
    date?: FieldMetadata;
  };
  
  // ドラフト状態
  status: 'pending_review' | 'confirmed' | 'rejected';
  ocrRawText?: string;           // OCR元テキスト（デバッグ用）
  receiptImageUrl?: string;      // レシート画像URL
  confirmedAt?: Timestamp;       // 確定日時
}

// カスタマイズ関連の型
export type CustomStatus = 'planned' | 'ordered' | 'installed' | 'removed_temp' | 'removed';
export type CustomCategory = 
  | 'exterior' | 'interior' | 'intake' | 'exhaust' | 'ecu' | 'suspension' 
  | 'brake' | 'reinforcement' | 'drivetrain' | 'tire_wheel' | 'electrical' 
  | 'audio' | 'safety' | 'other';

export interface Customization extends BaseEntity {
  carId: string;
  title: string;
  brand?: string;
  modelCode?: string;
  categories: CustomCategory[];
  status: CustomStatus;
  date: Timestamp;        // 実施日（Timestamp統一）
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
}

export interface CustomizationInput {
  carId: string;
  title: string;
  brand?: string;
  modelCode?: string;
  categories: CustomCategory[];
  status: CustomStatus;
  date: Timestamp;        // 実施日（Timestamp型で保存）
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
}

export interface CustomizationMedia extends BaseEntity {
  customizationId: string;
  carId: string;
  type: 'photo' | 'receipt' | 'video';
  storagePath: string;
  thumbPath?: string;
  note?: string;
  takenAt?: Date;
}

export interface CustomizationMeta {
  carId: string;
  totalCostJpy: number;
  yearToDateCostJpy: number;
  countInstalled: number;
  topCategories: { key: string; cost: number }[];
}

// ナビゲーション関連の型
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}
