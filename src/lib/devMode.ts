// 開発モード用のダミーデータベース機能
import { Car, MaintenanceRecord, Reminder } from './types';

// ダミーデータ
const dummyCars: Car[] = [
  {
    id: 'demo-car-1',
    name: 'デモカー',
    modelCode: 'Toyota Camry',
    year: 2020,
    odoKm: 50000,
    imagePath: '/car.jpg',
    inspectionExpiry: '2025-12-31',
    firstRegYm: '2020-01',
    avgKmPerMonth: 1000,
    engineCode: '2AR-FE',
    oilSpec: {
      viscosity: '0W-20',
      api: 'SP',
      volumeL: 4.2
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const dummyMaintenanceRecords: MaintenanceRecord[] = [
  {
    id: 'demo-maintenance-1',
    carId: 'demo-car-1',
    title: 'オイル交換',
    description: '定期的なオイル交換',
    cost: 5000,
    mileage: 45000,
    date: new Date('2024-01-15'),
    location: 'デモ工場',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const dummyReminders: Reminder[] = [
  {
    id: 'demo-reminder-1',
    carId: 'demo-car-1',
    kind: 'both',
    title: '次回オイル交換',
    dueDate: new Date('2024-07-15'),
    dueOdoKm: 50000,
    baseEntryRef: 'demo-maintenance-1',
    threshold: { months: 6, km: 5000 },
    status: 'active',
    notes: 'メンテナンス記録から自動生成: オイル交換',
    type: 'oil_change',
    lastOilChangeAt: new Date('2024-01-15'),
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// 開発モードかどうかを判定
export function isDevMode(): boolean {
  return typeof window !== 'undefined' && 
         localStorage.getItem('dev-mode') === 'true' ||
         process.env.NODE_ENV === 'development';
}

// 開発モードを有効化
export function enableDevMode(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('dev-mode', 'true');
    window.location.reload();
  }
}

// 開発モードを無効化
export function disableDevMode(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('dev-mode');
    window.location.reload();
  }
}

// ダミーデータを取得
export function getDummyCars(): Car[] {
  return dummyCars;
}

export function getDummyMaintenanceRecords(): MaintenanceRecord[] {
  return dummyMaintenanceRecords;
}

export function getDummyReminders(): Reminder[] {
  return dummyReminders;
}
