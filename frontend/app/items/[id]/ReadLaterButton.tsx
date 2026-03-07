"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Clock, Check } from "lucide-react";
import { toggleSave } from "@/lib/actions";

interface ReadLaterButtonProps {
  itemId: string;
  isSaved: boolean;
}

export function ReadLaterButton({ itemId, isSaved: initialSaved }: ReadLaterButtonProps) {
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-11 sm:h-9 px-3 text-xs ${isSaved ? "text-blue-600" : "text-gray-500 hover:text-blue-600"}`}
      disabled={isPending}
      onClick={() => {
        setIsSaved(!isSaved);
        startTransition(() => toggleSave(itemId));
      }}
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
  );
}
