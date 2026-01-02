/**
 * SNS共有（通常リンク）用公開ページコンポーネント
 * type="normal"のShareProfile用
 */

'use client';

import { useEffect, useState } from 'react';
import { storage } from '@/lib/firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import type { ShareProfile, Car } from '@/types';

interface SNSSharePublicPageProps {
  shareProfile: ShareProfile;
  vehicle: Car;
  maintenanceRecords: any[];
  customizations: any[];
}

export default function SNSSharePublicPage({
  shareProfile,
  vehicle,
  maintenanceRecords,
  customizations,
}: SNSSharePublicPageProps) {
  const sns = shareProfile.sns || {};
  const [galleryImages, setGalleryImages] = useState<Array<{ id: string; url: string; caption?: string }>>([]);
  const [loadingImages, setLoadingImages] = useState(true);

  // ギャラリー画像を読み込み
  useEffect(() => {
    const loadGalleryImages = async () => {
      if (!sns.gallery || sns.gallery.length === 0) {
        setLoadingImages(false);
        return;
      }

      try {
        const imagePromises = sns.gallery.map(async (item) => {
          try {
            const storageRef = ref(storage, item.path);
            const url = await getDownloadURL(storageRef);
            return { id: item.id, url, caption: item.caption };
          } catch (error) {
            console.error(`Failed to load image ${item.id}:`, error);
            return null;
          }
        });

        const images = (await Promise.all(imagePromises)).filter(Boolean) as Array<{ id: string; url: string; caption?: string }>;
        setGalleryImages(images);
      } catch (error) {
        console.error('Failed to load gallery images:', error);
      } finally {
        setLoadingImages(false);
      }
    };

    loadGalleryImages();
  }, [sns.gallery]);

  // ヒーロー画像（ギャラリーの最初の画像、または車両画像）
  const heroImage = galleryImages.length > 0 ? galleryImages[0].url : vehicle.imageUrl || null;

  // ハイライト情報を計算
  const highlights = [];
  if (vehicle.mileageKm) {
    highlights.push({ label: '走行距離', value: `${vehicle.mileageKm.toLocaleString()}km` });
  }
  
  // 直近整備日
  if (maintenanceRecords.length > 0) {
    const latestMaintenance = maintenanceRecords
      .filter(r => r.date)
      .sort((a, b) => {
        const dateA = typeof a.date === 'string' ? new Date(a.date) : (a.date?.toDate?.() || new Date(a.date));
        const dateB = typeof b.date === 'string' ? new Date(b.date) : (b.date?.toDate?.() || new Date(b.date));
        return dateB.getTime() - dateA.getTime();
      })[0];
    
    if (latestMaintenance) {
      const date = typeof latestMaintenance.date === 'string' 
        ? new Date(latestMaintenance.date) 
        : (latestMaintenance.date?.toDate?.() || new Date(latestMaintenance.date));
      highlights.push({ 
        label: '直近整備', 
        value: new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
      });
    }
  }

  // 主要カスタム（sns.highlightPartsまたはcustomizationsから）
  if (sns.highlightParts && sns.highlightParts.length > 0) {
    highlights.push(...sns.highlightParts.slice(0, 3 - highlights.length));
  } else if (customizations.length > 0) {
    const topCustom = customizations[0];
    highlights.push({ 
      label: '主要カスタム', 
      value: `${topCustom.brand || ''} ${topCustom.title || ''}`.trim() || 'カスタマイズあり'
    });
  }

  // 履歴サマリ
  const maintenanceCount = maintenanceRecords.filter(r => r.category !== 'fuel').length;
  const fuelCount = maintenanceRecords.filter(r => r.category === 'fuel').length;
  const customCount = customizations.length;
  
  // 継続期間
  let recordPeriod = '---';
  if (maintenanceRecords.length > 0) {
    const dates = maintenanceRecords
      .map(r => {
        if (!r.date) return null;
        if (typeof r.date === 'string') return new Date(r.date);
        if (r.date?.toDate) return r.date.toDate();
        return new Date(r.date);
      })
      .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (dates.length > 0) {
      const firstDate = dates[0];
      const lastDate = dates[dates.length - 1];
      const years = Math.floor((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
      recordPeriod = years > 0 ? `${years}年` : '1年未満';
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        {heroImage && (
          <div className="absolute inset-0 opacity-30">
            <img 
              src={heroImage} 
              alt={vehicle.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="relative max-w-4xl mx-auto px-4 py-16 sm:py-24">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            {vehicle.name}
            {vehicle.modelCode && <span className="text-2xl sm:text-3xl text-gray-300 ml-2">({vehicle.modelCode})</span>}
          </h1>
          
          {sns.conceptTitle && (
            <p className="text-xl sm:text-2xl text-gray-200 mb-6">
              {sns.conceptTitle}
            </p>
          )}
          
          {sns.conceptBody && (
            <p className="text-base sm:text-lg text-gray-300 mb-8 max-w-2xl">
              {sns.conceptBody}
            </p>
          )}

          {/* ハイライト */}
          {highlights.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {highlights.map((highlight, index) => (
                <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="text-xs text-gray-300 mb-1">{highlight.label}</div>
                  <div className="text-lg font-semibold">{highlight.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <a 
            href="#build" 
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            ビルドを見る
          </a>
        </div>
      </section>

      {/* Gallery Section */}
      {galleryImages.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">ギャラリー</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {galleryImages.map((img) => (
              <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-200">
                <img 
                  src={img.url} 
                  alt={img.caption || 'Gallery image'}
                  className="w-full h-full object-cover"
                />
                {img.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2">
                    {img.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Build Section */}
      <section id="build" className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">ビルド</h2>
        
        {/* 主要パーツ（最大6件） */}
        {sns.build?.featured && sns.build.featured.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            {sns.build.featured.slice(0, 6).map((part, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="text-xs text-gray-500 mb-1">{part.label}</div>
                <div className="text-base font-semibold text-gray-900">{part.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* カテゴリごとの詳細 */}
        {sns.build?.categories && sns.build.categories.length > 0 && (
          <div className="space-y-4">
            {sns.build.categories.map((category, index) => (
              <details key={index} className="bg-white rounded-lg border border-gray-200 p-4">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  {category.name}
                </summary>
                <div className="mt-4 space-y-2">
                  {category.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="text-sm text-gray-700">
                      <span className="font-medium">{item.name}</span>
                      {item.note && <span className="text-gray-500 ml-2">({item.note})</span>}
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}

        {/* カスタマイズデータがない場合のフォールバック */}
        {(!sns.build?.featured || sns.build.featured.length === 0) && 
         (!sns.build?.categories || sns.build.categories.length === 0) &&
         customizations.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {customizations.slice(0, 6).map((custom) => (
                <div key={custom.id} className="border-b border-gray-100 pb-3">
                  <div className="text-sm font-semibold text-gray-900">
                    {custom.brand && `${custom.brand} `}
                    {custom.title}
                  </div>
                  {custom.categories && custom.categories.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {custom.categories.join(' / ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Trust Section (履歴サマリ) */}
      {(maintenanceCount > 0 || fuelCount > 0 || customCount > 0) && (
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">信頼</h2>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {maintenanceCount > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">整備記録</div>
                  <div className="text-xl font-bold text-gray-900">{maintenanceCount}件</div>
                </div>
              )}
              {fuelCount > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">給油記録</div>
                  <div className="text-xl font-bold text-gray-900">{fuelCount}件</div>
                </div>
              )}
              {customCount > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">カスタム</div>
                  <div className="text-xl font-bold text-gray-900">{customCount}件</div>
                </div>
              )}
              {recordPeriod !== '---' && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">継続期間</div>
                  <div className="text-xl font-bold text-gray-900">{recordPeriod}</div>
                </div>
              )}
            </div>
          </div>

          {/* 直近整備 */}
          {maintenanceRecords.length > 0 && (
            <details className="bg-white rounded-lg border border-gray-200 p-4">
              <summary className="font-semibold text-gray-900 cursor-pointer mb-2">
                直近整備
              </summary>
              <div className="mt-4 space-y-2">
                {maintenanceRecords
                  .filter(r => r.category !== 'fuel')
                  .sort((a, b) => {
                    const dateA = typeof a.date === 'string' ? new Date(a.date) : (a.date?.toDate?.() || new Date(a.date));
                    const dateB = typeof b.date === 'string' ? new Date(b.date) : (b.date?.toDate?.() || new Date(b.date));
                    return dateB.getTime() - dateA.getTime();
                  })
                  .slice(0, 5)
                  .map((record, index) => {
                    const recordDate = typeof record.date === 'string' 
                      ? new Date(record.date) 
                      : (record.date?.toDate?.() || new Date(record.date));
                    return (
                      <div key={index} className="text-sm text-gray-700 border-b border-gray-100 pb-2">
                        <div className="font-medium">{record.title || 'メンテナンス'}</div>
                        <div className="text-xs text-gray-500">
                          {new Intl.DateTimeFormat('ja-JP', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          }).format(recordDate)}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </details>
          )}
        </section>
      )}

      {/* Social Links */}
      {sns.socialLinks && (
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">SNS</h2>
          <div className="flex flex-wrap gap-4">
            {sns.socialLinks.youtube && (
              <a 
                href={sns.socialLinks.youtube} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                YouTube
              </a>
            )}
            {sns.socialLinks.instagram && (
              <a 
                href={sns.socialLinks.instagram} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
              >
                Instagram
              </a>
            )}
            {sns.socialLinks.x && (
              <a 
                href={sns.socialLinks.x} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                X (Twitter)
              </a>
            )}
            {sns.socialLinks.web && (
              <a 
                href={sns.socialLinks.web} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                ウェブサイト
              </a>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 py-8 border-t border-gray-200 text-center text-sm text-gray-500">
        <p>このページは閲覧専用です</p>
        {shareProfile.viewCount !== undefined && (
          <p className="mt-2 text-xs text-gray-400">
            閲覧回数: {shareProfile.viewCount}
          </p>
        )}
      </footer>
    </div>
  );
}
