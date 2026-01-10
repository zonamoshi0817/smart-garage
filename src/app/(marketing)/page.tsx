import { Check, Shield, Gauge, Wrench, FileText, Camera, Lock, Sparkles, Car, LineChart, Download, Star, Timer, Zap, ArrowRight } from "lucide-react";
import Header from "@/components/marketing/Header";
import { CTAButtons, PricingCTAButtons } from "@/components/marketing/CTAButtons.client";
import LandingPageAnalytics from "@/components/marketing/LandingPageAnalytics.client";
import ScrollAnimations from "@/components/marketing/ScrollAnimations.client";
import Link from "next/link";

export const dynamic = 'force-static';
export const revalidate = 86400;

// GarageLog LP — Modern SaaS design with Bento layout

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <LandingPageAnalytics />
      <ScrollAnimations />
      <Header />
      <Hero />
      <BeforeAfter />
      <PainGain />
      <HowItWorks />
      <Features />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative bg-slate-50 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        {/* メイングリッド：左（コンテンツ）+ 右（モック） */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-16">
          {/* 左側：H1 + サブコピー + CTA */}
          <div className="space-y-8 slide-in-left-on-scroll">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-medium text-slate-700 shadow-sm">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span>クルマの記録を、もっとスマートに</span>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-semibold tracking-tight text-slate-900 leading-[1.05]">
              クルマと、<span className="text-blue-600">ずっと</span>いい関係。
            </h1>
            
            <p className="text-lg text-slate-600 leading-relaxed max-w-xl">
              メンテ・給油・カスタムをまとめて記録。クルマのコンディションを見える化して、長く気持ちよく走れる状態をキープします。
            </p>
            
            {/* CTA（2つに整理） */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <CTAButtons variant="hero" />
            </div>
          </div>
          
          {/* 右側：プロダクトモック（注釈付き） */}
          <div className="relative slide-in-right-on-scroll">
            <ProductMock />
          </div>
        </div>

        {/* 下部：Bentoタイル3枚 */}
        <div className="grid md:grid-cols-3 gap-6">
          <BentoTile
            icon={<Camera className="h-6 w-6" />}
            title="レシートOCR"
            description="給油レシートや保険証券を撮るだけで自動入力。記録時間を大幅に短縮します。"
            delay="0s"
          />
          <BentoTile
            icon={<FileText className="h-6 w-6" />}
            title="履歴証明PDF"
            description="整備履歴を証明書としてPDF出力。売却時や引き継ぎ時に安心です。"
            delay="0.1s"
          />
          <BentoTile
            icon={<Wrench className="h-6 w-6" />}
            title="次回メンテ提案"
            description="走行距離と期間から、次に必要なメンテナンスを自動で提案します。"
            delay="0.2s"
          />
        </div>
      </div>
    </section>
  );
}

function ProductMock() {
  return (
    <div className="relative rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white">
      {/* ブラウザウィンドウ風ヘッダー */}
      <div className="px-6 py-3 border-b border-slate-200 flex items-center gap-2 bg-slate-50">
        <div className="h-3 w-3 rounded-full bg-red-400" />
        <div className="h-3 w-3 rounded-full bg-yellow-400" />
        <div className="h-3 w-3 rounded-full bg-green-400" />
        <span className="text-sm text-slate-600 ml-2 font-medium">GarageLog</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-slate-300"></div>
          <div className="h-2 w-2 rounded-full bg-slate-300"></div>
          <div className="h-2 w-2 rounded-full bg-slate-300"></div>
        </div>
      </div>
      
      {/* ダッシュボードコンテンツ - 実際のレイアウトに合わせる */}
      <div className="bg-slate-50 p-4">
        <div className="grid grid-cols-[160px_1fr] gap-4">
          {/* サイドバー */}
          <aside className="space-y-3">
            {/* ユーザー情報 */}
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                  K
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-900 truncate">kenta kobayashi</div>
                  <div className="text-[10px] text-blue-600 font-medium">Premium プラン</div>
                </div>
              </div>
            </div>

            {/* ナビゲーション */}
            <nav className="bg-white rounded-xl border border-slate-200 p-2 space-y-0.5">
              <div className="px-2 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium">ホーム</div>
              <div className="px-2 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-50">マイカー</div>
              <div className="px-2 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-50">ガソリン</div>
              <div className="px-2 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-50">メンテナンス</div>
              <div className="px-2 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-50">カスタマイズ</div>
            </nav>
          </aside>

          {/* メインコンテンツ */}
          <div className="space-y-4">
            {/* ヘッダー */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">ホーム</h3>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Car className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-700">シビック TYPER (FL5)</span>
                </div>
              </div>
            </div>

            {/* 現在の車情報 */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 relative">
              {/* 次回メンテ（カード内に表示） */}
              <div className="mb-3">
                <div className="text-xs text-slate-600 mb-1">次回メンテ: 残1,234km</div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                {/* 車画像 */}
                <div className="w-24 h-16 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
                </div>
                {/* 車情報 */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 mb-2">シビック TYPER (FL5)</div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>走行距離: <span className="font-medium">4,822 km</span></div>
                    <div>車検期限: <span className="font-medium">2027/4/30</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* 最近の活動カード */}
            <div className="grid grid-cols-3 gap-3">
              {/* 最近のメンテナンス */}
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <div className="text-xs font-semibold text-slate-900 mb-2">最近のメンテナンス</div>
                <div className="space-y-1.5">
                  <div className="text-[10px] text-slate-600">最新の整備</div>
                  <div className="text-xs font-medium text-slate-900">オイル交換</div>
                  <div className="text-[10px] text-slate-500">2025/11/10 • 4,822km</div>
                </div>
              </div>

              {/* 最近の給油 */}
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <div className="text-xs font-semibold text-slate-900 mb-2">最近の給油</div>
                <div className="space-y-1.5">
                  <div className="text-[10px] text-slate-600">最新の給油</div>
                  <div className="text-xs font-medium text-slate-900">¥6,111</div>
                  <div className="text-[10px] text-slate-500">11/16 • 35.6L</div>
                </div>
              </div>

              {/* 最近のカスタマイズ */}
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <div className="text-xs font-semibold text-slate-900 mb-2">最近のカスタマイズ</div>
                <div className="space-y-1.5">
                  <div className="text-[10px] text-slate-600">最新のカスタマイズ</div>
                  <div className="text-xs font-medium text-slate-900">SPOON ダウンサス</div>
                  <div className="text-[10px] text-slate-500">¥30,000</div>
                </div>
              </div>
            </div>

            {/* 月別費用推移 */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <LineChart className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-slate-900">月別費用推移</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <button className="px-2 py-1 text-[10px] bg-blue-50 text-blue-600 rounded font-medium">月次</button>
                    <button className="px-2 py-1 text-[10px] text-slate-500 rounded">年次</button>
                    <button className="px-2 py-1 text-[10px] text-slate-500 rounded">全期間</button>
                  </div>
                  {/* PDF証明ボタン（グラフの右上） */}
                  <button className="hidden lg:flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors">
                    <FileText className="h-3 w-3 text-slate-600" />
                    <span className="text-xs font-medium text-slate-700 whitespace-nowrap">PDF証明：署名付き</span>
                  </button>
                </div>
              </div>
              {/* グラフ */}
              <div className="h-24 bg-slate-50 rounded-lg p-2 flex items-end justify-between gap-1">
                {[
                  { month: '8月', height: 15 },
                  { month: '9月', height: 20 },
                  { month: '10月', height: 85 },
                  { month: '11月', height: 18 },
                  { month: '12月', height: 10 },
                  { month: '1月', height: 35 }
                ].map((item, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div 
                      className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t min-h-[8px]" 
                      style={{ height: `${item.height}%` }}
                    />
                    <span className="text-[9px] text-slate-500">{item.month}</span>
                  </div>
                ))}
              </div>
              {/* 今月のサマリー */}
              <div className="mt-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">今月の総費用</span>
                  <span className="font-semibold text-slate-900">¥30,000</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BentoTile({ 
  icon, 
  title, 
  description, 
  delay 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  delay: string;
}) {
  return (
    <div 
      className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-blue-300 hover:shadow-md transition-all duration-300 scale-in-on-scroll"
      style={{ animationDelay: delay }}
    >
      <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

function BeforeAfter() {
  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700 mb-4">
            <Zap className="h-4 w-4 text-blue-600" />
            変革の瞬間
          </div>
          <h2 className="text-3xl font-semibold text-slate-900 leading-tight mb-4">Before & After</h2>
          <p className="text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            従来の管理方法から、GarageLogでの管理へ。あなたの愛車管理が劇的に変わります。
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Before */}
          <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-slate-300 flex items-center justify-center">
                <span className="text-lg font-bold text-slate-600">×</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900">Before</h3>
            </div>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-slate-400 flex-shrink-0"></span>
                <span className="text-base text-slate-700">整備や給油の記録が紙やメモに散らばっている</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-slate-400 flex-shrink-0"></span>
                <span className="text-base text-slate-700">いくらかかっているか、今月のコストが分からない</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-slate-400 flex-shrink-0"></span>
                <span className="text-base text-slate-700">次に何をやればいいか（オイル/車検など）が曖昧</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-slate-400 flex-shrink-0"></span>
                <span className="text-base text-slate-700">売却時に整備履歴をうまく伝えられない</span>
              </li>
            </ul>
          </div>

          {/* After */}
          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
                <Check className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">After</h3>
            </div>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Check className="mt-1 h-5 w-5 text-blue-600 flex-shrink-0" />
                <span className="text-base font-medium text-slate-900">すべてを1か所で一元管理（車ごとに整理）</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="mt-1 h-5 w-5 text-blue-600 flex-shrink-0" />
                <span className="text-base font-medium text-slate-900">自動グラフ化で「見るだけで価値」</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="mt-1 h-5 w-5 text-blue-600 flex-shrink-0" />
                <span className="text-base font-medium text-slate-900">走行距離/期間から次回メンテを自動提案</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="mt-1 h-5 w-5 text-blue-600 flex-shrink-0" />
                <span className="text-base font-medium text-slate-900">PDFで第三者にも「証明」できる</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function PainGain() {
  return (
    <section className="bg-slate-50 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div className="space-y-6 slide-in-left-on-scroll">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-medium text-slate-700">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              よくある悩み
            </div>
            <h2 className="text-3xl font-semibold text-slate-900 leading-tight">こんな経験、ありませんか？</h2>
            <ul className="space-y-4 text-slate-700">
              <li className="flex items-start gap-4 p-6 rounded-2xl bg-white border border-slate-200 hover:shadow-sm transition-all">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-slate-400 flex-shrink-0"></span>
                <span className="font-medium text-base leading-relaxed">整備や給油の記録が紙やメモに散らばっている</span>
              </li>
              <li className="flex items-start gap-4 p-6 rounded-2xl bg-white border border-slate-200 hover:shadow-sm transition-all">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-slate-400 flex-shrink-0"></span>
                <span className="font-medium text-base leading-relaxed">いくらかかっているか、今月のコストが分からない</span>
              </li>
              <li className="flex items-start gap-4 p-6 rounded-2xl bg-white border border-slate-200 hover:shadow-sm transition-all">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-slate-400 flex-shrink-0"></span>
                <span className="font-medium text-base leading-relaxed">次に何をやればいいか（オイル/車検など）が曖昧</span>
              </li>
              <li className="flex items-start gap-4 p-6 rounded-2xl bg-white border border-slate-200 hover:shadow-sm transition-all">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-slate-400 flex-shrink-0"></span>
                <span className="font-medium text-base leading-relaxed">売却時に整備履歴をうまく伝えられない</span>
              </li>
            </ul>
          </div>
          <div className="space-y-6 slide-in-right-on-scroll">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-sm font-medium text-blue-700">
              <Zap className="h-4 w-4" />
              GarageLog なら
            </div>
            <h3 className="text-3xl font-semibold text-slate-900 leading-tight">すべて解決できます</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-4 p-6 rounded-2xl bg-white border border-blue-200 hover:shadow-sm transition-all">
                <div className="mt-1.5 h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Check className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-base text-slate-900 leading-relaxed">すべてを1か所で一元管理（車ごとに整理）</span>
              </li>
              <li className="flex items-start gap-4 p-6 rounded-2xl bg-white border border-blue-200 hover:shadow-sm transition-all">
                <div className="mt-1.5 h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Check className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-base text-slate-900 leading-relaxed">自動グラフ化で「見るだけで価値」</span>
              </li>
              <li className="flex items-start gap-4 p-6 rounded-2xl bg-white border border-blue-200 hover:shadow-sm transition-all">
                <div className="mt-1.5 h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Check className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-base text-slate-900 leading-relaxed">走行距離/期間から次回メンテを自動提案</span>
              </li>
              <li className="flex items-start gap-4 p-6 rounded-2xl bg-white border border-blue-200 hover:shadow-sm transition-all">
                <div className="mt-1.5 h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Check className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-base text-slate-900 leading-relaxed">PDFで第三者にも「証明」できる</span>
              </li>
            </ul>
          </div>
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
    <section id="how" className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700 mb-4">
            <Zap className="h-4 w-4 text-blue-600" />
            使い方はシンプル
          </div>
          <h2 className="text-3xl font-semibold text-slate-900 leading-tight mb-4">4ステップで始められます</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div 
              key={i} 
              className="group relative rounded-2xl border border-slate-200 bg-white p-6 hover:border-blue-300 hover:shadow-md transition-all duration-300 scale-in-on-scroll min-h-[200px]" 
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="h-14 w-14 rounded-xl bg-blue-600 flex items-center justify-center text-white mb-4">
                {s.icon}
              </div>
              <div className="absolute top-6 right-6 h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                {i + 1}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2 pr-8">{s.title}</h3>
              <p className="text-base text-slate-600 leading-relaxed">{s.desc}</p>
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
    <section id="features" className="bg-slate-50 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-medium text-slate-700 mb-4">
            <Sparkles className="h-4 w-4 text-blue-600" />
            主な機能
          </div>
          <h2 className="text-3xl font-semibold text-slate-900 leading-tight">あなたの愛車管理をサポート</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {feats.map((f, i) => (
            <div 
              key={i} 
              className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-blue-300 hover:shadow-md transition-all duration-300 scale-in-on-scroll" 
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white mb-4">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700 mb-4">
            <Sparkles className="h-4 w-4 text-blue-600" />
            料金プラン
          </div>
          <h2 className="text-3xl font-semibold text-slate-900 leading-tight mb-4">シンプルでわかりやすい料金</h2>
          <p className="text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">まずは無料で1台から。プレミアムで「資産化」が加速します。</p>
        </div>
        <div className="mt-12 grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free */}
          <div className="rounded-2xl border border-slate-200 bg-white p-8 hover:shadow-md transition-shadow">
            <h3 className="text-2xl font-semibold text-slate-900 mb-2">無料プラン</h3>
            <p className="text-4xl font-semibold text-slate-900 mb-1">
              ¥0<span className="text-lg font-medium text-slate-500"> / 月</span>
            </p>
            <p className="text-sm text-slate-500 mb-6">個人利用に最適</p>
            <ul className="space-y-3 text-sm text-slate-700 mb-8">
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
                <Lock className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-400">OCR / PDF</span>
              </li>
            </ul>
            <PricingCTAButtons planType="free" />
          </div>

          {/* Premium */}
          <div className="relative rounded-2xl border-2 border-blue-200 bg-blue-50 p-8 hover:shadow-md transition-shadow">
            <span className="absolute -top-4 right-6 rounded-full bg-blue-600 text-white text-xs font-semibold px-4 py-1.5 shadow-sm">
              おすすめ
            </span>
            <h3 className="text-2xl font-semibold text-slate-900 mb-2">プレミアム</h3>
            <p className="text-4xl font-semibold text-slate-900 mb-1">
              ¥350<span className="text-lg font-medium text-slate-500"> / 月</span>
            </p>
            <p className="text-sm text-slate-600 mb-6">本格的な資産管理に</p>
            <ul className="space-y-3 text-sm text-slate-700 mb-8">
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
                <span>広告非表示・高度なリマインダー</span>
              </li>
            </ul>
            <PricingCTAButtons planType="premium" />
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
    <section id="faq" className="bg-slate-50 py-20 lg:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-medium text-slate-700 mb-4">
            <Sparkles className="h-4 w-4 text-blue-600" />
            よくある質問
          </div>
          <h2 className="text-3xl font-semibold text-slate-900 leading-tight">気になることを解決</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {faqs.map((f, i) => (
            <div 
              key={i} 
              className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-blue-300 hover:shadow-sm transition-all scale-in-on-scroll" 
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <h3 className="font-semibold text-lg text-slate-900 mb-3">{f.q}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="cta" className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 py-20 lg:py-28">
      {/* 控えめなノイズ/テクスチャ風のオーバーレイ */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}></div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-8 lg:p-12 text-white">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-semibold mb-4">愛車の価値を、最大限に。</h2>
              <p className="text-base lg:text-lg text-blue-100 leading-relaxed">プロレベルの管理を、今すぐ無料で。</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:justify-end">
              <CTAButtons variant="cta-section" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const currentYear = 2024;

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 text-sm text-slate-600">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/icon.png"
              alt="GarageLog"
              className="h-10 w-10 rounded-xl shadow-sm"
            />
            <div>
              <p className="font-semibold text-slate-900 text-lg">GarageLog</p>
              <p className="text-xs text-slate-500">© {currentYear} GarageLog</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Link className="hover:text-blue-600 font-medium transition-colors text-sm" href="/legal/privacy">
              プライバシーポリシー
            </Link>
            <Link className="hover:text-blue-600 font-medium transition-colors text-sm" href="/legal/terms">
              利用規約
            </Link>
            <Link className="hover:text-blue-600 font-medium transition-colors text-sm" href="/support">
              サポート
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}