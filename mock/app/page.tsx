import { ARTICLES, RELEASES, CATEGORY_COUNTS } from "@/lib/mock-data";
import { ArticleCard } from "@/components/ArticleCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, Package, AlertTriangle, Filter } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const topStories = [...ARTICLES].sort((a, b) => b.importanceScore - a.importanceScore).slice(0, 3);
  const urgentArticles = ARTICLES.filter((a) => a.isUrgent);
  const genaiArticles = ARTICLES.filter((a) => a.topic === "genai").slice(0, 4);
  const frontendArticles = ARTICLES.filter((a) => a.topic === "frontend").slice(0, 4);
  const backendArticles = ARTICLES.filter((a) => a.topic === "backend").slice(0, 4);

  return (
    <div className="flex flex-col gap-4">
      {/* Urgent Alert Banner */}
      {urgentArticles.map((article) => (
        <Link key={article.id} href={`/items/${article.id}`}>
          <div className="bg-red-50 border border-red-300 rounded-lg p-3 flex items-start gap-3 cursor-pointer hover:bg-red-100 transition-colors">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-bold text-red-600 uppercase tracking-wide">緊急アラート</span>
                <Badge variant="destructive" className="text-xs py-0 px-1.5">Security</Badge>
              </div>
              <p className="text-sm font-semibold text-red-900">{article.title}</p>
              <p className="text-xs text-red-700 mt-0.5">{article.summaryShort}</p>
            </div>
          </div>
        </Link>
      ))}

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Button variant="outline" size="sm" className="h-9 text-xs w-fit">
          <Filter className="w-3 h-3 mr-1" />
          未読のみ
        </Button>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:ml-auto text-xs text-gray-500">
          {Object.entries(CATEGORY_COUNTS).map(([cat, count]) => (
            <span key={cat}>
              <span className="font-medium text-gray-700">{cat}</span>: {count}件
            </span>
          ))}
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Left column: Main content */}
        <div className="flex flex-col gap-6">
          {/* TOP STORIES */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Top Stories</h2>
            </div>
            <div className="flex flex-col gap-3">
              {topStories.map((article, i) => (
                <div key={article.id} className="flex gap-3">
                  <span className="text-2xl font-bold text-gray-200 leading-none mt-1 w-6 shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <ArticleCard article={article} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* GenAI section */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">GenAI</h2>
                <span className="text-xs text-gray-400">{CATEGORY_COUNTS.GenAI}件</span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-500">もっと見る →</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {genaiArticles.map((article) => (
                <ArticleCard key={article.id} article={article} compact />
              ))}
            </div>
          </section>

          <Separator />

          {/* Frontend section */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Frontend</h2>
                <span className="text-xs text-gray-400">{CATEGORY_COUNTS.Frontend}件</span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-500">もっと見る →</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {frontendArticles.map((article) => (
                <ArticleCard key={article.id} article={article} compact />
              ))}
            </div>
          </section>

          <Separator />

          {/* Backend section */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Backend / Tools</h2>
                <span className="text-xs text-gray-400">{CATEGORY_COUNTS.Backend}件</span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-500">もっと見る →</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {backendArticles.map((article) => (
                <ArticleCard key={article.id} article={article} compact />
              ))}
            </div>
          </section>
        </div>

        {/* Right column: Releases - collapses on mobile */}
        <aside className="flex flex-col gap-4">
          <Card className="lg:sticky lg:top-20">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide">
                <Package className="w-4 h-4 text-gray-500" />
                Releases
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex flex-col divide-y divide-gray-100">
                {RELEASES.map((release, i) => (
                  <div key={i} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{release.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {release.source} · {release.publishedAt}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-medium text-gray-600">{release.score}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
