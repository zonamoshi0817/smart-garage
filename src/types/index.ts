// 共通の型定義

export interface BaseEntity {
  id?: string;
  ownerUid?: string;        // 所有者UID（マルチテナンシー対応）
  createdBy?: string;       // 作成者UID
  updatedBy?: string;       // 更新者UID
  deletedAt?: Date | null;  // 論理削除タイムスタンプ
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// 車両関連の型
export interface Car extends BaseEntity {
  name: string;
  modelCode?: string;
  year?: number;
  odoKm?: number;
  imagePath?: string;
  inspectionExpiry?: Date; // 車検期限（Timestamp → Date変換済み）
  firstRegYm?: string;
  avgKmPerMonth?: number;
}

export interface CarInput {
  name: string;
  modelCode?: string;
  year?: number;
  odoKm?: number;
  imagePath?: string;
  inspectionExpiry?: Date; // 車検期限（Date型で入力）
  firstRegYm?: string;
  avgKmPerMonth?: number;
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
  uploadedAt: Date;
}

export interface MaintenanceRecord extends BaseEntity {
  carId: string;
  title: string;
  description?: string;
  cost?: number;
  mileage?: number;
  date: Date;
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
  date: Date;
  location?: string;
  items?: MaintenanceItem[];        // 明細行（将来対応）
  attachments?: MaintenanceAttachment[]; // 添付ファイル（将来対応）
}

// 保険関連の型（拡張版）
export interface InsurancePolicy extends BaseEntity {
  // 基本情報
  provider: string;                    // 保険会社
  policyNumber: string;                // 証券番号
  carId: string;                       // 車両ID
  productName?: string;                // 商品名（例: 総合自動車保険TypeS）
  
  // 契約期間
  startDate: Date;                     // 契約開始日
  endDate: Date;                       // 満期日
  contractDate?: Date;                 // 契約日
  
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
  
  // 保険料
  paymentCycle: 'annual' | 'monthly' | 'installment'; // 支払いサイクル
  premiumAmount: number;               // 年間保険料合計
  firstPayment?: number;               // 初回保険料
  subsequentPayment?: number;          // 2回目以降の保険料
  installmentCount?: number;           // 分割回数
  
  // 等級・割引
  noClaimGrade?: number;               // ノンフリート等級
  accidentSurchargeYears?: number;     // 事故あり係数適用期間
  discounts?: string[];                // 適用割引（例: インターネット割引、無事故割引）
  
  // 補償内容
  coverages: {
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
  
  // 運転者条件
  drivers: {
    restriction?: 'self' | 'self_spouse' | 'family' | 'none'; // 運転者限定
    ageLimit: string;                  // 年齢条件（例: 30歳以上）
    familyOnly: boolean;               // 家族限定
  };
  
  // 使用条件
  usage: {
    purpose: 'private' | 'business' | 'commute'; // 使用目的
    annualMileageKm: number;           // 年間走行距離
    mileageCategory?: string;          // 契約距離区分
  };
  
  // その他
  notes: string;                       // メモ
  documentUrl?: string;                // 証券PDF/画像のURL
}

export interface InsuranceClaim extends BaseEntity {
  policyId: string;
  carId: string;
  claimNumber: string;
  incidentDate: Date;
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
  dueDate: Date;
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

// 給油ログ関連の型
export type FuelType = 'regular' | 'premium' | 'diesel' | 'ev';

export interface FuelLog extends BaseEntity {
  carId: string;
  odoKm: number;
  fuelAmount: number; // 給油量（L）
  cost: number; // 金額（¥）
  pricePerLiter?: number; // L価格（¥/L）
  isFullTank: boolean; // 満タンかどうか
  fuelType?: FuelType; // 燃料種別
  stationName?: string; // スタンド名
  unit: string; // 単位（デフォルト: 'JPY/L'、将来の外貨対応）
  memo?: string;
  date: Date;
}

export interface FuelLogInput {
  carId: string;
  odoKm: number;
  fuelAmount: number;
  cost: number;
  pricePerLiter?: number; // L価格（¥/L）
  isFullTank: boolean;
  fuelType?: FuelType; // 燃料種別
  stationName?: string; // スタンド名
  unit?: string; // 単位（デフォルト: 'JPY/L'）
  memo?: string;
  date: Date;
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
  date: Date;
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
  date: Date;
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
