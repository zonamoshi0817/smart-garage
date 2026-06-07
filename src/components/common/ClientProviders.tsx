"use client";

import React from "react";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { OfflineDetector } from "@/components/common/OfflineDetector";
import { SelectedCarProvider } from "@/contexts/SelectedCarContext";
import { FeedbackProvider } from "@/components/common/Feedback";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SelectedCarProvider>
      <FeedbackProvider>
        <ErrorBoundary>
          <OfflineDetector />
        </ErrorBoundary>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </FeedbackProvider>
    </SelectedCarProvider>
  );
}

