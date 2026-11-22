"use client";

import { useState } from "react";
import ViewAllButton from "@/components/ui/ViewAllButton";
import { MapPin } from "lucide-react";
import { EditorialLead, EditorialRow, hasPicture } from "@/components/news/EditorialNews";
import ScrollReveal from "@/components/home/cinematic/ScrollReveal";
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
export default function LatestNewsNearYou({ headingLevel = 2 }: { headingLevel?: 2 | 3 } = {}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
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

  // The lead is the first story that has a picture of its own (a big empty illustration is a poor front page); the rest keep their order.
  const leadAt = Math.max(0, items.findIndex(hasPicture));
  const lead = items[leadAt];
  const rest = items.filter((_, i) => i !== leadAt).slice(0, 4);

  return (
    <GlassCard className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
            <MapPin size={17} aria-hidden="true" />
          </div>
          <div>
            <Heading className="text-sm font-semibold uppercase tracking-wide text-foreground/90">{t("news.home.title")}</Heading>
            <p className="text-xs text-muted">{t("news.home.subtitle")}</p>
          </div>
        </div>
        <ViewAllButton href="/news" label={t("news.home.viewAll")} />
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
        <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
          <ScrollReveal from="image">
            <EditorialLead item={lead} onOpen={setOpenItem} showLevel={!showingFallback} />
          </ScrollReveal>
          {/* The stories arrive one after another, each under a hairline. */}
          <ScrollReveal from="stagger" className="self-center">
            <ul className="grid">
              {rest.map((item, i) => (
                <li key={item.id} className="border-t border-white/10 py-4 first:border-t-0 first:pt-0 last:pb-0">
                  <EditorialRow item={item} index={i + 2} onOpen={setOpenItem} showLevel={!showingFallback} />
                </li>
              ))}
            </ul>
          </ScrollReveal>
        </div>
      )}

      <NewsModal item={openItem} onClose={() => setOpenItem(null)} />
    </GlassCard>
  );
}
