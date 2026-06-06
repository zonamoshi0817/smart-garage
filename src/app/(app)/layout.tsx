"use client";

import { Suspense } from "react";
import ClientProviders from "@/components/common/ClientProviders";
import { GoogleAnalyticsComponent } from "@/components/GoogleAnalytics";
import { RouteDebugLogger } from "@/components/common/RouteDebugLogger";
import { BottomNav } from "@/components/common/BottomNav";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClientProviders>
      <Suspense fallback={null}>
        <RouteDebugLogger />
      </Suspense>
      {/* モバイル用ボトムナビ分の余白 */}
      <div className="pb-14 lg:pb-0">
        {children}
      </div>
      <BottomNav />
      <GoogleAnalyticsComponent />
    </ClientProviders>
  );
}
