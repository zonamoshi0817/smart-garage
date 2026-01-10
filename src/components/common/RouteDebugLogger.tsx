"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function RouteDebugLogger() {
  const pathname = usePathname();
  const sp = useSearchParams();

  useEffect(() => {
    console.log("[route]", pathname, sp.toString());
  }, [pathname, sp]);

  return null;
}

