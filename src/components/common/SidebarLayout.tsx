"use client";

import { ReactNode } from "react";
import { useSidebarCollapse } from "@/hooks/useSidebarCollapse";

interface SidebarLayoutProps {
  children: ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const isCollapsed = useSidebarCollapse();

  return (
    <div 
      className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 grid gap-6 ${
        isCollapsed 
          ? "grid-cols-1 lg:grid-cols-[64px_1fr]" 
          : "grid-cols-1 lg:grid-cols-[200px_1fr]"
      }`}
    >
      {children}
    </div>
  );
}
