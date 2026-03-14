import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { InfiniteScrollMasonryGrid } from "@/components/InfiniteScrollMasonryGrid";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { loadMoreArchiveArticles } from "@/lib/actions";
import {
  getAdjacentArchiveDates,
  getArchiveAllArticlesSortedPaginated,
  getArchiveCategoryCounts,
  getArchiveDates,
} from "@/lib/db/queries";

export async function generateStaticParams() {
  const days = await getArchiveDates();
  return days.map((day) => ({ date: day.date }));
}

interface ArchiveDatePageProps {
  params: Promise<{ date: string }>;
}

export default async function ArchiveDatePage({ params }: ArchiveDatePageProps) {
  const { date } = await params;

  const [year, month, day] = date.split("-").map(Number);

  const [paginated, counts, adjacent] = await Promise.all([
    getArchiveAllArticlesSortedPaginated(date),
    getArchiveCategoryCounts(date),
    getAdjacentArchiveDates(date),
  ]);

  const dayOfWeek = (() => {
    const d = new Date(`${date}T00:00:00+09:00`);
    return ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  })();

  const boundLoadMore = async (cursor: string) => {
    "use server";
    return loadMoreArchiveArticles(date, cursor);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Archive header */}
      <div className="flex items-center justify-between">
        <Link href="/archives">
          <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-500">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            アーカイブ一覧
          </Button>
        </Link>
        <div className="text-sm font-semibold text-gray-700">
          {year}年{month}月{day}日({dayOfWeek})号
        </div>
      </div>

      {/* Category counts */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
        {Object.entries(counts).map(([cat, count]) => (
          <span key={cat}>
            <span className="font-medium text-gray-700">{cat}</span>: {count}件
          </span>
        ))}
      </div>

      {/* Masonry layout - sorted by importance score with infinite scroll */}
      <InfiniteScrollMasonryGrid
        initialArticles={paginated.articles}
        initialCursor={paginated.nextCursor}
        initialHasMore={paginated.hasMore}
        loadMore={boundLoadMore}
      />

      {/* Pagination */}
      <Separator />
      <div className="flex items-center justify-between py-2">
        {adjacent.prev ? (
          <Link href={`/archives/${adjacent.prev}`}>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-500">
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              前日号 ({adjacent.prev.slice(5).replace("-", "/")})
            </Button>
          </Link>
        ) : (
          <div />
        )}
        {adjacent.next ? (
          <Link href={`/archives/${adjacent.next}`}>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-500">
              次日号 ({adjacent.next.slice(5).replace("-", "/")})
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
