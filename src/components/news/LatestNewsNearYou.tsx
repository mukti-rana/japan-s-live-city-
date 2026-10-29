"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import NewsCard from "@/components/news/NewsCard";
import NewsModal from "@/components/news/NewsModal";
import PlacePicker from "@/components/news/PlacePicker";
import { CardSkeleton, CompactSkeleton } from "@/components/news/NewsSkeleton";
import GlassCard from "@/components/ui/GlassCard";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useNewsFeed, useNewsPlace } from "@/lib/news/useNews";
import type { NewsItem } from "@/lib/news/query";

// The Home section. It reads the same /api/news endpoint, with the same
// place logic, as the News tab's "Local News Near You" — so the two always
// agree. Only the city name is used, from a city the visitor picked or the
// location the browser already shared; it is never asked for again here.
export default function LatestNewsNearYou() {
  const { t } = useLanguage();
  const placeInfo = useNewsPlace();
  const [openItem, setOpenItem] = useState<NewsItem | null>(null);

  const local = useNewsFeed(placeInfo.place ? { cat: "local", place: placeInfo.place, video: 0, limit: 6 } : null);
  const localEmpty = Boolean(local.data && local.data.items.length === 0);

  // When there is no place yet, or nothing local to show, fall back to Japan
  // headlines — labelled as such, never passed off as local.
  const needsFallback = (!placeInfo.place && !placeInfo.locating) || localEmpty;
  const fallback = useNewsFeed(needsFallback ? { cat: "japan", video: 0, limit: 6 } : null);

  const items = (localEmpty || !placeInfo.place ? fallback.data?.items : local.data?.items) ?? [];
  const showingFallback = needsFallback;
  const loading = placeInfo.locating || (placeInfo.place ? local.loading || (localEmpty && fallback.loading) : fallback.loading);
  const failed = placeInfo.place ? local.failed : fallback.failed;

  const [lead, ...others] = items;
  const compact = others.slice(0, 4);

  return (
    <GlassCard className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
            <MapPin size={17} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/90">{t("news.home.title")}</h2>
            <p className="text-xs text-muted">{t("news.home.subtitle")}</p>
          </div>
        </div>
        <Link
          href="/news?cat=local"
          className="flex items-center gap-1 text-[11px] font-medium text-muted transition-colors hover:text-azure focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
        >
          {t("news.home.viewAll")}
          <ArrowRight size={12} aria-hidden="true" />
        </Link>
      </div>

      {(placeInfo.place || (!placeInfo.locating && !placeInfo.place)) && <PlacePicker current={placeInfo} compact />}

      {localEmpty && placeInfo.place && <p className="text-xs text-muted">{t("news.home.empty")}</p>}
      {showingFallback && !localEmpty && !loading && (
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{t("news.home.japan")}</p>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-[1.1fr_1fr]" role="status" aria-label={t("news.hub.loadingMore")}>
          <CardSkeleton />
          <div className="flex flex-col gap-4">
            <CompactSkeleton />
            <CompactSkeleton />
            <CompactSkeleton />
          </div>
        </div>
      ) : failed || !lead ? (
        <p className="rounded-xl border border-dashed border-glass-border p-5 text-center text-xs text-muted">{t("news.home.unavailable")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
          <NewsCard item={lead} variant="card" onOpen={setOpenItem} showLevel={!showingFallback} />
          <ul className="flex flex-col gap-3.5">
            {compact.map((item) => (
              <li key={item.id} className="border-b border-glass-border pb-3.5 last:border-0 last:pb-0">
                <NewsCard item={item} variant="compact" onOpen={setOpenItem} showLevel={!showingFallback} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <NewsModal item={openItem} onClose={() => setOpenItem(null)} />
    </GlassCard>
  );
}
