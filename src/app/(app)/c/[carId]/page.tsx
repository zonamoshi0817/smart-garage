'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Car, Customization, MaintenanceRecord } from '@/types';
import { getPublicCarData } from '@/lib/publicCars';
import { timestampToDate } from '@/lib/converters';

export default function PublicCarPage() {
  const params = useParams();
  const carId = params.carId as string;
  const [car, setCar] = useState<Car | null>(null);
  const [customizations, setCustomizations] = useState<Customization[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadPublicCarData() {
      try {
        if (!carId) {
          setNotFound(true);
          setIsLoading(false);
          return;
        }

        const data = await getPublicCarData(carId);
        
        if (!data || !data.car) {
          setNotFound(true);
          setIsLoading(false);
          return;
        }

        setCar(data.car);
        setCustomizations(data.customizations);
        setMaintenanceRecords(data.maintenanceRecords);
      } catch (error) {
        console.error('公開車両データの読み込みエラー:', error);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }

    if (carId) {
      loadPublicCarData();
    }
  }, [carId]);

  // OGタグを動的に設定
  useEffect(() => {
    if (!car) return;

    const title = `${car.name} - GarageLog`;
    const description = car.publicTagline || `${car.name}のカスタマイズ・メンテナンス履歴を公開中`;
    const image = car.imagePath || `${window.location.origin}/icon.png`;
    const url = `${window.location.origin}/c/${car.id}`;

    // メタタグを更新
    document.title = title;
    
    // OGタグを更新または追加
    const updateMetaTag = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    const updateMetaName = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:image', image);
    updateMetaTag('og:url', url);
    updateMetaTag('og:type', 'website');
    updateMetaName('twitter:card', 'summary_large_image');
    updateMetaName('twitter:title', title);
    updateMetaName('twitter:description', description);
    updateMetaName('twitter:image', image);
    updateMetaName('description', description);
  }, [car]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (notFound || !car) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ページが見つかりません</h1>
          <p className="text-gray-600">この車両は公開されていないか、存在しません。</p>
        </div>
      </div>
    );
  }

  // 公開設定の確認
  if (!car.isPublic) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">非公開</h1>
          <p className="text-gray-600">この車両は公開されていません。</p>
        </div>
      </div>
    );
  }

  // OWNER'S PICKのカスタマイズを取得
  const ownerPicks = car.ownerPicks
    ? customizations.filter(c => car.ownerPicks?.includes(c.id || ''))
    : [];

  // 公開設定されているカスタマイズのみを取得
  const publicCustomizations = customizations.filter(c => c.isPublic);

  // カテゴリ別にカスタマイズを分類
  const customizationsByCategory: Record<string, Customization[]> = {};
  publicCustomizations.forEach(custom => {
    custom.categories.forEach(category => {
      if (!customizationsByCategory[category]) {
        customizationsByCategory[category] = [];
      }
      customizationsByCategory[category].push(custom);
    });
  });

  // 所有期間の計算
  const ownedSince = car.ownedSince ? timestampToDate(car.ownedSince) : null;
  const ownershipPeriod = ownedSince
    ? (() => {
        const now = new Date();
        const years = now.getFullYear() - ownedSince.getFullYear();
        const months = now.getMonth() - ownedSince.getMonth();
        const totalMonths = years * 12 + months;
        const displayYears = Math.floor(totalMonths / 12);
        const displayMonths = totalMonths % 12;
        if (displayYears > 0 && displayMonths > 0) {
          return `${displayYears}年${displayMonths}ヶ月`;
        } else if (displayYears > 0) {
          return `${displayYears}年`;
        } else {
          return `${displayMonths}ヶ月`;
        }
      })()
    : null;

  // 年間走行距離の計算
  const annualKm = ownedSince && car.odoKm
    ? (() => {
        const now = new Date();
        const months = (now.getFullYear() - ownedSince.getFullYear()) * 12 + (now.getMonth() - ownedSince.getMonth());
        if (months > 0) {
          return Math.round((car.odoKm / months) * 12);
        }
        return null;
      })()
    : null;

  // 最新のメンテナンス記録
  const latestMaintenance = maintenanceRecords.length > 0
    ? [...maintenanceRecords]      .sort((a, b) => {
        const aDate = timestampToDate(a.date)?.getTime() || 0;
        const bDate = timestampToDate(b.date)?.getTime() || 0;
        return bDate - aDate;
      })[0]
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヒーローセクション */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* メイン写真 */}
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
              {car.imagePath ? (
                <img
                  src={car.imagePath}
                  alt={car.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            {/* 車両情報 */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                {car.name}
              </h1>
              <div className="flex flex-wrap gap-2 mb-4">
                {car.modelCode && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {car.modelCode}
                  </span>
                )}
                {car.year && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                    {car.year}年式
                  </span>
                )}
              </div>
              {car.publicTagline && (
                <p className="text-lg text-gray-700 mb-4">{car.publicTagline}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 基本プロフィール */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">基本プロフィール</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {car.driveType && (
              <div>
                <div className="text-sm text-gray-500 mb-1">駆動方式</div>
                <div className="text-base font-medium text-gray-900">{car.driveType}</div>
              </div>
            )}
            {car.transmission && (
              <div>
                <div className="text-sm text-gray-500 mb-1">ミッション</div>
                <div className="text-base font-medium text-gray-900">{car.transmission}</div>
              </div>
            )}
            {car.bodyColor && (
              <div>
                <div className="text-sm text-gray-500 mb-1">ボディカラー</div>
                <div className="text-base font-medium text-gray-900">{car.bodyColor}</div>
              </div>
            )}
            {car.odoKm !== undefined && (
              <div>
                <div className="text-sm text-gray-500 mb-1">現在の走行距離</div>
                <div className="text-base font-medium text-gray-900">{car.odoKm.toLocaleString()} km</div>
              </div>
            )}
          </div>
        </div>

        {/* 状態・履歴のサマリ */}
        {(ownershipPeriod || annualKm) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">状態・履歴</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ownershipPeriod && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">所有期間</div>
                  <div className="text-lg font-medium text-gray-900">{ownershipPeriod}</div>
                </div>
              )}
              {annualKm && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">年間走行距離</div>
                  <div className="text-lg font-medium text-gray-900">約{annualKm.toLocaleString()}km</div>
                </div>
              )}
              {car.odoKm !== undefined && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">現在の走行距離</div>
                  <div className="text-lg font-medium text-gray-900">{car.odoKm.toLocaleString()} km</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* OWNER'S PICK */}
        {ownerPicks.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">OWNER'S PICK</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ownerPicks.map((pick) => {
                const pickDate = timestampToDate(pick.date);
                return (
                  <div key={pick.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-1">
                      {pick.categories.join(' / ')}
                    </div>
                    <div className="font-semibold text-gray-900 mb-2">
                      {pick.brand && `${pick.brand} `}
                      {pick.title}
                    </div>
                    {pickDate && (
                      <div className="text-xs text-gray-600">
                        装着：{pickDate.getFullYear()}年{pickDate.getMonth() + 1}月
                        {pick.odoKm && `（走行 ${pick.odoKm.toLocaleString()}km）`}
                      </div>
                    )}
                    {pick.link && (
                      <a
                        href={pick.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                      >
                        商品リンク →
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* カスタム一覧 */}
        {Object.keys(customizationsByCategory).length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">カスタム一覧</h2>
            <div className="space-y-4">
              {Object.entries(customizationsByCategory).map(([category, items]) => {
                const categoryDate = timestampToDate(items[0]?.date);
                return (
                  <div key={category}>
                    <h3 className="font-semibold text-gray-900 mb-2">{category}</h3>
                    <ul className="space-y-1">
                      {items.map((item) => (
                        <li key={item.id} className="text-sm text-gray-700">
                          {item.brand && `${item.brand} `}
                          {item.title}
                          {categoryDate && (
                            <span className="text-gray-500 ml-2">
                              （{categoryDate.getFullYear()}年装着）
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 記録件数サマリ */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">記録サマリ</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {maintenanceRecords.length > 0 && (
              <div>
                <div className="text-sm text-gray-500 mb-1">メンテ記録</div>
                <div className="text-lg font-medium text-gray-900">{maintenanceRecords.length}件</div>
              </div>
            )}
            {publicCustomizations.length > 0 && (
              <div>
                <div className="text-sm text-gray-500 mb-1">カスタム</div>
                <div className="text-lg font-medium text-gray-900">{publicCustomizations.length}件</div>
              </div>
            )}
          </div>
        </div>

        {/* 直近メンテナンス */}
        {latestMaintenance && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">直近メンテナンス</h2>
            <div>
              <div className="font-medium text-gray-900">{latestMaintenance.title}</div>
              {latestMaintenance.date && (
                <div className="text-sm text-gray-600 mt-1">
                  {(() => {
                    const date = timestampToDate(latestMaintenance.date);
                    return date
                      ? `${date.getFullYear()}年${date.getMonth() + 1}月`
                      : '';
                  })()}
                  {latestMaintenance.mileage && `（ODO ${latestMaintenance.mileage.toLocaleString()}km）`}
                </div>
              )}
            </div>
          </div>
        )}

        {/* オーナー情報 */}
        {(car.ownerHandle || car.ownerRegion || car.ownerSocialLinks) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">オーナー情報</h2>
            <div className="space-y-2">
              {car.ownerHandle && (
                <div>
                  <span className="text-sm text-gray-500">オーナー：</span>
                  <span className="text-base font-medium text-gray-900">{car.ownerHandle}</span>
                </div>
              )}
              {car.ownerRegion && (
                <div>
                  <span className="text-sm text-gray-500">地域：</span>
                  <span className="text-base text-gray-900">{car.ownerRegion}</span>
                </div>
              )}
              {car.ownerSocialLinks && (
                <div className="flex gap-4 mt-4">
                  {car.ownerSocialLinks.instagram && (
                    <a
                      href={car.ownerSocialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Instagram
                    </a>
                  )}
                  {car.ownerSocialLinks.twitter && (
                    <a
                      href={car.ownerSocialLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      X (Twitter)
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

