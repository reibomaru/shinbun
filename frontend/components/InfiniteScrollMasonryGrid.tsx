"use client";

import { useState, useCallback, useRef, useEffect, useTransition } from "react";
import { MasonryGrid } from "@/components/MasonryGrid";
import type { Article, PaginatedArticles } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface InfiniteScrollMasonryGridProps {
  initialArticles: Article[];
  initialCursor: string | null;
  initialHasMore: boolean;
  loadMore: (cursor: string) => Promise<PaginatedArticles>;
}

export function InfiniteScrollMasonryGrid({
  initialArticles,
  initialCursor,
  initialHasMore,
  loadMore,
}: InfiniteScrollMasonryGridProps) {
  const [articles, setArticles] = useState(initialArticles);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleLoadMore = useCallback(() => {
    if (!cursor || isPending || !hasMore) return;
    startTransition(async () => {
      const result = await loadMore(cursor);
      setArticles((prev) => [...prev, ...result.articles]);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    });
  }, [cursor, isPending, hasMore, loadMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleLoadMore]);

  return (
    <div>
      <MasonryGrid articles={articles} />
      <div ref={sentinelRef} className="flex justify-center py-4">
        {isPending && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
      </div>
    </div>
  );
}
