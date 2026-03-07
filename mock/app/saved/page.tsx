import { SAVED_ARTICLES } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Tag, Trash2, Download, ChevronDown } from "lucide-react";
import Link from "next/link";

export default function SavedPage() {
  const totalCount = SAVED_ARTICLES.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-gray-700" />
          <h1 className="text-lg font-bold text-gray-900">保存済み記事</h1>
          <span className="text-sm text-gray-500">({totalCount}件)</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="h-9 text-xs">
            日付順
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs">
            タグで絞り込み
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs text-gray-500">
            <Download className="w-3.5 h-3.5 mr-1" />
            エクスポート
          </Button>
        </div>
      </div>

      {/* Tag filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="text-xs text-gray-500 self-center">タグ:</span>
        {["llm", "api", "frontend", "backend", "react", "serverless"].map((tag) => (
          <button
            key={tag}
            className="text-xs px-3 py-2 min-h-[44px] sm:min-h-0 sm:py-1 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Articles grouped by date */}
      <div className="flex flex-col gap-6">
        {SAVED_ARTICLES.map((group) => (
          <div key={group.date}>
            {/* Date header */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-semibold text-gray-700">{group.date}</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            {/* Articles */}
            <div className="flex flex-col gap-2">
              {group.items.map((item) => (
                <Card key={item.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <Link href={`/items/${item.id}`}>
                          <h3 className="text-sm font-semibold text-gray-900 hover:text-blue-600 cursor-pointer truncate mb-1">
                            {item.title}
                          </h3>
                        </Link>

                        {/* Source & date */}
                        <p className="text-xs text-gray-500 mb-2">
                          {item.source} · {item.publishedAt}
                        </p>

                        {/* Tags */}
                        <div className="flex flex-wrap items-center gap-1">
                          {item.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs h-5 px-2"
                            >
                              🏷 {tag}
                            </Badge>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-2 text-xs text-gray-400 hover:text-gray-700"
                          >
                            <Tag className="w-3 h-3 mr-0.5" />
                            タグ追加
                          </Button>
                        </div>
                      </div>

                      {/* Delete button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state (hidden when articles exist) */}
      {SAVED_ARTICLES.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm">保存済み記事がありません</p>
          <p className="text-xs mt-1">記事カードの「保存」ボタンから追加できます</p>
        </div>
      )}
    </div>
  );
}
