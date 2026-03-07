export const dynamic = "force-dynamic";

import {
  getUrgentArticles,
  getAllArticlesSorted,
  getCategoryCounts,
} from "@/lib/db/queries";
import { MasonryGrid } from "@/components/MasonryGrid";
import { UrgentAlertBanner } from "@/components/UrgentAlertBanner";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

export default async function DashboardPage() {
  const [urgentArticles, allArticles, counts] = await Promise.all([
    getUrgentArticles(),
    getAllArticlesSorted(),
    getCategoryCounts(),
  ]);

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
          {Object.entries(counts).map(([cat, count]) => (
            <span key={cat}>
              <span className="font-medium text-gray-700">{cat}</span>: {count}件
            </span>
          ))}
        </div>
      </div>

      {/* Masonry newspaper layout - sorted by importance score */}
      <MasonryGrid articles={allArticles} />
    </div>
  );
}
