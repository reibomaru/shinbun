import { ARTICLES, CATEGORY_COUNTS, ARCHIVE_DAYS } from "@/lib/mock-data";
import { MasonryGrid } from "@/components/MasonryGrid";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
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

  // Sort all articles by importance score
  const sortedArticles = [...ARTICLES].sort((a, b) => b.importanceScore - a.importanceScore);

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
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
        {Object.entries(CATEGORY_COUNTS).map(([cat, count]) => (
          <span key={cat}>
            <span className="font-medium text-gray-700">{cat}</span>: {count}件
          </span>
        ))}
      </div>

      {/* Masonry layout - sorted by importance score */}
      <MasonryGrid articles={sortedArticles} useAbsoluteTime />

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
