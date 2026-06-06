'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Wrench, Fuel, Sparkles, Share2 } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/home', icon: Home, label: 'ホーム' },
  { href: '/maintenance', icon: Wrench, label: 'メンテナンス' },
  { href: '/gas', icon: Fuel, label: 'ガソリン' },
  { href: '/customizations', icon: Sparkles, label: 'カスタマイズ' },
  { href: '/share', icon: Share2, label: '共有' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(247,245,240,0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '0.5px solid rgba(0,0,0,0.1)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors"
              style={{ color: active ? '#1a1a18' : '#a0a098', minHeight: 56 }}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              <span style={{ fontSize: '0.6rem', fontFamily: "'Space Mono', monospace", letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: active ? 700 : 400, whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
