/**
 * SNS共有（通常リンク）用公開ページコンポーネント
 * type="normal"のShareProfile用
 */

'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
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

function isVideo(url: string) {
  return /\.(mp4|mov|webm)(\?|$)/i.test(url);
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
  const [showQR, setShowQR] = useState(false);
  const [showAllMaintenance, setShowAllMaintenance] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // ページビューイベント発火（初回マウント時のみ）
  useEffect(() => {
    if (!(shareProfile as any).slug) return;
    fetch(`/api/s/${(shareProfile as any).slug}/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'page_view' }),
    }).catch(() => {});
  }, []);

  // スクロール進捗
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const progress = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
      setScrollProgress(Math.min(progress, 100));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const loadGalleryImages = async () => {
      if (!sns.gallery || sns.gallery.length === 0) {
        setLoadingImages(false);
        return;
      }
      const getURLWithRetry = async (path: string, maxRetries = 1): Promise<string | null> => {
        for (let i = 0; i <= maxRetries; i++) {
          try {
            return await getDownloadURL(ref(storage, path));
          } catch {
            if (i < maxRetries) await new Promise(r => setTimeout(r, 500 * (i + 1)));
            else return null;
          }
        }
        return null;
      };
      try {
        const results = await Promise.all(
          sns.gallery.map(async (item) => {
            const url = await getURLWithRetry(item.path);
            return url ? { id: item.id, url, caption: item.caption } : null;
          })
        );
        setGalleryImages(results.filter(Boolean) as Array<{ id: string; url: string; caption?: string }>);
      } catch (e) {
        console.error('gallery load error', e);
      } finally {
        setLoadingImages(false);
      }
    };
    loadGalleryImages();
  }, [sns.gallery]);

  // ライトボックスキーボード操作
  useEffect(() => {
    if (lightboxIndex === null) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') setLightboxIndex(i => i !== null ? Math.min(i + 1, galleryImages.length - 1) : null);
      if (e.key === 'ArrowLeft') setLightboxIndex(i => i !== null ? Math.max(i - 1, 0) : null);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [lightboxIndex, galleryImages.length]);

  // QRコード生成
  useEffect(() => {
    if (!showQR || !qrCanvasRef.current) return;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    import('qrcode').then(QRCode => {
      QRCode.toCanvas(qrCanvasRef.current!, url, { width: 240, margin: 2, color: { dark: '#1a1a18', light: '#f7f5f0' } });
    });
  }, [showQR]);

  const heroImage = galleryImages.length > 0 ? galleryImages[0].url : ((vehicle as any).imageUrl || null);
  const maintenanceCount = maintenanceRecords.filter(r => r.category !== 'fuel').length;
  const buildCount = customizations.filter(c => c.status === 'installed').length;

  const lastUpdated = useMemo(() => {
    const ts = shareProfile.lastPublishedAt || shareProfile.updatedAt;
    if (!ts) return null;
    const d = typeof ts === 'string' ? new Date(ts) : (ts?.toDate?.() || new Date((ts as any)?._seconds * 1000));
    return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  }, [shareProfile.lastPublishedAt, shareProfile.updatedAt]);

  const customizationsByCategory = useMemo(() => {
    const cats: Record<string, Customization[]> = {};
    customizations.filter(c => c.status === 'installed').forEach(c => {
      c.categories?.forEach((cat: string) => {
        if (!cats[cat]) cats[cat] = [];
        cats[cat].push(c);
      });
    });
    return cats;
  }, [customizations]);

  const displayedGalleryImages = useMemo(
    () => (showAllGallery ? galleryImages : galleryImages.slice(0, 9)),
    [galleryImages, showAllGallery]
  );

  const evidenceCount = useMemo(
    () => maintenanceRecords.filter(r => r.attachments?.length > 0).length,
    [maintenanceRecords]
  );

  // 総投資額（価格情報が公開設定かつ金額あり）
  const totalBuildCost = useMemo(() => {
    if (!shareProfile.sns?.settings?.showPricesInDetails) return null;
    const featured: any[] = sns.build?.featured || [];
    let total = 0;
    featured.forEach((p: any) => {
      if (p.priceAmount && p.priceVisibility !== 'HIDE') total += Number(p.priceAmount);
    });
    return total > 0 ? total : null;
  }, [sns.build?.featured, shareProfile.sns?.settings?.showPricesInDetails]);

  // 整備タイムライン（燃料除外、日付降順）
  const maintenanceTimeline = useMemo(() => {
    return maintenanceRecords
      .filter(r => r.category !== 'fuel' && r.title !== 'テスト')
      .sort((a, b) => {
        const dA = typeof a.date === 'string' ? new Date(a.date) : (a.date?.toDate?.() || new Date(a.date));
        const dB = typeof b.date === 'string' ? new Date(b.date) : (b.date?.toDate?.() || new Date(b.date));
        return dB.getTime() - dA.getTime();
      });
  }, [maintenanceRecords]);

  const visibleMaintenance = showAllMaintenance ? maintenanceTimeline : maintenanceTimeline.slice(0, 5);

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
  const fmtPrice = (n: number) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(n);

  const styles = `
    /* フォントはルートレイアウト（src/app/layout.tsx）で全ルート一括読込 */
    .sp { --bg:#f7f5f0;--card:#ffffff;--muted:#f2f0eb;--border:rgba(0,0,0,0.08);--bb:rgba(0,0,0,0.15);--text:#1a1a18;--tm:#6a6a60;--td:#a0a098;--ac:#1a1a18;--fd:'Bebas Neue',sans-serif;--fm:'Space Mono',monospace;--fb:'Noto Sans JP',sans-serif;background:var(--bg);color:var(--text);font-family:var(--fb);min-height:100vh; }
    .sp .hero { background:var(--ac);color:#f7f5f0; }
    .sp .hero-title { font-family:var(--fd);letter-spacing:0.04em; }
    .sp .tag { background:rgba(247,245,240,0.15);border:1px solid rgba(247,245,240,0.3);border-radius:4px;font-family:var(--fm);font-size:0.72rem;letter-spacing:0.06em;text-transform:uppercase;padding:4px 10px; }
    .sp .sl { font-family:var(--fm);font-size:0.65rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--td); }
    .sp .nb { background:rgba(247,245,240,0.94);backdrop-filter:blur(12px);border-bottom:0.5px solid var(--border); }
    .sp .nl { font-family:var(--fm);font-size:0.68rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--tm);border-bottom:2px solid transparent;padding:11px 14px;transition:color 0.15s,border-color 0.15s;white-space:nowrap; }
    .sp .nl:hover { color:var(--text); }
    .sp .nl.on { color:var(--ac);border-bottom-color:var(--ac); }
    .sp .logo-lnk { font-family:var(--fm);font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--text);text-decoration:none;padding:11px 14px 11px 4px;white-space:nowrap; }
    .sp .st { font-family:var(--fd);font-size:1.6rem;letter-spacing:0.04em;color:var(--text);margin-bottom:1.25rem; }
    .sp .card { background:var(--card);border:0.5px solid var(--bb);border-radius:10px; }
    .sp .btn-p { background:var(--ac);color:#f7f5f0;font-family:var(--fm);font-size:0.75rem;letter-spacing:0.08em;text-transform:uppercase;border-radius:6px;padding:10px 20px;transition:opacity 0.15s; }
    .sp .btn-p:hover { opacity:0.82; }
    .sp .btn-g { background:rgba(247,245,240,0.12);border:1px solid rgba(247,245,240,0.3);color:#f7f5f0;font-family:var(--fm);font-size:0.75rem;letter-spacing:0.08em;text-transform:uppercase;border-radius:6px;padding:10px 20px;transition:background 0.15s; }
    .sp .btn-g:hover { background:rgba(247,245,240,0.22); }
    .sp .btn-o { background:transparent;border:0.5px solid var(--bb);color:var(--tm);font-family:var(--fm);font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;border-radius:6px;padding:8px 18px;transition:background 0.15s; }
    .sp .btn-o:hover { background:var(--muted); }
    .sp details summary::-webkit-details-marker { display:none; }
    .sp details summary { cursor:pointer;list-style:none; }
    .sp .chev { transition:transform 0.2s;flex-shrink:0;opacity:0.4; }
    .sp details[open] .chev { transform:rotate(180deg); }
    .sp .gthumb { cursor:zoom-in;transition:opacity 0.15s; }
    .sp .gthumb:hover { opacity:0.88; }
    .sp .lb { position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center; }
    .sp .lb-img { max-width:92vw;max-height:88vh;object-fit:contain;border-radius:4px; }
    .sp .lb-btn { position:absolute;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;transition:background 0.15s;cursor:pointer; }
    .sp .lb-btn:hover { background:rgba(255,255,255,0.2); }
    .sp .lb-x { position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background 0.15s; }
    .sp .lb-x:hover { background:rgba(255,255,255,0.22); }
    .sp .viral { background:var(--muted);border-top:0.5px solid var(--bb); }
    .sp .pwrd { font-family:var(--fm);font-size:0.62rem;letter-spacing:0.1em;text-transform:uppercase;color:rgba(247,245,240,0.4);text-decoration:none;transition:color 0.15s; }
    .sp .pwrd:hover { color:rgba(247,245,240,0.7); }
    .sp .tl-dot { width:8px;height:8px;border-radius:50%;background:var(--bb);flex-shrink:0;margin-top:5px; }
    .sp .tl-line { width:1px;background:var(--border);flex:1; }
    .sp .qr-modal { position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center; }
    .sp .qr-card { background:var(--bg);border-radius:12px;padding:2rem;text-align:center;max-width:320px;width:90vw; }
  `;

  return (
    <div className="sp">
      <style>{styles}</style>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div className="lb" onClick={() => setLightboxIndex(null)}>
          <button className="lb-x" onClick={() => setLightboxIndex(null)} aria-label="閉じる">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          {lightboxIndex > 0 && (
            <button className="lb-btn" style={{ left: 16 }} onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i! - 1); }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          {isVideo(galleryImages[lightboxIndex].url) ? (
            <video src={galleryImages[lightboxIndex].url} className="lb-img" controls autoPlay onClick={e => e.stopPropagation()} />
          ) : (
            <img src={galleryImages[lightboxIndex].url} alt={galleryImages[lightboxIndex].caption || ''} className="lb-img" onClick={e => e.stopPropagation()} />
          )}
          {lightboxIndex < galleryImages.length - 1 && (
            <button className="lb-btn" style={{ right: 16 }} onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i! + 1); }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
          {galleryImages[lightboxIndex].caption && (
            <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--fm)', fontSize: '0.7rem', letterSpacing: '0.06em' }}>
              {galleryImages[lightboxIndex].caption}
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 16, right: 24, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--fm)', fontSize: '0.62rem', letterSpacing: '0.08em' }}>
            {lightboxIndex + 1} / {galleryImages.length}
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQR && (
        <div className="qr-modal" onClick={() => setShowQR(false)}>
          <div className="qr-card" onClick={e => e.stopPropagation()}>
            <p style={{ fontFamily: 'var(--fd)', fontSize: '1.2rem', letterSpacing: '0.04em', marginBottom: '1rem' }}>QR CODE</p>
            <canvas ref={qrCanvasRef} style={{ borderRadius: 8, display: 'block', margin: '0 auto' }} />
            <p style={{ fontFamily: 'var(--fm)', fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--td)', marginTop: '1rem' }}>
              スキャンしてページを開く
            </p>
            <button onClick={() => setShowQR(false)} className="btn-o" style={{ marginTop: '1.25rem' }}>閉じる</button>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="hero relative">
        {heroImage && !isVideo(heroImage) && (
          <div className="absolute inset-0" style={{ opacity: 0.42 }}>
            <img src={heroImage} alt={vehicle.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="relative max-w-4xl mx-auto px-4 py-16 sm:py-24">
          <div className="flex items-start justify-between mb-4 gap-4">
            <h1 className="hero-title" style={{ fontSize: 'clamp(2.4rem, 8vw, 4rem)', lineHeight: 1.05 }}>
              {vehicle.name}
              {vehicle.modelCode && (
                <span style={{ fontSize: '0.55em', opacity: 0.55, marginLeft: '0.4em', fontFamily: 'var(--fm)' }}>{vehicle.modelCode}</span>
              )}
            </h1>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => setShowQR(true)} aria-label="QRコード" style={{ background: 'rgba(247,245,240,0.12)', border: '1px solid rgba(247,245,240,0.3)', color: '#f7f5f0', borderRadius: 6, padding: '8px', display: 'flex', alignItems: 'center', transition: 'background 0.15s', cursor: 'pointer' }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4h4v4H3V4zm0 12h4v4H3v-4zm12-12h4v4h-4V4zm-7 1h2v2H8V5zm0 12h2v2H8v-2zm5-5h2v2h-2v-2zm3 0h2v5h-2v-5zm0 3h-3v2h3v-2zM9 9h2v2H9V9zm5-5v2h2V4h-2zm-5 4H8v1h2V8zm7 4h-1v2h1v-2z" />
                </svg>
              </button>
              <ShareButton
                url={typeof window !== 'undefined' ? window.location.href : ''}
                title={`${vehicle.name}${vehicle.modelCode ? ` (${vehicle.modelCode})` : ''} | GarageLog`}
                text={sns.conceptBody || `${vehicle.name}のビルドとメンテナンス履歴`}
              />
            </div>
          </div>

          {sns.conceptBody && (
            <p style={{ fontSize: '1.05rem', opacity: 0.9, marginBottom: '1rem', maxWidth: '36rem', lineHeight: 1.65 }}>{sns.conceptBody}</p>
          )}
          {sns.conceptTitle && (
            <p style={{ fontSize: '0.9rem', opacity: 0.55, marginBottom: '1.25rem' }}>{sns.conceptTitle}</p>
          )}

          {sns.highlightParts && sns.highlightParts.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {sns.highlightParts.slice(0, 3).map((part, i) => <span key={i} className="tag">{part.value}</span>)}
            </div>
          )}

          {/* 数字サマリ：ビルド/整備/年式/走行距離/閲覧数 */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 mb-8" style={{ fontSize: '0.75rem', fontFamily: 'var(--fm)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {vehicle.year && <span style={{ opacity: 0.7 }}>{vehicle.year}年式</span>}
            {vehicle.odoKm && <span style={{ opacity: 0.7 }}>{vehicle.odoKm.toLocaleString()} km</span>}
            {buildCount > 0 && <span style={{ opacity: 0.5 }}>Build {buildCount}</span>}
            {maintenanceCount > 0 && <span style={{ opacity: 0.5 }}>Service {maintenanceCount}</span>}
            {(shareProfile.viewCount ?? 0) > 0 && (
              <span style={{ opacity: 0.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                {shareProfile.viewCount}
              </span>
            )}
            {lastUpdated && <span style={{ opacity: 0.4 }}>Updated {lastUpdated}</span>}
          </div>

          <div className="flex flex-wrap gap-3 mb-8">
            <a href="#gallery" className="btn-p">ギャラリー</a>
            <a href="#build" className="btn-g">ビルド</a>
          </div>

          <a href="https://garagelog.jp" target="_blank" rel="noopener noreferrer" className="pwrd">Powered by GarageLog</a>
        </div>
      </section>

      {/* Sticky nav + スクロール進捗バー */}
      <nav className="nb sticky top-0 z-40">
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: 2, background: 'var(--ac)', width: `${scrollProgress}%`, transition: 'width 0.1s linear', zIndex: 1 }} />
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <a href="https://garagelog.jp" target="_blank" rel="noopener noreferrer" className="logo-lnk flex-shrink-0">GarageLog</a>
            <div style={{ width: '0.5px', height: 16, background: 'var(--bb)', margin: '0 4px', flexShrink: 0 }} />
            <a href="#gallery" onClick={e => { e.preventDefault(); document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth' }); }} className={`nl${activeSection === 'gallery' ? ' on' : ''}`}>ギャラリー</a>
            <a href="#build" onClick={e => { e.preventDefault(); document.getElementById('build')?.scrollIntoView({ behavior: 'smooth' }); }} className={`nl${activeSection === 'build' ? ' on' : ''}`}>ビルド</a>
            {maintenanceCount > 0 && (
              <a href="#maintenance" onClick={e => { e.preventDefault(); document.getElementById('maintenance')?.scrollIntoView({ behavior: 'smooth' }); }} className={`nl${activeSection === 'maintenance' ? ' on' : ''}`}>整備履歴</a>
            )}
            {(maintenanceCount > 0 || buildCount > 0) && (
              <a href="#trust" onClick={e => { e.preventDefault(); document.getElementById('trust')?.scrollIntoView({ behavior: 'smooth' }); }} className={`nl${activeSection === 'trust' ? ' on' : ''}`}>信頼性</a>
            )}
          </div>
        </div>
      </nav>

      {/* Gallery */}
      {loadingImages && (
        <section className="max-w-7xl mx-auto px-4 py-16">
          <div style={{ fontFamily: 'var(--fm)', fontSize: '1.6rem', letterSpacing: '0.04em', marginBottom: '1.25rem', color: 'var(--td)' }}>Gallery</div>
          <div className="grid grid-cols-3 gap-3">
            {[0,1,2,3,4,5].map(i => (
              <div key={i} style={{ aspectRatio: '4/3', borderRadius: 8, background: 'var(--muted)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
        </section>
      )}
      {!loadingImages && galleryImages.length > 0 && (
        <section id="gallery" className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="st">Gallery</h2>

          {/* モバイル: peek付きカルーセル */}
          <div className="block sm:hidden overflow-x-auto pb-4 -mx-4 px-4" style={{ scrollSnapType: 'x mandatory' }}>
            <div className="flex gap-3" style={{ width: 'max-content' }}>
              {galleryImages.map((img, index) => (
                <div key={img.id} className="gthumb relative flex-shrink-0 overflow-hidden" style={{ width: '72vw', aspectRatio: '4/3', borderRadius: 8, background: 'var(--muted)', scrollSnapAlign: 'start' }} onClick={() => setLightboxIndex(index)}>
                  {isVideo(img.url) ? (
                    <video src={img.url} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    <img src={img.url} alt={img.caption || `Gallery ${index + 1}`} className="w-full h-full object-cover" />
                  )}
                  {isVideo(img.url) && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                    </div>
                  )}
                  {img.caption && <div className="absolute bottom-0 left-0 right-0 p-2 text-white" style={{ background: 'rgba(0,0,0,0.5)', fontFamily: 'var(--fm)', fontSize: '0.62rem' }}>{img.caption}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* デスクトップ: 3列グリッド */}
          <div className="hidden sm:grid grid-cols-3 gap-3">
            {displayedGalleryImages.map((img, index) => (
              <div key={img.id} className="gthumb relative overflow-hidden" style={{ aspectRatio: '4/3', borderRadius: 8, background: 'var(--muted)' }} onClick={() => setLightboxIndex(index)}>
                {isVideo(img.url) ? (
                  <video src={img.url} className="w-full h-full object-cover" muted playsInline />
                ) : (
                  <img src={img.url} alt={img.caption || 'Gallery'} className="w-full h-full object-cover" />
                )}
                {isVideo(img.url) && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  </div>
                )}
                {img.caption && <div className="absolute bottom-0 left-0 right-0 p-2 text-white" style={{ background: 'rgba(0,0,0,0.5)', fontFamily: 'var(--fm)', fontSize: '0.62rem' }}>{img.caption}</div>}
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
        <div className="flex items-end justify-between mb-5">
          <h2 className="st" style={{ marginBottom: 0 }}>Build</h2>
          {totalBuildCost !== null && (
            <div style={{ textAlign: 'right' }}>
              <div className="sl">トータルビルドコスト</div>
              <div style={{ fontFamily: 'var(--fm)', fontSize: '1.1rem', fontWeight: 700, marginTop: 2 }}>{fmtPrice(totalBuildCost)}</div>
            </div>
          )}
        </div>

        {sns.build?.featured && sns.build.featured.length > 0 && (
          <div className="mb-8">
            <p className="sl mb-4">推しパーツ</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sns.build.featured.slice(0, 30).map((part: any, index: number) => {
                const showPrice = shareProfile.sns?.settings?.showPricesInDetails && part.priceAmount && part.priceVisibility !== 'HIDE';
                const kindLabel = ({ PARTS_ONLY: 'パーツ代のみ', INSTALLED: '工賃込み', MARKET: '相場' } as any)[part.priceKind] || '';
                return (
                  <details key={index} className="card" style={{ overflow: 'hidden' }}>
                    <summary className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="sl mb-1">{part.label}</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{part.value}</div>
                          {showPrice && <div style={{ fontSize: '0.8rem', color: 'var(--tm)', marginTop: 2 }}>{fmtPrice(part.priceAmount)}</div>}
                        </div>
                        <svg className="chev ml-2" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </summary>
                    <div className="px-4 pb-4 pt-2" style={{ borderTop: '0.5px solid var(--border)' }}>
                      {showPrice ? (
                        <div className="space-y-1" style={{ fontSize: '0.85rem' }}>
                          <div><span style={{ color: 'var(--tm)' }}>参考価格: </span><span style={{ fontWeight: 600 }}>{fmtPrice(part.priceAmount)}</span></div>
                          {part.priceKind && <div><span style={{ color: 'var(--tm)' }}>価格の種類: </span><span>{kindLabel}</span></div>}
                          {part.priceAsOf && <div><span style={{ color: 'var(--tm)' }}>時点: </span><span>{part.priceAsOf}</span></div>}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.82rem', color: 'var(--td)' }}>価格情報は表示されません</div>
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
                        <svg className="chev" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </summary>
                  <div className="px-4 pb-4 pt-3 space-y-2" style={{ borderTop: '0.5px solid var(--border)' }}>
                    {items.map((c) => (
                      <div key={c.id} style={{ fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 500 }}>{c.brand && `${c.brand} `}{c.title}</span>
                        {c.memo && <span style={{ color: 'var(--tm)', marginLeft: '0.5rem' }}>({c.memo})</span>}
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
                      <svg className="chev" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </summary>
                <div className="px-4 pb-4 pt-3 space-y-2" style={{ borderTop: '0.5px solid var(--border)' }}>
                  {category.items.map((item, i) => (
                    <div key={i} style={{ fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 500 }}>{item.name}</span>
                      {item.note && <span style={{ color: 'var(--tm)', marginLeft: '0.5rem' }}>({item.note})</span>}
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
              {customizations.slice(0, 6).map((c) => (
                <div key={c.id} className="pb-3" style={{ borderBottom: '0.5px solid var(--border)' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{c.brand && `${c.brand} `}{c.title}</div>
                  {c.categories && c.categories.length > 0 && (
                    <div className="sl mt-1">{c.categories.map(cat => CATEGORY_LABELS[cat] || cat).join(' / ')}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Maintenance Timeline */}
      {maintenanceTimeline.length > 0 && (
        <section id="maintenance" className="max-w-4xl mx-auto px-4 py-14 scroll-mt-20">
          <h2 className="st">Maintenance</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {visibleMaintenance.map((record, i) => {
              const d = typeof record.date === 'string' ? new Date(record.date) : (record.date?.toDate?.() || new Date(record.date));
              const isLast = i === visibleMaintenance.length - 1;
              return (
                <div key={record.id || i} style={{ display: 'flex', gap: '1rem', paddingBottom: isLast ? 0 : '1.25rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="tl-dot" />
                    {!isLast && <div className="tl-line" />}
                  </div>
                  <div className="card p-4 flex-1" style={{ marginBottom: isLast ? 0 : 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>{record.title || 'メンテナンス'}</div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <span className="sl">{new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }).format(d)}</span>
                      {record.shopName && <span className="sl">{record.shopName}</span>}
                      {record.costYen > 0 && shareProfile.sns?.settings?.showPricesInDetails && (
                        <span className="sl">{fmtPrice(record.costYen)}</span>
                      )}
                      {record.attachments?.length > 0 && (
                        <span style={{ fontFamily: 'var(--fm)', fontSize: '0.62rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text)', background: 'var(--muted)', borderRadius: 3, padding: '1px 6px' }}>証跡あり</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {maintenanceTimeline.length > 5 && (
            <div className="mt-5 text-center">
              <button onClick={() => setShowAllMaintenance(!showAllMaintenance)} className="btn-o">
                {showAllMaintenance ? '折りたたむ' : `全${maintenanceTimeline.length}件を見る`}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Trust */}
      {(maintenanceCount > 0 || buildCount > 0) && (
        <section id="trust" className="max-w-4xl mx-auto px-4 py-10 scroll-mt-20">
          <h2 className="st">Trust</h2>
          <div className="card p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
              {(shareProfile.viewCount ?? 0) > 0 && (
                <div>
                  <div className="sl mb-1">総閲覧数</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{shareProfile.viewCount?.toLocaleString()}</div>
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
        </section>
      )}

      {/* SNS */}
      {sns.socialLinks && Object.values(sns.socialLinks).some(Boolean) && (
        <section className="max-w-4xl mx-auto px-4 py-10">
          <h2 className="st">SNS</h2>
          <div className="flex flex-wrap gap-3">
            {sns.socialLinks.youtube && (
              <a href={sns.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="card flex items-center gap-2 px-4 py-2" style={{ fontSize: '0.8rem', fontFamily: 'var(--fm)', letterSpacing: '0.06em', color: 'var(--text)', textDecoration: 'none', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--card)')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#FF0000' }}><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                YouTube
              </a>
            )}
            {sns.socialLinks.instagram && (
              <a href={sns.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="card flex items-center gap-2 px-4 py-2" style={{ fontSize: '0.8rem', fontFamily: 'var(--fm)', letterSpacing: '0.06em', color: 'var(--text)', textDecoration: 'none', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--card)')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#E1306C' }}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
                Instagram
              </a>
            )}
            {sns.socialLinks.x && (
              <a href={sns.socialLinks.x} target="_blank" rel="noopener noreferrer" className="card flex items-center gap-2 px-4 py-2" style={{ fontSize: '0.8rem', fontFamily: 'var(--fm)', letterSpacing: '0.06em', color: 'var(--text)', textDecoration: 'none', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--card)')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                X (Twitter)
              </a>
            )}
            {sns.socialLinks.web && (
              <a href={sns.socialLinks.web} target="_blank" rel="noopener noreferrer" className="card flex items-center gap-2 px-4 py-2" style={{ fontSize: '0.8rem', fontFamily: 'var(--fm)', letterSpacing: '0.06em', color: 'var(--text)', textDecoration: 'none', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--card)')}>
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                Web
              </a>
            )}
          </div>
        </section>
      )}

      {/* バイラル */}
      <section className="viral py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="card p-8" style={{ maxWidth: 480, margin: '0 auto' }}>
            <p style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>あなたの愛車も紹介しませんか？</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--tm)', marginBottom: '1.5rem', lineHeight: 1.75 }}>
              GarageLogでビルド履歴やメンテナンス記録を管理し、<br className="hidden sm:inline" />あなただけの紹介ページを作成できます
            </p>
            <a href="https://garagelog.jp" target="_blank" rel="noopener noreferrer" className="btn-p inline-flex items-center gap-2">
              <span>GarageLogを始める</span>
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 py-8 text-center" style={{ fontFamily: 'var(--fm)', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--td)' }}>
        <p>Read Only</p>
        {(shareProfile.viewCount ?? 0) > 0 && <p className="mt-2">{shareProfile.viewCount?.toLocaleString()} Views</p>}
      </footer>
    </div>
  );
}
