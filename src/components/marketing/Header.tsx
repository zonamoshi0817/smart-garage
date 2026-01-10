import Link from "next/link";
import MobileMenu from "./MobileMenu.client";
import { CTAButtons } from "./CTAButtons.client";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70 border-b border-gray-200/60 shadow-sm animate-slideUp">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
          <img
            src="/icon.png"
            alt="GarageLog"
            className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl shadow-md"
          />
          <div className="leading-tight">
            <p className="font-bold text-gray-900 text-base sm:text-lg">GarageLog</p>
            <p className="text-[10px] sm:text-[11px] text-gray-500 -mt-0.5 font-medium hidden sm:block">
              クルマと、ずっといい関係。
            </p>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-700">
          <Link href="#features" className="hover:text-blue-600 transition-colors">
            機能
          </Link>
          <Link href="#how" className="hover:text-blue-600 transition-colors">
            使い方
          </Link>
          <Link href="#pricing" className="hover:text-blue-600 transition-colors">
            料金
          </Link>
          <Link href="#faq" className="hover:text-blue-600 transition-colors">
            FAQ
          </Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <MobileMenu />
          <CTAButtons variant="default" />
        </div>
      </div>
    </header>
  );
}
