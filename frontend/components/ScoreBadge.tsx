"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ScoreBadgeProps {
  score: number;
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 cursor-help">
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                clampedScore >= 80
                  ? "bg-orange-500"
                  : clampedScore >= 60
                    ? "bg-blue-500"
                    : clampedScore >= 40
                      ? "bg-blue-400"
                      : "bg-gray-400"
              }`}
              style={{ width: `${clampedScore}%` }}
            />
          </div>
          <span className="text-sm font-bold text-gray-500">{score}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="font-semibold text-xs mb-1.5">重要度スコア（0-100）</p>
        <ul className="text-xs space-y-0.5">
          <li>ソース信頼度: 30%</li>
          <li>コンテンツ品質（LLM評価）: 30%</li>
          <li>鮮度: 20%</li>
          <li>エンゲージメント: 20%</li>
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
