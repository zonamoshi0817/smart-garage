// src/lib/carOilSpecs.ts
"use client";

// 車両情報の型定義
export interface CarInfo {
  make: string;
  model: string;
  year?: number;
  engineCode?: string;
  displacement?: number; // 排気量（L）
  fuelType?: 'gasoline' | 'hybrid' | 'diesel' | 'electric';
}

// オイル仕様の型定義
export interface OilSpecification {
  viscosity: string; // "0W-20", "5W-30", etc.
  api: string; // "SP", "SN", etc.
  volumeL: number; // 必要量（L）
  changeIntervalMonths: number; // 交換間隔（月）
  changeIntervalKm: number; // 交換間隔（km）
  notes?: string; // 特記事項
}

// 車種別オイル仕様データベース
const carOilSpecsDatabase: Record<string, OilSpecification> = {
  // Honda
  'honda_civic_2016_2021': {
    viscosity: '0W-20',
    api: 'SP',
    volumeL: 4.0,
    changeIntervalMonths: 6,
    changeIntervalKm: 5000,
    notes: 'Honda純正オイル推奨'
  },
  'honda_civic_2022_': {
    viscosity: '0W-20',
    api: 'SP',
    volumeL: 4.0,
    changeIntervalMonths: 6,
    changeIntervalKm: 5000,
    notes: 'Honda純正オイル推奨'
  },
  'honda_fit_2013_2020': {
    viscosity: '0W-20',
    api: 'SP',
    volumeL: 3.5,
    changeIntervalMonths: 6,
    changeIntervalKm: 5000,
    notes: 'Honda純正オイル推奨'
  },
  'honda_fit_2021_': {
    viscosity: '0W-20',
    api: 'SP',
    volumeL: 3.5,
    changeIntervalMonths: 6,
    changeIntervalKm: 5000,
    notes: 'Honda純正オイル推奨'
  },
  'honda_accord_2018_': {
    viscosity: '0W-20',
    api: 'SP',
    volumeL: 4.5,
    changeIntervalMonths: 6,
    changeIntervalKm: 5000,
    notes: 'Honda純正オイル推奨'
  },

  // Toyota
  'toyota_prius_2016_2022': {
    viscosity: '0W-20',
    api: 'SP',
    volumeL: 4.2,
    changeIntervalMonths: 6,
    changeIntervalKm: 5000,
    notes: 'Toyota純正オイル推奨'
  },
  'toyota_prius_2023_': {
    viscosity: '0W-20',
    api: 'SP',
    volumeL: 4.2,
    changeIntervalMonths: 6,
    changeIntervalKm: 5000,
    notes: 'Toyota純正オイル推奨'
  },
  'toyota_corolla_2019_': {
    viscosity: '0W-20',
    api: 'SP',
    volumeL: 4.0,
    changeIntervalMonths: 6,
    changeIntervalKm: 5000,
    notes: 'Toyota純正オイル推奨'
  },
  'toyota_camry_2018_': {
    viscosity: '0W-20',
    api: 'SP',
    volumeL: 4.5,
    changeIntervalMonths: 6,
    changeIntervalKm: 5000,
    notes: 'Toyota純正オイル推奨'
  },
  'toyota_rav4_2019_': {
    viscosity: '0W-20',
    api: 'SP',
    volumeL: 4.5,
    changeIntervalMonths: 6,
    changeIntervalKm: 5000,
    notes: 'Toyota純正オイル推奨'
  },

  // Nissan
  'nissan_leaf_2017_': {
    viscosity: '0W-20',
    api: 'SP',
    volumeL: 4.0,
    changeIntervalMonths: 6,
    changeIntervalKm: 5000,
    notes: 'Nissan純正オイル推奨'
  },
  'nissan_altima_2019_': {
    viscosity: '0W-20',
    api: 'SP',
    volumeL: 4.5,
    changeIntervalMonths: 6,
    changeIntervalKm: 5000,
    notes: 'Nissan純正オイル推奨'
  },
  'nissan_rogue_2019_': {
    viscosity: '0W-20',
    api: 'SP',
    volumeL: 4.5,
    changeIntervalMonths: 6,
    changeIntervalKm: 5000,
    notes: 'Nissan純正オイル推奨'
  },

  // Mazda
  'mazda_cx5_2017_': {
    viscosity: '0W-20',
    api: 'SP',
    volumeL: 4.5,
    changeIntervalMonths: 6,
    changeIntervalKm: 5000,
    notes: 'Mazda純正オイル推奨'
  },
  'mazda_cx3_2016_2021': {
    viscosity: '0W-20',
    api: 'SP',
    volumeL: 4.0,
    changeIntervalMonths: 6,
    changeIntervalKm: 5000,
    notes: 'Mazda純正オイル推奨'
  },
  'mazda_mazda3_2019_': {
    viscosity: '0W-20',
    api: 'SP',
    volumeL: 4.0,
    changeIntervalMonths: 6,
    changeIntervalKm: 5000,
    notes: 'Mazda純正オイル推奨'
  },

  // Subaru
  'subaru_impreza_2017_': {
    viscosity: '0W-20',
    api: 'SP',
    volumeL: 4.2,
    changeIntervalMonths: 6,
    changeIntervalKm: 5000,
    notes: 'Subaru純正オイル推奨'
  },
  'subaru_outback_2018_': {
    viscosity: '0W-20',
    api: 'SP',
    volumeL: 4.5,
    changeIntervalMonths: 6,
    changeIntervalKm: 5000,
    notes: 'Subaru純正オイル推奨'
  },
  'subaru_forester_2019_': {
    viscosity: '0W-20',
    api: 'SP',
    volumeL: 4.5,
    changeIntervalMonths: 6,
    changeIntervalKm: 5000,
    notes: 'Subaru純正オイル推奨'
  },

  // 古い車両用（5W-30）
  'honda_civic_2006_2015': {
    viscosity: '5W-30',
    api: 'SN',
    volumeL: 4.0,
    changeIntervalMonths: 6,
    changeIntervalKm: 5000,
    notes: '古い車両のため5W-30推奨'
  },
  'toyota_prius_2010_2015': {
    viscosity: '5W-30',
    api: 'SN',
    volumeL: 4.2,
    changeIntervalMonths: 6,
    changeIntervalKm: 5000,
    notes: '古い車両のため5W-30推奨'
  }
};

// 車両キーを生成
function generateCarKey(carInfo: CarInfo): string {
  const make = carInfo.make.toLowerCase();
  const model = carInfo.model.toLowerCase();
  const year = carInfo.year;
  
  if (!year) {
    return `${make}_${model}`;
  }
  
  // 年式による世代判定
  if (year >= 2023) {
    return `${make}_${model}_2023_`;
  } else if (year >= 2022) {
    return `${make}_${model}_2022_`;
  } else if (year >= 2021) {
    return `${make}_${model}_2021_`;
  } else if (year >= 2020) {
    return `${make}_${model}_2020_`;
  } else if (year >= 2019) {
    return `${make}_${model}_2019_`;
  } else if (year >= 2018) {
    return `${make}_${model}_2018_`;
  } else if (year >= 2017) {
    return `${make}_${model}_2017_`;
  } else if (year >= 2016) {
    return `${make}_${model}_2016_2021`;
  } else if (year >= 2010) {
    return `${make}_${model}_2010_2015`;
  } else {
    return `${make}_${model}_2006_2015`;
  }
}

// 車両情報からオイル仕様を取得
export function getOilSpecForCar(carInfo: CarInfo): OilSpecification {
  const carKey = generateCarKey(carInfo);
  const spec = carOilSpecsDatabase[carKey];
  
  if (spec) {
    return spec;
  }
  
  // フォールバック: デフォルト仕様
  return {
    viscosity: '0W-20',
    api: 'SP',
    volumeL: 4.0,
    changeIntervalMonths: 6,
    changeIntervalKm: 5000,
    notes: '汎用仕様（車種確認推奨）'
  };
}

// 車両情報からオイル仕様を取得（複数候補）
export function getOilSpecsForCar(carInfo: CarInfo): OilSpecification[] {
  const primarySpec = getOilSpecForCar(carInfo);
  const specs: OilSpecification[] = [primarySpec];
  
  // 代替仕様を追加
  if (primarySpec.viscosity === '0W-20') {
    specs.push({
      ...primarySpec,
      viscosity: '5W-30',
      api: 'SN',
      notes: '代替仕様（0W-20が入手困難な場合）'
    });
  } else if (primarySpec.viscosity === '5W-30') {
    specs.push({
      ...primarySpec,
      viscosity: '0W-20',
      api: 'SP',
      notes: '代替仕様（5W-30が入手困難な場合）'
    });
  }
  
  return specs;
}

// オイル仕様の互換性をチェック
export function isOilSpecCompatible(
  carSpec: OilSpecification,
  oilSpec: { viscosity: string; api: string }
): boolean {
  // 粘度の互換性チェック
  const viscosityCompatible = 
    carSpec.viscosity === oilSpec.viscosity ||
    (carSpec.viscosity === '0W-20' && oilSpec.viscosity === '5W-30') ||
    (carSpec.viscosity === '5W-30' && oilSpec.viscosity === '0W-20');
  
  // API規格の互換性チェック
  const apiCompatible = 
    carSpec.api === oilSpec.api ||
    (carSpec.api === 'SP' && oilSpec.api === 'SN') ||
    (carSpec.api === 'SN' && oilSpec.api === 'SP');
  
  return viscosityCompatible && apiCompatible;
}

// オイル交換間隔を計算
export function calculateOilChangeInterval(
  carInfo: CarInfo,
  lastChangeDate: Date,
  lastChangeMileage: number,
  currentMileage: number
): {
  nextChangeByDate: Date;
  nextChangeByMileage: number;
  recommendedChangeDate: Date;
  isOverdue: boolean;
} {
  const oilSpec = getOilSpecForCar(carInfo);
  
  // 日付ベースの次回交換日
  const nextChangeByDate = new Date(lastChangeDate);
  nextChangeByDate.setMonth(nextChangeByDate.getMonth() + oilSpec.changeIntervalMonths);
  
  // 走行距離ベースの次回交換走行距離
  const nextChangeByMileage = lastChangeMileage + oilSpec.changeIntervalKm;
  
  // 推奨交換日（早い方）
  const mileageBasedDate = new Date(lastChangeDate);
  const mileageDiff = currentMileage - lastChangeMileage;
  const monthsByMileage = (mileageDiff / oilSpec.changeIntervalKm) * oilSpec.changeIntervalMonths;
  mileageBasedDate.setMonth(mileageBasedDate.getMonth() + monthsByMileage);
  
  const recommendedChangeDate = nextChangeByDate < mileageBasedDate ? nextChangeByDate : mileageBasedDate;
  
  // 期限切れチェック
  const isOverdue = new Date() > recommendedChangeDate;
  
  return {
    nextChangeByDate,
    nextChangeByMileage,
    recommendedChangeDate,
    isOverdue
  };
}

// オイル仕様の説明を生成
export function generateOilSpecDescription(oilSpec: OilSpecification): string {
  let description = `${oilSpec.viscosity} / ${oilSpec.api} エンジンオイル`;
  description += `\n必要量: ${oilSpec.volumeL}L`;
  description += `\n交換間隔: ${oilSpec.changeIntervalMonths}ヶ月 または ${oilSpec.changeIntervalKm.toLocaleString()}km`;
  
  if (oilSpec.notes) {
    description += `\n\n${oilSpec.notes}`;
  }
  
  return description;
}

// オイル仕様の推奨度を取得
export function getOilSpecRecommendation(
  carInfo: CarInfo,
  oilSpec: { viscosity: string; api: string }
): {
  level: 'recommended' | 'acceptable' | 'not_recommended';
  reason: string;
} {
  const carSpec = getOilSpecForCar(carInfo);
  
  if (carSpec.viscosity === oilSpec.viscosity && carSpec.api === oilSpec.api) {
    return {
      level: 'recommended',
      reason: '車両に最適なオイル仕様です'
    };
  }
  
  if (isOilSpecCompatible(carSpec, oilSpec)) {
    return {
      level: 'acceptable',
      reason: '互換性がありますが、推奨仕様ではありません'
    };
  }
  
  return {
    level: 'not_recommended',
    reason: '車両に適さないオイル仕様です'
  };
}

// 車種別のオイルフィルター情報
export interface OilFilterInfo {
  partNumber: string;
  compatibleCars: string[];
  notes?: string;
}

const oilFilterDatabase: Record<string, OilFilterInfo> = {
  'honda_civic_2016_': {
    partNumber: '15400-PLM-A01',
    compatibleCars: ['Honda Civic 2016-2023'],
    notes: 'Honda純正互換'
  },
  'toyota_prius_2016_': {
    partNumber: '04152-YZZA1',
    compatibleCars: ['Toyota Prius 2016-2023'],
    notes: 'Toyota純正互換'
  },
  'nissan_leaf_2017_': {
    partNumber: '15208-65F0A',
    compatibleCars: ['Nissan Leaf 2017-2023'],
    notes: 'Nissan純正互換'
  }
};

// 車両用のオイルフィルター情報を取得
export function getOilFilterForCar(carInfo: CarInfo): OilFilterInfo | null {
  const carKey = generateCarKey(carInfo);
  return oilFilterDatabase[carKey] || null;
}
