"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Article } from "@/lib/mock-data";
import { Bookmark, ThumbsUp, ThumbsDown, Star } from "lucide-react";

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
}

export function ArticleCard({ article, compact = false }: ArticleCardProps) {
  return (
    <Link href={`/items/${article.id}`}>
      <Card
        className={`cursor-pointer transition-all hover:shadow-md hover:border-gray-300 ${
          article.isRead ? "opacity-50" : ""
        } ${article.isUrgent ? "border-red-400 bg-red-50" : ""}`}
      >
        <CardContent className={compact ? "p-3" : "p-4"}>
          {/* Labels */}
          <div className="flex flex-wrap gap-1 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TOPIC_COLORS[article.topic]}`}>
              {TOPIC_LABELS[article.topic]}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FORMAT_COLORS[article.format]}`}>
              {FORMAT_LABELS[article.format]}
            </span>
            <Badge variant="outline" className="text-xs py-0.5">
              {article.language}
            </Badge>
          </div>

          {/* Title */}
          <h3 className={`font-semibold text-gray-900 leading-snug mb-1 ${compact ? "text-sm" : "text-base"}`}>
            {article.title}
          </h3>

          {/* Summary */}
          {!compact && (
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
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-xs font-medium text-gray-700">{article.importanceScore}</span>
            </div>
          </div>

          {/* Actions */}
          {!compact && (
            <div className="flex gap-1 mt-3" onClick={(e) => e.preventDefault()}>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-500 hover:text-blue-600">
                <Bookmark className="w-3 h-3 mr-1" />
                保存
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-500 hover:text-green-600">
                <ThumbsUp className="w-3 h-3 mr-1" />
                役立った
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-500 hover:text-red-500">
                <ThumbsDown className="w-3 h-3 mr-1" />
                不要
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
