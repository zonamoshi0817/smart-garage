import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GarageLog - クルマと、ずっといい関係。',
  description: 'メンテ・給油・カスタムをまとめて記録。クルマのコンディションを見える化して、長く気持ちよく走れる状態をキープします。',
  keywords: ['車両管理', '車メンテナンス', '給油記録', 'カスタム記録', 'PDF出力', '共有リンク', 'OCR', '車歴書', '整備記録'],
  authors: [{ name: 'GarageLog' }],
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: 'https://garagelog.jp/',
    siteName: 'GarageLog',
    title: 'GarageLog - クルマと、ずっといい関係。',
    description: 'メンテ・給油・カスタムをまとめて記録。クルマのコンディションを見える化して、長く気持ちよく走れる状態をキープします。',
    images: [
      {
        url: 'https://garagelog.jp/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'GarageLog - クルマと、ずっといい関係。',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GarageLog - クルマと、ずっといい関係。',
    description: 'メンテ・給油・カスタムをまとめて記録。クルマのコンディションを見える化して、長く気持ちよく走れる状態をキープします。',
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

