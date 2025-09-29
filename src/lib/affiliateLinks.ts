// src/lib/affiliateLinks.ts
"use client";

// アフィリエイト設定の型定義
export interface AffiliateConfig {
  amazon: {
    tag: string;
    baseUrl: string;
  };
  rakuten: {
    id: string;
    baseUrl: string;
  };
}

// アフィリエイト設定（環境変数から取得）
const affiliateConfig: AffiliateConfig = {
  amazon: {
    tag: process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG || 'smartgarage-22',
    baseUrl: 'https://amazon.co.jp'
  },
  rakuten: {
    id: process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID || 'smartgarage',
    baseUrl: 'https://item.rakuten.co.jp'
  }
};

// UTMパラメータの型定義
export interface UTMParams {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content?: string;
  utm_term?: string;
}

// オイル関連の商品マッピング
export interface OilProduct {
  sku: string;
  title: string;
  store: 'amazon' | 'rakuten';
  asin?: string; // Amazon商品ID
  rakutenId?: string; // 楽天商品ID
  category: 'oil' | 'filter';
  grade: 'oem' | 'value' | 'premium';
  viscosity: string;
  api: string;
  volumeL: number;
  price?: number;
  imageUrl?: string;
}

// 車種別のオイル商品データベース
const oilProductsDatabase: Record<string, OilProduct[]> = {
  'honda_civic': [
    {
      sku: 'oil-0w20-honda-oem',
      title: 'Honda純正同等 0W-20 エンジンオイル 4L',
      store: 'amazon',
      asin: 'B08XYZ123',
      category: 'oil',
      grade: 'oem',
      viscosity: '0W-20',
      api: 'SP',
      volumeL: 4.0,
      price: 3200
    },
    {
      sku: 'oil-0w20-honda-value',
      title: 'コスパ重視 0W-20 エンジンオイル 4L',
      store: 'rakuten',
      rakutenId: 'oil-value-001',
      category: 'oil',
      grade: 'value',
      viscosity: '0W-20',
      api: 'SP',
      volumeL: 4.0,
      price: 1800
    },
    {
      sku: 'oil-0w20-honda-premium',
      title: 'ハイグレード 0W-20 エンジンオイル 4L',
      store: 'amazon',
      asin: 'B08XYZ456',
      category: 'oil',
      grade: 'premium',
      viscosity: '0W-20',
      api: 'SP',
      volumeL: 4.0,
      price: 4500
    },
    {
      sku: 'filter-honda-civic',
      title: 'Honda Civic用 純正互換 オイルフィルター',
      store: 'amazon',
      asin: 'B08XYZ789',
      category: 'filter',
      grade: 'oem',
      viscosity: '0W-20',
      api: 'SP',
      volumeL: 0,
      price: 800
    }
  ],
  'toyota_prius': [
    {
      sku: 'oil-0w20-toyota-oem',
      title: 'Toyota純正同等 0W-20 エンジンオイル 4.2L',
      store: 'amazon',
      asin: 'B08ABC123',
      category: 'oil',
      grade: 'oem',
      viscosity: '0W-20',
      api: 'SP',
      volumeL: 4.2,
      price: 3500
    },
    {
      sku: 'oil-0w20-toyota-value',
      title: 'コスパ重視 0W-20 エンジンオイル 4.2L',
      store: 'rakuten',
      rakutenId: 'oil-toyota-value-001',
      category: 'oil',
      grade: 'value',
      viscosity: '0W-20',
      api: 'SP',
      volumeL: 4.2,
      price: 2000
    },
    {
      sku: 'oil-0w20-toyota-premium',
      title: 'ハイグレード 0W-20 エンジンオイル 4.2L',
      store: 'amazon',
      asin: 'B08ABC456',
      category: 'oil',
      grade: 'premium',
      viscosity: '0W-20',
      api: 'SP',
      volumeL: 4.2,
      price: 4800
    },
    {
      sku: 'filter-toyota-prius',
      title: 'Toyota Prius用 純正互換 オイルフィルター',
      store: 'amazon',
      asin: 'B08ABC789',
      category: 'filter',
      grade: 'oem',
      viscosity: '0W-20',
      api: 'SP',
      volumeL: 0,
      price: 900
    }
  ]
};

// 汎用オイル商品（車種が特定できない場合）
const genericOilProducts: OilProduct[] = [
  {
    sku: 'oil-0w20-generic-oem',
    title: '純正同等 0W-20 エンジンオイル 4L',
    store: 'amazon',
    asin: 'B08GENERIC1',
    category: 'oil',
    grade: 'oem',
    viscosity: '0W-20',
    api: 'SP',
    volumeL: 4.0,
    price: 3000
  },
  {
    sku: 'oil-0w20-generic-value',
    title: 'コスパ重視 0W-20 エンジンオイル 4L',
    store: 'rakuten',
    rakutenId: 'oil-generic-value-001',
    category: 'oil',
    grade: 'value',
    viscosity: '0W-20',
    api: 'SP',
    volumeL: 4.0,
    price: 1500
  },
  {
    sku: 'oil-0w20-generic-premium',
    title: 'ハイグレード 0W-20 エンジンオイル 4L',
    store: 'amazon',
    asin: 'B08GENERIC2',
    category: 'oil',
    grade: 'premium',
    viscosity: '0W-20',
    api: 'SP',
    volumeL: 4.0,
    price: 4200
  },
  {
    sku: 'filter-generic',
    title: '純正互換 オイルフィルター',
    store: 'amazon',
    asin: 'B08GENERIC3',
    category: 'filter',
    grade: 'oem',
    viscosity: '0W-20',
    api: 'SP',
    volumeL: 0,
    price: 700
  }
];

// UTMパラメータを生成
export function generateUTMParams(
  campaign: string,
  content?: string,
  term?: string
): UTMParams {
  return {
    utm_source: 'smartgarage',
    utm_medium: 'app',
    utm_campaign: campaign,
    utm_content: content,
    utm_term: term
  };
}

// UTMパラメータをURLに追加
export function addUTMToUrl(url: string, utmParams: UTMParams): string {
  const urlObj = new URL(url);
  
  Object.entries(utmParams).forEach(([key, value]) => {
    if (value) {
      urlObj.searchParams.set(key, value);
    }
  });
  
  return urlObj.toString();
}

// Amazonアフィリエイトリンクを生成
export function generateAmazonAffiliateLink(
  asin: string,
  utmParams: UTMParams
): string {
  const baseUrl = `${affiliateConfig.amazon.baseUrl}/dp/${asin}`;
  const urlWithTag = `${baseUrl}?tag=${affiliateConfig.amazon.tag}`;
  return addUTMToUrl(urlWithTag, utmParams);
}

// 楽天アフィリエイトリンクを生成
export function generateRakutenAffiliateLink(
  rakutenId: string,
  utmParams: UTMParams
): string {
  const baseUrl = `${affiliateConfig.rakuten.baseUrl}/example/${rakutenId}`;
  const urlWithAffiliate = `${baseUrl}?scid=af_ich_link_urltxt&m=${affiliateConfig.rakuten.id}`;
  return addUTMToUrl(urlWithAffiliate, utmParams);
}

// 車種別のオイル商品を取得
export function getOilProductsForCar(
  carMake: string,
  carModel: string,
  oilSpec: { viscosity: string; api: string; volumeL: number }
): OilProduct[] {
  // 型チェックとフォールバック
  const make = typeof carMake === 'string' ? carMake : 'generic';
  const model = typeof carModel === 'string' ? carModel : 'generic';
  
  const key = `${make.toLowerCase()}_${model.toLowerCase()}`;
  const carProducts = oilProductsDatabase[key];
  
  if (carProducts) {
    // 車種に合致する商品をフィルタリング
    return carProducts.filter(product => 
      product.viscosity === oilSpec.viscosity &&
      product.api === oilSpec.api
    );
  }
  
  // 車種が特定できない場合は汎用商品を返す
  if (!oilSpec || !oilSpec.viscosity || !oilSpec.api) {
    console.warn("オイル仕様が不完全です:", oilSpec);
    return genericOilProducts.slice(0, 3); // 最初の3つを返す
  }
  
  return genericOilProducts.filter(product => 
    product.viscosity === oilSpec.viscosity &&
    product.api === oilSpec.api
  );
}

// 購入候補を生成（アフィリエイトリンク付き）
export function generatePurchaseCandidatesWithAffiliate(
  carId: string,
  oilSpec: { viscosity: string; api: string; volumeL: number },
  carInfo: { make: string; model: string; year?: number }
) {
  // 型チェックとフォールバック
  const make = typeof carInfo.make === 'string' ? carInfo.make : 'generic';
  const model = typeof carInfo.model === 'string' ? carInfo.model : 'generic';
  
  const products = getOilProductsForCar(make, model, oilSpec);
  const utmParams = generateUTMParams('oil-reminder', carId);
  
  return products.map(product => {
    let affiliateUrl: string;
    
    if (product.store === 'amazon' && product.asin) {
      affiliateUrl = generateAmazonAffiliateLink(product.asin, utmParams);
    } else if (product.store === 'rakuten' && product.rakutenId) {
      affiliateUrl = generateRakutenAffiliateLink(product.rakutenId, utmParams);
    } else {
      // フォールバック
      affiliateUrl = product.store === 'amazon' 
        ? `${affiliateConfig.amazon.baseUrl}/s?k=${encodeURIComponent(product.title)}&tag=${affiliateConfig.amazon.tag}`
        : `${affiliateConfig.rakuten.baseUrl}/search/mall/${encodeURIComponent(product.title)}/`;
    }
    
    return {
      sku: product.sku,
      title: product.title,
      store: product.store,
      url: affiliateUrl,
      price: product.price,
      imageUrl: product.imageUrl,
      category: product.category,
      grade: product.grade
    };
  });
}

// 予約URLを生成（楽天Car等）
export function generateReservationUrl(carId: string): string {
  const baseUrl = 'https://af.rakuten.co.jp/example/';
  const utmParams = generateUTMParams('oil-reminder', carId);
  return addUTMToUrl(baseUrl, utmParams);
}

// アフィリエイトリンクのクリックを追跡
export function trackAffiliateClick(
  sku: string,
  store: string,
  carId: string,
  action: 'click' | 'purchase' = 'click'
): void {
  // アナリティクスイベントを送信
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'affiliate_click', {
      event_category: 'oil_reminder',
      event_label: `${store}_${sku}`,
      custom_parameter_1: carId,
      custom_parameter_2: action
    });
  }
  
  // カスタムイベントも送信
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('affiliateClick', {
      detail: {
        sku,
        store,
        carId,
        action,
        timestamp: new Date().toISOString()
      }
    }));
  }
  
  console.log(`アフィリエイトクリックを追跡: ${store}/${sku}/${action}`, { carId });
}

// アフィリエイト収益の推定
export function estimateAffiliateRevenue(
  clicks: number,
  conversionRate: number = 0.05,
  averageOrderValue: number = 3000,
  commissionRate: number = 0.03
): { clicks: number; purchases: number; revenue: number; commission: number } {
  const purchases = Math.floor(clicks * conversionRate);
  const revenue = purchases * averageOrderValue;
  const commission = revenue * commissionRate;
  
  return {
    clicks,
    purchases,
    revenue,
    commission: Math.round(commission)
  };
}
