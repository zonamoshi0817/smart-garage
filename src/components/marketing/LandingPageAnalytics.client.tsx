"use client";

import { useEffect } from "react";
import { lpEvents, trackPageView } from "@/lib/analytics";

export default function LandingPageAnalytics() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // ページビューを追跡
    trackPageView(window.location.pathname);

    // スクロール深度を追跡
    let maxScrollDepth = 0;
    const scrollDepthThresholds = [25, 50, 75, 100];
    const trackedDepths = new Set<number>();

    const handleScroll = () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const documentHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollDepth = Math.round((scrollTop / documentHeight) * 100);

      scrollDepthThresholds.forEach((threshold) => {
        if (
          scrollDepth >= threshold &&
          !trackedDepths.has(threshold) &&
          maxScrollDepth < threshold
        ) {
          trackedDepths.add(threshold);
          maxScrollDepth = threshold;
          lpEvents.scrollDepth(threshold);
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // セクション表示を追跡
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id;
            if (sectionId) {
              lpEvents.sectionView(sectionId);
            }
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    const timeoutId = setTimeout(() => {
      const sections = document.querySelectorAll("section[id]");
      sections.forEach((section) => observer.observe(section));
    }, 200);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timeoutId);
      const sections = document.querySelectorAll("section[id]");
      sections.forEach((section) => observer.unobserve(section));
    };
  }, []);

  return null;
}
