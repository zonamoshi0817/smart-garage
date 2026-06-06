'use client';

import { useEffect, useRef, useState } from 'react';

const INTERVAL = 10000;
const VIDEOS = ['/videos/hero1.mp4', '/videos/hero2.mp4', '/videos/hero3.mp4'];

export default function HeroVideo() {
  const [current, setCurrent] = useState(0);
  const currentRef = useRef(0);
  const failedRef = useRef<boolean[]>([false, false, false]);
  const refs = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)];
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getActives = () => VIDEOS.map((_, i) => i).filter(i => !failedRef.current[i]);

  const showVideo = (idx: number) => {
    refs.forEach((r, i) => {
      if (!r.current) return;
      if (i === idx) {
        r.current.classList.add('active');
        r.current.play().catch(() => {
          failedRef.current[idx] = true;
        });
      } else {
        r.current.classList.remove('active');
      }
    });
    currentRef.current = idx;
    setCurrent(idx);
  };

  const advance = () => {
    const actives = getActives();
    if (!actives.length) return;
    const pos = actives.indexOf(currentRef.current);
    const next = actives[(pos + 1) % actives.length];
    showVideo(next);
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(advance, INTERVAL);
  };

  useEffect(() => {
    refs[0].current?.play().catch(() => { failedRef.current[0] = true; });
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDotClick = (i: number) => {
    if (failedRef.current[i]) return;
    showVideo(i);
    startTimer();
  };

  return (
    <>
      <div className="hero-video-bg">
        {VIDEOS.map((src, i) => (
          <video
            key={i}
            ref={refs[i]}
            className={i === 0 ? 'active' : ''}
            muted
            loop
            playsInline
            preload="auto"
            onError={() => { failedRef.current[i] = true; }}
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
