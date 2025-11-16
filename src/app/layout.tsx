import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { OfflineDetector } from "@/components/common/OfflineDetector";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "garage log - 愛車の履歴を、資産に。",
  description: '給油・メンテ・カスタムの"いたわり"を記録。グラフ・PDF・共有で、愛車の価値を正しく伝えます。レシートOCRで最短10秒、続けられるUX設計。',
  keywords: "車両管理,車メンテナンス,給油記録,カスタム記録,PDF出力,共有リンク,OCR,車歴書,整備記録",
  authors: [{ name: "garage log" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180" },
    ],
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://garagelog.jp/",
    siteName: "garage log",
    title: "garage log - 愛車の履歴を、資産に。",
    description: '給油・メンテ・カスタムの"いたわり"を記録。グラフ・PDF・共有で、愛車の価値を正しく伝えます。',
    images: [
      {
        url: "https://garagelog.jp/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "garage log - Turn Your Car History into Value",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "garage log - 愛車の履歴を、資産に。",
    description: '給油・メンテ・カスタムの"いたわり"を記録。グラフ・PDF・共有で、愛車の価値を正しく伝えます。',
    images: ["https://garagelog.jp/og-image.jpg"],
  },
  alternates: {
    canonical: "https://garagelog.jp/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <OfflineDetector />
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
