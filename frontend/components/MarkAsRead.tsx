"use client";

import { useEffect, useRef } from "react";
import { markAsRead } from "@/lib/actions";

interface MarkAsReadProps {
  itemId: string;
  isRead: boolean;
}

export function MarkAsRead({ itemId, isRead }: MarkAsReadProps) {
  const called = useRef(false);

  useEffect(() => {
    if (!isRead && !called.current) {
      called.current = true;
      markAsRead(itemId);
    }
  }, [itemId, isRead]);

  return null;
}
