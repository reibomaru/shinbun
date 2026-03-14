import { FileText, Newspaper } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ARCHIVE_DAYS } from "@/lib/mock-data";

export default function ArchivesPage() {
  // Group by month
  const grouped = ARCHIVE_DAYS.reduce<Record<string, typeof ARCHIVE_DAYS>>((acc, day) => {
    const [year, month] = day.date.split("-");
    const key = `${year}年${Number(month)}月`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(day);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Newspaper className="w-6 h-6 text-gray-700" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">バックナンバー</h1>
          <p className="text-sm text-gray-500">過去に発行した AI Tech Daily の一覧</p>
        </div>
      </div>

      {/* Month groups */}
      <div className="flex flex-col gap-8">
        {Object.entries(grouped).map(([month, days]) => (
          <section key={month}>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 border-b border-gray-200 pb-2">
              {month}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {days.map((day) => {
                const [, m, d] = day.date.split("-");
                return (
                  <Link key={day.date} href={`/archives/${day.date}`}>
                    <Card className="cursor-pointer transition-all hover:shadow-md hover:border-gray-300 h-full">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg font-bold text-gray-900">
                            {Number(m)}/{Number(d)}
                            <span className="text-sm font-normal text-gray-400 ml-1">
                              ({day.dayOfWeek})
                            </span>
                          </span>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <FileText className="w-3.5 h-3.5" />
                            <span>{day.articleCount}件</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 truncate">TOP: {day.topTitle}</p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
