import Link from "next/link";
import HeroVideo from "@/components/marketing/HeroVideo.client";
import FloatingCTA from "@/components/marketing/FloatingCTA";
import "./lp.css";

export const dynamic = 'force-static';

const TICKER_ITEMS = [
  "FL5 CIVIC TYPE R", "GDB IMPREZA WRX STi", "GR86 TOYOTA",
  "ROADSTER ND5RC", "BRZ ZD8 SUBARU", "LANCER EVO X", "SUPRA A90", "GTR R35 NISSAN",
  "FL5 CIVIC TYPE R", "GDB IMPREZA WRX STi", "GR86 TOYOTA",
  "ROADSTER ND5RC", "BRZ ZD8 SUBARU", "LANCER EVO X", "SUPRA A90", "GTR R35 NISSAN",
];

export default function LandingPage() {
  return (
    <div className="lp-root">
      <FloatingCTA />

      {/* NAV */}
      <nav>
        <Link href="/" className="nav-logo">GARAGE_LOG</Link>
        <div className="nav-links">
          <a href="#features">機能</a>
          <a href="#how">使い方</a>
          <Link href="/login" className="nav-cta">ログイン</Link>
        </div>
        <Link href="/signup" className="nav-cta mobile-cta" style={{ display: 'none' }}>無料で始める</Link>
      </nav>

      {/* HERO */}
      <section className="hero">
        <HeroVideo />
        <div className="hero-content">
          <div className="hero-left">
            <p className="hero-eyebrow">Vehicle History Platform</p>
            <h1>愛車の<em>履歴を、</em>資産に。</h1>
            <p className="hero-desc">
              整備・カスタム・証憑を記録し、URLひとつで共有できる車両履歴プラットフォーム。
              見せられる履歴が、信頼と価値を生む。
            </p>
            <div className="hero-actions">
              <Link href="/signup" className="btn-primary">無料ではじめる</Link>
              <a href="#features" className="btn-ghost">デモを見る</a>
            </div>
            <div className="hero-meta">
              <span>クレカ不要</span>
              <span>30秒で開始</span>
              <span>完全無料</span>
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-card">
              <p className="card-car-name">CIVIC TYPE R</p>
              <p className="card-car-sub">FL5 · 2022 · CHAMPIONSHIP WHITE</p>
              <div className="card-stat-row">
                <div className="card-stat">
                  <p className="card-stat-label">ODO</p>
                  <p className="card-stat-val">12,480</p>
                </div>
                <div className="card-stat">
                  <p className="card-stat-label">車検</p>
                  <p className="card-stat-val">2027/4</p>
                </div>
                <div className="card-stat">
                  <p className="card-stat-label">記録数</p>
                  <p className="card-stat-val">24件</p>
                </div>
              </div>
              <p className="card-history-label">最近の履歴</p>
              <div className="card-history-item">
                <span className="card-history-name">SPOON オイル交換 (5W-40)</span>
                <span className="card-history-date">2026/05/12</span>
              </div>
              <div className="card-history-item">
                <span className="card-history-name">ブレーキパッド交換 (Endless)</span>
                <span className="card-history-date">2026/03/08</span>
              </div>
              <div className="card-history-item">
                <span className="card-history-name">車高調整 (Öhlins DFV)</span>
                <span className="card-history-date">2025/11/22</span>
              </div>
              <p className="card-url">garagelog.jp/g/fl5-champ-white</p>
            </div>
          </div>
        </div>
        <div className="hero-ticker">
          <div className="ticker-track">
            {TICKER_ITEMS.map((item, i) => (
              <span key={i} className="ticker-item">
                {item} <span className="ticker-sep">—</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="problem" id="problem">
        <div className="problem-inner">
          <p className="section-label"><span>01</span> 解決する課題</p>
          <h2>履歴は分散する。<br />価値は消える。</h2>
          <div className="problem-grid">
            <div className="problem-col">
              <p className="problem-col-label bad">× これまで</p>
              <ul className="problem-list bad">
                <li>整備履歴が紙・スマホ写真・記憶に散らばっている</li>
                <li>カスタムのこだわりを売却時にうまく伝えられない</li>
                <li>次の車検・オイル交換がいつか分からない</li>
                <li>SNS投稿は流れていく。蓄積されない</li>
                <li>買い手が車両状態を信頼しにくい</li>
              </ul>
            </div>
            <div className="problem-col">
              <p className="problem-col-label good">→ GarageLogなら</p>
              <ul className="problem-list good">
                <li>車両ごとに履歴を一元化。URLひとつで共有できる</li>
                <li>整備・カスタム・証憑が揃った「見せる履歴」を作れる</li>
                <li>走行距離と日付から次回メンテを自動提案・リマインド</li>
                <li>公開ガレージページがSNSカード対応。拡散できる</li>
                <li>PDF出力で買い手・査定担当に信頼を証明できる</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features">
        <div className="features-inner">
          <div className="features-header">
            <div>
              <p className="section-label"><span>02</span> 主な機能</p>
              <h2>記録する。<br />見せる。<br />資産にする。</h2>
            </div>
            <p className="features-desc">
              日常のメンテから売却まで、愛車の一生を1つのページにまとめる。
              記録が積み上がるほど、共有・売却時の信頼と価値が高まる。
            </p>
          </div>
          <div className="features-grid">
            <div className="feature-card featured">
              <p className="feature-num">01</p>
              <h3 className="feature-title">公開ガレージページ</h3>
              <p className="feature-body">
                車両プロフィール・整備履歴・カスタム一覧・証憑写真をまとめた専用URL。
                SNS共有カード対応で、X/Instagramに貼るだけで愛車の全履歴が伝わる。
                売却時はQRコードを印刷して買い手に渡せる。
              </p>
              <span className="feature-tag">SNS連携 / QR / PDF対応</span>
            </div>
            <div className="feature-card">
              <p className="feature-num">02</p>
              <h3 className="feature-title">10秒記録</h3>
              <p className="feature-body">テンプレ選択 or レシートOCRで最短10秒。走行距離も自動更新。</p>
              <span className="feature-tag">OCR / テンプレ</span>
            </div>
            <div className="feature-card">
              <p className="feature-num">03</p>
              <h3 className="feature-title">次回メンテ提案</h3>
              <p className="feature-body">走行距離・日付から車検/オイル/タイヤ交換を自動算出してリマインド。</p>
              <span className="feature-tag">リマインダー</span>
            </div>
            <div className="feature-card">
              <p className="feature-num">04</p>
              <h3 className="feature-title">証憑PDF出力</h3>
              <p className="feature-body">署名付きPDFで整備履歴を証明書として出力。売却・査定で信頼を補強できる。</p>
              <span className="feature-tag">売却 / 査定</span>
            </div>
            <div className="feature-card">
              <p className="feature-num">05</p>
              <h3 className="feature-title">複数台管理</h3>
              <p className="feature-body">家族の車も、2台目も。車両ごとに完全分離で管理できる。</p>
              <span className="feature-tag">複数台対応</span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW */}
      <section className="how" id="how">
        <div className="how-inner">
          <p className="section-label"><span>03</span> 使い方</p>
          <h2>3ステップで<br />はじめられる。</h2>
          <div className="steps">
            <div className="step">
              <p className="step-num">01</p>
              <p className="step-title">車両を登録</p>
              <p className="step-body">車名・型式・年式を入力。30秒で車両プロフィールが完成する。</p>
              <p className="step-accent">クレカ不要 · 無料</p>
            </div>
            <div className="step">
              <p className="step-num">02</p>
              <p className="step-title">履歴を記録</p>
              <p className="step-body">テンプレかレシートOCRで最短10秒。証憑写真も添付できる。</p>
              <p className="step-accent">継続するほど価値が高まる</p>
            </div>
            <div className="step">
              <p className="step-num">03</p>
              <p className="step-title">公開・共有</p>
              <p className="step-body">URLひとつでSNS・買い手に愛車の全履歴を届ける。</p>
              <p className="step-accent">SNSカード / QR / PDF</p>
            </div>
          </div>
        </div>
      </section>

      {/* PERSONAS */}
      <section id="personas">
        <div className="personas-inner">
          <p className="section-label"><span>04</span> こんな人に</p>
          <h2>履歴を見せたい<br />全ての人へ。</h2>
          <div className="persona-grid">
            <div className="persona-card">
              <p className="persona-priority">Priority 01 — コアターゲット</p>
              <p className="persona-cars">FL5 / GDB / GR86 / BRZ / ロードスター</p>
              <h3 className="persona-name">スポーツカー / カスタム車オーナー</h3>
              <p className="persona-body">整備・カスタム履歴を見せたい動機が強く、SNS共有もしやすい。こだわりを1ページに集約し、仲間への共有・コミュニティ拡散の起点を作る。</p>
            </div>
            <div className="persona-card">
              <p className="persona-priority">Priority 02 — 売却検討者</p>
              <p className="persona-cars">中古車売却 / 個人売買 / 査定申込</p>
              <h3 className="persona-name">売却・個人売買を検討している人</h3>
              <p className="persona-body">整備履歴・カスタム一覧・証憑をまとめたPDFで、買い手の信頼を勝ち取る。透明な履歴が査定額の向上につながる。</p>
            </div>
            <div className="persona-card">
              <p className="persona-priority">Priority 03 — 一般オーナー</p>
              <p className="persona-cars">乗用車全般 / 複数台保有 / 家族</p>
              <h3 className="persona-name">「次の車検いつだっけ」が口癖の人</h3>
              <p className="persona-body">紙・メモ・スマホ写真に散らばった記録を一元化。車検・オイル交換の時期を逃さない。</p>
            </div>
            <div className="persona-card" style={{ background: 'transparent' }} />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final-cta">
        <p className="section-label" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
          <span>05</span> はじめる
        </p>
        <h2>愛車の価値を、<br />最大限に。</h2>
        <p>無料でアカウントを作成して、愛車の履歴を資産に変えよう。<br />クレジットカード不要。30秒で開始できる。</p>
        <Link href="/signup" className="btn-primary final-cta-btn">無料ではじめる</Link>
        <p className="cta-meta">© 2026 GarageLog · garagelog.jp</p>
      </section>

      {/* FOOTER */}
      <footer>
        <p className="footer-logo">GARAGE_LOG</p>
        <div className="footer-links">
          <Link href="/legal/privacy">プライバシーポリシー</Link>
          <Link href="/legal/terms">利用規約</Link>
          <Link href="/support">サポート</Link>
        </div>
        <p className="footer-copy">© 2026 GarageLog</p>
      </footer>
    </div>
  );
}
