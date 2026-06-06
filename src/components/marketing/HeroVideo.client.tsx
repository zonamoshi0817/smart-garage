'use client';

import { useEffect, useRef, useState } from 'react';

const INTERVAL = 8000;
const VIDEOS = ['/videos/hero1.mp4', '/videos/hero2.mp4', '/videos/hero3.mp4'];

export default function HeroVideo() {
  const [current, setCurrent] = useState(0);
  const [failed, setFailed] = useState<boolean[]>([false, false, false]);
  const refs = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)];
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getActives = (f: boolean[]) => VIDEOS.map((_, i) => i).filter(i => !f[i]);

  const showVideo = (idx: number) => {
    refs.forEach((r, i) => {
      if (!r.current) return;
      if (i === idx) {
        r.current.classList.add('active');
        r.current.play().catch(() => {
          setFailed(prev => { const n = [...prev]; n[idx] = true; return n; });
        });
      } else {
        r.current.classList.remove('active');
      }
    });
    setCurrent(idx);
  };

  const advance = (f: boolean[]) => {
    const actives = getActives(f);
    if (!actives.length) return;
    const pos = actives.indexOf(current);
    const next = actives[(pos + 1) % actives.length];
    showVideo(next);
  };

  const startTimer = (f: boolean[]) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => advance(f), INTERVAL);
  };

  useEffect(() => {
    // 最初の動画を再生
    refs[0].current?.play().catch(() => {
      setFailed(prev => { const n = [...prev]; n[0] = true; return n; });
    });
    startTimer(failed);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDotClick = (i: number) => {
    if (failed[i]) return;
    showVideo(i);
    startTimer(failed);
  };

  return (
    <>
      <div className="hero-video-bg">
        {VIDEOS.map((src, i) => (
          <video
            key={i}
            ref={refs[i]}
            id={`vid${i}`}
            className={i === 0 ? 'active' : ''}
            muted
            loop
            playsInline
            preload="auto"
            onError={() => setFailed(prev => { const n = [...prev]; n[i] = true; return n; })}
          >
            <source src={src} type="video/mp4" />
          </video>
        ))}
      </div>
      <div className="hero-video-overlay" />
      <div className="hero-grid-lines" />
      <div className="hero-video-dots">
        {VIDEOS.map((_, i) => (
          <button
            key={i}
            className={`hero-video-dot${current === i ? ' active' : ''}`}
            onClick={() => handleDotClick(i)}
            aria-label={`動画${i + 1}`}
          />
        ))}
      </div>
      <p className="hero-video-credit">Video: Pexels (Free License)</p>
    </>
  );
}
