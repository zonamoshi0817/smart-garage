"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Shield, Gauge, Wrench, FileText, Share2, Camera, Lock, Sparkles, Car, LineChart, ArrowRight, Download, Star, Timer, Zap, LogIn } from "lucide-react";
import { loginWithGoogle, watchAuth } from "@/lib/firebase";
import type { User } from "firebase/auth";

// Smart Garage LP — Modern, premium design with animations and gradients

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = watchAuth((u) => {
      setUser(u);
      setIsLoading(false);
      // ログイン済みの場合はホーム画面にリダイレクト
      if (u) {
        router.push('/home');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      // ログイン成功後、watchAuthのコールバックでリダイレクトされる
    } catch (error) {
      console.error('ログインエラー:', error);
      alert('ログインに失敗しました。もう一度お試しください。');
    }
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
      <Header user={user} onLogin={handleLogin} />
      <Hero onLogin={handleLogin} />
      <TrustBar />
      <PainGain />
      <HowItWorks />
      <Features />
      <ValueBlocks />
      <Pricing />
      <Security />
      <FAQ />
      <CTA onLogin={handleLogin} />
      <Footer />
    </div>
  );
}

function Header({ user, onLogin }: { user: User | null; onLogin: () => void }) {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 border-b border-gray-200/50 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/icon.png" alt="GarageLog" className="h-10 w-10 rounded-xl shadow-md" />
          <div className="leading-tight">
            <p className="font-bold text-gray-900 text-lg">GarageLog</p>
            <p className="text-[11px] text-gray-500 -mt-0.5 font-medium">クルマと、ずっといい関係。</p>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-700">
          <a href="#features" className="hover:text-blue-600 transition-colors">機能</a>
          <a href="#how" className="hover:text-blue-600 transition-colors">使い方</a>
          <a href="#pricing" className="hover:text-blue-600 transition-colors">料金</a>
          <a href="#faq" className="hover:text-blue-600 transition-colors">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <a href="/home" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 transition-all duration-200">
              ダッシュボードへ <ArrowRight className="h-4 w-4" />
            </a>
          ) : (
            <button
              onClick={onLogin}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 transition-all duration-200"
            >
              <LogIn className="h-4 w-4" />
              ログイン
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero({ onLogin }: { onLogin: () => void }) {
  return (
    <section className="relative overflow-hidden bg-blue-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-blue-200 text-sm font-medium text-blue-700 shadow-sm">
              <Sparkles className="h-4 w-4" />
              <span>クルマの記録を、もっとスマートに</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight">
              クルマと、<span className="text-blue-600">ずっと走り続ける</span>ために。
            </h1>
            
            <p className="text-xl text-gray-600 leading-relaxed max-w-xl">
              メンテ・給油・カスタムをまとめて記録。クルマのコンディションを見える化して、長く気持ちよく走れる状態をキープします。
            </p>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                onClick={onLogin}
                className="group inline-flex justify-center items-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 text-white font-bold text-lg shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all duration-200"
              >
                無料ではじめる
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <a href="#how" className="inline-flex justify-center items-center gap-2 px-8 py-4 rounded-2xl bg-white text-gray-900 font-semibold border-2 border-blue-200 hover:border-blue-300 shadow-md hover:shadow-lg transition-all duration-200">
                使い方を見る
              </a>
            </div>
            
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 pt-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Star className="h-4 w-4 text-blue-600" />
                </div>
                <span className="font-medium">継続しやすいUX</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Timer className="h-4 w-4 text-blue-600" />
                </div>
                <span className="font-medium">記録は最短10秒</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-blue-600" />
                </div>
                <span className="font-medium">データはあなたのもの</span>
              </div>
            </div>
          </div>
          
          <div className="relative lg:mt-0 mt-8">
            <div className="relative rounded-3xl border border-blue-200 shadow-xl overflow-hidden bg-white transform hover:scale-[1.01] transition-transform duration-300">
              <div className="px-6 py-4 border-b border-blue-100 flex items-center gap-2 bg-blue-50">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
                <span className="text-sm text-gray-500 ml-2 font-medium">GarageLog Demo</span>
              </div>
              <div className="p-6 grid sm:grid-cols-2 gap-4 bg-white">
                <div className="group rounded-xl p-5 bg-blue-50 border border-blue-200 hover:border-blue-300 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-2 text-blue-900 font-semibold mb-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-200 flex items-center justify-center group-hover:bg-blue-300 transition-colors">
                      <Camera className="h-4 w-4 text-blue-700" />
                    </div>
                    レシートOCR
                  </div>
                  <p className="text-sm text-blue-800">撮って自動入力。L価格も自動計算。</p>
                </div>
                <div className="group rounded-xl p-5 bg-blue-50 border border-blue-200 hover:border-blue-300 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-2 text-blue-900 font-semibold mb-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-200 flex items-center justify-center group-hover:bg-blue-300 transition-colors">
                      <LineChart className="h-4 w-4 text-blue-700" />
                    </div>
                    見える化
                  </div>
                  <p className="text-sm text-blue-800">月別コストと燃費を自動でグラフ化。</p>
                </div>
                <div className="group rounded-xl p-5 bg-blue-50 border border-blue-200 hover:border-blue-300 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-2 text-blue-900 font-semibold mb-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-200 flex items-center justify-center group-hover:bg-blue-300 transition-colors">
                      <Wrench className="h-4 w-4 text-blue-700" />
                    </div>
                    次回メンテ提案
                  </div>
                  <p className="text-sm text-blue-800">距離/期間から &quot;次にやること&quot; を提示。</p>
                </div>
                <div className="group rounded-xl p-5 bg-blue-50 border border-blue-200 hover:border-blue-300 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-2 text-blue-900 font-semibold mb-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-200 flex items-center justify-center group-hover:bg-blue-300 transition-colors">
                      <Share2 className="h-4 w-4 text-blue-700" />
                    </div>
                    PDF/共有
                  </div>
                  <p className="text-sm text-blue-800">履歴を証明書として出力・共有。</p>
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
    <section className="border-y border-blue-200 bg-blue-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-6 text-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-blue-600" />
          </div>
          <span className="font-semibold text-gray-700">記録×可視化×意思決定支援</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Shield className="h-5 w-5 text-blue-600" />
          </div>
          <span className="font-semibold text-gray-700">共有URLは署名付き&有効期限</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Download className="h-5 w-5 text-blue-600" />
          </div>
          <span className="font-semibold text-gray-700">PDF出力で売却時の&quot;証明&quot;に</span>
        </div>
      </div>
    </section>
  );
}

function PainGain() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      <div className="grid lg:grid-cols-2 gap-12 items-start">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 border border-gray-200 text-sm font-semibold text-gray-700">
            <span className="h-2 w-2 rounded-full bg-gray-400" />
            よくある悩み
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">こんな経験、ありませんか？</h2>
          <ul className="space-y-4 text-gray-700">
            <li className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200 hover:shadow-md transition-shadow">
              <span className="mt-1 h-2 w-2 rounded-full bg-gray-400 flex-shrink-0" />
              <span className="font-medium">整備や給油の記録が紙やメモに散らばっている</span>
            </li>
            <li className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200 hover:shadow-md transition-shadow">
              <span className="mt-1 h-2 w-2 rounded-full bg-gray-400 flex-shrink-0" />
              <span className="font-medium">いくらかかっているか、今月のコストが分からない</span>
            </li>
            <li className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200 hover:shadow-md transition-shadow">
              <span className="mt-1 h-2 w-2 rounded-full bg-gray-400 flex-shrink-0" />
              <span className="font-medium">次に何をやればいいか（オイル/車検など）が曖昧</span>
            </li>
            <li className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200 hover:shadow-md transition-shadow">
              <span className="mt-1 h-2 w-2 rounded-full bg-gray-400 flex-shrink-0" />
              <span className="font-medium">売却時に整備履歴をうまく伝えられない</span>
            </li>
          </ul>
        </div>
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-sm font-semibold text-blue-700">
            <Zap className="h-4 w-4" />
            GarageLog なら
          </div>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-gray-900">すべて解決できます</h3>
          <ul className="space-y-4">
            <li className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 border border-blue-200 hover:shadow-md transition-all">
              <div className="mt-1 h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Check className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">すべてを1か所で一元管理（車ごとに整理）</span>
            </li>
            <li className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 border border-blue-200 hover:shadow-md transition-all">
              <div className="mt-1 h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Check className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">自動グラフ化で &quot;見るだけで価値&quot;</span>
            </li>
            <li className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 border border-blue-200 hover:shadow-md transition-all">
              <div className="mt-1 h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Check className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">走行距離/期間から次回メンテを自動提案</span>
            </li>
            <li className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 border border-blue-200 hover:shadow-md transition-all">
              <div className="mt-1 h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Check className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">PDF/共有リンクで第三者にも&quot;証明&quot;できる</span>
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
    { icon: <Share2 className="h-6 w-6" />, title: "資産化", desc: 'PDF/共有URLで履歴を"価値"に。' },
  ];
  
  return (
    <section id="how" className="bg-blue-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-blue-200 text-sm font-semibold text-blue-700 mb-4">
            <Zap className="h-4 w-4" />
            使い方はシンプル
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">4ステップで始められます</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={i} className="group relative rounded-3xl border border-blue-200 bg-white p-6 hover:border-blue-300 hover:shadow-lg transition-all duration-300">
              <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform mb-4">
                {s.icon}
              </div>
              <div className="absolute top-6 right-6 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                {i + 1}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
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
    { icon: <Share2 className="h-5 w-5" />, title: "共有URL", desc: '署名付きリンクで安全に "見せられる"。' },
    { icon: <Camera className="h-5 w-5" />, title: "レシートOCR", desc: "給油や保険証券の自動読み取り。" },
    { icon: <Lock className="h-5 w-5" />, title: "プレミアムで無制限", desc: "複数台登録・PDF・共有・OCRが使い放題。" },
  ];
  
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-sm font-semibold text-blue-700 mb-4">
          <Sparkles className="h-4 w-4" />
          主な機能
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">あなたの愛車管理をサポート</h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {feats.map((f, i) => (
          <div key={i} className="group rounded-2xl border border-blue-200 bg-white p-6 hover:border-blue-300 hover:shadow-lg transition-all duration-300">
            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform mb-4">
              {f.icon}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ValueBlocks() {
  const blocks = [
    {
      title: '&quot;見せられる履歴&quot;で価値が上がる',
      desc: "記録は自己満で終わらせない。PDF/共有URLで第三者にも伝わる形に。中古車の信頼性と売却価値を底上げします。",
      icon: <Star className="h-6 w-6" />,
    },
    {
      title: "続けられるUX",
      desc: '入力は最小化。テンプレ・前回コピー・OCRで&quot;続く仕組み&quot;を設計。',
      icon: <Zap className="h-6 w-6" />,
    },
    {
      title: "将来の意思決定がラクに",
      desc: "費用の見える化と次回メンテ提案で、計画も予算も迷わない。",
      icon: <LineChart className="h-6 w-6" />,
    },
  ];
  return (
    <section className="bg-blue-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-6">
        {blocks.map((b, i) => (
          <div key={i} className="group rounded-3xl bg-white border border-blue-200 p-8 shadow-md hover:shadow-lg hover:border-blue-300 transition-all duration-300">
            <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform mb-4">
              {b.icon}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">{b.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{b.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-sm font-semibold text-blue-700 mb-4">
            <Sparkles className="h-4 w-4" />
            料金プラン
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">シンプルでわかりやすい料金</h2>
          <p className="text-lg text-gray-600">まずは無料で1台から。プレミアムで&quot;資産化&quot;が加速します。</p>
        </div>
        <div className="mt-12 grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free */}
          <div className="rounded-3xl border-2 border-gray-200 bg-white p-8 hover:shadow-xl transition-shadow">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">無料プラン</h3>
            <p className="text-4xl font-extrabold text-gray-900 mb-1">
              ¥0<span className="text-lg font-medium text-gray-500"> / 月</span>
            </p>
            <p className="text-sm text-gray-500 mb-6">個人利用に最適</p>
            <ul className="space-y-3 text-sm text-gray-700 mb-8">
              <li className="flex gap-3 items-start">
                <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>車両登録 1台</span>
              </li>
              <li className="flex gap-3 items-start">
                <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>給油・メンテ・カスタムの記録</span>
              </li>
              <li className="flex gap-3 items-start">
                <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>グラフ・ホーム</span>
              </li>
              <li className="flex gap-3 items-start">
                <Lock className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-400">OCR / PDF / 共有URL</span>
              </li>
            </ul>
            <button disabled className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-400 py-3 font-semibold cursor-not-allowed">
              近日公開
            </button>
          </div>

          {/* Premium */}
          <div className="relative rounded-3xl border-2 border-blue-500 bg-blue-50 p-8 shadow-xl hover:shadow-2xl transition-shadow">
            <span className="absolute -top-4 right-6 rounded-full bg-blue-600 text-white text-xs font-bold px-4 py-1.5 shadow-lg">
              おすすめ
            </span>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">プレミアム</h3>
            <p className="text-4xl font-extrabold text-gray-900 mb-1">
              ¥480<span className="text-lg font-medium text-gray-500"> / 月</span>
            </p>
            <p className="text-sm text-gray-600 mb-6">本格的な資産管理に</p>
            <ul className="space-y-3 text-sm text-gray-700 mb-8">
              <li className="flex gap-3 items-start">
                <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>複数台登録 無制限</span>
              </li>
              <li className="flex gap-3 items-start">
                <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>レシートOCR（給油/保険）</span>
              </li>
              <li className="flex gap-3 items-start">
                <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>履歴証明PDF出力</span>
              </li>
              <li className="flex gap-3 items-start">
                <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>署名付き共有URL（有効期限つき）</span>
              </li>
              <li className="flex gap-3 items-start">
                <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>広告非表示・高度なリマインダー</span>
              </li>
            </ul>
            <button disabled className="w-full rounded-xl bg-blue-600 text-white py-3 font-bold shadow-lg hover:shadow-xl cursor-not-allowed">
              近日公開
            </button>
            <p className="mt-3 text-xs text-gray-500 text-center">サービス準備中です。もうしばらくお待ちください。</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Security() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-sm font-semibold text-blue-700">
            <Shield className="h-4 w-4" />
            セキュリティ & プライバシー
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">あなたのデータを守ります</h2>
          <ul className="space-y-4">
            <li className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 border border-blue-200">
              <div className="mt-1 h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="font-semibold text-gray-900">Firebase認証・権限管理</span>
                <p className="text-sm text-gray-600 mt-1">ユーザー毎にデータを完全分離</p>
              </div>
            </li>
            <li className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 border border-blue-200">
              <div className="mt-1 h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="font-semibold text-gray-900">署名付きトークン＋有効期限</span>
                <p className="text-sm text-gray-600 mt-1">共有リンクは安全に保護</p>
              </div>
            </li>
            <li className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 border border-blue-200">
              <div className="mt-1 h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="font-semibold text-gray-900">PDFに署名埋め込み</span>
                <p className="text-sm text-gray-600 mt-1">改ざん防止で信頼性を確保</p>
              </div>
            </li>
            <li className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 border border-blue-200">
              <div className="mt-1 h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="font-semibold text-gray-900">データの所有権はユーザーに</span>
                <p className="text-sm text-gray-600 mt-1">いつでもエクスポート可能</p>
              </div>
            </li>
          </ul>
        </div>
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8 shadow-lg">
          <div className="flex items-center gap-3 text-gray-900 font-bold text-xl mb-4">
            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
              <Shield className="h-6 w-6 text-white" />
            </div>
            安心して使える仕組み
          </div>
          <p className="text-gray-700 leading-relaxed">
            GarageLogは、あなたの愛車データを安全に守ります。リンク共有時も、期限つきの署名トークンで第三者への過剰な公開を防ぎます。データの所有権は常にあなたにあり、いつでもエクスポートできます。
          </p>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    { q: "自動連携はありますか？", a: "銀行連携のような外部APIはありませんが、代わりにレシートOCR・テンプレ・前回コピーで入力負担を最小化しています。" },
    { q: "無料プランでも十分使えますか？", a: "1台までなら主要機能はすべて利用可能です。2台目以降・OCR・PDF・共有URLはプレミアムで提供します。" },
    { q: "データはエクスポートできますか？", a: "CSV/JSON/PDFでいつでもエクスポート可能です。PDFには署名を埋め込みます。" },
    { q: "安全面は？", a: "Firebase認証・権限管理、署名付き共有リンク、有効期限など多層防御を採用しています。" },
  ];
  return (
    <section id="faq" className="bg-blue-50 py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-blue-200 text-sm font-semibold text-blue-700 mb-4">
            <Sparkles className="h-4 w-4" />
            よくある質問
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">気になることを解決</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {faqs.map((f, i) => (
            <div key={i} className="rounded-2xl border border-blue-200 bg-white p-6 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="font-bold text-lg text-gray-900 mb-3">{f.q}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA({ onLogin }: { onLogin: () => void }) {
  return (
    <section id="cta" className="relative overflow-hidden bg-blue-600">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 p-10 lg:p-12 text-white">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">今日から、愛車の履歴を資産に。</h2>
              <p className="text-lg text-blue-100 leading-relaxed">無料で1台から。7日間プレミアムトライアルもご用意しています。</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:justify-end">
              <button
                onClick={onLogin}
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-blue-600 font-bold px-8 py-4 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
              >
                無料ではじめる
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 text-sm text-gray-600">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
              <Car className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">GarageLog</p>
              <p className="text-xs text-gray-500">© {new Date().getFullYear()} GarageLog</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <a className="hover:text-blue-600 font-medium transition-colors" href="/legal/privacy">プライバシーポリシー</a>
            <a className="hover:text-blue-600 font-medium transition-colors" href="/legal/terms">利用規約</a>
            <a className="hover:text-blue-600 font-medium transition-colors" href="/support">サポート</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
