import { getArticleById } from "@/lib/db/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { MarkAsRead } from "@/components/MarkAsRead";
import { ReadLaterButton } from "./ReadLaterButton";
import { ScoreBadge } from "@/components/ScoreBadge";
import {
  ArrowLeft,
  ExternalLink,
  Lightbulb,
  FileText,
  Tag,
} from "lucide-react";

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

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getArticleById(id);
  if (!article) notFound();

  return (
    <div className="max-w-3xl mx-auto">
      <MarkAsRead itemId={article.id} isRead={article.isRead} />

      {/* Back nav + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900 h-11 sm:h-9">
            <ArrowLeft className="w-4 h-4 mr-1" />
            一覧へ
          </Button>
        </Link>
        <ReadLaterButton itemId={article.id} isSaved={article.isSaved} />
      </div>

      {/* Article header */}
      <Card className="mb-4">
        <CardContent className="pt-6">
          {/* Labels */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${TOPIC_COLORS[article.topic]}`}>
              {TOPIC_LABELS[article.topic]}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${FORMAT_COLORS[article.format]}`}>
              {FORMAT_LABELS[article.format]}
            </span>
            <Badge variant="outline" className="text-xs">
              {article.language} → JA
            </Badge>
            <div className="ml-auto">
              <ScoreBadge score={article.importanceScore} />
            </div>
          </div>

          {/* Meta */}
          <p className="text-sm text-gray-500 mb-2">
            {article.source} · {article.publishedAt}
          </p>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 leading-snug mb-6">
            {article.title}
          </h1>

          <Separator className="mb-6" />

          {/* Summary */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-bold text-gray-700">要約</h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{article.summaryMedium}</p>
          </div>

          {/* Key Points */}
          {article.keyPoints.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">📌</span>
                <h2 className="text-sm font-bold text-gray-700">Key Points</h2>
              </div>
              <ul className="space-y-2">
                {article.keyPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Why it matters */}
          {article.whyItMatters && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-bold text-gray-700">Why it matters</h2>
              </div>
              <p className="text-sm text-gray-700">{article.whyItMatters}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Original link */}
      <Card className="mb-4">
        <CardContent className="py-4">
          <a href={article.url} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium">
            <ExternalLink className="w-4 h-4" />
            原文を読む
          </a>
        </CardContent>
      </Card>

      {/* Entities & Related */}
      <Card>
        <CardContent className="py-4 space-y-4">
          {/* Entities */}
          {article.entities.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">関連エンティティ</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {article.entities.map((entity) => (
                  <Badge key={entity} variant="secondary" className="text-xs">
                    {entity}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Related articles */}
          {article.relatedArticles.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-gray-400 text-sm">📎</span>
                <span className="text-sm font-medium text-gray-700">関連記事</span>
              </div>
              <div className="flex flex-col gap-1">
                {article.relatedArticles.map((related) => (
                  <p key={related} className="text-sm text-blue-600 hover:underline cursor-pointer">
                    {related}
                  </p>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
