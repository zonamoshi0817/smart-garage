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
import ShareButton from '@/components/common/ShareButton.client';

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

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Noto+Sans+JP:wght@300;400;500;700&family=Space+Mono:wght@400;700&display=swap');
    .share-page {
      --bg: #f7f5f0;
      --card: #ffffff;
      --muted: #f2f0eb;
      --border: rgba(0,0,0,0.08);
      --border-bright: rgba(0,0,0,0.15);
      --text: #1a1a18;
      --text-muted: #6a6a60;
      --text-dim: #a0a098;
      --accent: #1a1a18;
      --font-display: 'Bebas Neue', sans-serif;
      --font-mono: 'Space Mono', monospace;
      --font-body: 'Noto Sans JP', sans-serif;
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-body);
      min-height: 100vh;
    }
    .share-page .hero { background: var(--accent); color: #f7f5f0; }
    .share-page .hero-title { font-family: var(--font-display); letter-spacing: 0.04em; }
    .share-page .tag { background: rgba(247,245,240,0.15); border: 1px solid rgba(247,245,240,0.3); border-radius: 4px; font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.06em; text-transform: uppercase; padding: 4px 10px; }
    .share-page .stat-label { font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-dim); }
    .share-page nav { background: rgba(247,245,240,0.94); backdrop-filter: blur(12px); border-bottom: 0.5px solid var(--border); }
    .share-page .nav-link { font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); border-bottom: 2px solid transparent; padding: 12px 16px; transition: color 0.15s, border-color 0.15s; white-space: nowrap; }
    .share-page .nav-link:hover { color: var(--text); }
    .share-page .nav-link.active { color: var(--accent); border-bottom-color: var(--accent); }
    .share-page .section-title { font-family: var(--font-display); font-size: 1.6rem; letter-spacing: 0.04em; color: var(--text); margin-bottom: 1.25rem; }
    .share-page .card { background: var(--card); border: 0.5px solid var(--border-bright); border-radius: 10px; }
    .share-page .card-muted { background: var(--muted); border-radius: 8px; }
    .share-page .btn-primary { background: var(--accent); color: #f7f5f0; font-family: var(--font-mono); font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; border-radius: 6px; padding: 10px 20px; transition: opacity 0.15s; }
    .share-page .btn-primary:hover { opacity: 0.85; }
    .share-page .btn-ghost { background: rgba(247,245,240,0.12); border: 1px solid rgba(247,245,240,0.3); color: #f7f5f0; font-family: var(--font-mono); font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; border-radius: 6px; padding: 10px 20px; transition: background 0.15s; }
    .share-page .btn-ghost:hover { background: rgba(247,245,240,0.2); }
    .share-page .btn-outline { background: transparent; border: 0.5px solid var(--border-bright); color: var(--text-muted); font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; border-radius: 6px; padding: 8px 18px; transition: background 0.15s; }
    .share-page .btn-outline:hover { background: var(--muted); }
    .share-page details summary::-webkit-details-marker { display: none; }
    .share-page .sns-link { font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; padding: 8px 16px; border: 0.5px solid var(--border-bright); border-radius: 6px; color: var(--text); background: var(--card); transition: background 0.15s; }
    .share-page .sns-link:hover { background: var(--muted); }
    .share-page .viral-section { background: var(--muted); border-top: 0.5px solid var(--border-bright); }
  `;

  return (
    <div className="share-page">
      <style>{styles}</style>

      {/* Hero Section */}
      <section className="hero relative">
        {heroImage && (
          <div className="absolute inset-0 opacity-20">
            <img src={heroImage} alt={vehicle.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="relative max-w-4xl mx-auto px-4 py-16 sm:py-24">
          <div className="flex items-start justify-between mb-4 gap-4">
            <h1 className="hero-title" style={{ fontSize: 'clamp(2.4rem, 8vw, 4rem)', lineHeight: 1.05 }}>
              {vehicle.name}
              {vehicle.modelCode && (
                <span style={{ fontSize: '0.55em', opacity: 0.6, marginLeft: '0.4em', fontFamily: 'var(--font-mono)' }}>
                  {vehicle.modelCode}
                </span>
              )}
            </h1>
            <ShareButton
              url={typeof window !== 'undefined' ? window.location.href : ''}
              title={`${vehicle.name}${vehicle.modelCode ? ` (${vehicle.modelCode})` : ''} | GarageLog`}
              text={sns.conceptBody || `${vehicle.name}のビルドとメンテナンス履歴`}
              className="flex-shrink-0"
            />
          </div>

          {sns.conceptBody && (
            <p style={{ fontSize: '1.05rem', opacity: 0.9, marginBottom: '1rem', maxWidth: '36rem', lineHeight: 1.65 }}>
              {sns.conceptBody}
            </p>
          )}
          {sns.conceptTitle && (
            <p style={{ fontSize: '0.9rem', opacity: 0.6, marginBottom: '1.25rem' }}>{sns.conceptTitle}</p>
          )}

          {sns.highlightParts && sns.highlightParts.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {sns.highlightParts.slice(0, 3).map((part, index) => (
                <span key={index} className="tag">{part.value}</span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-4 mb-8" style={{ fontSize: '0.78rem', opacity: 0.55, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {buildCount > 0 && <span>Build {buildCount}</span>}
            {maintenanceCount > 0 && <span>Service {maintenanceCount}</span>}
            {lastUpdated && <span>Updated {lastUpdated}</span>}
          </div>

          <div className="flex flex-wrap gap-3">
            <a href="#gallery" className="btn-primary">ギャラリー</a>
            <a href="#build" className="btn-ghost">ビルド</a>
          </div>
        </div>
      </section>

      {/* ページ内ナビゲーション（sticky） */}
      <nav className="sticky top-0 z-40" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <a href="#gallery" onClick={(e) => { e.preventDefault(); document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth' }); }}
              className={`nav-link${activeSection === 'gallery' ? ' active' : ''}`}>ギャラリー</a>
            <a href="#build" onClick={(e) => { e.preventDefault(); document.getElementById('build')?.scrollIntoView({ behavior: 'smooth' }); }}
              className={`nav-link${activeSection === 'build' ? ' active' : ''}`}>ビルド</a>
            {maintenanceCount > 0 && (
              <a href="#maintenance" onClick={(e) => { e.preventDefault(); document.getElementById('maintenance')?.scrollIntoView({ behavior: 'smooth' }); }}
                className={`nav-link${activeSection === 'maintenance' ? ' active' : ''}`}>整備履歴</a>
            )}
            {(maintenanceCount > 0 || buildCount > 0) && (
              <a href="#trust" onClick={(e) => { e.preventDefault(); document.getElementById('trust')?.scrollIntoView({ behavior: 'smooth' }); }}
                className={`nav-link${activeSection === 'trust' ? ' active' : ''}`}>履歴の信頼性</a>
            )}
          </div>
        </div>
      </nav>

      {/* Gallery Section */}
      {galleryImages.length > 0 && (
        <section id="gallery" className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="section-title">Gallery</h2>

          <div className="block sm:hidden overflow-x-auto pb-4 -mx-4 px-4">
            <div className="flex gap-3" style={{ width: 'max-content' }}>
              {mobileGalleryImages.map((img, index) => (
                <div key={img.id} className="relative flex-shrink-0 overflow-hidden" style={{ width: '80vw', aspectRatio: '4/3', borderRadius: '8px', background: 'var(--muted)' }}>
                  <img src={img.url} alt={img.caption || `Gallery ${index + 1}`} className="w-full h-full object-cover" />
                  {img.caption && (
                    <div className="absolute bottom-0 left-0 right-0 text-white text-xs p-2" style={{ background: 'rgba(0,0,0,0.5)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>
                      {img.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="hidden sm:grid grid-cols-3 gap-3">
            {displayedGalleryImages.map((img) => (
              <div key={img.id} className="relative overflow-hidden" style={{ aspectRatio: '4/3', borderRadius: '8px', background: 'var(--muted)' }}>
                <img src={img.url} alt={img.caption || 'Gallery'} className="w-full h-full object-cover" />
                {img.caption && (
                  <div className="absolute bottom-0 left-0 right-0 text-white text-xs p-2" style={{ background: 'rgba(0,0,0,0.5)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>
                    {img.caption}
                  </div>
                )}
              </div>
            ))}
          </div>

          {galleryImages.length > 9 && (
            <div className="mt-6 text-center">
              <button onClick={() => setShowAllGallery(!showAllGallery)} className="btn-outline">
                {showAllGallery ? '折りたたむ' : `もっと見る (全${galleryImages.length}枚)`}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Build Section */}
      <section id="build" className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="section-title">Build</h2>

        {sns.build?.featured && sns.build.featured.length > 0 && (
          <div className="mb-8">
            <p className="stat-label mb-4">推しパーツ</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sns.build.featured.slice(0, 30).map((part: any, index) => {
                const showPriceInDetails = shareProfile.sns?.settings?.showPricesInDetails && part.priceAmount && part.priceVisibility !== 'HIDE';
                const formatPrice = (amount: number) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(amount);
                const getPriceKindLabel = (kind?: string) => ({ PARTS_ONLY: 'パーツ代のみ', INSTALLED: '工賃込み', MARKET: '相場' })[kind as string] || '';
                return (
                  <details key={index} className="card" style={{ overflow: 'hidden' }}>
                    <summary className="p-4 cursor-pointer" style={{ listStyle: 'none' }}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="stat-label mb-1">{part.label}</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)' }}>{part.value}</div>
                        </div>
                        <svg className="flex-shrink-0 ml-2" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ opacity: 0.4 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </summary>
                    <div className="px-4 pb-4 pt-2" style={{ borderTop: '0.5px solid var(--border)' }}>
                      {showPriceInDetails ? (
                        <div className="space-y-1" style={{ fontSize: '0.85rem' }}>
                          <div><span style={{ color: 'var(--text-muted)' }}>参考価格: </span><span style={{ fontWeight: 600 }}>{formatPrice(part.priceAmount)}</span></div>
                          {part.priceKind && <div><span style={{ color: 'var(--text-muted)' }}>価格の種類: </span><span>{getPriceKindLabel(part.priceKind)}</span></div>}
                          {part.priceAsOf && <div><span style={{ color: 'var(--text-muted)' }}>時点: </span><span>{part.priceAsOf}</span></div>}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>価格情報は表示されません</div>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        )}

        {Object.keys(customizationsByCategory).length > 0 && (
          <div className="space-y-2">
            <p className="stat-label mb-4">カテゴリ別</p>
            {Object.entries(customizationsByCategory)
              .sort(([a], [b]) => {
                const p: Record<string, number> = { tire_wheel: 1, suspension: 2, brake: 3, exterior: 4, interior: 5, intake: 6, exhaust: 7, ecu: 8, electrical: 9, drivetrain: 10, other: 99 };
                return (p[a] || 50) - (p[b] || 50);
              })
              .map(([category, items]) => (
                <details key={category} className="card" style={{ overflow: 'hidden' }}>
                  <summary className="p-4 cursor-pointer" style={{ listStyle: 'none' }}>
                    <div className="flex justify-between items-center">
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category}</span>
                      <span className="stat-label">{items.length}件</span>
                    </div>
                  </summary>
                  <div className="px-4 pb-4 pt-3 space-y-2" style={{ borderTop: '0.5px solid var(--border)' }}>
                    {items.map((custom) => (
                      <div key={custom.id} style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
                        <span style={{ fontWeight: 500 }}>{custom.brand && `${custom.brand} `}{custom.title}</span>
                        {custom.memo && <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({custom.memo})</span>}
                      </div>
                    ))}
                  </div>
                </details>
              ))}
          </div>
        )}

        {sns.build?.categories && sns.build.categories.length > 0 && (
          <div className="space-y-2 mt-6">
            <p className="stat-label mb-4">その他</p>
            {sns.build.categories.map((category, index) => (
              <details key={index} className="card" style={{ overflow: 'hidden' }}>
                <summary className="p-4 cursor-pointer" style={{ listStyle: 'none' }}>
                  <div className="flex justify-between items-center">
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{category.name}</span>
                    <span className="stat-label">{category.items.length}件</span>
                  </div>
                </summary>
                <div className="px-4 pb-4 pt-3 space-y-2" style={{ borderTop: '0.5px solid var(--border)' }}>
                  {category.items.map((item, i) => (
                    <div key={i} style={{ fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 500 }}>{item.name}</span>
                      {item.note && <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({item.note})</span>}
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}

        {(!sns.build?.featured || sns.build.featured.length === 0) &&
         (!sns.build?.categories || sns.build.categories.length === 0) &&
         Object.keys(customizationsByCategory).length === 0 &&
         customizations.length > 0 && (
          <div className="card p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {customizations.slice(0, 6).map((custom) => (
                <div key={custom.id} className="pb-3" style={{ borderBottom: '0.5px solid var(--border)' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{custom.brand && `${custom.brand} `}{custom.title}</div>
                  {custom.categories && custom.categories.length > 0 && (
                    <div className="stat-label mt-1">{custom.categories.map(cat => CATEGORY_LABELS[cat] || cat).join(' / ')}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Trust Section */}
      {(maintenanceCount > 0 || buildCount > 0) && (
        <section id="trust" className="max-w-4xl mx-auto px-4 py-12 scroll-mt-20">
          <h2 className="section-title">Trust</h2>

          <div className="card p-6 mb-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {maintenanceCount > 0 && (
                <div>
                  <div className="stat-label mb-1">総整備回数</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{maintenanceCount}件</div>
                </div>
              )}
              {evidenceCount > 0 && (
                <div>
                  <div className="stat-label mb-1">証跡あり</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{evidenceCount}件</div>
                </div>
              )}
              {lastUpdated && (
                <div>
                  <div className="stat-label mb-1">最終更新</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{lastUpdated}</div>
                </div>
              )}
            </div>
          </div>

          {maintenanceRecords.length > 0 && (() => {
            const latestRecord = maintenanceRecords
              .filter(r => r.category !== 'fuel' && r.title !== 'テスト')
              .sort((a, b) => {
                const dA = typeof a.date === 'string' ? new Date(a.date) : (a.date?.toDate?.() || new Date(a.date));
                const dB = typeof b.date === 'string' ? new Date(b.date) : (b.date?.toDate?.() || new Date(b.date));
                return dB.getTime() - dA.getTime();
              })[0];
            if (!latestRecord) return null;
            const recordDate = typeof latestRecord.date === 'string' ? new Date(latestRecord.date) : (latestRecord.date?.toDate?.() || new Date(latestRecord.date));
            return (
              <div id="maintenance" className="card p-4 scroll-mt-20">
                <div className="stat-label mb-2">直近整備</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{latestRecord.title || 'メンテナンス'}</div>
                <div className="stat-label mt-1">{new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }).format(recordDate)}</div>
              </div>
            );
          })()}
        </section>
      )}

      {/* Social Links */}
      {sns.socialLinks && (
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="section-title">SNS</h2>
          <div className="flex flex-wrap gap-3">
            {sns.socialLinks.youtube && <a href={sns.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="sns-link">YouTube</a>}
            {sns.socialLinks.instagram && <a href={sns.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="sns-link">Instagram</a>}
            {sns.socialLinks.x && <a href={sns.socialLinks.x} target="_blank" rel="noopener noreferrer" className="sns-link">X (Twitter)</a>}
            {sns.socialLinks.web && <a href={sns.socialLinks.web} target="_blank" rel="noopener noreferrer" className="sns-link">Web</a>}
          </div>
        </section>
      )}

      {/* バイラル導線 */}
      <section className="viral-section py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="card p-8" style={{ maxWidth: '480px', margin: '0 auto' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
              あなたの愛車も紹介しませんか？
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
              GarageLogでビルド履歴やメンテナンス記録を管理し、<br className="hidden sm:inline" />
              あなただけの紹介ページを作成できます
            </p>
            <a href="https://garagelog.jp" target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center gap-2">
              <span>GarageLogを始める</span>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 py-8 text-center" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
        <p>Read Only</p>
        {shareProfile.viewCount !== undefined && (
          <p className="mt-2">{shareProfile.viewCount} Views</p>
        )}
      </footer>
    </div>
  );
}
