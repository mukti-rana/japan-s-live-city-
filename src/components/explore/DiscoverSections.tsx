"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CloudSun } from "lucide-react";
import ScrollReveal from "@/components/home/cinematic/ScrollReveal";
import { playfair } from "@/components/home/cinematic/fonts";
import "@/components/home/cinematic/cinematic.css";
import DestinationCard from "@/components/explore/DestinationCard";
import { X } from "@/components/explore/explore-text";
import EventCard from "@/components/events/EventCard";
import EventModal from "@/components/events/EventModal";
import { useLazyJson } from "@/components/map/useMapData";
import { scopeFor } from "@/lib/explore/filters";
import type { Section, WeatherKind } from "@/lib/explore/sections";
import type { Destination, ExploreResult } from "@/lib/explore/types";
import type { ExploreLocation } from "@/lib/explore/useExploreLocation";
import { useEventsFeed } from "@/lib/events/useEvents";
import type { EventView } from "@/lib/events/query";
import { translate, useInline, useTranslate } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { PREFECTURES } from "@/lib/news/places";
import type { WeatherSnapshot } from "@/lib/services/weather";

function weatherKind(icon: WeatherSnapshot["icon"]): WeatherKind {
  if (icon === "rain" || icon === "drizzle" || icon === "storm") return "rain";
  if (icon === "snow") return "snow";
  if (icon === "clear" || icon === "partly") return "clear";
  return "cloud";
}

const REASON_KEY = { rain: "todayRain", sunny: "todaySunny", cloudy: "todayCloudy", cold: "todayCold", evening: "todayEvening", default: "todayDefault" } as const;

// One magazine spread: a numbered serif title, then the first place as a large feature photograph with the next four beside it (four across on a
// wide screen), the rest in a row beneath. On a phone it is a row you swipe through. The cards arrive one after another as it scrolls into view.
function Spread({ n, title, note, items: all, approximate }: { n: number; title: string; note?: string; items: Destination[]; approximate: boolean }) {
  if (all.length === 0) return null;
  // Whole rows only on a wide screen: the feature and four beside it, then rows of four (a short last row would leave a hole).
  const items = all.length > 5 ? all.slice(0, 5 + Math.floor((all.length - 5) / 4) * 4) : all;
  return (
    <section aria-label={title} className={`${playfair.variable} flex flex-col gap-4`}>
      <ScrollReveal className="flex items-end gap-4">
        <span aria-hidden="true" className="font-[family-name:var(--font-home-serif)] text-[clamp(40px,5vw,72px)] font-normal leading-none text-foreground/15 tabular-nums">{String(n).padStart(2, "0")}</span>
        <div className="min-w-0 pb-1">
          <h2 className="font-[family-name:var(--font-home-serif)] text-[clamp(24px,3vw,40px)] font-normal leading-[1.05] tracking-[-0.015em] text-foreground">{title}</h2>
          {note && <p className="mt-1 max-w-[64ch] text-sm text-muted">{note}</p>}
        </div>
      </ScrollReveal>
      <ScrollReveal from="stagger">
        <ul className="-mx-3 grid snap-x grid-flow-col auto-cols-[17rem] gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:thin] sm:mx-0 sm:px-0 lg:auto-cols-auto lg:grid-flow-row lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:pb-0">
          {items.map((p, i) => (
            <li key={p.id} className={`snap-start ${i === 0 ? "lg:col-span-2 lg:row-span-2" : ""}`}>
              <DestinationCard place={p} approximateDistance={approximate} variant={i === 0 ? "feature" : "landscape"} />
            </li>
          ))}
        </ul>
      </ScrollReveal>
    </section>
  );
}

// The curated rows of the landing view: what to do today, places by distance,
// hidden gems, events, and what suits the season. No place appears twice.
export default function DiscoverSections({ origin }: { origin: ExploreLocation | null }) {
  const x = useInline(X);
  const tr = useTranslate();
  const { language } = useLanguage();
  const scope = scopeFor(origin);
  const approximate = origin?.mode === "manual";
  const [openEvent, setOpenEvent] = useState<EventView | null>(null);

  const wx = useLazyJson<WeatherSnapshot>(origin ? `/api/weather/live?lat=${origin.lat.toFixed(2)}&lon=${origin.lon.toFixed(2)}` : null);
  const weatherWord = wx.data ? weatherKind(wx.data.icon) : null;

  const url = useMemo(() => {
    if (origin && wx.loading) return null;
    const p = new URLSearchParams({ scope, lang: language });
    if (origin) {
      p.set("lat", String(origin.lat));
      p.set("lon", String(origin.lon));
      if (origin.accuracyKm !== null && origin.mode === "gps") p.set("acc", String(origin.accuracyKm));
      if (origin.prefectureId) p.set("pref", origin.prefectureId);
    }
    if (weatherWord) p.set("wx", weatherWord);
    if (wx.data) p.set("temp", String(wx.data.tempC));
    return `/api/explore/sections?${p.toString()}`;
  }, [scope, origin, wx.loading, wx.data, weatherWord, language]);
  const sections = useLazyJson<{ sections: Section[] }>(url);

  // Three more themed rows from the same catalogue (real places, most widely written-about first), kept to where the visitor is looking.
  const themeBase = useMemo(() => {
    const p = new URLSearchParams({ lang: language, sort: "popular", limit: "9" });
    if (scope === "near" && origin) {
      p.set("lat", String(origin.lat));
      p.set("lon", String(origin.lon));
      p.set("radius", "150");
    } else if (scope === "pref" && origin?.prefectureId) p.set("pref", origin.prefectureId);
    return p.toString();
  }, [scope, origin, language]);
  const featuredFeed = useLazyJson<ExploreResult>(`/api/explore?${themeBase}&heritage=1`);
  const natureFeed = useLazyJson<ExploreResult>(`/api/explore?${themeBase}&cats=park,waterfall,lake,gorge,mountain,beach,island`);
  const cultureFeed = useLazyJson<ExploreResult>(`/api/explore?${themeBase}&cats=shrine,temple,castle,museum,onsen`);

  const eventPlace = origin?.prefectureId ? (PREFECTURES.find((p) => p.id === origin.prefectureId)?.en ?? null) : null;
  const events = useEventsFeed(origin ? (eventPlace ? { near: eventPlace, limit: 3 } : null) : { limit: 3 });

  const list = sections.data?.sections ?? [];
  const seen = new Set<string>();
  const takeFeed = (feed: ExploreResult | null | undefined, n = 9): Destination[] => {
    const out = (feed?.items ?? []).filter((d) => !seen.has(d.id)).slice(0, n);
    out.forEach((d) => seen.add(d.id));
    return out;
  };
  const take = (id: string, n = 9): Destination[] => {
    const s = list.find((r) => r.id === id);
    const out = (s?.items ?? []).filter((d) => !seen.has(d.id)).slice(0, n);
    out.forEach((d) => seen.add(d.id));
    return out;
  };
  const featured = takeFeed(featuredFeed.data);
  const today = list.find((s) => s.id === "today");
  const todayItems = take("today");
  const near = scope !== "all";
  const rowIds = near ? ["within5", "within10", "popularNear", "popularPref", "weekend", "oneday"] : ["popularAll"];
  const titleOf = (id: string) => x(`s_${id}` as keyof typeof X);
  const rows = rowIds.map((id) => ({ id, items: take(id) }));
  const hiddenId = near ? (scope === "pref" ? "hiddenPref" : "hiddenNear") : "hiddenAll";
  const hiddenItems = take(hiddenId);
  const seasonal = take("seasonal");
  const nature = takeFeed(natureFeed.data);
  const culture = takeFeed(cultureFeed.data);
  let n = 0;

  return (
    <div className="flex flex-col gap-8">
      {sections.loading && <p role="status" className="text-sm text-muted">{x("loading")}</p>}
      {sections.failed && (
        <div role="alert" className="flex items-center gap-3 rounded-2xl border border-sakura/25 bg-sakura/5 p-4 text-sm text-foreground">
          {x("failed")}
          <button type="button" onClick={sections.retry} className="rounded-full bg-sakura/20 px-3 py-1 text-xs font-semibold text-sakura">
            {x("retry")}
          </button>
        </div>
      )}

      <Spread n={++n} title={tr("Featured destinations")} note={tr("The best-known places, by how widely they are written about.")} items={featured} approximate={approximate} />

      {today && todayItems.length > 0 && (
        <ScrollReveal><section aria-label={x("today")} className="rounded-3xl border border-azure/25 bg-gradient-to-br from-azure/10 via-transparent to-neon-purple/10 p-4 sm:p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-azure/15 text-azure">
              <CloudSun size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{x("today")}</h2>
              <p className="text-xs text-foreground/80">
                {x(REASON_KEY[(today.reason as keyof typeof REASON_KEY) in REASON_KEY ? (today.reason as keyof typeof REASON_KEY) : "default"])}
                {wx.data ? ` · ${wx.data.tempC}°C ${translate(wx.data.condition, language)}` : ""} {x("todayNote")}
              </p>
            </div>
          </div>
          <ul className="-mx-3 mt-4 flex snap-x scroll-pl-3 gap-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0 [scrollbar-width:thin]">
            {todayItems.map((p) => (
              <li key={p.id} className="w-[17rem] shrink-0 snap-start sm:w-[18.5rem]">
                <DestinationCard place={p} approximateDistance={approximate} compact />
              </li>
            ))}
          </ul>
        </section></ScrollReveal>
      )}

      {rows.slice(0, 3).map((r) => (
        <Spread key={r.id} n={r.items.length ? ++n : n} title={titleOf(r.id)} items={r.items} approximate={approximate} />
      ))}

      <section aria-label={tr("Events near me")} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sakura/15 text-sakura">
              <CalendarDays size={16} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{origin ? tr("Events near me") : tr("Upcoming events in Japan")}</h2>
              <p className="text-xs text-muted">{tr("Festivals, fireworks and seasonal events — with dates and official sources.")}</p>
            </div>
          </div>
          <Link href={origin ? "/events?near=1" : "/events"} className="text-xs font-medium text-azure hover:underline">
            {tr("See all events")}
          </Link>
        </div>
        {events.loading ? (
          <div className="h-20 animate-pulse rounded-2xl bg-glass-bg-strong" role="status" />
        ) : events.failed || !events.data || events.data.items.length === 0 ? (
          <p className="text-xs text-muted">{tr("No upcoming events found near this place.")}</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-3">
            {events.data.items.map((event) => (
              <li key={event.id} className="rounded-2xl border border-glass-border bg-glass-bg p-3">
                <EventCard event={event} variant="compact" onOpen={setOpenEvent} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Spread n={hiddenItems.length ? ++n : n} title={titleOf(hiddenId)} note={tr("Less-visited places: they have a photo and a description but few international write-ups.")} items={hiddenItems} approximate={approximate} />

      <Spread n={nature.length ? ++n : n} title={tr("Nature and landscapes")} note={tr("Parks, waterfalls, lakes, gorges, mountains and coasts.")} items={nature} approximate={approximate} />

      <Spread n={culture.length ? ++n : n} title={tr("Japanese culture and experiences")} note={tr("Shrines, temples, castles, museums and hot springs.")} items={culture} approximate={approximate} />

      {rows.slice(3).map((r) => (
        <Spread key={r.id} n={r.items.length ? ++n : n} title={titleOf(r.id)} items={r.items} approximate={approximate} note={r.id === "weekend" ? x("weekendNote") : undefined} />
      ))}
      <Spread n={seasonal.length ? ++n : n} title={titleOf("seasonal")} note={x("explainSeason")} items={seasonal} approximate={approximate} />
      <EventModal event={openEvent} onClose={() => setOpenEvent(null)} />
    </div>
  );
}
