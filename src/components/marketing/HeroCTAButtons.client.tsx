"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Play } from "lucide-react";
import { lpEvents } from "@/lib/analytics";

export default function HeroCTAButtonsPrimary({ variant }: { variant: "primary" | "secondary" }) {
  const router = useRouter();

  if (variant === "primary") {
    return (
      <button
        onClick={() => {
          lpEvents.ctaClick("hero_primary");
          router.push("/signup");
        }}
        className="group inline-flex justify-center items-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 text-white font-semibold text-lg shadow-md hover:bg-blue-700 hover:shadow-lg transition-all duration-200"
      >
        無料ではじめる
        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
      </button>
    );
  }

  return (
    <button
      onClick={() => {
        lpEvents.ctaClick("hero_demo");
        const demoSection = document.getElementById("demo") || document.getElementById("how");
        if (demoSection) {
          demoSection.scrollIntoView({ behavior: "smooth" });
        }
      }}
      className="group inline-flex justify-center items-center gap-2 px-8 py-4 rounded-2xl bg-white text-slate-700 font-medium border-2 border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-200"
    >
      <Play className="h-5 w-5 group-hover:scale-110 transition-transform" />
      デモを見る
    </button>
  );
}
