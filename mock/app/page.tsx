import { ARTICLES, CATEGORY_COUNTS } from "@/lib/mock-data";
import { MasonryGrid } from "@/components/MasonryGrid";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import { UrgentAlertBanner } from "@/components/UrgentAlertBanner";

export default function DashboardPage() {
  const sortedArticles = [...ARTICLES].sort((a, b) => b.importanceScore - a.importanceScore);
  const urgentArticles = ARTICLES.filter((a) => a.isUrgent);

  return (
    <div className="flex flex-col gap-4">
      {/* Urgent Alert Banner */}
      <UrgentAlertBanner articles={urgentArticles} />

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

      {/* Masonry newspaper layout - sorted by importance score */}
      {/* Articles are pre-assigned to columns (round-robin) so opening/closing a card doesn't reflow other columns */}
      <MasonryGrid articles={sortedArticles} />
    </div>
  );
}
