"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Clock, LayoutDashboard, Archive, Menu, X } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Hamburger (mobile only) */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden shrink-0"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="メニュー"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0" onClick={() => setMobileMenuOpen(false)}>
          <span className="text-lg font-bold text-gray-900 tracking-tight">
            <span className="hidden sm:inline">📰 AI Tech Daily</span>
            <span className="sm:hidden">📰</span>
          </span>
        </Link>

        {/* Nav (desktop) */}
        <nav className="hidden md:flex items-center gap-1 ml-2">
          <Link href="/">
            <Button
              variant={pathname === "/" ? "secondary" : "ghost"}
              size="sm"
              className="h-9 text-sm"
            >
              <LayoutDashboard className="w-4 h-4 mr-1" />
              ダッシュボード
            </Button>
          </Link>
          <Link href="/archives">
            <Button
              variant={pathname.startsWith("/archives") ? "secondary" : "ghost"}
              size="sm"
              className="h-9 text-sm"
            >
              <Archive className="w-4 h-4 mr-1" />
              アーカイブ
            </Button>
          </Link>
          <Link href="/saved">
            <Button
              variant={pathname === "/saved" ? "secondary" : "ghost"}
              size="sm"
              className="h-9 text-sm"
            >
              <Clock className="w-4 h-4 mr-1" />
              あとで読む
            </Button>
          </Link>
        </nav>

        {/* Search */}
        <div className="flex-1 max-w-sm ml-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="記事を検索..."
              className="pl-8 h-9 text-sm bg-gray-50"
            />
          </div>
        </div>

        {/* Date (hidden on small screens) */}
        <span className="text-sm text-gray-500 shrink-0 hidden sm:inline">
          {new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" })}
        </span>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="flex flex-col px-4 py-3 gap-1">
            <Link href="/" onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant={pathname === "/" ? "secondary" : "ghost"}
                className="w-full justify-start h-11 text-sm"
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                ダッシュボード
              </Button>
            </Link>
            <Link href="/archives" onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant={pathname.startsWith("/archives") ? "secondary" : "ghost"}
                className="w-full justify-start h-11 text-sm"
              >
                <Archive className="w-4 h-4 mr-2" />
                アーカイブ
              </Button>
            </Link>
            <Link href="/saved" onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant={pathname === "/saved" ? "secondary" : "ghost"}
                className="w-full justify-start h-11 text-sm"
              >
                <Clock className="w-4 h-4 mr-2" />
                あとで読む
              </Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
