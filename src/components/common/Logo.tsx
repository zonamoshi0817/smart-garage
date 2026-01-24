/**
 * GarageLog ロゴコンポーネント
 * クリックでホームに戻る
 */

'use client';

import { useRouter, usePathname } from 'next/navigation';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ className = '', size = 'md' }: LogoProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = () => {
    // 現在のページがホームページの場合は何もしない
    if (pathname === '/home' || pathname === '/') {
      return;
    }

    // ログインページやサインアップページの場合はトップページに
    if (pathname === '/login' || pathname === '/signup' || pathname === '/reset-password') {
      router.push('/');
      return;
    }

    // 保護されたページ（未ログインでアクセスするとAuthGateが表示される）の場合はトップページに
    const protectedPages = ['/mycar', '/gas', '/maintenance', '/customizations', '/share', '/cars', '/data'];
    if (protectedPages.some(page => pathname.startsWith(page))) {
      router.push('/');
      return;
    }

    // その他のページ（設定ページなど）は /home に遷移
    router.push('/home');
  };

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-7 w-7 sm:h-8 sm:w-8',
    lg: 'h-8 w-8 sm:h-10 sm:w-10',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg sm:text-xl lg:text-2xl',
    lg: 'text-xl sm:text-2xl lg:text-3xl',
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink hover:opacity-80 transition-opacity ${className}`}
      aria-label="garage log ホームに戻る"
    >
      <img 
        src="/icon.png" 
        alt="garage log" 
        className={`${sizeClasses[size]} rounded-lg shadow-sm ring-1 ring-black/5 flex-shrink-0`}
      />
      <span className={`${textSizeClasses[size]} font-semibold tracking-tight text-gray-900 truncate`}>
        garage log
      </span>
    </button>
  );
}

