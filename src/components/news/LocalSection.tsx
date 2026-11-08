"use client";

import { ArrowRight, LocateFixed, MapPin } from "lucide-react";
import NewsCard from "@/components/news/NewsCard";
import PlacePicker from "@/components/news/PlacePicker";
import { CardSkeleton } from "@/components/news/NewsSkeleton";
import { useLiveLocation } from "@/lib/geo/useLiveLocation";
import type { NewsItem } from "@/lib/news/query";
import { useNewsFeed, type NewsPlace } from "@/lib/news/useNews";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTranslate } from "@/lib/i18n/inline";

// A short, personal row at the top: the latest stories that name the
// visitor's own city or prefecture. The place is the one they picked, or the
// city their browser has already shared — it is never requested silently.
export default function LocalSection({ placeInfo, onOpen, onSeeAll }: { placeInfo: NewsPlace; onOpen: (item: NewsItem) => void; onSeeAll: () => void }) {
  const { t } = useLanguage();
  const tr = useTranslate();
  const live = useLiveLocation();
  const local = useNewsFeed(placeInfo.place ? { cat: "local", place: placeInfo.place, video: 0, limit: 3 } : null);
  const items = local.data?.items ?? [];
  const loading = placeInfo.locating || (Boolean(placeInfo.place) && local.loading);

  return (
    <section aria-label={tr("Latest near you")} className="flex flex-col gap-3.5 rounded-3xl border border-glass-border bg-glass-bg p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
            <MapPin size={17} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold leading-tight text-foreground">{tr("Latest near you")}</h2>
            <p className="text-xs text-muted">{t("news.home.subtitle")}</p>
          </div>
        </div>
        {placeInfo.place && (
          <button type="button" onClick={onSeeAll} className="flex min-h-9 items-center gap-1.5 rounded-full border border-azure/40 bg-azure/10 px-4 text-xs font-semibold text-azure transition-colors hover:bg-azure/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            {tr("See all local news")}
            <ArrowRight size={13} aria-hidden="true" />
          </button>
        )}
      </div>

      <PlacePicker current={placeInfo} compact />

      {!placeInfo.place && !placeInfo.locating && live.status === "prompt" && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={live.requestLocation} className="flex min-h-9 items-center gap-2 rounded-full bg-gradient-to-r from-azure to-neon-purple px-4 text-xs font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            <LocateFixed size={14} aria-hidden="true" />
            {tr("Use my location")}
          </button>
          <p className="max-w-md text-[11px] text-muted">{tr("Your browser will ask for permission. Your position is only used to find your city.")}</p>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3" role="status" aria-label={t("news.hub.loadingMore")}>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : !placeInfo.place ? null : local.failed ? (
        <p className="text-xs text-sakura">{t("news.home.unavailable")}</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-glass-border p-4 text-center text-xs text-muted">{t("news.home.empty")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((item) => (
            <NewsCard key={item.id} item={item} variant="card" onOpen={onOpen} showLevel />
          ))}
        </div>
      )}
    </section>
  );
}
