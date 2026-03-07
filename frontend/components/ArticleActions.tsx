"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck, ThumbsUp, ThumbsDown } from "lucide-react";
import { toggleSave, submitFeedback } from "@/lib/actions";

interface ArticleActionsProps {
  itemId: string;
  isSaved: boolean;
}

export function ArticleActions({ itemId, isSaved }: ArticleActionsProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex gap-1" onClick={(e) => e.preventDefault()}>
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 px-2 text-xs ${isSaved ? "text-blue-600" : "text-gray-500 hover:text-blue-600"}`}
        disabled={isPending}
        onClick={() => startTransition(() => toggleSave(itemId))}
      >
        {isSaved ? (
          <BookmarkCheck className="w-3 h-3 mr-1" />
        ) : (
          <Bookmark className="w-3 h-3 mr-1" />
        )}
        {isSaved ? "保存済み" : "保存"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-gray-500 hover:text-green-600"
        disabled={isPending}
        onClick={() =>
          startTransition(() => submitFeedback(itemId, "helpful"))
        }
      >
        <ThumbsUp className="w-3 h-3 mr-1" />
        役立った
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-gray-500 hover:text-red-500"
        disabled={isPending}
        onClick={() =>
          startTransition(() => submitFeedback(itemId, "not_helpful"))
        }
      >
        <ThumbsDown className="w-3 h-3 mr-1" />
        不要
      </Button>
    </div>
  );
}
