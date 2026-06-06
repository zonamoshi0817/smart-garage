'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function FloatingCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // ヒーロー（約100vh）を過ぎたら表示
      setVisible(window.scrollY > window.innerHeight * 0.8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className="lp-root"
      style={{
        position: 'fixed',
        bottom: 28,
        right: 24,
        zIndex: 9999,
        transition: 'opacity 0.3s, transform 0.3s',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <Link
        href="/login"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: '#1a1a18',
          color: '#f7f5f0',
          fontFamily: "'Space Mono', monospace",
          fontSize: '0.72rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding: '12px 22px',
          borderRadius: 6,
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        無料ではじめる
        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </Link>
    </div>
  );
}
