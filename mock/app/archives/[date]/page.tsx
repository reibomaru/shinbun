import { ARTICLES, RELEASES, CATEGORY_COUNTS, ARCHIVE_DAYS } from "@/lib/mock-data";
import { ArticleCard } from "@/components/ArticleCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Star, Package, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export function generateStaticParams() {
  return ARCHIVE_DAYS.map((day) => ({ date: day.date }));
}

interface ArchiveDatePageProps {
  params: Promise<{ date: string }>;
}

export default async function ArchiveDatePage({ params }: ArchiveDatePageProps) {
  const { date } = await params;

  // Parse date for display
  const [year, month, day] = date.split("-").map(Number);
  const archiveDay = ARCHIVE_DAYS.find((d) => d.date === date);
  const dayOfWeek = archiveDay?.dayOfWeek ?? "";

  // Find prev/next
  const currentIndex = ARCHIVE_DAYS.findIndex((d) => d.date === date);
  const prevDay = currentIndex < ARCHIVE_DAYS.length - 1 ? ARCHIVE_DAYS[currentIndex + 1] : null;
  const nextDay = currentIndex > 0 ? ARCHIVE_DAYS[currentIndex - 1] : null;

  // Reuse existing mock articles as snapshot
  const topStories = [...ARTICLES].sort((a, b) => b.importanceScore - a.importanceScore).slice(0, 3);
  const genaiArticles = ARTICLES.filter((a) => a.topic === "genai").slice(0, 4);
  const frontendArticles = ARTICLES.filter((a) => a.topic === "frontend").slice(0, 4);
  const backendArticles = ARTICLES.filter((a) => a.topic === "backend").slice(0, 4);

  return (
    <div className="flex flex-col gap-4">
      {/* Archive header */}
      <div className="flex items-center justify-between">
        <Link href="/archives">
          <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-500">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            バックナンバー一覧
          </Button>
        </Link>
        <div className="text-sm font-semibold text-gray-700">
          {year}年{month}月{day}日({dayOfWeek})号
        </div>
      </div>

      {/* Category counts */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 ml-auto text-xs text-gray-500">
          {Object.entries(CATEGORY_COUNTS).map(([cat, count]) => (
            <span key={cat}>
              <span className="font-medium text-gray-700">{cat}</span>: {count}件
            </span>
          ))}
        </div>
      </div>

      {/* Main 2-column layout (same as dashboard) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
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
                  <div className="flex-1">
                    <ArticleCard article={article} useAbsoluteTime />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* GenAI */}
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
                <ArticleCard key={article.id} article={article} compact useAbsoluteTime />
              ))}
            </div>
          </section>

          <Separator />

          {/* Frontend */}
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
                <ArticleCard key={article.id} article={article} compact useAbsoluteTime />
              ))}
            </div>
          </section>

          <Separator />

          {/* Backend */}
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
                <ArticleCard key={article.id} article={article} compact useAbsoluteTime />
              ))}
            </div>
          </section>
        </div>

        {/* Right column: Releases */}
        <aside className="flex flex-col gap-4">
          <Card className="sticky top-20">
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
                          {release.source} · {release.publishedAtAbsolute}
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

      {/* Pagination */}
      <Separator />
      <div className="flex items-center justify-between py-2">
        {prevDay ? (
          <Link href={`/archives/${prevDay.date}`}>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-500">
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              前日号 ({prevDay.date.slice(5).replace("-", "/")})
            </Button>
          </Link>
        ) : (
          <div />
        )}
        {nextDay ? (
          <Link href={`/archives/${nextDay.date}`}>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-500">
              次日号 ({nextDay.date.slice(5).replace("-", "/")})
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
