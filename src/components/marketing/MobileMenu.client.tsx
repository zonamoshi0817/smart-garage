"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";

export default function MobileMenu() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl text-gray-700 hover:bg-gray-100 transition-all duration-200"
        aria-label="メニュー"
      >
        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 border-t border-gray-200 bg-white shadow-lg z-40">
          <nav className="px-4 py-4 space-y-3">
            <Link
              href="#features"
              className="block text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              機能
            </Link>
            <Link
              href="#how"
              className="block text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              使い方
            </Link>
            <Link
              href="#pricing"
              className="block text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              料金
            </Link>
            <Link
              href="#faq"
              className="block text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              FAQ
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
