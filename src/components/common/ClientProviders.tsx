"use client";

import React from "react";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { OfflineDetector } from "@/components/common/OfflineDetector";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ErrorBoundary>
        <OfflineDetector />
      </ErrorBoundary>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </>
  );
}

