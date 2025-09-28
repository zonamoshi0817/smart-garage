// src/lib/defaultImages.ts
// デフォルト画像の管理

export interface DefaultImage {
  id: string;
  name: string;
  path: string;
  category: 'sedan' | 'suv' | 'sports' | 'hatchback' | 'truck' | 'generic';
  description: string;
}

export const defaultImages: DefaultImage[] = [
  {
    id: 'generic-car',
    name: '一般的な車',
    path: '/car.jpg',
    category: 'generic',
    description: '汎用的な車両画像'
  },
  {
    id: 'sedan-blue',
    name: 'セダン（青）',
    path: '/default-images/sedan-blue.jpg',
    category: 'sedan',
    description: '青いセダンタイプの車両'
  },
  {
    id: 'sedan-silver',
    name: 'セダン（シルバー）',
    path: '/default-images/sedan-silver.jpg',
    category: 'sedan',
    description: 'シルバーのセダンタイプの車両'
  },
  {
    id: 'suv-black',
    name: 'SUV（黒）',
    path: '/default-images/suv-black.jpg',
    category: 'suv',
    description: '黒いSUVタイプの車両'
  },
  {
    id: 'sports-red',
    name: 'スポーツカー（赤）',
    path: '/default-images/sports-red.jpg',
    category: 'sports',
    description: '赤いスポーツカータイプの車両'
  },
  {
    id: 'hatchback-white',
    name: 'ハッチバック（白）',
    path: '/default-images/hatchback-white.jpg',
    category: 'hatchback',
    description: '白いハッチバックタイプの車両'
  },
  {
    id: 'truck-gray',
    name: 'トラック（グレー）',
    path: '/default-images/truck-gray.jpg',
    category: 'truck',
    description: 'グレーのトラックタイプの車両'
  }
];

// カテゴリ別に画像を取得
export function getImagesByCategory(category: DefaultImage['category']): DefaultImage[] {
  return defaultImages.filter(img => img.category === category);
}

// 全てのカテゴリを取得
export function getAllCategories(): DefaultImage['category'][] {
  return Array.from(new Set(defaultImages.map(img => img.category)));
}

// IDで画像を取得
export function getImageById(id: string): DefaultImage | undefined {
  return defaultImages.find(img => img.id === id);
}

// ランダムな画像を取得
export function getRandomImage(): DefaultImage {
  const randomIndex = Math.floor(Math.random() * defaultImages.length);
  return defaultImages[randomIndex];
}

// カテゴリ別のランダム画像を取得
export function getRandomImageByCategory(category: DefaultImage['category']): DefaultImage {
  const categoryImages = getImagesByCategory(category);
  if (categoryImages.length === 0) {
    return defaultImages[0]; // フォールバック
  }
  const randomIndex = Math.floor(Math.random() * categoryImages.length);
  return categoryImages[randomIndex];
}
