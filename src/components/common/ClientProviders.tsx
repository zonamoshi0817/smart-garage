"use client";

import React from "react";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { OfflineDetector } from "@/components/common/OfflineDetector";
import { SelectedCarProvider } from "@/contexts/SelectedCarContext";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SelectedCarProvider>
      <ErrorBoundary>
        <OfflineDetector />
      </ErrorBoundary>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </SelectedCarProvider>
  );
}

