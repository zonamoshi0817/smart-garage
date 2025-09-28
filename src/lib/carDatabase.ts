// src/lib/carDatabase.ts
// 車種データベース（カーセンサー参考）

export interface CarModel {
  id: string;
  name: string;
  modelCode?: string;
  bodyType: 'sedan' | 'hatchback' | 'suv' | 'wagon' | 'coupe' | 'convertible' | 'pickup' | 'minivan' | 'sports' | 'other';
  fuelType: 'gasoline' | 'hybrid' | 'electric' | 'diesel' | 'other';
  displacement?: number; // cc
  generation?: string; // 世代
  yearFrom?: number;
  yearTo?: number;
}

export interface CarManufacturer {
  id: string;
  name: string;
  nameKana: string;
  country: 'japan' | 'germany' | 'usa' | 'korea' | 'france' | 'italy' | 'uk' | 'other';
  models: CarModel[];
}

// 主要メーカーの車種データベース
export const carDatabase: CarManufacturer[] = [
  {
    id: 'toyota',
    name: 'トヨタ',
    nameKana: 'トヨタ',
    country: 'japan',
    models: [
      {
        id: 'prius',
        name: 'プリウス',
        modelCode: 'ZVW30',
        bodyType: 'sedan',
        fuelType: 'hybrid',
        displacement: 1798,
        generation: '3代目',
        yearFrom: 2009,
        yearTo: 2015
      },
      {
        id: 'prius-4th',
        name: 'プリウス',
        modelCode: 'ZVW50',
        bodyType: 'sedan',
        fuelType: 'hybrid',
        displacement: 1798,
        generation: '4代目',
        yearFrom: 2015,
        yearTo: 2022
      },
      {
        id: 'aqua',
        name: 'アクア',
        modelCode: 'NHP10',
        bodyType: 'hatchback',
        fuelType: 'hybrid',
        displacement: 1496,
        yearFrom: 2011,
        yearTo: 2021
      },
      {
        id: 'vitz',
        name: 'ヴィッツ',
        modelCode: 'XP130',
        bodyType: 'hatchback',
        fuelType: 'gasoline',
        displacement: 1329,
        yearFrom: 2010,
        yearTo: 2019
      },
      {
        id: 'corolla',
        name: 'カローラ',
        modelCode: 'E170',
        bodyType: 'sedan',
        fuelType: 'gasoline',
        displacement: 1798,
        yearFrom: 2012,
        yearTo: 2019
      },
      {
        id: 'camry',
        name: 'カムリ',
        modelCode: 'XV70',
        bodyType: 'sedan',
        fuelType: 'gasoline',
        displacement: 2487,
        yearFrom: 2017,
        yearTo: 2023
      },
      {
        id: 'harrier',
        name: 'ハリアー',
        modelCode: 'XU80',
        bodyType: 'suv',
        fuelType: 'hybrid',
        displacement: 2487,
        yearFrom: 2020,
        yearTo: 2024
      },
      {
        id: 'land-cruiser',
        name: 'ランドクルーザー',
        modelCode: 'J200',
        bodyType: 'suv',
        fuelType: 'gasoline',
        displacement: 4608,
        yearFrom: 2007,
        yearTo: 2021
      },
      {
        id: 'alphard',
        name: 'アルファード',
        modelCode: 'AH30',
        bodyType: 'minivan',
        fuelType: 'gasoline',
        displacement: 2494,
        yearFrom: 2015,
        yearTo: 2023
      },
      {
        id: 'vellfire',
        name: 'ヴェルファイア',
        modelCode: 'AH30',
        bodyType: 'minivan',
        fuelType: 'gasoline',
        displacement: 2494,
        yearFrom: 2015,
        yearTo: 2023
      }
    ]
  },
  {
    id: 'honda',
    name: 'ホンダ',
    nameKana: 'ホンダ',
    country: 'japan',
    models: [
      {
        id: 'fit',
        name: 'フィット',
        modelCode: 'GK5',
        bodyType: 'hatchback',
        fuelType: 'hybrid',
        displacement: 1496,
        generation: '3代目',
        yearFrom: 2013,
        yearTo: 2019
      },
      {
        id: 'fit-4th',
        name: 'フィット',
        modelCode: 'GR3',
        bodyType: 'hatchback',
        fuelType: 'hybrid',
        displacement: 1496,
        generation: '4代目',
        yearFrom: 2020,
        yearTo: 2024
      },
      {
        id: 'civic',
        name: 'シビック',
        modelCode: 'FC1',
        bodyType: 'sedan',
        fuelType: 'gasoline',
        displacement: 1496,
        yearFrom: 2017,
        yearTo: 2021
      },
      {
        id: 'accord',
        name: 'アコード',
        modelCode: 'CU2',
        bodyType: 'sedan',
        fuelType: 'gasoline',
        displacement: 2356,
        yearFrom: 2008,
        yearTo: 2017
      },
      {
        id: 'cr-v',
        name: 'CR-V',
        modelCode: 'RW5',
        bodyType: 'suv',
        fuelType: 'gasoline',
        displacement: 1996,
        yearFrom: 2017,
        yearTo: 2023
      },
      {
        id: 'stepwgn',
        name: 'ステップワゴン',
        modelCode: 'RK5',
        bodyType: 'minivan',
        fuelType: 'gasoline',
        displacement: 1996,
        yearFrom: 2015,
        yearTo: 2022
      },
      {
        id: 'odyssey',
        name: 'オデッセイ',
        modelCode: 'RC1',
        bodyType: 'minivan',
        fuelType: 'gasoline',
        displacement: 2356,
        yearFrom: 2013,
        yearTo: 2020
      },
      {
        id: 'nsx',
        name: 'NSX',
        modelCode: 'NC1',
        bodyType: 'sports',
        fuelType: 'hybrid',
        displacement: 3493,
        yearFrom: 2016,
        yearTo: 2022
      }
    ]
  },
  {
    id: 'nissan',
    name: '日産',
    nameKana: 'ニッサン',
    country: 'japan',
    models: [
      {
        id: 'leaf',
        name: 'リーフ',
        modelCode: 'ZE1',
        bodyType: 'hatchback',
        fuelType: 'electric',
        yearFrom: 2017,
        yearTo: 2023
      },
      {
        id: 'note',
        name: 'ノート',
        modelCode: 'E12',
        bodyType: 'hatchback',
        fuelType: 'hybrid',
        displacement: 1198,
        yearFrom: 2016,
        yearTo: 2022
      },
      {
        id: 'march',
        name: 'マーチ',
        modelCode: 'K13',
        bodyType: 'hatchback',
        fuelType: 'gasoline',
        displacement: 1198,
        yearFrom: 2010,
        yearTo: 2019
      },
      {
        id: 'skyline',
        name: 'スカイライン',
        modelCode: 'V37',
        bodyType: 'sedan',
        fuelType: 'gasoline',
        displacement: 1997,
        yearFrom: 2014,
        yearTo: 2022
      },
      {
        id: 'x-trail',
        name: 'エクストレイル',
        modelCode: 'T32',
        bodyType: 'suv',
        fuelType: 'gasoline',
        displacement: 1997,
        yearFrom: 2014,
        yearTo: 2022
      },
      {
        id: 'serena',
        name: 'セレナ',
        modelCode: 'C27',
        bodyType: 'minivan',
        fuelType: 'gasoline',
        displacement: 1997,
        yearFrom: 2016,
        yearTo: 2023
      },
      {
        id: 'elgrand',
        name: 'エルグランド',
        modelCode: 'E52',
        bodyType: 'minivan',
        fuelType: 'gasoline',
        displacement: 3498,
        yearFrom: 2010,
        yearTo: 2022
      },
      {
        id: 'gtr',
        name: 'GT-R',
        modelCode: 'R35',
        bodyType: 'sports',
        fuelType: 'gasoline',
        displacement: 3799,
        yearFrom: 2007,
        yearTo: 2024
      }
    ]
  },
  {
    id: 'mazda',
    name: 'マツダ',
    nameKana: 'マツダ',
    country: 'japan',
    models: [
      {
        id: 'demio',
        name: 'デミオ',
        modelCode: 'DJ',
        bodyType: 'hatchback',
        fuelType: 'gasoline',
        displacement: 1496,
        yearFrom: 2014,
        yearTo: 2019
      },
      {
        id: 'axela',
        name: 'アクセラ',
        modelCode: 'BM',
        bodyType: 'sedan',
        fuelType: 'gasoline',
        displacement: 1998,
        yearFrom: 2013,
        yearTo: 2019
      },
      {
        id: 'atenza',
        name: 'アテンザ',
        modelCode: 'GJ',
        bodyType: 'sedan',
        fuelType: 'gasoline',
        displacement: 1998,
        yearFrom: 2012,
        yearTo: 2018
      },
      {
        id: 'cx-5',
        name: 'CX-5',
        modelCode: 'KF',
        bodyType: 'suv',
        fuelType: 'gasoline',
        displacement: 1998,
        yearFrom: 2017,
        yearTo: 2023
      },
      {
        id: 'cx-8',
        name: 'CX-8',
        modelCode: 'KE',
        bodyType: 'suv',
        fuelType: 'gasoline',
        displacement: 1998,
        yearFrom: 2017,
        yearTo: 2023
      },
      {
        id: 'roadster',
        name: 'ロードスター',
        modelCode: 'ND',
        bodyType: 'convertible',
        fuelType: 'gasoline',
        displacement: 1496,
        yearFrom: 2015,
        yearTo: 2024
      }
    ]
  },
  {
    id: 'subaru',
    name: 'スバル',
    nameKana: 'スバル',
    country: 'japan',
    models: [
      {
        id: 'impreza',
        name: 'インプレッサ',
        modelCode: 'GJ',
        bodyType: 'sedan',
        fuelType: 'gasoline',
        displacement: 1995,
        yearFrom: 2012,
        yearTo: 2016
      },
      {
        id: 'impreza-wrx',
        name: 'インプレッサWRX',
        modelCode: 'GJ',
        bodyType: 'sedan',
        fuelType: 'gasoline',
        displacement: 1994,
        yearFrom: 2014,
        yearTo: 2021
      },
      {
        id: 'legacy',
        name: 'レガシィ',
        modelCode: 'BM',
        bodyType: 'sedan',
        fuelType: 'gasoline',
        displacement: 1995,
        yearFrom: 2014,
        yearTo: 2020
      },
      {
        id: 'forester',
        name: 'フォレスター',
        modelCode: 'SJ',
        bodyType: 'suv',
        fuelType: 'gasoline',
        displacement: 1995,
        yearFrom: 2012,
        yearTo: 2018
      },
      {
        id: 'outback',
        name: 'アウトバック',
        modelCode: 'BS',
        bodyType: 'wagon',
        fuelType: 'gasoline',
        displacement: 2494,
        yearFrom: 2014,
        yearTo: 2020
      },
      {
        id: 'levorg',
        name: 'レヴォーグ',
        modelCode: 'VM',
        bodyType: 'wagon',
        fuelType: 'gasoline',
        displacement: 1995,
        yearFrom: 2014,
        yearTo: 2020
      }
    ]
  },
  {
    id: 'suzuki',
    name: 'スズキ',
    nameKana: 'スズキ',
    country: 'japan',
    models: [
      {
        id: 'wagon-r',
        name: 'ワゴンR',
        modelCode: 'MH23S',
        bodyType: 'hatchback',
        fuelType: 'gasoline',
        displacement: 658,
        yearFrom: 2012,
        yearTo: 2022
      },
      {
        id: 'alto',
        name: 'アルト',
        modelCode: 'HA36S',
        bodyType: 'hatchback',
        fuelType: 'gasoline',
        displacement: 658,
        yearFrom: 2014,
        yearTo: 2022
      },
      {
        id: 'swift',
        name: 'スイフト',
        modelCode: 'ZC33S',
        bodyType: 'hatchback',
        fuelType: 'gasoline',
        displacement: 1197,
        yearFrom: 2017,
        yearTo: 2023
      },
      {
        id: 'ignis',
        name: 'イグニス',
        modelCode: 'MH12S',
        bodyType: 'hatchback',
        fuelType: 'hybrid',
        displacement: 1197,
        yearFrom: 2016,
        yearTo: 2023
      },
      {
        id: 'jimny',
        name: 'ジムニー',
        modelCode: 'JB64W',
        bodyType: 'suv',
        fuelType: 'gasoline',
        displacement: 1462,
        yearFrom: 2018,
        yearTo: 2024
      },
      {
        id: 'every',
        name: 'エブリイ',
        modelCode: 'DA64V',
        bodyType: 'minivan',
        fuelType: 'gasoline',
        displacement: 658,
        yearFrom: 2011,
        yearTo: 2022
      }
    ]
  },
  {
    id: 'daihatsu',
    name: 'ダイハツ',
    nameKana: 'ダイハツ',
    country: 'japan',
    models: [
      {
        id: 'tanto',
        name: 'タント',
        modelCode: 'L375S',
        bodyType: 'hatchback',
        fuelType: 'gasoline',
        displacement: 658,
        yearFrom: 2019,
        yearTo: 2024
      },
      {
        id: 'mira',
        name: 'ミラ',
        modelCode: 'L275S',
        bodyType: 'hatchback',
        fuelType: 'gasoline',
        displacement: 658,
        yearFrom: 2018,
        yearTo: 2023
      },
      {
        id: 'move',
        name: 'ムーヴ',
        modelCode: 'L175S',
        bodyType: 'hatchback',
        fuelType: 'gasoline',
        displacement: 658,
        yearFrom: 2014,
        yearTo: 2021
      },
      {
        id: 'terios',
        name: 'テリオス',
        modelCode: 'J200G',
        bodyType: 'suv',
        fuelType: 'gasoline',
        displacement: 1495,
        yearFrom: 2006,
        yearTo: 2017
      },
      {
        id: 'hijet',
        name: 'ハイゼット',
        modelCode: 'S500P',
        bodyType: 'pickup',
        fuelType: 'gasoline',
        displacement: 658,
        yearFrom: 2014,
        yearTo: 2022
      }
    ]
  }
];

// ヘルパー関数
export function getManufacturers(): CarManufacturer[] {
  return carDatabase;
}

export function getManufacturerById(id: string): CarManufacturer | undefined {
  return carDatabase.find(manufacturer => manufacturer.id === id);
}

export function getModelsByManufacturer(manufacturerId: string): CarModel[] {
  const manufacturer = getManufacturerById(manufacturerId);
  return manufacturer ? manufacturer.models : [];
}

export function getModelById(manufacturerId: string, modelId: string): CarModel | undefined {
  const models = getModelsByManufacturer(manufacturerId);
  return models.find(model => model.id === modelId);
}

export function searchModels(query: string): { manufacturer: CarManufacturer; model: CarModel }[] {
  const results: { manufacturer: CarManufacturer; model: CarModel }[] = [];
  
  carDatabase.forEach(manufacturer => {
    manufacturer.models.forEach(model => {
      if (
        model.name.toLowerCase().includes(query.toLowerCase()) ||
        (model.modelCode && model.modelCode.toLowerCase().includes(query.toLowerCase()))
      ) {
        results.push({ manufacturer, model });
      }
    });
  });
  
  return results;
}

export function getModelsByBodyType(bodyType: CarModel['bodyType']): { manufacturer: CarManufacturer; model: CarModel }[] {
  const results: { manufacturer: CarManufacturer; model: CarModel }[] = [];
  
  carDatabase.forEach(manufacturer => {
    manufacturer.models.forEach(model => {
      if (model.bodyType === bodyType) {
        results.push({ manufacturer, model });
      }
    });
  });
  
  return results;
}

