"use client";

import { useEffect, useState } from "react";
import { ArticleCard } from "@/components/ArticleCard";
import type { Article } from "@/lib/types";

interface MasonryGridProps {
  articles: Article[];
}

function useColumnCount() {
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    function update() {
      if (window.innerWidth < 640) setColumns(1);
      else if (window.innerWidth < 1024) setColumns(2);
      else setColumns(3);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return columns;
}

export function MasonryGrid({ articles }: MasonryGridProps) {
  const columnCount = useColumnCount();

  const columns: Article[][] = Array.from({ length: columnCount }, () => []);
  articles.forEach((article, i) => {
    columns[i % columnCount].push(article);
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
      {columns.map((col, colIndex) => (
        <div key={colIndex} className="flex flex-col gap-3">
          {col.map((article) => (
            <ArticleCard key={article.id} article={article} expanded />
          ))}
        </div>
      ))}
    </div>
  );
}
