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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadGalleryImages = async () => {
      if (!sns.gallery || sns.gallery.length === 0) {
        setLoadingImages(false);
        return;
      }

      const getDownloadURLWithRetry = async (storagePath: string, maxRetries = 1): Promise<string | null> => {
        for (let i = 0; i <= maxRetries; i++) {
          try {
            const storageRef = ref(storage, storagePath);
            return await getDownloadURL(storageRef);
          } catch {
            if (i < maxRetries) await new Promise(r => setTimeout(r, 500 * (i + 1)));
            else return null;
          }
        }
        return null;
      };

      try {
        const imagePromises = sns.gallery.map(async (item) => {
          const url = await getDownloadURLWithRetry(item.path);
          return url ? { id: item.id, url, caption: item.caption } : null;
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

  // ライトボックス: キーボード操作
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') setLightboxIndex(i => i !== null ? Math.min(i + 1, galleryImages.length - 1) : null);
      if (e.key === 'ArrowLeft') setLightboxIndex(i => i !== null ? Math.max(i - 1, 0) : null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex, galleryImages.length]);

  const heroImage = galleryImages.length > 0 ? galleryImages[0].url : ((vehicle as any).imageUrl || null);

  const maintenanceCount = maintenanceRecords.filter(r => r.category !== 'fuel').length;
  const buildCount = customizations.filter(c => c.status === 'installed').length;

  const lastUpdated = useMemo(() => {
    const ts = shareProfile.lastPublishedAt || shareProfile.updatedAt;
    if (!ts) return null;
    const date = typeof ts === 'string' ? new Date(ts) : (ts?.toDate?.() || new Date((ts as any)?._seconds * 1000));
    return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }, [shareProfile.lastPublishedAt, shareProfile.updatedAt]);

  const customizationsByCategory = useMemo(() => {
    const cats: Record<string, Customization[]> = {};
    customizations.filter(c => c.status === 'installed').forEach(custom => {
      custom.categories?.forEach((cat: string) => {
        if (!cats[cat]) cats[cat] = [];
        cats[cat].push(custom);
      });
    });
    return cats;
  }, [customizations]);

  const displayedGalleryImages = useMemo(() => showAllGallery ? galleryImages : galleryImages.slice(0, 9), [galleryImages, showAllGallery]);

  const evidenceCount = useMemo(() => maintenanceRecords.filter(r => r.attachments?.length > 0).length, [maintenanceRecords]);

  useEffect(() => {
    const sections: SectionId[] = ['gallery', 'build', 'maintenance', 'trust'];
    const els = sections.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
          const id = entry.target.id as SectionId;
          if (sections.includes(id)) setActiveSection(id);
        }
      }),
      { threshold: [0.3], rootMargin: '-80px 0px -50% 0px' }
    );
    els.forEach(el => observer.observe(el));
    return () => els.forEach(el => observer.unobserve(el));
  }, [galleryImages.length, maintenanceRecords.length, buildCount]);

  const catPriority: Record<string, number> = { tire_wheel: 1, suspension: 2, brake: 3, exterior: 4, interior: 5, intake: 6, exhaust: 7, ecu: 8, electrical: 9, drivetrain: 10, other: 99 };

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Noto+Sans+JP:wght@300;400;500;700&family=Space+Mono:wght@400;700&display=swap');
    .sp {
      --bg: #f7f5f0; --card: #ffffff; --muted: #f2f0eb;
      --border: rgba(0,0,0,0.08); --border-bright: rgba(0,0,0,0.15);
      --text: #1a1a18; --text-muted: #6a6a60; --text-dim: #a0a098;
      --accent: #1a1a18;
      --fd: 'Bebas Neue', sans-serif;
      --fm: 'Space Mono', monospace;
      --fb: 'Noto Sans JP', sans-serif;
      background: var(--bg); color: var(--text); font-family: var(--fb); min-height: 100vh;
    }
    .sp .hero { background: var(--accent); color: #f7f5f0; }
    .sp .hero-title { font-family: var(--fd); letter-spacing: 0.04em; }
    .sp .tag { background: rgba(247,245,240,0.15); border: 1px solid rgba(247,245,240,0.3); border-radius: 4px; font-family: var(--fm); font-size: 0.72rem; letter-spacing: 0.06em; text-transform: uppercase; padding: 4px 10px; }
    .sp .sl { font-family: var(--fm); font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-dim); }
    .sp .nav-bar { background: rgba(247,245,240,0.94); backdrop-filter: blur(12px); border-bottom: 0.5px solid var(--border); }
    .sp .nl { font-family: var(--fm); font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); border-bottom: 2px solid transparent; padding: 11px 14px; transition: color 0.15s, border-color 0.15s; white-space: nowrap; }
    .sp .nl:hover { color: var(--text); }
    .sp .nl.on { color: var(--accent); border-bottom-color: var(--accent); }
    .sp .logo-link { font-family: var(--fm); font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text); text-decoration: none; padding: 11px 14px 11px 4px; white-space: nowrap; }
    .sp .st { font-family: var(--fd); font-size: 1.6rem; letter-spacing: 0.04em; color: var(--text); margin-bottom: 1.25rem; }
    .sp .card { background: var(--card); border: 0.5px solid var(--border-bright); border-radius: 10px; }
    .sp .btn-p { background: var(--accent); color: #f7f5f0; font-family: var(--fm); font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; border-radius: 6px; padding: 10px 20px; transition: opacity 0.15s; }
    .sp .btn-p:hover { opacity: 0.82; }
    .sp .btn-g { background: rgba(247,245,240,0.12); border: 1px solid rgba(247,245,240,0.3); color: #f7f5f0; font-family: var(--fm); font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; border-radius: 6px; padding: 10px 20px; transition: background 0.15s; }
    .sp .btn-g:hover { background: rgba(247,245,240,0.22); }
    .sp .btn-o { background: transparent; border: 0.5px solid var(--border-bright); color: var(--text-muted); font-family: var(--fm); font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; border-radius: 6px; padding: 8px 18px; transition: background 0.15s; }
    .sp .btn-o:hover { background: var(--muted); }
    .sp details summary::-webkit-details-marker { display: none; }
    .sp details summary { cursor: pointer; list-style: none; }
    .sp .chevron { transition: transform 0.2s; flex-shrink: 0; opacity: 0.4; }
    .sp details[open] .chevron { transform: rotate(180deg); }
    .sp .gallery-thumb { cursor: zoom-in; transition: opacity 0.15s; }
    .sp .gallery-thumb:hover { opacity: 0.88; }
    .sp .lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 9999; display: flex; align-items: center; justify-content: center; }
    .sp .lightbox-img { max-width: 92vw; max-height: 88vh; object-fit: contain; border-radius: 4px; }
    .sp .lb-btn { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; transition: background 0.15s; cursor: pointer; }
    .sp .lb-btn:hover { background: rgba(255,255,255,0.2); }
    .sp .lb-close { position: absolute; top: 16px; right: 16px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.15s; }
    .sp .lb-close:hover { background: rgba(255,255,255,0.22); }
    .sp .viral { background: var(--muted); border-top: 0.5px solid var(--border-bright); }
    .sp .powered { font-family: var(--fm); font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(247,245,240,0.4); text-decoration: none; transition: color 0.15s; }
    .sp .powered:hover { color: rgba(247,245,240,0.7); }
  `;

  return (
    <div className="sp">
      <style>{styles}</style>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div className="lightbox" onClick={() => setLightboxIndex(null)}>
          <button className="lb-close" onClick={() => setLightboxIndex(null)} aria-label="閉じる">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          {lightboxIndex > 0 && (
            <button className="lb-btn" style={{ left: 16 }} onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i! - 1); }} aria-label="前の画像">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          <img
            src={galleryImages[lightboxIndex].url}
            alt={galleryImages[lightboxIndex].caption || `Gallery ${lightboxIndex + 1}`}
            className="lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
          {lightboxIndex < galleryImages.length - 1 && (
            <button className="lb-btn" style={{ right: 16 }} onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i! + 1); }} aria-label="次の画像">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
          {galleryImages[lightboxIndex].caption && (
            <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--fm)', fontSize: '0.7rem', letterSpacing: '0.06em', textAlign: 'center' }}>
              {galleryImages[lightboxIndex].caption}
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 16, right: 24, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--fm)', fontSize: '0.62rem', letterSpacing: '0.08em' }}>
            {lightboxIndex + 1} / {galleryImages.length}
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="hero relative">
        {heroImage && (
          <div className="absolute inset-0" style={{ opacity: 0.42 }}>
            <img src={heroImage} alt={vehicle.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="relative max-w-4xl mx-auto px-4 py-16 sm:py-24">
          <div className="flex items-start justify-between mb-4 gap-4">
            <h1 className="hero-title" style={{ fontSize: 'clamp(2.4rem, 8vw, 4rem)', lineHeight: 1.05 }}>
              {vehicle.name}
              {vehicle.modelCode && (
                <span style={{ fontSize: '0.55em', opacity: 0.55, marginLeft: '0.4em', fontFamily: 'var(--fm)' }}>
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
            <p style={{ fontSize: '0.9rem', opacity: 0.55, marginBottom: '1.25rem' }}>{sns.conceptTitle}</p>
          )}

          {sns.highlightParts && sns.highlightParts.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {sns.highlightParts.slice(0, 3).map((part, i) => (
                <span key={i} className="tag">{part.value}</span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-4 mb-8" style={{ fontSize: '0.75rem', opacity: 0.5, fontFamily: 'var(--fm)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {buildCount > 0 && <span>Build {buildCount}</span>}
            {maintenanceCount > 0 && <span>Service {maintenanceCount}</span>}
            {lastUpdated && <span>Updated {lastUpdated}</span>}
          </div>

          <div className="flex flex-wrap gap-3 mb-8">
            <a href="#gallery" className="btn-p">ギャラリー</a>
            <a href="#build" className="btn-g">ビルド</a>
          </div>

          {/* Powered by — ヒーロー下部 */}
          <a href="https://garagelog.jp" target="_blank" rel="noopener noreferrer" className="powered">
            Powered by GarageLog
          </a>
        </div>
      </section>

      {/* Sticky nav */}
      <nav className="nav-bar sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {/* ロゴ */}
            <a href="https://garagelog.jp" target="_blank" rel="noopener noreferrer" className="logo-link flex-shrink-0">
              GarageLog
            </a>
            <div style={{ width: '0.5px', height: '16px', background: 'var(--border-bright)', margin: '0 4px', flexShrink: 0 }} />
            <a href="#gallery" onClick={(e) => { e.preventDefault(); document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth' }); }} className={`nl${activeSection === 'gallery' ? ' on' : ''}`}>ギャラリー</a>
            <a href="#build" onClick={(e) => { e.preventDefault(); document.getElementById('build')?.scrollIntoView({ behavior: 'smooth' }); }} className={`nl${activeSection === 'build' ? ' on' : ''}`}>ビルド</a>
            {maintenanceCount > 0 && (
              <a href="#maintenance" onClick={(e) => { e.preventDefault(); document.getElementById('maintenance')?.scrollIntoView({ behavior: 'smooth' }); }} className={`nl${activeSection === 'maintenance' ? ' on' : ''}`}>整備履歴</a>
            )}
            {(maintenanceCount > 0 || buildCount > 0) && (
              <a href="#trust" onClick={(e) => { e.preventDefault(); document.getElementById('trust')?.scrollIntoView({ behavior: 'smooth' }); }} className={`nl${activeSection === 'trust' ? ' on' : ''}`}>履歴の信頼性</a>
            )}
          </div>
        </div>
      </nav>

      {/* Gallery */}
      {galleryImages.length > 0 && (
        <section id="gallery" className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="st">Gallery</h2>

          {/* モバイル: peek付きカルーセル */}
          <div className="block sm:hidden overflow-x-auto pb-4 -mx-4 px-4" style={{ scrollSnapType: 'x mandatory' }}>
            <div className="flex gap-3" style={{ width: 'max-content' }}>
              {galleryImages.map((img, index) => (
                <div
                  key={img.id}
                  className="gallery-thumb relative flex-shrink-0 overflow-hidden"
                  style={{ width: '72vw', aspectRatio: '4/3', borderRadius: '8px', background: 'var(--muted)', scrollSnapAlign: 'start' }}
                  onClick={() => setLightboxIndex(index)}
                >
                  <img src={img.url} alt={img.caption || `Gallery ${index + 1}`} className="w-full h-full object-cover" />
                  {img.caption && (
                    <div className="absolute bottom-0 left-0 right-0 p-2 text-white" style={{ background: 'rgba(0,0,0,0.5)', fontFamily: 'var(--fm)', fontSize: '0.62rem', letterSpacing: '0.04em' }}>
                      {img.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* デスクトップ: 3列グリッド */}
          <div className="hidden sm:grid grid-cols-3 gap-3">
            {displayedGalleryImages.map((img, index) => (
              <div
                key={img.id}
                className="gallery-thumb relative overflow-hidden"
                style={{ aspectRatio: '4/3', borderRadius: '8px', background: 'var(--muted)' }}
                onClick={() => setLightboxIndex(index)}
              >
                <img src={img.url} alt={img.caption || 'Gallery'} className="w-full h-full object-cover" />
                {img.caption && (
                  <div className="absolute bottom-0 left-0 right-0 p-2 text-white" style={{ background: 'rgba(0,0,0,0.5)', fontFamily: 'var(--fm)', fontSize: '0.62rem', letterSpacing: '0.04em' }}>
                    {img.caption}
                  </div>
                )}
              </div>
            ))}
          </div>

          {galleryImages.length > 9 && (
            <div className="mt-6 text-center">
              <button onClick={() => setShowAllGallery(!showAllGallery)} className="btn-o">
                {showAllGallery ? '折りたたむ' : `もっと見る (全${galleryImages.length}枚)`}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Build */}
      <section id="build" className="max-w-4xl mx-auto px-4 py-14">
        <h2 className="st">Build</h2>

        {sns.build?.featured && sns.build.featured.length > 0 && (
          <div className="mb-8">
            <p className="sl mb-4">推しパーツ</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sns.build.featured.slice(0, 30).map((part: any, index: number) => {
                const showPrice = shareProfile.sns?.settings?.showPricesInDetails && part.priceAmount && part.priceVisibility !== 'HIDE';
                const fmtPrice = (n: number) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(n);
                const kindLabel = ({ PARTS_ONLY: 'パーツ代のみ', INSTALLED: '工賃込み', MARKET: '相場' } as any)[part.priceKind] || '';
                return (
                  <details key={index} className="card" style={{ overflow: 'hidden' }}>
                    <summary className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="sl mb-1">{part.label}</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{part.value}</div>
                        </div>
                        <svg className="chevron ml-2" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </summary>
                    <div className="px-4 pb-4 pt-2" style={{ borderTop: '0.5px solid var(--border)' }}>
                      {showPrice ? (
                        <div className="space-y-1" style={{ fontSize: '0.85rem' }}>
                          <div><span style={{ color: 'var(--text-muted)' }}>参考価格: </span><span style={{ fontWeight: 600 }}>{fmtPrice(part.priceAmount)}</span></div>
                          {part.priceKind && <div><span style={{ color: 'var(--text-muted)' }}>価格の種類: </span><span>{kindLabel}</span></div>}
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
            <p className="sl mb-4">カテゴリ別</p>
            {Object.entries(customizationsByCategory)
              .sort(([a], [b]) => (catPriority[a] || 50) - (catPriority[b] || 50))
              .map(([category, items]) => (
                <details key={category} className="card" style={{ overflow: 'hidden' }}>
                  <summary className="p-4">
                    <div className="flex justify-between items-center">
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category}</span>
                      <div className="flex items-center gap-2">
                        <span className="sl">{items.length}件</span>
                        <svg className="chevron" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </summary>
                  <div className="px-4 pb-4 pt-3 space-y-2" style={{ borderTop: '0.5px solid var(--border)' }}>
                    {items.map((custom) => (
                      <div key={custom.id} style={{ fontSize: '0.85rem' }}>
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
            <p className="sl mb-4">その他</p>
            {sns.build.categories.map((category, index) => (
              <details key={index} className="card" style={{ overflow: 'hidden' }}>
                <summary className="p-4">
                  <div className="flex justify-between items-center">
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{category.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="sl">{category.items.length}件</span>
                      <svg className="chevron" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
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
         Object.keys(customizationsByCategory).length === 0 && customizations.length > 0 && (
          <div className="card p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {customizations.slice(0, 6).map((custom) => (
                <div key={custom.id} className="pb-3" style={{ borderBottom: '0.5px solid var(--border)' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{custom.brand && `${custom.brand} `}{custom.title}</div>
                  {custom.categories && custom.categories.length > 0 && (
                    <div className="sl mt-1">{custom.categories.map(cat => CATEGORY_LABELS[cat] || cat).join(' / ')}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Trust */}
      {(maintenanceCount > 0 || buildCount > 0) && (
        <section id="trust" className="max-w-4xl mx-auto px-4 py-10 scroll-mt-20">
          <h2 className="st">Trust</h2>

          <div className="card p-6 mb-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {maintenanceCount > 0 && (
                <div>
                  <div className="sl mb-1">総整備回数</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{maintenanceCount}件</div>
                </div>
              )}
              {evidenceCount > 0 && (
                <div>
                  <div className="sl mb-1">証跡あり</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{evidenceCount}件</div>
                </div>
              )}
              {lastUpdated && (
                <div>
                  <div className="sl mb-1">最終更新</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{lastUpdated}</div>
                </div>
              )}
            </div>
          </div>

          {maintenanceRecords.length > 0 && (() => {
            const latest = maintenanceRecords
              .filter(r => r.category !== 'fuel' && r.title !== 'テスト')
              .sort((a, b) => {
                const dA = typeof a.date === 'string' ? new Date(a.date) : (a.date?.toDate?.() || new Date(a.date));
                const dB = typeof b.date === 'string' ? new Date(b.date) : (b.date?.toDate?.() || new Date(b.date));
                return dB.getTime() - dA.getTime();
              })[0];
            if (!latest) return null;
            const d = typeof latest.date === 'string' ? new Date(latest.date) : (latest.date?.toDate?.() || new Date(latest.date));
            return (
              <div id="maintenance" className="card p-4 scroll-mt-20">
                <div className="sl mb-2">直近整備</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{latest.title || 'メンテナンス'}</div>
                <div className="sl mt-1">{new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }).format(d)}</div>
              </div>
            );
          })()}
        </section>
      )}

      {/* SNS リンク（アイコン付き） */}
      {sns.socialLinks && (Object.values(sns.socialLinks).some(Boolean)) && (
        <section className="max-w-4xl mx-auto px-4 py-10">
          <h2 className="st">SNS</h2>
          <div className="flex flex-wrap gap-3">
            {sns.socialLinks.youtube && (
              <a href={sns.socialLinks.youtube} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 card px-4 py-2"
                style={{ fontSize: '0.8rem', fontFamily: 'var(--fm)', letterSpacing: '0.06em', color: 'var(--text)', textDecoration: 'none', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--card)')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#FF0000' }}>
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                YouTube
              </a>
            )}
            {sns.socialLinks.instagram && (
              <a href={sns.socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 card px-4 py-2"
                style={{ fontSize: '0.8rem', fontFamily: 'var(--fm)', letterSpacing: '0.06em', color: 'var(--text)', textDecoration: 'none', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--card)')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#E1306C' }}>
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                </svg>
                Instagram
              </a>
            )}
            {sns.socialLinks.x && (
              <a href={sns.socialLinks.x} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 card px-4 py-2"
                style={{ fontSize: '0.8rem', fontFamily: 'var(--fm)', letterSpacing: '0.06em', color: 'var(--text)', textDecoration: 'none', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--card)')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                X (Twitter)
              </a>
            )}
            {sns.socialLinks.web && (
              <a href={sns.socialLinks.web} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 card px-4 py-2"
                style={{ fontSize: '0.8rem', fontFamily: 'var(--fm)', letterSpacing: '0.06em', color: 'var(--text)', textDecoration: 'none', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--card)')}>
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Web
              </a>
            )}
          </div>
        </section>
      )}

      {/* バイラル導線 */}
      <section className="viral py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="card p-8" style={{ maxWidth: '480px', margin: '0 auto' }}>
            <p style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
              あなたの愛車も紹介しませんか？
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.75 }}>
              GarageLogでビルド履歴やメンテナンス記録を管理し、<br className="hidden sm:inline" />
              あなただけの紹介ページを作成できます
            </p>
            <a href="https://garagelog.jp" target="_blank" rel="noopener noreferrer" className="btn-p inline-flex items-center gap-2">
              <span>GarageLogを始める</span>
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 py-8 text-center" style={{ fontFamily: 'var(--fm)', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
        <p>Read Only</p>
        {shareProfile.viewCount !== undefined && (
          <p className="mt-2">{shareProfile.viewCount} Views</p>
        )}
      </footer>
    </div>
  );
}
