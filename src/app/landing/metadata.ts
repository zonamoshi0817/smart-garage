import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'garage log - 愛車の履歴を、資産に。',
  description: '給油・メンテ・カスタムの"いたわり"を記録。グラフ・PDFで、愛車の価値を正しく伝えます。レシートOCRで最短10秒、続けられるUX設計。',
  keywords: ['車両管理', '車メンテナンス', '給油記録', 'カスタム記録', 'PDF出力', 'OCR', '車歴書', '整備記録'],
  authors: [{ name: 'garage log' }],
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: 'https://garagelog.jp/',
    siteName: 'garage log',
    title: 'garage log - 愛車の履歴を、資産に。',
    description: '給油・メンテ・カスタムの"いたわり"を記録。グラフ・PDFで、愛車の価値を正しく伝えます。',
    images: [
      {
        url: 'https://garagelog.jp/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'garage log - Turn Your Car History into Value',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'garage log - 愛車の履歴を、資産に。',
    description: '給油・メンテ・カスタムの"いたわり"を記録。グラフ・PDFで、愛車の価値を正しく伝えます。',
    images: ['https://garagelog.jp/og-image.jpg'],
  },
  alternates: {
    canonical: 'https://garagelog.jp/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Google Search Console verification (add when available)
    // google: 'your-verification-code',
  },
};

