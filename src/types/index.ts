// 共通の型定義

export interface BaseEntity {
  id?: string;
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
  inspectionExpiry?: string;
  firstRegYm?: string;
  avgKmPerMonth?: number;
}

export interface CarInput {
  name: string;
  modelCode?: string;
  year?: number;
  odoKm?: number;
  imagePath?: string;
  inspectionExpiry?: string;
  firstRegYm?: string;
  avgKmPerMonth?: number;
}

// メンテナンス関連の型
export interface MaintenanceRecord extends BaseEntity {
  carId: string;
  title: string;
  description?: string;
  cost?: number;
  mileage?: number;
  date: Date;
  location?: string;
}

export interface MaintenanceInput {
  carId: string;
  title: string;
  description?: string;
  cost?: number;
  mileage: number;
  date: Date;
  location?: string;
}

// 保険関連の型
export interface InsurancePolicy extends BaseEntity {
  provider: string;
  policyNumber: string;
  carId: string;
  startDate: Date;
  endDate: Date;
  paymentCycle: 'annual' | 'monthly';
  premiumAmount: number;
  coverages: {
    bodilyInjury: { limit: string };
    propertyDamage: { limit: string };
    personalInjury: { limit: string };
    vehicle: { 
      type: 'AG' | 'AC' | 'NONE';
      deductible: string;
    };
    riders: string[];
  };
  drivers: {
    ageLimit: string;
    familyOnly: boolean;
  };
  usage: {
    purpose: 'private' | 'business';
    annualMileageKm: number;
  };
  notes: string;
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
export interface FuelLog extends BaseEntity {
  carId: string;
  odoKm: number;
  fuelAmount: number; // 給油量（L）
  cost: number; // 金額（¥）
  pricePerLiter?: number; // L価格（¥/L）
  isFullTank: boolean; // 満タンかどうか
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
  memo?: string;
  date: Date;
}

// ナビゲーション関連の型
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}
