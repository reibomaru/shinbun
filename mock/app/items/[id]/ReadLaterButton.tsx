"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Clock, Check } from "lucide-react";
import { toast } from "sonner";

export function ReadLaterButton() {
  const [isSaved, setIsSaved] = useState(false);

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-11 sm:h-9 px-3 text-xs ${isSaved ? "text-blue-600" : "text-gray-500 hover:text-blue-600"}`}
      onClick={() => {
        const newSaved = !isSaved;
        setIsSaved(newSaved);
        toast.success(newSaved ? "あとで読むリストに保存しました" : "あとで読むリストから削除しました");
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
