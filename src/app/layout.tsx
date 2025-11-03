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
  title: "Smart Garage - 愛車の価値を履歴で残す",
  description: "車両メンテナンス管理アプリ。給油記録、メンテナンス履歴、カスタマイズ記録を簡単に管理。OCRスキャン、PDF出力、履歴共有機能を搭載。",
  keywords: "車両管理,メンテナンス記録,給油記録,燃費管理,カスタマイズ,OCRスキャン",
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
