"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Article } from "@/lib/types";
import { getVisibleAlerts, dismissArticle, isSafeUrl } from "./urgent-alert-helpers";

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

export function UrgentAlertBanner({ articles }: { articles: Article[] }) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const visibleAlerts = getVisibleAlerts(articles, dismissedIds);

  const handleAcknowledge = () => {
    if (selectedArticle) {
      setDismissedIds((prev) => dismissArticle(prev, selectedArticle.id));
      setSelectedArticle(null);
    }
  };

  if (visibleAlerts.length === 0) return null;

  return (
    <>
      {visibleAlerts.map((article) => (
        <button
          key={article.id}
          type="button"
          onClick={() => setSelectedArticle(article)}
          className="w-full text-left bg-red-50 border border-red-300 rounded-lg p-3 flex items-start gap-3 cursor-pointer hover:bg-red-100 transition-colors"
        >
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-bold text-red-600 uppercase tracking-wide">
                緊急アラート
              </span>
              <Badge variant="destructive" className="text-xs py-0 px-1.5">
                {TOPIC_LABELS[article.topic] ?? article.topic}
              </Badge>
            </div>
            <p className="text-sm font-semibold text-red-900">
              {article.title}
            </p>
            <p className="text-xs text-red-700 mt-0.5">
              {article.summaryShort}
            </p>
          </div>
        </button>
      ))}

      <Dialog
        open={selectedArticle !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedArticle(null);
        }}
      >
        {selectedArticle && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-xs font-bold text-red-600 uppercase tracking-wide">
                  緊急アラート
                </span>
                <Badge variant="destructive" className="text-xs py-0 px-1.5">
                  {TOPIC_LABELS[selectedArticle.topic] ?? selectedArticle.topic}
                </Badge>
                <Badge variant="outline" className="text-xs py-0 px-1.5">
                  {FORMAT_LABELS[selectedArticle.format] ?? selectedArticle.format}
                </Badge>
              </div>
              <DialogTitle className="text-red-900">
                {selectedArticle.title}
              </DialogTitle>
              <DialogDescription className="text-red-700">
                {selectedArticle.source} · {selectedArticle.publishedAt} · ★{" "}
                {selectedArticle.importanceScore}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-800 leading-relaxed">
                  {selectedArticle.summaryMedium}
                </p>
              </div>

              {selectedArticle.keyPoints.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Key Points
                  </h4>
                  <ul className="space-y-1">
                    {selectedArticle.keyPoints.map((point, i) => (
                      <li
                        key={i}
                        className="text-sm text-gray-700 flex items-start gap-2"
                      >
                        <span className="text-red-400 mt-1.5 shrink-0 w-1 h-1 rounded-full bg-red-400" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedArticle.whyItMatters && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">
                    Why it matters
                  </h4>
                  <p className="text-sm text-red-800">
                    {selectedArticle.whyItMatters}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
              {isSafeUrl(selectedArticle.url) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  asChild
                >
                  <a href={selectedArticle.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5" />
                    原文を読む
                  </a>
                </Button>
              )}
              <Button
                size="sm"
                className="gap-1.5 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleAcknowledge}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                確認済みにする
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
