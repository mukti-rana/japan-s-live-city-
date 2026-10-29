"use client";

import { useState } from "react";
import { Newspaper } from "lucide-react";
import NewsCard from "@/components/news/NewsCard";
import NewsModal from "@/components/news/NewsModal";
import { CompactSkeleton } from "@/components/news/NewsSkeleton";
import WidgetFrame from "@/components/home/WidgetFrame";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useNewsFeed } from "@/lib/news/useNews";
import type { NewsItem } from "@/lib/news/query";

function Group({ title, items, onOpen }: { title: string; items: NewsItem[]; onOpen: (i: NewsItem) => void }) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id}>
            <NewsCard item={item} variant="compact" onOpen={onOpen} />
          </li>
        ))}
      </ul>
    </section>
  );
}

// A short mix of national and world headlines, from the same news service as
// the News tab.
export default function HeadlinesMini() {
  const { t } = useLanguage();
  const [openItem, setOpenItem] = useState<NewsItem | null>(null);
  const japan = useNewsFeed({ cat: "japan", video: 0, limit: 2 });
  const world = useNewsFeed({ cat: "international", video: 0, limit: 2 });

  const loading = japan.loading || world.loading;
  const empty = !loading && (japan.data?.items.length ?? 0) + (world.data?.items.length ?? 0) === 0;

  return (
    <WidgetFrame icon={Newspaper} labelKey="news.home.headlines" accent="azure" viewAll viewAllHref="/news">
      {loading ? (
        <div className="flex flex-col gap-4" role="status" aria-label={t("news.hub.loadingMore")}>
          <CompactSkeleton />
          <CompactSkeleton />
          <CompactSkeleton />
        </div>
      ) : empty ? (
        <p className="text-xs text-sakura">{t("news.home.unavailable")}</p>
      ) : (
        <>
          <Group title={t("news.home.japan")} items={japan.data?.items ?? []} onOpen={setOpenItem} />
          <Group title={t("news.home.world")} items={world.data?.items ?? []} onOpen={setOpenItem} />
        </>
      )}
      <NewsModal item={openItem} onClose={() => setOpenItem(null)} />
    </WidgetFrame>
  );
}
