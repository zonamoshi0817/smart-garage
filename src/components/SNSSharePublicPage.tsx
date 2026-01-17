/**
 * SNS共有（通常リンク）用公開ページコンポーネント
 * type="normal"のShareProfile用
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
import { storage } from '@/lib/firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import type { ShareProfile, Car, Customization } from '@/types';
import { CATEGORY_LABELS } from '@/lib/customizations';

type SectionId = 'gallery' | 'build' | 'maintenance' | 'trust';

interface SNSSharePublicPageProps {
  shareProfile: ShareProfile;
  vehicle: Car;
  maintenanceRecords: any[];
  customizations: Customization[];
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
  const [showAllGallery, setShowAllGallery] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('gallery');

  // ギャラリー画像を読み込み（リトライ付き）
  useEffect(() => {
    const loadGalleryImages = async () => {
      if (!sns.gallery || sns.gallery.length === 0) {
        setLoadingImages(false);
        return;
      }

      // リトライ付きでURLを取得（エラーは静かに処理）
      const getDownloadURLWithRetry = async (storagePath: string, maxRetries = 1): Promise<string | null> => {
        for (let i = 0; i <= maxRetries; i++) {
          try {
            const storageRef = ref(storage, storagePath);
            const url = await getDownloadURL(storageRef);
            return url;
          } catch (error: any) {
            // 最後のリトライでも失敗した場合のみ、警告ログを出力（コンソールエラーではなく）
            if (i === maxRetries) {
              console.warn(`Failed to load image after ${maxRetries + 1} attempts:`, storagePath);
            }
            if (i < maxRetries) {
              // 指数バックオフ: 0.5秒、1秒
              await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
            } else {
              return null;
            }
          }
        }
        return null;
      };

      try {
        const imagePromises = sns.gallery.map(async (item) => {
          const url = await getDownloadURLWithRetry(item.path);
          if (url) {
            return { id: item.id, url, caption: item.caption };
          }
          return null;
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
  const heroImage = galleryImages.length > 0 ? galleryImages[0].url : ((vehicle as any).imageUrl || null);

  // 履歴サマリ
  const maintenanceCount = maintenanceRecords.filter(r => r.category !== 'fuel').length;
  const buildCount = customizations.filter(c => c.status === 'installed').length;
  
  // 最終更新日の計算
  const lastUpdated = useMemo(() => {
    if (shareProfile.lastPublishedAt) {
      const ts = shareProfile.lastPublishedAt;
      const date = typeof ts === 'string' ? new Date(ts) : (ts?.toDate?.() || new Date((ts as any)?._seconds * 1000));
      return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    } else if (shareProfile.updatedAt) {
      const ts = shareProfile.updatedAt;
      const date = typeof ts === 'string' ? new Date(ts) : (ts?.toDate?.() || new Date((ts as any)?._seconds * 1000));
      return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    }
    return null;
  }, [shareProfile.lastPublishedAt, shareProfile.updatedAt]);

  // カスタマイズをカテゴリ別に集計
  const customizationsByCategory = useMemo(() => {
    const categories: Record<string, Customization[]> = {};
    customizations
      .filter(c => c.status === 'installed')
      .forEach(custom => {
        custom.categories?.forEach((cat: string) => {
          if (!categories[cat]) {
            categories[cat] = [];
          }
          categories[cat].push(custom);
        });
      });
    return categories;
  }, [customizations]);

  // 表示用ギャラリー画像（モバイルは最初の5枚、デスクトップは全てまたは最初の9枚）
  const displayedGalleryImages = useMemo(() => {
    if (showAllGallery) return galleryImages;
    return galleryImages.slice(0, 9);
  }, [galleryImages, showAllGallery]);

  // モバイル用カルーセル表示画像（最初の3〜5枚）
  const mobileGalleryImages = galleryImages.slice(0, 5);

  // スクロール監視でアクティブセクションを更新
  useEffect(() => {
    const sections: SectionId[] = ['gallery', 'build', 'maintenance', 'trust'];
    const sectionElements = sections.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
            const id = entry.target.id as SectionId;
            if (sections.includes(id)) {
              setActiveSection(id);
            }
          }
        });
      },
      { threshold: [0.3], rootMargin: '-80px 0px -50% 0px' }
    );

    sectionElements.forEach((el) => observer.observe(el));

    return () => {
      sectionElements.forEach((el) => observer.unobserve(el));
    };
  }, [galleryImages.length, maintenanceRecords.length, buildCount]);

  // 証跡ありのメンテナンス記録数をカウント
  const evidenceCount = useMemo(() => {
    return maintenanceRecords.filter(r => {
      // attachments配列が存在し、かつ空でない場合
      return r.attachments && Array.isArray(r.attachments) && r.attachments.length > 0;
    }).length;
  }, [maintenanceRecords]);

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
          
          {/* 一言キャプション（conceptBody）- より目立つ位置に */}
          {sns.conceptBody && (
            <p className="text-lg sm:text-xl text-gray-100 mb-4 max-w-2xl font-medium leading-relaxed">
              {sns.conceptBody}
            </p>
          )}
          
          {sns.conceptTitle && (
            <p className="text-base sm:text-lg text-gray-300 mb-6">
              {sns.conceptTitle}
            </p>
          )}

          {/* ハイライトタグ3点 */}
          {sns.highlightParts && sns.highlightParts.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {sns.highlightParts.slice(0, 3).map((part, index) => (
                <span 
                  key={index}
                  className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium border border-white/30"
                >
                  {part.value}
                </span>
              ))}
            </div>
          )}

          {/* 数字で伝える要約 */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-300 mb-8">
            {buildCount > 0 && (
              <span>ビルド {buildCount}件</span>
            )}
            {maintenanceCount > 0 && (
              <span>整備 {maintenanceCount}件</span>
            )}
            {lastUpdated && (
              <span>最終更新 {lastUpdated}</span>
            )}
          </div>

          {/* CTA */}
          <div className="flex flex-wrap gap-3">
            <a 
              href="#gallery" 
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              ギャラリーを見る
            </a>
            <a 
              href="#build" 
              className="inline-block px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg font-medium transition-colors"
            >
              ビルドを見る
            </a>
          </div>
        </div>
      </section>

      {/* ページ内ナビゲーション（sticky） */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div 
            className="flex gap-1 overflow-x-auto" 
            style={{ 
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <a
              href="#gallery"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeSection === 'gallery'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              ギャラリー
            </a>
            <a
              href="#build"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('build')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeSection === 'build'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              ビルド
            </a>
            {maintenanceCount > 0 && (
              <a
                href="#maintenance"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('maintenance')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeSection === 'maintenance'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                整備履歴
              </a>
            )}
            {(maintenanceCount > 0 || buildCount > 0) && (
              <a
                href="#trust"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('trust')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeSection === 'trust'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                履歴の信頼性
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Gallery Section */}
      {galleryImages.length > 0 && (
        <section id="gallery" className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">ギャラリー</h2>
          
          {/* モバイル: カルーセル */}
          <div className="block sm:hidden overflow-x-auto pb-4 -mx-4 px-4">
            <div className="flex gap-4" style={{ width: 'max-content' }}>
              {mobileGalleryImages.map((img, index) => (
                <div 
                  key={img.id} 
                  className="relative flex-shrink-0 w-[80vw] aspect-[4/3] rounded-lg overflow-hidden bg-gray-200"
                >
                  <img 
                    src={img.url} 
                    alt={img.caption || `Gallery image ${index + 1}`}
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
          </div>

          {/* デスクトップ: 3列グリッド */}
          <div className="hidden sm:grid grid-cols-3 gap-4">
            {displayedGalleryImages.map((img) => (
              <div 
                key={img.id} 
                className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-200"
              >
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

          {/* もっと見るボタン（9枚以上の時） */}
          {galleryImages.length > 9 && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowAllGallery(!showAllGallery)}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium text-gray-700 transition-colors"
              >
                {showAllGallery ? '折りたたむ' : `もっと見る (全${galleryImages.length}枚)`}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Build Section */}
      <section id="build" className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">ビルド</h2>
        
        {/* 推しパーツ（featured）- テキスト情報で表示 */}
        {sns.build?.featured && sns.build.featured.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">推しパーツ</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sns.build.featured.slice(0, 30).map((part: any, index) => {
                const showPriceInDetails = shareProfile.sns?.settings?.showPricesInDetails && part.priceAmount && part.priceVisibility !== 'HIDE';
                const formatPrice = (amount: number): string => {
                  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(amount);
                };
                const getPriceKindLabel = (kind?: 'PARTS_ONLY' | 'INSTALLED' | 'MARKET'): string => {
                  switch (kind) {
                    case 'PARTS_ONLY': return 'パーツ代のみ';
                    case 'INSTALLED': return '工賃込み';
                    case 'MARKET': return '相場';
                    default: return '';
                  }
                };
                return (
                  <details key={index} className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                    <summary className="p-4 cursor-pointer list-none">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 mb-1">{part.label}</div>
                          <div className="text-base font-semibold text-gray-900">{part.value}</div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </summary>
                    <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                      {showPriceInDetails ? (
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-600">参考価格: </span>
                            <span className="font-semibold text-gray-900">{formatPrice(part.priceAmount)}</span>
                          </div>
                          {part.priceKind && (
                            <div>
                              <span className="text-gray-600">価格の種類: </span>
                              <span className="text-gray-900">{getPriceKindLabel(part.priceKind)}</span>
                            </div>
                          )}
                          {part.priceAsOf && (
                            <div>
                              <span className="text-gray-600">時点: </span>
                              <span className="text-gray-900">{part.priceAsOf}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">価格情報は表示されません</div>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        )}

        {/* カテゴリ別まとめ（件数表示） */}
        {Object.keys(customizationsByCategory).length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">カテゴリ別</h3>
            {Object.entries(customizationsByCategory)
              .sort(([catA], [catB]) => {
                // 優先順位: ホイール・タイヤ > 足回り > ブレーキ > その他
                const priority: Record<string, number> = {
                  'tire_wheel': 1,
                  'suspension': 2,
                  'brake': 3,
                  'exterior': 4,
                  'interior': 5,
                  'intake': 6,
                  'exhaust': 7,
                  'ecu': 8,
                  'electrical': 9,
                  'drivetrain': 10,
                  'other': 99,
                };
                return (priority[catA] || 50) - (priority[catB] || 50);
              })
              .map(([category, items]) => {
                const categoryLabel = CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category;
                return (
                  <details 
                    key={category}
                    className="bg-white rounded-lg border border-gray-200 p-4"
                  >
                    <summary className="font-semibold text-gray-900 cursor-pointer list-none">
                      <div className="flex justify-between items-center">
                        <span>{categoryLabel}</span>
                        <span className="text-sm font-normal text-gray-500">{items.length}件</span>
                      </div>
                    </summary>
                    <div className="mt-4 space-y-2 pt-4 border-t border-gray-100">
                      {items.map((custom) => (
                        <div key={custom.id} className="text-sm text-gray-700">
                          <span className="font-medium">
                            {custom.brand && `${custom.brand} `}
                            {custom.title}
                          </span>
                          {custom.memo && (
                            <span className="text-gray-500 ml-2">({custom.memo})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })}
          </div>
        )}

        {/* カテゴリごとの詳細（sns.build.categories） */}
        {sns.build?.categories && sns.build.categories.length > 0 && (
          <div className="space-y-4 mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">その他</h3>
            {sns.build.categories.map((category, index) => (
              <details key={index} className="bg-white rounded-lg border border-gray-200 p-4">
                <summary className="font-semibold text-gray-900 cursor-pointer list-none">
                  <div className="flex justify-between items-center">
                    <span>{category.name}</span>
                    <span className="text-sm font-normal text-gray-500">{category.items.length}件</span>
                  </div>
                </summary>
                <div className="mt-4 space-y-2 pt-4 border-t border-gray-100">
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
         Object.keys(customizationsByCategory).length === 0 &&
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
                      {custom.categories.map(cat => CATEGORY_LABELS[cat] || cat).join(' / ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Trust Section (履歴サマリ) */}
      {(maintenanceCount > 0 || buildCount > 0) && (
        <section id="trust" className="max-w-4xl mx-auto px-4 py-12 scroll-mt-20">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">履歴の信頼性</h2>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {maintenanceCount > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">総整備回数</div>
                  <div className="text-xl font-bold text-gray-900">{maintenanceCount}件</div>
                </div>
              )}
              {evidenceCount > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">証跡あり</div>
                  <div className="text-xl font-bold text-gray-900">{evidenceCount}件</div>
                </div>
              )}
              {lastUpdated && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">最終更新</div>
                  <div className="text-lg font-bold text-gray-900">{lastUpdated}</div>
                </div>
              )}
            </div>
          </div>

          {/* 直近整備（1件表示） */}
          {maintenanceRecords.length > 0 && (() => {
            const latestRecord = maintenanceRecords
              .filter(r => r.category !== 'fuel' && r.title !== 'テスト')
              .sort((a, b) => {
                const dateA = typeof a.date === 'string' ? new Date(a.date) : (a.date?.toDate?.() || new Date(a.date));
                const dateB = typeof b.date === 'string' ? new Date(b.date) : (b.date?.toDate?.() || new Date(b.date));
                return dateB.getTime() - dateA.getTime();
              })[0];
            
            if (!latestRecord) return null;
            
            const recordDate = typeof latestRecord.date === 'string' 
              ? new Date(latestRecord.date) 
              : (latestRecord.date?.toDate?.() || new Date(latestRecord.date));
            
            return (
              <div id="maintenance" className="bg-white rounded-lg border border-gray-200 p-4 scroll-mt-20">
                <div className="font-semibold text-gray-900 mb-3">直近整備</div>
                <div className="text-sm text-gray-700">
                  <div className="font-medium">{latestRecord.title || 'メンテナンス'}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Intl.DateTimeFormat('ja-JP', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }).format(recordDate)}
                  </div>
                </div>
              </div>
            );
          })()}
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

      {/* バイラル導線 */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-50 border-t border-gray-200 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              あなたの愛車も紹介しませんか？
            </h3>
            <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
              GarageLogでビルド履歴やメンテナンス記録を管理し、<br className="hidden sm:inline" />
              あなただけの紹介ページを作成できます
            </p>
            <a
              href="https://garagelog.jp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
            >
              <span>GarageLogを始める</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 py-8 text-center text-sm text-gray-500">
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
