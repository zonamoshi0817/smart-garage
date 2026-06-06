'use client';

import '../home/home.css';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/home');
  }, [router]);

  return (
    <div className="app-home min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">リダイレクト中...</p>
      </div>
    </div>
  );
}
