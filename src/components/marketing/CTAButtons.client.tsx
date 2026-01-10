"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";
import { lpEvents } from "@/lib/analytics";

export function PricingCTAButtons({ planType }: { planType: "free" | "premium" }) {
  const router = useRouter();

  const handleSignUp = (location: string) => {
    lpEvents.ctaClick(location);
    router.push("/signup");
  };

  if (planType === "free") {
    return (
      <button
        onClick={() => handleSignUp("pricing_free")}
        className="w-full rounded-xl border border-blue-600 bg-white text-blue-600 py-3 font-medium hover:bg-blue-50 transition-colors text-base"
      >
        無料で始める
      </button>
    );
  }

  return (
    <button
      onClick={() => handleSignUp("pricing_premium")}
      className="w-full rounded-xl bg-blue-600 text-white py-3 font-semibold shadow-sm hover:bg-blue-700 hover:shadow-md transition-colors text-base"
    >
      プレミアムを始める
    </button>
  );
}

export function CTAButtons({
  variant = "default",
}: {
  variant?: "default" | "hero" | "cta-section";
}) {
  const router = useRouter();

  const handleLogin = () => {
    lpEvents.loginClick("lp");
    router.push("/login");
  };

  const handleSignUp = (location: string) => {
    lpEvents.ctaClick(location);
    router.push("/signup");
  };

  if (variant === "hero") {
    return (
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <button
          onClick={() => handleSignUp("lp_signup")}
          className="group inline-flex justify-center items-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 text-white font-semibold text-lg shadow-sm hover:bg-blue-700 hover:shadow-md transition-all duration-200"
        >
          無料ではじめる
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </button>
        <a
          href="#how"
          onClick={() => lpEvents.ctaClick("hero_how_it_works")}
          className="inline-flex justify-center items-center gap-2 px-8 py-4 rounded-2xl bg-white text-slate-900 font-medium border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-200"
        >
          使い方を見る
        </a>
      </div>
    );
  }

  if (variant === "cta-section") {
    return (
      <div className="flex flex-col sm:flex-row gap-4 sm:justify-end">
        <button
          onClick={() => handleSignUp("cta_section")}
          className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-blue-600 font-semibold px-8 py-4 shadow-sm hover:shadow-md transition-all duration-200 text-lg"
        >
          新規登録
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </button>
        <button
          onClick={handleLogin}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 backdrop-blur-sm text-white font-medium border border-white/30 px-8 py-4 shadow-sm hover:bg-white/20 transition-all duration-200 text-lg"
        >
          ログイン
        </button>
      </div>
    );
  }

  // default variant (header)
  return (
    <>
      <button
        onClick={() => handleSignUp("header_signup")}
        className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 hover:scale-105 transition-all duration-200"
      >
        <UserPlus className="h-4 w-4" />
        新規登録
      </button>
      <button
        onClick={handleLogin}
        className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-gray-700 font-semibold border-2 border-gray-300 shadow-md hover:bg-gray-50 hover:scale-105 transition-all duration-200"
      >
        <LogIn className="h-4 w-4" />
        ログイン
      </button>
      <button
        onClick={() => handleSignUp("header_signup")}
        className="sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-all duration-200"
        aria-label="新規登録"
      >
        <UserPlus className="h-5 w-5" />
      </button>
    </>
  );
}
