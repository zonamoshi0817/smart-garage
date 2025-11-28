"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Shield, Gauge, Wrench, FileText, Camera, Lock, Sparkles, Car, LineChart, ArrowRight, Download, Star, Timer, Zap, LogIn, Menu, X, UserPlus } from "lucide-react";
import { watchAuth } from "@/lib/firebase";
import type { User } from "firebase/auth";
import { lpEvents, trackPageView } from "@/lib/analytics";

// Smart Garage LP — Modern, premium design with animations and gradients

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;
    
    // タイムアウトを設定（500ms後に強制的にローディングを解除）
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    }, 500);
    
    try {
      unsubscribe = watchAuth((u) => {
        if (!isMounted) return;
        
        try {
          setUser(u);
          setIsLoading(false);
          setError(null);
        } catch (err) {
          console.error('認証状態更新エラー:', err);
          if (isMounted) {
            setError('認証状態の取得に失敗しました');
            setIsLoading(false);
          }
        }
      });
    } catch (err) {
      console.error('認証初期化エラー:', err);
      if (isMounted) {
        setError('認証の初期化に失敗しました');
        setIsLoading(false);
      }
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (err) {
          console.error('認証監視の解除エラー:', err);
        }
      }
    };
  }, [router]);

  // ページビューを追跡
  useEffect(() => {
    if (isLoading || typeof window === 'undefined') return;
    trackPageView(window.location.pathname);
  }, [isLoading]);

  // スクロールアニメーションとセクション表示を初期化（ローディング完了後）
  useEffect(() => {
    if (isLoading || typeof window === 'undefined') return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            
            // セクション表示を追跡
            const sectionId = entry.target.id;
            if (sectionId) {
              lpEvents.sectionView(sectionId);
            }
            
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    // DOMが完全にレンダリングされるのを待つ
    const timeoutId = setTimeout(() => {
      const elements = document.querySelectorAll('.fade-in-on-scroll, .slide-in-left-on-scroll, .slide-in-right-on-scroll, .scale-in-on-scroll');
      elements.forEach((el) => observer.observe(el));
      
      // セクション要素も監視
      const sections = document.querySelectorAll('section[id]');
      sections.forEach((section) => observer.observe(section));
    }, 200);

    // スクロール深度を追跡
    let maxScrollDepth = 0;
    const scrollDepthThresholds = [25, 50, 75, 100];
    const trackedDepths = new Set<number>();

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollDepth = Math.round((scrollTop / documentHeight) * 100);

      scrollDepthThresholds.forEach((threshold) => {
        if (scrollDepth >= threshold && !trackedDepths.has(threshold) && maxScrollDepth < threshold) {
          trackedDepths.add(threshold);
          maxScrollDepth = threshold;
          lpEvents.scrollDepth(threshold);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimeout(timeoutId);
      const elements = document.querySelectorAll('.fade-in-on-scroll, .slide-in-left-on-scroll, .slide-in-right-on-scroll, .scale-in-on-scroll');
      elements.forEach((el) => observer.unobserve(el));
      const sections = document.querySelectorAll('section[id]');
      sections.forEach((section) => observer.unobserve(section));
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isLoading]);

  const handleLogin = () => {
    lpEvents.loginClick('lp');
    router.push('/login');
  };

  const handleSignUp = () => {
    lpEvents.ctaClick('lp_signup');
    router.push('/signup');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      <Header user={user} onLogin={handleLogin} onSignUp={handleSignUp} />
      <Hero onLogin={handleLogin} onSignUp={handleSignUp} />
      <TrustBar />
      <PainGain />
      <HowItWorks />
      <Features />
      <Pricing onSignUp={handleSignUp} />
      <FAQ />
      <CTA onLogin={handleLogin} onSignUp={handleSignUp} />
      <Footer />
    </div>
  );
}

function Header({ user, onLogin, onSignUp }: { user: User | null; onLogin: () => void; onSignUp: () => void }) {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // 画像読み込みエラーを無視（デフォルト画像が表示されない場合）
    const target = e.target as HTMLImageElement;
    target.style.display = 'none';
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 border-b border-gray-200/50 shadow-sm animate-slideUp">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
          <img 
            src="/icon.png" 
            alt="GarageLog" 
            className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl shadow-md"
            onError={handleImageError}
          />
          <div className="leading-tight">
            <p className="font-bold text-gray-900 text-base sm:text-lg">GarageLog</p>
            <p className="text-[10px] sm:text-[11px] text-gray-500 -mt-0.5 font-medium hidden sm:block">クルマと、ずっといい関係。</p>
          </div>
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-700">
          <a href="#features" className="hover:text-blue-600 transition-colors">機能</a>
          <a href="#how" className="hover:text-blue-600 transition-colors">使い方</a>
          <a href="#pricing" className="hover:text-blue-600 transition-colors">料金</a>
          <a href="#faq" className="hover:text-blue-600 transition-colors">FAQ</a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* モバイルメニューボタン */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl text-gray-700 hover:bg-gray-100 transition-all duration-200"
            aria-label="メニュー"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <>
            <button
              onClick={onSignUp}
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 hover:scale-105 transition-all duration-200"
            >
              <UserPlus className="h-4 w-4" />
              新規登録
            </button>
            <button
              onClick={onLogin}
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-gray-700 font-semibold border-2 border-gray-300 shadow-md hover:bg-gray-50 hover:scale-105 transition-all duration-200"
            >
              <LogIn className="h-4 w-4" />
              ログイン
            </button>
            <button
              onClick={onSignUp}
              className="sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-all duration-200"
              aria-label="新規登録"
            >
              <UserPlus className="h-5 w-5" />
            </button>
          </>
        </div>
      </div>
      {/* モバイルメニュー */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="px-4 py-4 space-y-3">
            <a href="#features" className="block text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors" onClick={() => setMobileMenuOpen(false)}>機能</a>
            <a href="#how" className="block text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors" onClick={() => setMobileMenuOpen(false)}>使い方</a>
            <a href="#pricing" className="block text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors" onClick={() => setMobileMenuOpen(false)}>料金</a>
            <a href="#faq" className="block text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
          </nav>
        </div>
      )}
    </header>
  );
}

function Hero({ onLogin, onSignUp }: { onLogin: () => void; onSignUp: () => void }) {
  return (
    <section className="relative overflow-hidden bg-blue-50">
      {/* アニメーション背景 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative py-20 lg:py-32 z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 slide-in-left-on-scroll">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-sm border border-white/30 text-sm font-medium text-blue-700 shadow-lg animate-pulse-slow">
              <Sparkles className="h-4 w-4 animate-rotate-slow" />
              <span>クルマの記録を、もっとスマートに</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight">
              クルマと、<span className="text-blue-600 animate-pulse-slow">ずっと走り続ける</span>ために。
            </h1>
            
            <p className="text-xl text-gray-600 leading-relaxed max-w-xl">
              メンテ・給油・カスタムをまとめて記録。クルマのコンディションを見える化して、長く気持ちよく走れる状態をキープします。
            </p>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                onClick={onSignUp}
                className="group inline-flex justify-center items-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 text-white font-bold text-lg shadow-lg hover:bg-blue-700 hover:shadow-xl hover:scale-105 transition-all duration-200"
              >
                無料ではじめる
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onLogin}
                className="inline-flex justify-center items-center gap-2 px-8 py-4 rounded-2xl bg-white text-gray-900 font-semibold border-2 border-blue-200 hover:border-blue-300 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                ログイン
              </button>
              <a 
                href="#how" 
                onClick={() => lpEvents.ctaClick('hero_how_it_works')}
                className="inline-flex justify-center items-center gap-2 px-8 py-4 rounded-2xl bg-white text-gray-900 font-semibold border-2 border-gray-200 hover:border-gray-300 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                使い方を見る
              </a>
            </div>
            
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 pt-4">
              <div className="flex items-center gap-2 group">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Star className="h-4 w-4 text-blue-600 animate-pulse-slow" />
                </div>
                <span className="font-medium">継続しやすいUX</span>
              </div>
              <div className="flex items-center gap-2 group">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Timer className="h-4 w-4 text-blue-600 animate-pulse-slow" />
                </div>
                <span className="font-medium">記録は最短10秒</span>
              </div>
              <div className="flex items-center gap-2 group">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Shield className="h-4 w-4 text-blue-600 animate-pulse-slow" />
                </div>
                <span className="font-medium">データはあなたのもの</span>
              </div>
            </div>
          </div>
          
          <div className="relative lg:mt-0 mt-8 slide-in-right-on-scroll">
            <div className="relative rounded-3xl border border-blue-200 shadow-xl overflow-hidden bg-white transform hover:scale-[1.01] hover:shadow-2xl transition-all duration-300">
              {/* ブラウザウィンドウ風ヘッダー */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center gap-1.5 sm:gap-2 bg-gray-50">
                <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-red-400" />
                <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-yellow-400" />
                <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-green-400" />
                <span className="text-xs sm:text-sm text-gray-600 ml-1.5 sm:ml-2 font-medium">GarageLog</span>
                <div className="ml-auto flex items-center gap-1 sm:gap-2">
                  <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-gray-300"></div>
                  <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-gray-300"></div>
                  <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-gray-300"></div>
                </div>
              </div>
              
              {/* 実際のダッシュボード風コンテンツ */}
              <div className="p-4 sm:p-6 bg-white">
                {/* ヘッダー部分 */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2">
                  <div>
                    <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">ホーム</h3>
                    <p className="text-[9px] sm:text-[10px] lg:text-xs text-gray-500 mt-0.5 sm:mt-1">2024年12月</p>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Car className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 text-blue-600" />
                    </div>
                    <span className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700">シビック（FL5）</span>
                  </div>
                </div>

                {/* 統計カード */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 lg:gap-3 mb-4 sm:mb-6">
                  <div className="bg-blue-50 rounded-lg sm:rounded-xl p-1.5 sm:p-2 lg:p-3 border border-blue-100">
                    <div className="text-[9px] sm:text-[10px] lg:text-xs text-gray-600 mb-0.5 sm:mb-1">今月のコスト</div>
                    <div className="text-xs sm:text-sm lg:text-lg font-bold text-gray-900 break-all">¥12,500</div>
                  </div>
                  <div className="bg-green-50 rounded-lg sm:rounded-xl p-1.5 sm:p-2 lg:p-3 border border-green-100">
                    <div className="text-[9px] sm:text-[10px] lg:text-xs text-gray-600 mb-0.5 sm:mb-1">平均燃費</div>
                    <div className="text-xs sm:text-sm lg:text-lg font-bold text-gray-900 break-all">14.2 km/L</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg sm:rounded-xl p-1.5 sm:p-2 lg:p-3 border border-orange-100">
                    <div className="text-[9px] sm:text-[10px] lg:text-xs text-gray-600 mb-0.5 sm:mb-1">走行距離</div>
                    <div className="text-xs sm:text-sm lg:text-lg font-bold text-gray-900 break-all">10,234 km</div>
                  </div>
                </div>

                {/* グラフプレビュー */}
                <div className="mb-4 sm:mb-6 bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <LineChart className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                      <span className="text-xs sm:text-sm font-semibold text-gray-900">月別コスト</span>
                    </div>
                    <span className="text-[10px] sm:text-xs text-gray-500">過去6ヶ月</span>
                  </div>
                  <div className="h-24 sm:h-32 bg-white rounded-lg p-2 sm:p-3 flex items-end justify-between gap-0.5 sm:gap-1">
                    {[
                      { value: 8500, height: 55 },
                      { value: 12000, height: 75 },
                      { value: 9800, height: 62 },
                      { value: 14500, height: 90 },
                      { value: 12500, height: 78 },
                      { value: 11000, height: 68 }
                    ].map((item, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5 sm:gap-1 group relative">
                        <div 
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all hover:from-blue-600 hover:to-blue-500 min-h-[15px] sm:min-h-[20px]" 
                          style={{ height: `${item.height}%` }}
                        />
                        <span className="text-[8px] sm:text-[10px] text-gray-500">{['7', '8', '9', '10', '11', '12'][i]}月</span>
                        <div className="absolute -top-5 sm:-top-6 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded whitespace-nowrap">
                          ¥{item.value.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 機能カード */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="group rounded-lg sm:rounded-xl p-3 sm:p-4 bg-blue-50 border border-blue-200 hover:border-blue-300 hover:shadow-md transition-all">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-blue-900 font-semibold mb-1.5 sm:mb-2">
                      <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-blue-200 flex items-center justify-center group-hover:bg-blue-300 transition-colors">
                        <Camera className="h-3 w-3 sm:h-4 sm:w-4 text-blue-700" />
                      </div>
                      <span className="text-xs sm:text-sm">レシートOCR</span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-blue-800">撮って自動入力</p>
                  </div>
                  <div className="group rounded-lg sm:rounded-xl p-3 sm:p-4 bg-blue-50 border border-blue-200 hover:border-blue-300 hover:shadow-md transition-all">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-blue-900 font-semibold mb-1.5 sm:mb-2">
                      <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-blue-200 flex items-center justify-center group-hover:bg-blue-300 transition-colors">
                        <Wrench className="h-3 w-3 sm:h-4 sm:w-4 text-blue-700" />
                      </div>
                      <span className="text-xs sm:text-sm">次回メンテ</span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-blue-800">オイル交換まで 1,234km</p>
                  </div>
                  <div className="group rounded-lg sm:rounded-xl p-3 sm:p-4 bg-blue-50 border border-blue-200 hover:border-blue-300 hover:shadow-md transition-all">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-blue-900 font-semibold mb-1.5 sm:mb-2">
                      <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-blue-200 flex items-center justify-center group-hover:bg-blue-300 transition-colors">
                        <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-blue-700" />
                      </div>
                      <span className="text-xs sm:text-sm">PDF出力</span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-blue-800">履歴を証明書として</p>
                  </div>
                  <div className="group rounded-lg sm:rounded-xl p-3 sm:p-4 bg-blue-50 border border-blue-200 hover:border-blue-300 hover:shadow-md transition-all">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-blue-900 font-semibold mb-1.5 sm:mb-2">
                      <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-blue-200 flex items-center justify-center group-hover:bg-blue-300 transition-colors">
                        <LineChart className="h-3 w-3 sm:h-4 sm:w-4 text-blue-700" />
                      </div>
                      <span className="text-xs sm:text-sm">見える化</span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-blue-800">コストと燃費を可視化</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  return (
    <section className="border-y border-blue-200 bg-blue-50 fade-in-on-scroll">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 text-xs sm:text-sm">
        <div className="flex items-center gap-2 sm:gap-3 group hover:scale-105 transition-transform w-full md:w-auto justify-center md:justify-start">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-blue-100 flex items-center justify-center group-hover:rotate-12 transition-transform flex-shrink-0">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 animate-pulse-slow" />
          </div>
          <span className="font-semibold text-gray-700 text-center md:text-left">記録×可視化×意思決定支援</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 group hover:scale-105 transition-transform w-full md:w-auto justify-center md:justify-start">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-blue-100 flex items-center justify-center group-hover:rotate-12 transition-transform flex-shrink-0">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 animate-pulse-slow" />
          </div>
          <span className="font-semibold text-gray-700 text-center md:text-left">PDF出力で売却時の&quot;証明&quot;に</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 group hover:scale-105 transition-transform w-full md:w-auto justify-center md:justify-start">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-blue-100 flex items-center justify-center group-hover:rotate-12 transition-transform flex-shrink-0">
            <Download className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 animate-pulse-slow" />
          </div>
          <span className="font-semibold text-gray-700 text-center md:text-left">データはいつでもエクスポート可能</span>
        </div>
      </div>
    </section>
  );
}

function PainGain() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        <div className="space-y-4 sm:space-y-6 slide-in-left-on-scroll">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gray-100 border border-gray-200 text-xs sm:text-sm font-semibold text-gray-700">
            <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-gray-400" />
            よくある悩み
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900">こんな経験、ありませんか？</h2>
          <ul className="space-y-3 sm:space-y-4 text-gray-700">
            <li className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-gray-50 border border-gray-200 hover:shadow-md hover:scale-[1.02] transition-all">
              <span className="mt-1 h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-gray-400 flex-shrink-0 animate-pulse-slow" />
              <span className="font-medium text-sm sm:text-base">整備や給油の記録が紙やメモに散らばっている</span>
            </li>
            <li className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-gray-50 border border-gray-200 hover:shadow-md hover:scale-[1.02] transition-all">
              <span className="mt-1 h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-gray-400 flex-shrink-0 animate-pulse-slow" />
              <span className="font-medium text-sm sm:text-base">いくらかかっているか、今月のコストが分からない</span>
            </li>
            <li className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-gray-50 border border-gray-200 hover:shadow-md hover:scale-[1.02] transition-all">
              <span className="mt-1 h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-gray-400 flex-shrink-0 animate-pulse-slow" />
              <span className="font-medium text-sm sm:text-base">次に何をやればいいか（オイル/車検など）が曖昧</span>
            </li>
            <li className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-gray-50 border border-gray-200 hover:shadow-md hover:scale-[1.02] transition-all">
              <span className="mt-1 h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-gray-400 flex-shrink-0 animate-pulse-slow" />
              <span className="font-medium text-sm sm:text-base">売却時に整備履歴をうまく伝えられない</span>
            </li>
          </ul>
        </div>
        <div className="space-y-4 sm:space-y-6 slide-in-right-on-scroll">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-blue-50 border border-blue-200 text-xs sm:text-sm font-semibold text-blue-700">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4 animate-pulse-slow" />
            GarageLog なら
          </div>
          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900">すべて解決できます</h3>
          <ul className="space-y-3 sm:space-y-4">
            <li className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-blue-50 border border-blue-200 hover:shadow-md hover:scale-[1.02] transition-all">
              <div className="mt-1 h-5 w-5 sm:h-6 sm:w-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 group-hover:rotate-12 transition-transform">
                <Check className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900 text-sm sm:text-base">すべてを1か所で一元管理（車ごとに整理）</span>
            </li>
            <li className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-blue-50 border border-blue-200 hover:shadow-md hover:scale-[1.02] transition-all">
              <div className="mt-1 h-5 w-5 sm:h-6 sm:w-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 group-hover:rotate-12 transition-transform">
                <Check className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900 text-sm sm:text-base">自動グラフ化で &quot;見るだけで価値&quot;</span>
            </li>
            <li className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-blue-50 border border-blue-200 hover:shadow-md hover:scale-[1.02] transition-all">
              <div className="mt-1 h-5 w-5 sm:h-6 sm:w-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 group-hover:rotate-12 transition-transform">
                <Check className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900 text-sm sm:text-base">走行距離/期間から次回メンテを自動提案</span>
            </li>
            <li className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-blue-50 border border-blue-200 hover:shadow-md hover:scale-[1.02] transition-all">
              <div className="mt-1 h-5 w-5 sm:h-6 sm:w-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 group-hover:rotate-12 transition-transform">
                <Check className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900 text-sm sm:text-base">PDFで第三者にも&quot;証明&quot;できる</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: <Camera className="h-6 w-6" />, title: "記録する", desc: "テンプレ or レシートOCRで最短10秒。" },
    { icon: <LineChart className="h-6 w-6" />, title: "見える化", desc: "費用・燃費を自動でグラフ化。" },
    { icon: <Wrench className="h-6 w-6" />, title: "次の一手", desc: "次回メンテナンスを提案＆リマインド。" },
    { icon: <FileText className="h-6 w-6" />, title: "資産化", desc: 'PDFで履歴を"価値"に。' },
  ];
  
  return (
    <section id="how" className="bg-blue-50 py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white border border-blue-200 text-xs sm:text-sm font-semibold text-blue-700 mb-3 sm:mb-4">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
            使い方はシンプル
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900">4ステップで始められます</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {steps.map((s, i) => (
            <div key={i} className="group relative rounded-2xl sm:rounded-3xl border border-blue-200 bg-white p-5 sm:p-6 hover:border-blue-300 hover:shadow-lg hover:scale-105 transition-all duration-300 scale-in-on-scroll min-h-[180px] sm:min-h-[200px]" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md group-hover:scale-110 group-hover:rotate-12 transition-all mb-3 sm:mb-4">
                {s.icon}
              </div>
              <div className="absolute top-4 right-4 sm:top-6 sm:right-6 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm sm:text-base group-hover:scale-110 transition-transform">
                {i + 1}
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-2 sm:mb-2 pr-8">{s.title}</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const feats = [
    { icon: <Gauge className="h-5 w-5" />, title: "ホーム", desc: "今月のコスト・燃費・やることを一目で。" },
    { icon: <Wrench className="h-5 w-5" />, title: "メンテ記録", desc: "テンプレで素早く、走行距離も自動更新。" },
    { icon: <FileText className="h-5 w-5" />, title: "履歴証明PDF", desc: "売却や引き継ぎに使える書式で出力。" },
    { icon: <Camera className="h-5 w-5" />, title: "レシートOCR", desc: "給油や保険証券の自動読み取り。" },
    { icon: <Lock className="h-5 w-5" />, title: "プレミアムで無制限", desc: "複数台登録・PDF・OCRが使い放題。" },
  ];
  
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-blue-50 border border-blue-200 text-xs sm:text-sm font-semibold text-blue-700 mb-3 sm:mb-4">
          <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
          主な機能
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900">あなたの愛車管理をサポート</h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {feats.map((f, i) => (
          <div key={i} className="group rounded-xl sm:rounded-2xl border border-blue-200 bg-white p-4 sm:p-6 hover:border-blue-300 hover:shadow-lg hover:scale-105 transition-all duration-300 scale-in-on-scroll" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md group-hover:scale-110 group-hover:rotate-12 transition-all mb-3 sm:mb-4">
              {f.icon}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1.5 sm:mb-2">{f.title}</h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pricing({ onSignUp }: { onSignUp: () => void }) {
  return (
    <section id="pricing" className="bg-white py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-blue-50 border border-blue-200 text-xs sm:text-sm font-semibold text-blue-700 mb-3 sm:mb-4">
            <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
            料金プラン
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 mb-2 sm:mb-3">シンプルでわかりやすい料金</h2>
          <p className="text-base sm:text-lg text-gray-600">まずは無料で1台から。プレミアムで&quot;資産化&quot;が加速します。</p>
        </div>
        <div className="mt-8 sm:mt-12 grid md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
          {/* Free */}
          <div className="rounded-2xl sm:rounded-3xl border-2 border-gray-200 bg-white p-6 sm:p-8 hover:shadow-xl transition-shadow">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">無料プラン</h3>
            <p className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-1">
              ¥0<span className="text-base sm:text-lg font-medium text-gray-500"> / 月</span>
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">個人利用に最適</p>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-700 mb-6 sm:mb-8">
              <li className="flex gap-2 sm:gap-3 items-start">
                <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>車両登録 1台</span>
              </li>
              <li className="flex gap-2 sm:gap-3 items-start">
                <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>給油・メンテ・カスタムの記録</span>
              </li>
              <li className="flex gap-2 sm:gap-3 items-start">
                <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>グラフ・ホーム</span>
              </li>
              <li className="flex gap-2 sm:gap-3 items-start">
                <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-400">OCR / PDF</span>
              </li>
            </ul>
            <button
              onClick={onSignUp}
              className="w-full rounded-xl border-2 border-blue-600 bg-white text-blue-600 py-2.5 sm:py-3 font-semibold hover:bg-blue-50 transition-colors text-sm sm:text-base"
            >
              無料で始める
            </button>
          </div>

          {/* Premium */}
          <div className="relative rounded-2xl sm:rounded-3xl border-2 border-blue-500 bg-blue-50 p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-shadow">
            <span className="absolute -top-3 sm:-top-4 right-4 sm:right-6 rounded-full bg-blue-600 text-white text-[10px] sm:text-xs font-bold px-3 sm:px-4 py-1 sm:py-1.5 shadow-lg">
              おすすめ
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">プレミアム</h3>
            <p className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-1">
              ¥480<span className="text-base sm:text-lg font-medium text-gray-500"> / 月</span>
            </p>
            <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">本格的な資産管理に</p>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-700 mb-6 sm:mb-8">
              <li className="flex gap-2 sm:gap-3 items-start">
                <Check className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>複数台登録 無制限</span>
              </li>
              <li className="flex gap-2 sm:gap-3 items-start">
                <Check className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>レシートOCR（給油/保険）</span>
              </li>
              <li className="flex gap-2 sm:gap-3 items-start">
                <Check className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>履歴証明PDF出力</span>
              </li>
              <li className="flex gap-2 sm:gap-3 items-start">
                <Check className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>広告非表示・高度なリマインダー</span>
              </li>
            </ul>
            <button
              onClick={onSignUp}
              className="w-full rounded-xl bg-blue-600 text-white py-2.5 sm:py-3 font-bold shadow-lg hover:shadow-xl hover:bg-blue-700 transition-colors text-sm sm:text-base"
            >
              プレミアムを始める
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    { q: "どのような記録ができますか？", a: "メンテナンス履歴、給油記録、カスタマイズ履歴など、愛車に関するあらゆる情報を記録できます。走行距離も自動で管理されるため、次回のメンテナンス時期も一目で分かります。" },
    { q: "レシートOCRはどのくらい正確ですか？", a: "給油レシートや保険証券などの主要な書類を高精度で読み取り、自動入力します。手動での修正も可能なので、確実に記録を残せます。" },
    { q: "複数台の車を管理できますか？", a: "無料プランでは1台まで、プレミアムプランでは無制限に登録可能です。車ごとに記録を分けて管理できるため、家族で複数台お持ちの方にも最適です。" },
    { q: "売却時に履歴を証明できますか？", a: "PDF出力機能で、整備履歴を証明書として出力できます。署名が埋め込まれるため、第三者への提示にも安心です。売却時の価値向上にもつながります。" },
  ];
  return (
    <section id="faq" className="bg-blue-50 py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white border border-blue-200 text-xs sm:text-sm font-semibold text-blue-700 mb-3 sm:mb-4">
            <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
            よくある質問
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900">気になることを解決</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          {faqs.map((f, i) => (
            <div key={i} className="rounded-xl sm:rounded-2xl border border-blue-200 bg-white p-4 sm:p-6 hover:border-blue-300 hover:shadow-md hover:scale-[1.02] transition-all scale-in-on-scroll" style={{ animationDelay: `${i * 0.1}s` }}>
              <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-2 sm:mb-3">{f.q}</h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA({ onLogin, onSignUp }: { onLogin: () => void; onSignUp: () => void }) {
  return (
    <section id="cta" className="relative overflow-hidden bg-blue-600 fade-in-on-scroll">
      {/* アニメーション背景 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 sm:w-96 sm:h-96 bg-white/10 rounded-full mix-blend-overlay filter blur-3xl animate-blob"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-white/10 rounded-full mix-blend-overlay filter blur-3xl animate-blob animation-delay-2000"></div>
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="rounded-2xl sm:rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 p-6 sm:p-8 lg:p-10 xl:p-12 text-white">
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-3 sm:mb-4 animate-pulse-slow">愛車の価値を、最大限に。</h2>
              <p className="text-base sm:text-lg text-blue-100 leading-relaxed">プロレベルの管理を、今すぐ無料で。</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-end">
              <button
                onClick={onSignUp}
                className="group inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-white text-blue-600 font-bold px-6 sm:px-8 py-3 sm:py-4 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 text-base sm:text-lg"
              >
                新規登録
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onLogin}
                className="inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-sm text-white font-semibold border-2 border-white/30 px-6 sm:px-8 py-3 sm:py-4 shadow-xl hover:bg-white/20 hover:scale-105 transition-all duration-200 text-base sm:text-lg"
              >
                ログイン
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.style.display = 'none';
  };

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 text-xs sm:text-sm text-gray-600">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <img 
              src="/icon.png" 
              alt="GarageLog" 
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl shadow-md"
              onError={handleImageError}
            />
            <div>
              <p className="font-bold text-gray-900 text-base sm:text-lg">GarageLog</p>
              <p className="text-[10px] sm:text-xs text-gray-500">© {new Date().getFullYear()} GarageLog</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <a className="hover:text-blue-600 font-medium transition-colors text-xs sm:text-sm" href="/legal/privacy">プライバシーポリシー</a>
            <a className="hover:text-blue-600 font-medium transition-colors text-xs sm:text-sm" href="/legal/terms">利用規約</a>
            <a className="hover:text-blue-600 font-medium transition-colors text-xs sm:text-sm" href="/support">サポート</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
