"use client";

import { useEffect } from "react";

export default function ScrollAnimations() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    const timeoutId = setTimeout(() => {
      const elements = document.querySelectorAll(
        ".fade-in-on-scroll, .slide-in-left-on-scroll, .slide-in-right-on-scroll, .scale-in-on-scroll"
      );
      elements.forEach((el) => observer.observe(el));
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      const elements = document.querySelectorAll(
        ".fade-in-on-scroll, .slide-in-left-on-scroll, .slide-in-right-on-scroll, .scale-in-on-scroll"
      );
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  return null;
}
