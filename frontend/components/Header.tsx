"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Bookmark, LayoutDashboard, Newspaper } from "lucide-react";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-lg font-bold text-gray-900 tracking-tight">📰 AI Tech Daily</span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1 ml-2">
          <Link href="/">
            <Button
              variant={pathname === "/" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs"
            >
              <LayoutDashboard className="w-3.5 h-3.5 mr-1" />
              ダッシュボード
            </Button>
          </Link>
          <Link href="/archives">
            <Button
              variant={pathname.startsWith("/archives") ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs"
            >
              <Newspaper className="w-3.5 h-3.5 mr-1" />
              バックナンバー
            </Button>
          </Link>
          <Link href="/saved">
            <Button
              variant={pathname === "/saved" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs"
            >
              <Bookmark className="w-3.5 h-3.5 mr-1" />
              保存済み
            </Button>
          </Link>
        </nav>

        {/* Search */}
        <div className="flex-1 max-w-sm ml-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="記事を検索..."
              className="pl-8 h-8 text-sm bg-gray-50"
            />
          </div>
        </div>

        {/* Date */}
        <span className="text-sm text-gray-500 shrink-0">
          {new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" })}
        </span>
      </div>
    </header>
  );
}
