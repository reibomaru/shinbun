"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Article } from "@/lib/types";
import { Clock, ChevronDown, ChevronUp, Check } from "lucide-react";
import { toggleSave } from "@/lib/actions";
import { toast } from "sonner";
import { ScoreBadge } from "@/components/ScoreBadge";

const TOPIC_COLORS: Record<string, string> = {
  genai: "bg-purple-100 text-purple-700",
  frontend: "bg-blue-100 text-blue-700",
  backend: "bg-green-100 text-green-700",
  devtools: "bg-orange-100 text-orange-700",
  security: "bg-red-100 text-red-700",
};

const FORMAT_COLORS: Record<string, string> = {
  release: "bg-emerald-100 text-emerald-700",
  tutorial: "bg-sky-100 text-sky-700",
  benchmark: "bg-amber-100 text-amber-700",
  incident: "bg-red-100 text-red-700",
  announcement: "bg-violet-100 text-violet-700",
};

const TOPIC_LABELS: Record<string, string> = {
  genai: "GenAI",
  frontend: "Frontend",
  backend: "Backend",
  devtools: "DevTools",
  security: "Security",
};

const FORMAT_LABELS: Record<string, string> = {
  release: "Release",
  tutorial: "Tutorial",
  benchmark: "Benchmark",
  incident: "Incident",
  announcement: "Announcement",
};

interface ArticleCardProps {
  article: Article;
  compact?: boolean;
  expanded?: boolean;
}

export function ArticleCard({ article, compact = false, expanded = false }: ArticleCardProps) {
  const [isOpen, setIsOpen] = useState(expanded);
  const [isSaved, setIsSaved] = useState(article.isSaved);
  const [isPending, startTransition] = useTransition();

  const handleToggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newSaved = !isSaved;
    setIsSaved(newSaved);
    startTransition(async () => {
      await toggleSave(article.id);
      toast.success(newSaved ? "あとで読むリストに保存しました" : "あとで読むリストから削除しました");
    });
  };

  return (
    <Card
      className={`transition-all hover:shadow-md hover:border-gray-300 ${
        article.isRead ? "opacity-50" : ""
      }`}
    >
      <CardContent className={compact ? "p-3" : "p-4"}>
        {/* Labels + Actions */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${TOPIC_COLORS[article.topic]}`}>
            {TOPIC_LABELS[article.topic]}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${FORMAT_COLORS[article.format]}`}>
            {FORMAT_LABELS[article.format]}
          </span>
          <Badge variant="outline" className="text-xs py-1">
            {article.language}
          </Badge>
          {!compact && (
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-2 text-xs ${isSaved ? "text-blue-600" : "text-gray-400 hover:text-blue-600"}`}
                disabled={isPending}
                onClick={handleToggleSave}
              >
                {isSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1" />
                    保存済み
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    あとで読む
                  </>
                )}
              </Button>
              {expanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                  }}
                >
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Title */}
        <Link href={`/items/${article.id}`}>
          <h3 className={`font-semibold text-gray-900 leading-snug mb-1 cursor-pointer hover:text-blue-600 ${compact ? "text-sm" : "text-base"}`}>
            {article.title}
          </h3>
        </Link>

        {/* Summary */}
        {isOpen ? (
          <div className="mt-2 space-y-3">
            <p className="text-sm text-gray-700 leading-relaxed">
              {article.summaryMedium}
            </p>
            {article.keyPoints.length > 0 && (
              <ul className="space-y-1">
                {article.keyPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-gray-400 mt-0.5 shrink-0">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}
            {article.whyItMatters && (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">Why it matters</p>
                <p className="text-sm text-gray-700">{article.whyItMatters}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-600 leading-relaxed mb-2 line-clamp-2">
            {article.summaryShort}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{article.source}</span>
            <span>·</span>
            <span>{article.publishedAt}</span>
          </div>
          <ScoreBadge score={article.importanceScore} />
        </div>

      </CardContent>
    </Card>
  );
}
