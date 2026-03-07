"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";

export function FeedbackButtons() {
  const [submitted, setSubmitted] = useState<"helpful" | "not_helpful" | null>(null);

  const handleFeedback = (type: "helpful" | "not_helpful") => {
    if (submitted === type) return;
    setSubmitted(type);
    toast.success(type === "helpful" ? "フィードバックありがとうございます！" : "フィードバックを記録しました");
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className={`h-11 sm:h-9 px-3 text-xs ${
          submitted === "helpful"
            ? "text-green-600 bg-green-50"
            : "text-gray-500 hover:text-green-600"
        }`}
        disabled={submitted !== null}
        onClick={() => handleFeedback("helpful")}
      >
        <ThumbsUp className={`w-3.5 h-3.5 mr-1 ${submitted === "helpful" ? "fill-current" : ""}`} />
        役立った
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`h-11 sm:h-9 px-3 text-xs ${
          submitted === "not_helpful"
            ? "text-red-500 bg-red-50"
            : "text-gray-500 hover:text-red-500"
        }`}
        disabled={submitted !== null}
        onClick={() => handleFeedback("not_helpful")}
      >
        <ThumbsDown className={`w-3.5 h-3.5 mr-1 ${submitted === "not_helpful" ? "fill-current" : ""}`} />
        不要
      </Button>
    </div>
  );
}
