"use client";

import React from "react";
import { Check, Shield, Gauge, Wrench, FileText, Share2, Camera, Lock, Sparkles, Car, LineChart, ArrowRight, Download, Star, Timer } from "lucide-react";

// Smart Garage LP — clean, data-first personal management LP patterns

export default function LandingPage() {
  // 認証済みでもLPを表示（自動リダイレクトなし）
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Header />
      <Hero />
      <TrustBar />
      <PainGain />
      <HowItWorks />
      <Features />
      <ValueBlocks />
      <Pricing />
      <Security />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
            <Car className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="font-bold text-gray-900">garage log</p>
            <p className="text-[12px] text-gray-500 -mt-0.5">Turn Your Car History into Value</p>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-700">
          <a href="#features" className="hover:text-gray-900">機能</a>
          <a href="#how" className="hover:text-gray-900">使い方</a>
          <a href="#pricing" className="hover:text-gray-900">料金</a>
          <a href="#faq" className="hover:text-gray-900">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <a href="/dashboard" className="hidden sm:inline-flex px-3 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50">ログイン</a>
          <a href="#cta" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-medium shadow-sm hover:bg-blue-700">
            無料ではじめる <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-white" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-10 items-center py-16 lg:py-24">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900">
              愛車の履歴を、資産に。
            </h1>
            <p className="mt-5 text-lg text-gray-600 leading-relaxed">
              給油・メンテ・カスタムの"いたわり"を記録。グラフ・PDF・共有で、愛車の価値を正しく伝えます。
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <a href="#cta" className="inline-flex justify-center items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700">
                無料ではじめる <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#how" className="inline-flex justify-center items-center gap-2 px-5 py-3 rounded-2xl bg-gray-900 text-white font-semibold hover:bg-black">
                1分でわかる使い方
              </a>
            </div>
            <div className="mt-5 flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1"><Star className="h-4 w-4" /> 継続しやすいUX</div>
              <div className="flex items-center gap-1"><Timer className="h-4 w-4" /> 記録は最短10秒</div>
              <div className="flex items-center gap-1"><Shield className="h-4 w-4" /> データはあなたのもの</div>
            </div>
          </div>
          <div className="relative">
            <div className="relative rounded-3xl border border-gray-200 shadow-xl overflow-hidden bg-white">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
                <span className="text-sm text-gray-500 ml-2">garage log Demo</span>
              </div>
              <div className="p-6 grid sm:grid-cols-2 gap-6">
                <div className="rounded-2xl p-4 bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-2 text-blue-700 font-semibold"><Camera className="h-4 w-4" /> レシートOCR</div>
                  <p className="mt-2 text-sm text-blue-800">撮って自動入力。L価格も自動計算。</p>
                </div>
                <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold"><LineChart className="h-4 w-4" /> 見える化</div>
                  <p className="mt-2 text-sm text-emerald-800">月別コストと燃費を自動でグラフ化。</p>
                </div>
                <div className="rounded-2xl p-4 bg-amber-50 border border-amber-100">
                  <div className="flex items-center gap-2 text-amber-700 font-semibold"><Wrench className="h-4 w-4" /> 次回メンテ提案</div>
                  <p className="mt-2 text-sm text-amber-800">距離/期間から &quot;次にやること&quot; を提示。</p>
                </div>
                <div className="rounded-2xl p-4 bg-fuchsia-50 border border-fuchsia-100">
                  <div className="flex items-center gap-2 text-fuchsia-700 font-semibold"><Share2 className="h-4 w-4" /> PDF/共有</div>
                  <p className="mt-2 text-sm text-fuchsia-800">履歴を証明書として出力・共有。</p>
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
    <section className="border-y border-gray-100 bg-gray-50/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> 記録×可視化×意思決定支援</div>
        <div className="flex items-center gap-2"><Shield className="h-4 w-4" /> 共有URLは署名付き&有効期限</div>
        <div className="flex items-center gap-2"><Download className="h-4 w-4" /> PDF出力で売却時の&quot;証明&quot;に</div>
      </div>
    </section>
  );
}

function PainGain() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid lg:grid-cols-2 gap-10 items-start">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">よくある悩み</h2>
          <ul className="mt-6 space-y-4 text-gray-700">
            <li className="flex items-start gap-3"><span className="mt-1.5 h-2 w-2 rounded-full bg-gray-300"/> 整備や給油の記録が紙やメモに散らばっている</li>
            <li className="flex items-start gap-3"><span className="mt-1.5 h-2 w-2 rounded-full bg-gray-300"/> いくらかかっているか、今月のコストが分からない</li>
            <li className="flex items-start gap-3"><span className="mt-1.5 h-2 w-2 rounded-full bg-gray-300"/> 次に何をやればいいか（オイル/車検など）が曖昧</li>
            <li className="flex items-start gap-3"><span className="mt-1.5 h-2 w-2 rounded-full bg-gray-300"/> 売却時に整備履歴をうまく伝えられない</li>
          </ul>
        </div>
        <div>
          <h3 className="text-2xl sm:text-3xl font-bold">garage log なら</h3>
          <ul className="mt-6 space-y-4 text-gray-700">
            <li className="flex items-start gap-3"><Check className="mt-1 h-5 w-5 text-blue-600"/> すべてを1か所で一元管理（車ごとに整理）</li>
            <li className="flex items-start gap-3"><Check className="mt-1 h-5 w-5 text-blue-600"/> 自動グラフ化で &quot;見るだけで価値&quot;</li>
            <li className="flex items-start gap-3"><Check className="mt-1 h-5 w-5 text-blue-600"/> 走行距離/期間から次回メンテを自動提案</li>
            <li className="flex items-start gap-3"><Check className="mt-1 h-5 w-5 text-blue-600"/> PDF/共有リンクで第三者にも&quot;証明&quot;できる</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: <Camera className="h-5 w-5" />, title: "記録する", desc: "テンプレ or レシートOCRで最短10秒。" },
    { icon: <LineChart className="h-5 w-5" />, title: "見える化", desc: "費用・燃費を自動でグラフ化。" },
    { icon: <Wrench className="h-5 w-5" />, title: "次の一手", desc: "次回メンテナンスを提案＆リマインド。" },
    { icon: <Share2 className="h-5 w-5" />, title: "資産化", desc: 'PDF/共有URLで履歴を"価値"に。' },
  ];
  return (
    <section id="how" className="bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center">使い方はシンプル</h2>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="h-10 w-10 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center">{s.icon}</div>
              <h3 className="mt-4 font-semibold text-gray-900">{s.title}</h3>
              <p className="mt-1.5 text-sm text-gray-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const feats = [
    { icon: <Gauge className="h-5 w-5" />, title: "ダッシュボード", desc: "今月のコスト・燃費・やることを一目で。" },
    { icon: <Wrench className="h-5 w-5" />, title: "メンテ記録", desc: "テンプレで素早く、走行距離も自動更新。" },
    { icon: <FileText className="h-5 w-5" />, title: "履歴証明PDF", desc: "売却や引き継ぎに使える書式で出力。" },
    { icon: <Share2 className="h-5 w-5" />, title: "共有URL", desc: '署名付きリンクで安全に "見せられる"。' },
    { icon: <Camera className="h-5 w-5" />, title: "レシートOCR", desc: "給油や保険証券の自動読み取り。" },
    { icon: <Lock className="h-5 w-5" />, title: "プレミアムで無制限", desc: "複数台登録・PDF・共有・OCRが使い放題。" },
  ];
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <h2 className="text-2xl sm:text-3xl font-bold text-center">主な機能</h2>
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {feats.map((f, i) => (
          <div key={i} className="rounded-2xl border border-gray-200 p-6">
            <div className="h-10 w-10 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center">{f.icon}</div>
            <h3 className="mt-4 font-semibold text-gray-900">{f.title}</h3>
            <p className="mt-1.5 text-sm text-gray-600">{f.desc}</p>
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
    },
    {
      title: "続けられるUX",
      desc: '入力は最小化。テンプレ・前回コピー・OCRで&quot;続く仕組み&quot;を設計。',
    },
    {
      title: "将来の意思決定がラクに",
      desc: "費用の見える化と次回メンテ提案で、計画も予算も迷わない。",
    },
  ];
  return (
    <section className="bg-blue-50/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 grid md:grid-cols-3 gap-6">
        {blocks.map((b, i) => (
          <div key={i} className="rounded-2xl bg-white border border-blue-100 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900">{b.title}</h3>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">{b.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="bg-gray-50" >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center">料金プラン</h2>
        <p className="mt-2 text-center text-gray-600">まずは無料で1台から。プレミアムで&quot;資産化&quot;が加速します。</p>
        <div className="mt-10 grid md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold">無料プラン</h3>
            <p className="text-3xl font-extrabold mt-1">¥0<span className="text-sm font-medium text-gray-500"> / 月</span></p>
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              <li className="flex gap-2"><Check className="h-4 w-4 text-green-600"/> 車両登録 1台</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-green-600"/> 給油・メンテ・カスタムの記録</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-green-600"/> グラフ・ダッシュボード</li>
              <li className="flex gap-2"><Lock className="h-4 w-4 text-gray-400"/> OCR / PDF / 共有URL</li>
            </ul>
            <a href="#cta" className="mt-6 inline-flex items-center justify-center w-full rounded-xl border border-gray-200 py-2.5 hover:bg-gray-50">無料ではじめる</a>
          </div>

          {/* Premium */}
          <div className="relative rounded-2xl border border-blue-200 bg-white p-6 shadow-[0_10px_30px_rgba(37,99,235,0.08)]">
            <span className="absolute -top-3 right-4 rounded-full bg-blue-600 text-white text-xs px-2 py-0.5 shadow">おすすめ</span>
            <h3 className="text-lg font-semibold">プレミアム</h3>
            <p className="text-3xl font-extrabold mt-1">¥480<span className="text-sm font-medium text-gray-500"> / 月</span></p>
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              <li className="flex gap-2"><Check className="h-4 w-4 text-blue-600"/> 複数台登録 無制限</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-blue-600"/> レシートOCR（給油/保険）</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-blue-600"/> 履歴証明PDF出力</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-blue-600"/> 署名付き共有URL（有効期限つき）</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-blue-600"/> 広告非表示・高度なリマインダー</li>
            </ul>
            <a href="#cta" className="mt-6 inline-flex items-center justify-center w-full rounded-xl bg-blue-600 text-white py-2.5 hover:bg-blue-700">7日間無料トライアル</a>
            <p className="mt-2 text-xs text-gray-500 text-center">いつでも解約可能。年額プラン（¥4,800）も選べます。</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Security() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">セキュリティ & プライバシー</h2>
          <ul className="mt-6 space-y-3 text-gray-700 text-sm">
            <li className="flex items-start gap-3"><Shield className="mt-0.5 h-5 w-5 text-blue-600"/> Firebase認証・権限管理（ユーザー毎に分離）</li>
            <li className="flex items-start gap-3"><Shield className="mt-0.5 h-5 w-5 text-blue-600"/> 共有リンクは署名付きトークン＋有効期限</li>
            <li className="flex items-start gap-3"><Shield className="mt-0.5 h-5 w-5 text-blue-600"/> PDFに署名埋め込み（改ざん防止）</li>
            <li className="flex items-start gap-3"><Shield className="mt-0.5 h-5 w-5 text-blue-600"/> データの所有権はユーザーに</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 text-gray-900 font-semibold"><Shield className="h-5 w-5 text-blue-600"/> 安心して使える仕組み</div>
          <p className="mt-2 text-sm text-gray-600">garage logは、あなたの愛車データを安全に守ります。リンク共有時も、期限つきの署名トークンで第三者への過剰な公開を防ぎます。</p>
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
    <section id="faq" className="bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center">よくある質問</h2>
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          {faqs.map((f, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-6">
              <h3 className="font-semibold text-gray-900">{f.q}</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="cta" className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-3xl bg-white/10 ring-1 ring-white/20 p-8 lg:p-10 text-white backdrop-blur">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold">今日から、愛車の履歴を資産に。</h2>
              <p className="mt-2 text-blue-100">無料で1台から。7日間プレミアムトライアルもご用意しています。</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <a href="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-blue-700 font-semibold px-6 py-3 hover:bg-blue-50">今すぐはじめる</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 text-sm text-gray-600">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gray-900 flex items-center justify-center">
              <Car className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">garage log</p>
              <p className="text-xs text-gray-500">© {new Date().getFullYear()} garage log</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <a className="hover:text-gray-900" href="/legal/privacy">プライバシーポリシー</a>
            <a className="hover:text-gray-900" href="/legal/terms">利用規約</a>
            <a className="hover:text-gray-900" href="/support">サポート</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

