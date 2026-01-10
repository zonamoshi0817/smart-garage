"use client";

import { Suspense } from "react";
import ClientProviders from "@/components/common/ClientProviders";
import { GoogleAnalyticsComponent } from "@/components/GoogleAnalytics";
import { RouteDebugLogger } from "@/components/common/RouteDebugLogger";

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
      {children}
      <GoogleAnalyticsComponent />
    </ClientProviders>
  );
}
