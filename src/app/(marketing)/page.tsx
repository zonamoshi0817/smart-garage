import { Check, Shield, Gauge, Wrench, FileText, Camera, Lock, Sparkles, Car, LineChart, Download, Star, Timer, Zap, ArrowRight, Clock, Play } from "lucide-react";
import Header from "@/components/marketing/Header";
import { CTAButtons, PricingCTAButtons } from "@/components/marketing/CTAButtons.client";
import LandingPageAnalytics from "@/components/marketing/LandingPageAnalytics.client";
import ScrollAnimations from "@/components/marketing/ScrollAnimations.client";
import HeroCTAButtonsPrimary from "@/components/marketing/HeroCTAButtons.client";
import Link from "next/link";
import Image from "next/image";

export const dynamic = 'force-static';
export const revalidate = 0; // デプロイ直後に反映されるように一時的に0に設定（確認後、86400に戻す）

// ===== デザイントークン定数 =====
const DESIGN_TOKENS = {
  container: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
  radius: {
    sm: "rounded-lg",
    md: "rounded-xl",
    lg: "rounded-2xl",
  },
  shadow: {
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg",
    xl: "shadow-xl",
    xxl: "shadow-2xl",
  },
  accent: {
    blue: "blue-600",
    blueLight: "blue-50",
    blueDark: "blue-700",
  },
} as const;

// GarageLog LP — 2026 Modern SaaS Design

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <LandingPageAnalytics />
      <ScrollAnimations />
      <Header />
      <Hero />
      <BeforeAfter />
      <HowItWorks />
      <Features />
      <Pricing />
      <Trust />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* 背景：薄い放射グラデーション + ごく薄いテクスチャ（最新感、白の清潔感は維持） */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(37, 99, 235, 0.04) 0%, rgba(255, 255, 255, 0) 70%)',
        }}
      ></div>
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>
      
      <div className={`${DESIGN_TOKENS.container} relative py-16 lg:py-24`}>
        {/* メイングリッド：モバイルでは画像→テキストの順、デスクトップでは左（コンテンツ）+ 右（モック） */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center mb-16 lg:mb-20">
          {/* 左側：H1 + ベネフィット + CTA（モバイルでは2番目） */}
          <div className="space-y-6 slide-in-left-on-scroll order-2 lg:order-1">
            {/* バッジ */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200/60 text-sm font-medium text-slate-700 shadow-sm">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span>クルマの記録を、もっとスマートに</span>
            </div>
            
            {/* H1：改行を自然に、縦リズムを詰める */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-semibold tracking-tight text-slate-900 leading-[1.05] mt-4">
              クルマと、<br className="hidden sm:block" />
              <span className="text-blue-600">ずっと</span>いい関係。
            </h1>
            
            {/* サブコピー：行幅を最適化 */}
            <p className="text-base lg:text-lg text-slate-600 leading-relaxed max-w-lg mt-4">
              メンテ・給油・カスタムをまとめて記録。クルマのコンディションを見える化して、長く気持ちよく走れる状態をキープします。
            </p>

            {/* 3つのベネフィット（H1直下、縦リズムを詰める） */}
            <div className="flex flex-col gap-2.5 mt-5">
              <div className="flex items-center gap-3 text-sm lg:text-base text-slate-700">
                <div className="h-9 w-9 lg:h-10 lg:w-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Camera className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
                </div>
                <span className="font-medium">レシートOCRで最短10秒入力</span>
              </div>
              <div className="flex items-center gap-3 text-sm lg:text-base text-slate-700">
                <div className="h-9 w-9 lg:h-10 lg:w-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Timer className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
                </div>
                <span className="font-medium">次回メンテ自動リマインド</span>
              </div>
              <div className="flex items-center gap-3 text-sm lg:text-base text-slate-700">
                <div className="h-9 w-9 lg:h-10 lg:w-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
                </div>
                <span className="font-medium">署名付きPDFで第三者に証明</span>
              </div>
            </div>
            
            {/* CTA：Primary + Secondary（縦リズムを詰める） */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-6">
              <HeroCTAButtonsPrimary variant="primary" />
              <HeroCTAButtonsPrimary variant="secondary" />
            </div>

            {/* 信頼要素のチップ3つ（CTA直下） */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <TrustChip icon={<Check className="h-3.5 w-3.5" />} text="クレカ不要" />
              <TrustChip icon={<Clock className="h-3.5 w-3.5" />} text="30秒で開始" />
              <TrustChip icon={<Download className="h-3.5 w-3.5" />} text="データはいつでもエクスポート" />
            </div>
          </div>
          
          {/* 右側：プロダクトスクショ（注釈付き、モバイルでは1番目） */}
          <div className="relative slide-in-right-on-scroll lg:mt-0 order-1 lg:order-2">
            <HeroScreenshot />
          </div>
        </div>

        {/* 下部：機能別スクショ3枚 */}
        <FeatureScreenshots />

        {/* 下部：機能カード3枚（成果ベース） */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mt-20">
          <BentoTile
            icon={<Camera className="h-6 w-6" />}
            title="入力が10秒"
            description="レシートを撮るだけで自動入力。手入力の時間を大幅に削減します。"
            delay="0s"
          />
          <BentoTile
            icon={<FileText className="h-6 w-6" />}
            title="売却で価値になる"
            description="整備履歴をPDF証明書として出力。売却時に愛車の価値を明確に伝えられます。"
            delay="0.1s"
          />
          <BentoTile
            icon={<Wrench className="h-6 w-6" />}
            title="忘れない・壊さない"
            description="走行距離と期間から次回メンテを自動提案。タイミングを逃さず、長く走れます。"
            delay="0.2s"
          />
        </div>
      </div>
    </section>
  );
}


// ヒーロー用スクリーンショット（Spotlight表現：背景にダッシュボードUI、前面に次回メンテカードを強調）
function HeroScreenshot() {
  return (
    <div className="relative">
      {/* スクショカード：大きめの角丸、柔らかいシャドウ（強調要素なのでxl使用）、外周余白 */}
      <div className={`relative ${DESIGN_TOKENS.radius.lg} border border-slate-200/60 bg-white ${DESIGN_TOKENS.shadow.xl} overflow-hidden p-4 lg:p-6`}>
        {/* ブラウザウィンドウ風ヘッダー */}
        <div className="px-3 py-2 border-b border-slate-200/60 flex items-center gap-2 bg-slate-50/50 mb-4">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          <span className="text-xs text-slate-600 ml-2 font-medium">GarageLog</span>
        </div>
        
        {/* コンテンツエリア：Spotlight表現 */}
        <div className={`relative w-full aspect-[4/3] bg-gradient-to-br from-slate-50 to-blue-50/30 ${DESIGN_TOKENS.radius.md} overflow-hidden`}>
          {/* 背景：ダッシュボードUIをうっすら読める状態で表示（ぼかしを弱める、情報量が読める状態） */}
          <div className="absolute inset-0 opacity-[0.35] blur-[1.5px]">
            <DashboardBackground />
          </div>
          
          {/* 前面：次回メンテ提案カードを強調表示 */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <MaintenanceCard />
          </div>
        </div>
      </div>

      {/* LP注釈：機能説明に変更（数値はカード側に寄せる） */}
      <div className="hidden lg:block absolute -top-6 left-1/2 -translate-x-1/2 z-20">
        <LPAnnotation
          icon={<Timer className="h-4 w-4" />}
          text="次回メンテを自動計算"
          position="top"
        />
      </div>
    </div>
  );
}

// 背景用：ダッシュボードUI（薄く表示、画像差し替え可能な構造）
function DashboardBackground() {
  return (
    <div className="w-full h-full p-4">
      {/* 実際の画像がある場合はこちらを使用（コメントアウトを外す） */}
      {/* 
      <Image
        src="/lp-screenshots/hero-dashboard-background.png"
        alt="GarageLog ダッシュボード（背景用）"
        width={1200}
        height={900}
        className="w-full h-full object-cover"
        style={{ opacity: 0.35, filter: 'blur(1.5px)' }}
      />
      */}
      
      {/* プレースホルダー：HTML構造でダッシュボードUIを再現 */}
      <div className="grid grid-cols-[140px_1fr] gap-4 h-full">
        {/* サイドバー */}
        <aside className="space-y-3">
          <div className="bg-white/80 rounded-xl border border-slate-200/60 p-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs">
                K
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-700 truncate">Ken</div>
                <div className="text-[10px] text-blue-600 font-medium">Premium プラン</div>
              </div>
            </div>
          </div>
          <nav className="bg-white/80 rounded-xl border border-slate-200/60 p-2 space-y-0.5">
            <div className="px-2 py-1 rounded-lg bg-blue-50/50 text-blue-600 text-xs font-medium">ホーム</div>
            <div className="px-2 py-1 rounded-lg text-xs text-slate-600">マイカー</div>
            <div className="px-2 py-1 rounded-lg text-xs text-slate-600">ガソリン</div>
            <div className="px-2 py-1 rounded-lg text-xs text-slate-600">メンテナンス</div>
          </nav>
        </aside>

        {/* メインコンテンツ */}
        <div className="space-y-4">
          {/* ヘッダー */}
          <div className="bg-white/80 rounded-xl border border-slate-200/60 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">ホーム</h3>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Car className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-slate-600">シビック TYPER</span>
              </div>
            </div>
          </div>

          {/* 車情報カード */}
          <div className="bg-white/80 rounded-2xl border border-slate-200/60 p-4">
            <div className="flex items-start gap-4">
              <div className="w-24 h-16 rounded-xl border border-slate-200/60 bg-gradient-to-br from-blue-400/30 to-blue-600/30"></div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-700 mb-2">シビック TYPER (FL5)</div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>走行距離: <span className="font-medium">4,822 km</span></div>
                  <div>車検期限: <span className="font-medium">2027/4/30</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* 活動カード */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/80 rounded-xl border border-slate-200/60 p-3">
              <div className="text-xs font-semibold text-slate-700 mb-2">最近のメンテナンス</div>
              <div className="bg-slate-50/50 rounded-lg p-2">
                <div className="text-xs font-medium text-slate-700">オイル交換</div>
                <div className="text-[10px] text-slate-500">2025/11/10</div>
              </div>
            </div>
            <div className="bg-white/80 rounded-xl border border-slate-200/60 p-3">
              <div className="text-xs font-semibold text-slate-700 mb-2">最近の給油</div>
              <div className="bg-slate-50/50 rounded-lg p-2">
                <div className="text-xs font-medium text-slate-700">11/16 • 35.6L</div>
                <div className="text-xs font-bold text-slate-700">¥6,111</div>
              </div>
            </div>
            <div className="bg-white/80 rounded-xl border border-slate-200/60 p-3">
              <div className="text-xs font-semibold text-slate-700 mb-2">最近のカスタマイズ</div>
              <div className="bg-slate-50/50 rounded-lg p-2">
                <div className="text-xs font-medium text-slate-700">SPOON ダウンサス</div>
                <div className="text-xs font-bold text-slate-700">¥30,000</div>
              </div>
            </div>
          </div>

          {/* グラフ */}
          <div className="bg-white/80 rounded-2xl border border-slate-200/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <LineChart className="h-4 w-4 text-blue-600/60" />
              <span className="text-sm font-semibold text-slate-700">月別費用推移</span>
            </div>
            <div className="h-20 bg-slate-50/50 rounded-lg flex items-end justify-between gap-1 p-2">
              {[15, 20, 85, 18, 10, 35].map((h, i) => (
                <div key={i} className="flex-1 bg-blue-400/30 rounded-t" style={{ height: `${h}%` }}></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 前面強調：次回メンテ提案カード（shadow強め、border薄い、角丸は既存と合わせる、数値を強調）
function MaintenanceCard() {
  return (
    <div className={`bg-white ${DESIGN_TOKENS.radius.lg} border border-slate-200/30 ${DESIGN_TOKENS.shadow.xxl} p-5 lg:p-6 max-w-sm mx-auto backdrop-blur-sm`}>
      {/* 見出し */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`h-11 w-11 lg:h-12 lg:w-12 ${DESIGN_TOKENS.radius.md} bg-blue-100 flex items-center justify-center shadow-md`}>
          <Timer className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-base lg:text-lg font-semibold text-slate-900">次回メンテ</h3>
        </div>
      </div>
      
      {/* 本文：数値を強調 */}
      <div className={`bg-slate-50 ${DESIGN_TOKENS.radius.md} p-4 lg:p-5`}>
        <div className="text-xs lg:text-sm text-slate-600 mb-2">次回まで残り</div>
        <div className="text-2xl lg:text-3xl font-bold text-slate-900 mb-3">1,234km</div>
        
        {/* 進捗バー */}
        <div className="mb-3">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" style={{ width: '75%' }}></div>
          </div>
        </div>
        
        {/* 推奨メンテナンス */}
        <div className="pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-500 mb-1">推奨メンテナンス</div>
          <div className="text-sm lg:text-base font-semibold text-slate-900">オイル交換</div>
        </div>
      </div>
    </div>
  );
}

// 信頼要素のチップ（CTA直下、視認性が高いが主張しすぎない見た目）
function TrustChip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${DESIGN_TOKENS.radius.sm} bg-white/90 backdrop-blur-sm border border-slate-200/60 text-xs font-medium text-slate-700 ${DESIGN_TOKENS.shadow.sm} hover:shadow-md transition-shadow`}>
      <div className="text-green-600 flex-shrink-0">{icon}</div>
      <span className="whitespace-nowrap">{text}</span>
    </div>
  );
}

// LP用注釈コンポーネント（統一デザイン）
function LPAnnotation({
  icon,
  text,
  position = "top",
}: {
  icon: React.ReactNode;
  text: string;
  position?: "top" | "bottom" | "left" | "right";
}) {
  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-slate-200",
    bottom: "bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-transparent border-b-slate-200",
    left: "top-1/2 -right-1 -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-l-[6px] border-transparent border-l-slate-200",
    right: "top-1/2 -left-1 -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-r-[6px] border-transparent border-r-slate-200",
  };

  const arrowInnerClasses = {
    top: "top-full left-1/2 -translate-x-1/2 translate-y-[-1px] w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-white",
    bottom: "bottom-full left-1/2 -translate-x-1/2 translate-y-[1px] w-0 h-0 border-l-[5px] border-r-[5px] border-b-[5px] border-transparent border-b-white",
    left: "top-1/2 -right-[1px] -translate-y-1/2 w-0 h-0 border-t-[5px] border-b-[5px] border-l-[5px] border-transparent border-l-white",
    right: "top-1/2 -left-[1px] -translate-y-1/2 w-0 h-0 border-t-[5px] border-b-[5px] border-r-[5px] border-transparent border-r-white",
  };

  return (
    <div className="relative bg-white border-2 border-slate-200 rounded-2xl px-4 py-2.5 shadow-xl">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
          {icon}
        </div>
        <p className="text-sm font-semibold text-slate-900 whitespace-nowrap">{text}</p>
      </div>
      {/* 矢印（外側） */}
      <div className={`absolute ${arrowClasses[position]}`}></div>
      {/* 矢印（内側・白） */}
      <div className={`absolute ${arrowInnerClasses[position]}`}></div>
    </div>
  );
}

// 機能別スクショ3枚
function FeatureScreenshots() {
  const features = [
    {
      icon: <Camera className="h-5 w-5" />,
      title: "レシートOCR",
      description: "撮るだけで自動入力",
      imageSrc: "/lp-screenshots/feature-ocr.png",
      imageAlt: "レシートOCR機能",
      annotation: "OCR：撮って自動入力",
    },
    {
      icon: <Timer className="h-5 w-5" />,
      title: "次回メンテ提案",
      description: "走行距離から自動算出",
      imageSrc: "/lp-screenshots/feature-maintenance.png",
      imageAlt: "次回メンテ提案機能",
      annotation: "次回メンテ：残 1,234km",
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: "履歴証明PDF",
      description: "署名付きで出力",
      imageSrc: "/lp-screenshots/feature-pdf.png",
      imageAlt: "履歴証明PDF機能",
      annotation: "PDF証明：署名付き",
    },
  ];

  return (
    <div className="mt-24 mb-20">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-medium text-slate-700 mb-4 shadow-sm">
          <Sparkles className="h-4 w-4 text-blue-600" />
          主要機能
        </div>
        <h2 className="text-3xl lg:text-4xl font-semibold text-slate-900 leading-tight mb-4">
          1メッセージで価値が伝わる
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
        {features.map((feature, index) => (
          <div key={index} className="relative group">
            {/* スクショカード */}
            <div className="relative rounded-2xl border border-slate-200/60 bg-white shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
              {/* ブラウザウィンドウ風ヘッダー */}
              <div className="px-3 py-2 border-b border-slate-200/60 flex items-center gap-2 bg-slate-50/50">
                <div className="h-2 w-2 rounded-full bg-red-400" />
                <div className="h-2 w-2 rounded-full bg-yellow-400" />
                <div className="h-2 w-2 rounded-full bg-green-400" />
              </div>

              {/* スクリーンショット画像 */}
              <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-slate-50 to-blue-50/30">
                {/* プレースホルダー：実際の画像に差し替え予定 */}
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div className="text-center w-full">
                    <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-3 text-blue-600">
                      {feature.icon}
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 mb-1">{feature.title}</h3>
                    <p className="text-sm text-slate-600">{feature.description}</p>
                  </div>
                </div>

                {/* 実際の画像：機能別スクショ */}
                {/* 画像が用意されたらコメントアウトを外す */}
                {/* 
                <Image
                  src={feature.imageSrc}
                  alt={feature.imageAlt}
                  width={800}
                  height={600}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml,%3Csvg width='800' height='600' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='800' height='600' fill='%23f1f5f9'/%3E%3C/svg%3E"
                />
                */}
              </div>
            </div>

            {/* 注釈ラベル（スクショの外側） */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-10 hidden lg:block">
              <LPAnnotation
                icon={feature.icon}
                text={feature.annotation}
                position="bottom"
              />
            </div>
          </div>
        ))}
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
      className={`group ${DESIGN_TOKENS.radius.lg} border border-slate-200 bg-white p-6 lg:p-8 hover:border-blue-300/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 scale-in-on-scroll`}
      style={{ animationDelay: delay }}
    >
      <div className="h-12 w-12 lg:h-14 lg:w-14 rounded-xl bg-blue-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-slate-900 mb-3">{title}</h3>
      <p className="text-base text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

function BeforeAfter() {
  return (
    <section className="bg-gradient-to-b from-white to-slate-50/50 py-20 lg:py-32">
      <div className={`${DESIGN_TOKENS.container}`}>
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-medium text-slate-700 mb-4 shadow-sm">
            <Zap className="h-4 w-4 text-blue-600" />
            変革の瞬間
          </div>
          <h2 className="text-3xl lg:text-4xl font-semibold text-slate-900 leading-tight mb-4">紙やメモで散らばる → 車ごとに一元管理</h2>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            従来の管理方法から、GarageLogでの管理へ。あなたの愛車管理が劇的に変わります。
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Before */}
          <div className={`${DESIGN_TOKENS.radius.lg} border-2 border-slate-200 bg-slate-50/80 p-8 lg:p-10`}>
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-xl bg-slate-200 flex items-center justify-center">
                <span className="text-xl font-bold text-slate-600">×</span>
              </div>
              <h3 className="text-2xl font-semibold text-slate-900">Before</h3>
            </div>
            <ul className="space-y-5">
              <li className="flex items-start gap-4">
                <span className="mt-2 h-2 w-2 rounded-full bg-slate-400 flex-shrink-0"></span>
                <span className="text-base text-slate-700 leading-relaxed">整備や給油の記録が紙やメモに散らばっている</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="mt-2 h-2 w-2 rounded-full bg-slate-400 flex-shrink-0"></span>
                <span className="text-base text-slate-700 leading-relaxed">いくらかかっているか、今月のコストが分からない</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="mt-2 h-2 w-2 rounded-full bg-slate-400 flex-shrink-0"></span>
                <span className="text-base text-slate-700 leading-relaxed">次に何をやればいいか（オイル/車検など）が曖昧</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="mt-2 h-2 w-2 rounded-full bg-slate-400 flex-shrink-0"></span>
                <span className="text-base text-slate-700 leading-relaxed">売却時に整備履歴をうまく伝えられない</span>
              </li>
            </ul>
          </div>

          {/* After */}
          <div className={`${DESIGN_TOKENS.radius.lg} border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50/50 p-8 lg:p-10`}>
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
                <Check className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-900">After</h3>
            </div>
            <ul className="space-y-5">
              <li className="flex items-start gap-4">
                <div className="mt-1 h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Check className="h-4 w-4 text-white" />
                </div>
                <span className="text-base font-semibold text-slate-900 leading-relaxed">すべてを1か所で一元管理（車ごとに整理）</span>
              </li>
              <li className="flex items-start gap-4">
                <div className="mt-1 h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Check className="h-4 w-4 text-white" />
                </div>
                <span className="text-base font-semibold text-slate-900 leading-relaxed">自動グラフ化で「見るだけで価値」</span>
              </li>
              <li className="flex items-start gap-4">
                <div className="mt-1 h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Check className="h-4 w-4 text-white" />
                </div>
                <span className="text-base font-semibold text-slate-900 leading-relaxed">走行距離/期間から次回メンテを自動提案</span>
              </li>
              <li className="flex items-start gap-4">
                <div className="mt-1 h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Check className="h-4 w-4 text-white" />
                </div>
                <span className="text-base font-semibold text-slate-900 leading-relaxed">PDFで第三者にも「証明」できる</span>
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
    <section id="how" className="bg-white py-20 lg:py-32">
      <div className={`${DESIGN_TOKENS.container}`}>
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700 mb-4 shadow-sm">
            <Zap className="h-4 w-4 text-blue-600" />
            使い方はシンプル
          </div>
          <h2 className="text-3xl lg:text-4xl font-semibold text-slate-900 leading-tight mb-4">4ステップで始められます</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {steps.map((s, i) => (
            <div 
              key={i} 
              className={`group relative ${DESIGN_TOKENS.radius.lg} border border-slate-200 bg-white p-6 lg:p-8 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 scale-in-on-scroll`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="h-14 w-14 lg:h-16 lg:w-16 rounded-xl bg-blue-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md">
                {s.icon}
              </div>
              <div className="absolute top-6 right-6 h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm group-hover:scale-110 transition-transform">
                {i + 1}
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3 pr-10">{s.title}</h3>
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
    { icon: <Gauge className="h-6 w-6" />, title: "ホーム", desc: "今月のコスト・燃費・やることを一目で確認。" },
    { icon: <Wrench className="h-6 w-6" />, title: "メンテ記録", desc: "テンプレで素早く、走行距離も自動更新。" },
    { icon: <FileText className="h-6 w-6" />, title: "履歴証明PDF", desc: "売却や引き継ぎに使える書式で出力、信頼性向上。" },
    { icon: <Camera className="h-6 w-6" />, title: "レシートOCR", desc: "給油や保険証券を自動読み取り、入力の手間を削減。" },
    { icon: <Lock className="h-6 w-6" />, title: "プレミアムで無制限", desc: "複数台登録・PDF・OCRが使い放題、本格的な資産管理。" },
  ];
  
  return (
    <section id="features" className="bg-slate-50 py-20 lg:py-32">
      <div className={`${DESIGN_TOKENS.container}`}>
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-medium text-slate-700 mb-4 shadow-sm">
            <Sparkles className="h-4 w-4 text-blue-600" />
            主な機能
          </div>
          <h2 className="text-3xl lg:text-4xl font-semibold text-slate-900 leading-tight">あなたの愛車管理をサポート</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {feats.map((f, i) => (
            <div 
              key={i} 
              className={`group ${DESIGN_TOKENS.radius.lg} border border-slate-200 bg-white p-6 lg:p-8 hover:border-blue-300/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 scale-in-on-scroll`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="h-12 w-12 lg:h-14 lg:w-14 rounded-xl bg-blue-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-md">
                {f.icon}
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">{f.title}</h3>
              <p className="text-base text-slate-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="bg-slate-50 py-20 lg:py-28">
      <div className={`${DESIGN_TOKENS.container}`}>
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-medium text-slate-700 mb-4 shadow-sm">
            <Sparkles className="h-4 w-4 text-blue-600" />
            料金プラン
          </div>
          <h2 className="text-3xl lg:text-4xl font-semibold text-slate-900 leading-tight mb-4">シンプルでわかりやすい料金</h2>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">まずは無料で1台から。プレミアムで「資産化」が加速します。</p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free */}
          <div className={`${DESIGN_TOKENS.radius.lg} border border-slate-200 bg-white p-8 hover:shadow-md transition-all duration-300`}>
            <h3 className="text-2xl font-semibold text-slate-900 mb-2">無料プラン</h3>
            <p className="text-4xl font-semibold text-slate-900 mb-1">
              ¥0<span className="text-lg font-medium text-slate-500"> / 月</span>
            </p>
            <p className="text-sm text-slate-500 mb-8">個人利用に最適</p>
            <ul className="space-y-4 text-base text-slate-700 mb-8">
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
          <div className={`relative ${DESIGN_TOKENS.radius.lg} border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50/50 p-8 hover:shadow-lg transition-all duration-300`}>
            <span className="absolute -top-3 right-6 rounded-full bg-blue-600 text-white text-xs font-bold px-4 py-1.5 shadow-md">
              おすすめ
            </span>
            <h3 className="text-2xl font-semibold text-slate-900 mb-2">プレミアム</h3>
            <p className="text-4xl font-semibold text-slate-900 mb-1">
              ¥350<span className="text-lg font-medium text-slate-500"> / 月</span>
            </p>
            <p className="text-sm text-blue-700 font-medium mb-8">本格的な資産管理に</p>
            <ul className="space-y-4 text-base text-slate-700 mb-8">
              <li className="flex gap-3 items-start">
                <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="font-medium">複数台登録 無制限</span>
              </li>
              <li className="flex gap-3 items-start">
                <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="font-medium">レシートOCR（給油/保険）</span>
              </li>
              <li className="flex gap-3 items-start">
                <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="font-medium">履歴証明PDF出力</span>
              </li>
              <li className="flex gap-3 items-start">
                <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="font-medium">広告非表示・高度なリマインダー</span>
              </li>
            </ul>
            <PricingCTAButtons planType="premium" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Trust() {
  return (
    <section className="bg-white py-16 lg:py-20">
      <div className={`${DESIGN_TOKENS.container}`}>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">データはあなたのもの</h3>
            <p className="text-sm text-slate-600 leading-relaxed">すべてのデータはあなたのもので、いつでもエクスポートできます。</p>
          </div>
          <div className="text-center">
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <Download className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">エクスポート可</h3>
            <p className="text-sm text-slate-600 leading-relaxed">記録データをCSVやPDFで出力し、他のサービスでも利用できます。</p>
          </div>
          <div className="text-center">
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <Lock className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">セキュリティ重視</h3>
            <p className="text-sm text-slate-600 leading-relaxed">Firebase AuthenticationとFirestoreで安全にデータを管理します。</p>
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
    <section id="cta" className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 py-20 lg:py-32">
      {/* 控えめなノイズ/テクスチャ風のオーバーレイ */}
      <div className="absolute inset-0 opacity-[0.08]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}></div>
      <div className={`${DESIGN_TOKENS.container} relative`}>
        <div className={`${DESIGN_TOKENS.radius.lg} bg-white/10 backdrop-blur-xl border border-white/30 p-8 lg:p-12 text-white shadow-2xl`}>
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl xl:text-5xl font-semibold mb-4 leading-tight">愛車の価値を、最大限に。</h2>
              <p className="text-lg lg:text-xl text-blue-50 leading-relaxed">プロレベルの管理を、今すぐ無料で。</p>
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