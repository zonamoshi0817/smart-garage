# ランディングページ実装ガイド

## 概要
Smart GarageのLPが実装され、ルートパス (`/`) に配置されました。

## アーキテクチャ

### パス構成
- **`/`** - ランディングページ（未認証ユーザー向け）
- **`/dashboard`** - メインダッシュボード（認証済みユーザー向け）
- **`/landing`** - LP独立ページ（開発/プレビュー用）

### 自動リダイレクト
- **ルート (`/`)**: 認証済みユーザーは自動的に `/dashboard` にリダイレクト
- **ダッシュボード (`/dashboard`)**: `AuthGate` により未認証ユーザーを認証画面へ誘導

## 実装内容

### 1. ファイル構成
```
src/
├── app/
│   ├── page.tsx               # ルートLP（認証チェック付き）
│   ├── landing/
│   │   └── page.tsx           # LP独立版
│   └── dashboard/
│       └── page.tsx           # 旧 app/page.tsx（ダッシュボード）
├── hooks/
│   └── useAuth.ts             # Firebase認証フック
└── ...
```

### 2. 主要機能

#### A. 認証状態に基づく自動ルーティング
```tsx
// src/app/page.tsx
const { user, loading } = useAuth();
useEffect(() => {
  if (!loading && user) {
    router.replace("/dashboard");
  }
}, [user, loading, router]);
```

#### B. LP構成要素
- **Header**: スティッキーヘッダー（ナビゲーション、CTA）
- **Hero**: メインビジュアル、キャッチコピー
- **TrustBar**: 信頼性を高める要素
- **PainGain**: 課題と解決策の対比
- **HowItWorks**: 4ステップの使い方
- **Features**: 6つの主要機能
- **ValueBlocks**: 3つの価値提案
- **Pricing**: 無料/プレミアムプラン比較
- **Security**: セキュリティ機能説明
- **FAQ**: よくある質問
- **CTA**: コンバージョンセクション
- **Footer**: 法的リンク、サポート

#### C. CTA導線
- 全CTAボタン → `/dashboard` へ誘導
- `/dashboard` では `AuthGate` が認証フローを処理
- 認証済みならダッシュボード表示、未認証なら認証画面へ

### 3. SEO & OGP設定

#### メタデータ (`src/app/layout.tsx`)
```tsx
export const metadata: Metadata = {
  title: "Smart Garage - 愛車の履歴を、資産に。",
  description: '給油・メンテ・カスタムの"いたわり"を記録。グラフ・PDF・共有で、愛車の価値を正しく伝えます。',
  keywords: "車両管理,車メンテナンス,給油記録,カスタム記録,PDF出力,共有リンク,OCR,車歴書,整備記録",
  openGraph: {
    url: "https://garagelog.jp/",
    title: "Smart Garage - 愛車の履歴を、資産に。",
    images: [{ url: "https://garagelog.jp/og-image.jpg", width: 1200, height: 630 }],
    // ...
  },
  // ...
};
```

#### サイトマップ (`public/sitemap.xml`)
- ルートページ (`/`) を `priority: 1.0` で登録済み
- `/dashboard` は認証必須のため除外

### 4. デザイン要素
- **カラースキーム**: Blue 600 (Primary), Indigo 600 (Gradient)
- **タイポグラフィ**: Geist Sans
- **アイコン**: lucide-react
- **レイアウト**: Tailwind CSS + Responsive Grid

## TODO

### デプロイ前
- [ ] **OG画像作成** (`public/og-image.jpg`, 1200x630px)
  - `public/og-image-todo.md` を参照
- [ ] Google Search Console の設定（サイトマップ送信）
- [ ] A/Bテスト用のアナリティクス設定（任意）

### 今後の改善案
- [ ] LP訪問者の行動分析（ヒートマップ、スクロール率）
- [ ] CTAのコピーテスト
- [ ] スクリーンショット/デモ動画の追加
- [ ] お客様の声/レビューセクション
- [ ] 料金プランの詳細ページ

## テスト方法

### ローカル開発
```bash
npm run dev
# http://localhost:3000 にアクセス
```

### ビルドテスト
```bash
npm run build
npm start
```

### 確認項目
- [ ] 未認証状態で `/` にアクセス → LPが表示される
- [ ] 認証済みで `/` にアクセス → `/dashboard` にリダイレクト
- [ ] LPのCTAクリック → `/dashboard` へ遷移
- [ ] `/dashboard` で未認証 → 認証画面へ遷移
- [ ] レスポンシブデザインの確認（Mobile, Tablet, Desktop）
- [ ] SEOメタタグが正しく設定されている（View Page Source）

## 関連ドキュメント
- [SPECIFICATION.md](/SPECIFICATION.md) - 全体仕様
- [DOMAIN_SETUP.md](/DOMAIN_SETUP.md) - ドメイン設定
- [RELEASE_CHECKLIST.md](/RELEASE_CHECKLIST.md) - リリース前チェックリスト

