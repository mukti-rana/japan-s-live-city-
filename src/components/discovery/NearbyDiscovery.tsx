"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Compass, LocateFixed, MapPin } from "lucide-react";
import FeaturedPlace from "@/components/discovery/FeaturedPlace";
import PlaceTile from "@/components/discovery/PlaceTile";
import GlassCard from "@/components/ui/GlassCard";
import { useLazyJson } from "@/components/map/useMapData";
import { featuredOf, previewParams } from "@/lib/discovery/discovery";
import type { ExploreResult } from "@/lib/explore/types";
import { useExploreLocation, type ExploreLocation } from "@/lib/explore/useExploreLocation";
import { useLiveLocation } from "@/lib/geo/useLiveLocation";
import { known, localize, useTranslate } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { MAP_CITIES } from "@/lib/map/cities";
import { resolvePlace } from "@/lib/news/places";

const inJapan = (lat: number, lon: number) => lat >= 24 && lat <= 46 && lon >= 122 && lon <= 149;

function jstMonth(): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", month: "numeric" }).format(new Date()));
}

// Home's small taste of discovery: one featured place and two more near the
// visitor, then a clear way into the full Explore Japan page.
export default function NearbyDiscovery() {
  const tr = useTranslate();
  const { language } = useLanguage();
  const explore = useExploreLocation();
  const live = useLiveLocation();
  const [month] = useState(jstMonth);
  const [dayNumber] = useState(() => Math.floor((Date.now() + 9 * 3600_000) / 86_400_000));

  // A position the browser had already allowed for this site also counts.
  const loc: ExploreLocation | null = useMemo(() => {
    if (explore.location) return explore.location;
    if (live.status === "ready" && live.coords && inJapan(live.coords.lat, live.coords.lon)) {
      return {
        mode: "gps",
        lat: live.coords.lat,
        lon: live.coords.lon,
        accuracyKm: live.coords.accuracyKm,
        label: live.location?.area ?? live.location?.name ?? "your area",
        prefectureId: resolvePlace(live.location?.name)?.prefectureId ?? null,
      };
    }
    return null;
  }, [explore.location, live.status, live.coords, live.location]);

  const locating = explore.status === "locating" || live.status === "locating";
  const denied = explore.status === "denied" || live.status === "denied";
  const approximate = loc?.mode === "manual";

  const main = useLazyJson<ExploreResult>(loc ? `/api/explore?${previewParams({ lat: loc.lat, lon: loc.lon, language })}` : null);
  const items = useMemo(() => main.data?.items ?? [], [main.data]);
  const featured = useMemo(() => featuredOf(items, dayNumber), [items, dayNumber]);
  const more = items.filter((d) => d.id !== featured?.id).slice(0, 2);

  const useMyLocation = () => {
    explore.useMyLocation();
    if (live.status !== "ready") live.requestLocation();
  };

  return (
    <GlassCard className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-azure/25 to-neon-purple/25 text-[#c4b5fd]">
            <Compass size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight text-foreground sm:text-xl">{tr("Discover near you")}</h2>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
              {loc ? (
                <>
                  <span className="flex items-center gap-1">
                    <MapPin size={12} className="text-gold" aria-hidden="true" />
                    {known(loc.label, language)}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${loc.mode === "gps" ? "bg-mint/15 text-mint" : "bg-gold/15 text-gold"}`}>
                    {loc.mode === "gps" ? tr("Your current location") : tr("Place you picked")}
                  </span>
                </>
              ) : (
                tr("The best places and things to do around you today.")
              )}
            </p>
          </div>
        </div>
        <Link href="/explore" className="flex min-h-10 items-center gap-1.5 rounded-full border border-azure/40 bg-azure/10 px-4 text-sm font-semibold text-azure transition-colors hover:bg-azure/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
          {tr("Explore all Japan")}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {!loc ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-glass-border bg-glass-bg-strong/40 p-3.5">
          <div>
            <p className="text-sm font-semibold text-foreground">{tr("Where are you?")}</p>
            <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-muted">
              {tr("Share your location to see what's around you — your browser will ask for permission, and your position is only used to find places and weather near you. Or choose a city.")}
            </p>
            {denied && <p role="status" className="mt-1.5 text-xs text-gold">{tr("Location permission was declined. Pick a city instead.")}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={useMyLocation} disabled={locating} className="flex min-h-10 items-center gap-2 rounded-full bg-gradient-to-r from-azure to-neon-purple px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure disabled:opacity-60">
              <LocateFixed size={15} aria-hidden="true" />
              {locating ? tr("Finding your location…") : tr("Use my location")}
            </button>
            {MAP_CITIES.slice(0, 5).map((c) => (
              <button key={c.slug} type="button" onClick={() => explore.choosePlace("city", c.slug)} className="rounded-full border border-glass-border bg-glass-bg px-3 py-1.5 text-xs text-foreground/85 transition-colors hover:border-gold/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                {localize(c.name, c.nameJa, language)}
              </button>
            ))}
          </div>
        </div>
      ) : main.loading ? (
        <div className="h-72 animate-pulse rounded-2xl bg-glass-bg-strong" role="status" aria-busy="true" />
      ) : main.failed ? (
        <div role="alert" className="flex items-center gap-3 rounded-2xl border border-sakura/25 bg-sakura/5 p-4 text-sm text-foreground">
          {tr("Couldn't load places right now.")}
          <button type="button" onClick={main.retry} className="rounded-full bg-sakura/20 px-3 py-1 text-xs font-semibold text-sakura">
            {tr("Try again")}
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-glass-border p-5 text-center text-sm text-muted">{tr("No places found near here yet. Open Explore Japan to look further afield.")}</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          {featured && <FeaturedPlace place={featured} approximate={approximate} month={month} />}
          {more.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 xl:grid-cols-1">
              {more.map((p) => (
                <li key={p.id}>
                  <PlaceTile place={p} approximate={approximate} month={month} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Link href="/explore" className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-azure to-neon-purple px-5 text-sm font-semibold text-white shadow-[0_0_30px_-10px_rgba(124,92,255,0.9)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
        {loc ? tr("Discover more nearby") : tr("Explore Japan")}
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </GlassCard>
  );
}
