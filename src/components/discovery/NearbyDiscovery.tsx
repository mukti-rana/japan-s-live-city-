"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronDown, CloudSun, Compass, LayoutGrid, LocateFixed, Map as MapIcon, MapPin, Sparkles } from "lucide-react";
import FeaturedPlace from "@/components/discovery/FeaturedPlace";
import DiscoveryMap from "@/components/discovery/DiscoveryMapLoader";
import PlaceTile from "@/components/discovery/PlaceTile";
import EventCard from "@/components/events/EventCard";
import EventModal from "@/components/events/EventModal";
import GlassCard from "@/components/ui/GlassCard";
import { useLazyJson } from "@/components/map/useMapData";
import { DISCOVERY_CATEGORIES, RADII, discoveryParams, featuredOf, useDiscoveryPrefs, type DiscoverySort } from "@/lib/discovery/discovery";
import type { Section, WeatherKind } from "@/lib/explore/sections";
import type { ExploreResult } from "@/lib/explore/types";
import { useExploreLocation, type ExploreLocation } from "@/lib/explore/useExploreLocation";
import { useLiveLocation } from "@/lib/geo/useLiveLocation";
import { useEventsFeed } from "@/lib/events/useEvents";
import type { EventView } from "@/lib/events/query";
import { known, localize, useTranslate } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { MAP_CITIES } from "@/lib/map/cities";
import { PREFECTURES, resolvePlace } from "@/lib/news/places";
import type { WeatherSnapshot } from "@/lib/services/weather";

const REASON_TEXT: Record<string, string> = {
  rain: "It's raining, so these are mostly indoor places.",
  sunny: "It's sunny — good for outdoor places and views.",
  cloudy: "A mild, cloudy day — outdoor places should be comfortable.",
  cold: "It's cold, so hot springs, snow and indoor places come first.",
  evening: "It's evening — views, hot springs and markets.",
  default: "A mix of well-regarded places.",
};

function weatherKind(icon: WeatherSnapshot["icon"]): WeatherKind {
  if (icon === "rain" || icon === "drizzle" || icon === "storm") return "rain";
  if (icon === "snow") return "snow";
  if (icon === "clear" || icon === "partly") return "clear";
  return "cloud";
}

const inJapan = (lat: number, lon: number) => lat >= 24 && lat <= 46 && lon >= 122 && lon <= 149;

function jstMonth(): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", month: "numeric" }).format(new Date()));
}

function Heading({ icon: Icon, title, note }: { icon: typeof Sparkles; title: string; note?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-azure/15 text-azure">
        <Icon size={16} aria-hidden="true" />
      </span>
      <div>
        <h3 className="text-base font-semibold text-foreground sm:text-lg">{title}</h3>
        {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-busy="true">
      <div className="h-72 animate-pulse rounded-2xl bg-glass-bg-strong" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-2xl bg-glass-bg-strong" />
        ))}
      </div>
    </div>
  );
}

// Home's personalised discovery: places and things to do around the visitor,
// from the open-data catalogue behind the Explore page. The position comes
// from the device only after the visitor presses "Use my location" (or had
// already allowed it for this site); otherwise from a city they pick.
export default function NearbyDiscovery() {
  const tr = useTranslate();
  const { language } = useLanguage();
  const explore = useExploreLocation();
  const live = useLiveLocation();
  const { prefs, update } = useDiscoveryPrefs();
  const [picking, setPicking] = useState(false);
  const [view, setView] = useState<"list" | "map">("list");
  const [openEvent, setOpenEvent] = useState<EventView | null>(null);

  // The place being explored: a city the visitor picked or a fresh device
  // position (Explore's own store), else a position the browser had already
  // allowed for this site.
  const outsideJapan = Boolean(live.coords && !inJapan(live.coords.lat, live.coords.lon)) || explore.status === "outside";
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
  const month = jstMonth();

  // Weather at that place — the same coarse word the Explore page uses.
  const wx = useLazyJson<WeatherSnapshot>(loc ? `/api/weather/live?lat=${loc.lat.toFixed(2)}&lon=${loc.lon.toFixed(2)}` : null);
  const weatherWord = wx.data ? weatherKind(wx.data.icon) : null;

  const mainUrl = loc ? `/api/explore?${discoveryParams({ lat: loc.lat, lon: loc.lon, prefs, language, limit: 14 })}` : null;
  const main = useLazyJson<ExploreResult>(mainUrl);

  const sectionsUrl = useMemo(() => {
    if (!loc || wx.loading) return null;
    const p = new URLSearchParams({ scope: "near", lang: language, lat: String(loc.lat), lon: String(loc.lon) });
    if (loc.accuracyKm !== null && loc.mode === "gps") p.set("acc", String(loc.accuracyKm));
    if (loc.prefectureId) p.set("pref", loc.prefectureId);
    if (weatherWord) p.set("wx", weatherWord);
    if (wx.data) p.set("temp", String(wx.data.tempC));
    return `/api/explore/sections?${p.toString()}`;
  }, [loc, wx.loading, wx.data, weatherWord, language]);
  const sections = useLazyJson<{ sections: Section[] }>(sectionsUrl);

  // Events: the feed takes a place name, so use the prefecture's.
  const eventPlace = loc?.prefectureId ? (PREFECTURES.find((p) => p.id === loc.prefectureId)?.en ?? null) : null;
  const events = useEventsFeed(eventPlace ? { near: eventPlace, limit: 3 } : null);

  const items = useMemo(() => main.data?.items ?? [], [main.data]);
  // A different featured place each day; nothing appears twice on the card.
  const [dayNumber] = useState(() => Math.floor((Date.now() + 9 * 3600_000) / 86_400_000));
  const featured = useMemo(() => featuredOf(items, dayNumber), [items, dayNumber]);
  const seen = new Set<string>(featured ? [featured.id] : []);
  const fresh = <T extends { id: string }>(list: T[], n: number): T[] => {
    const out = list.filter((d) => !seen.has(d.id)).slice(0, n);
    out.forEach((d) => seen.add(d.id));
    return out;
  };
  const gridItems = fresh(items, 6);
  const today = sections.data?.sections.find((s) => s.id === "today");
  const withinRadius = <T extends { distanceKm: number | null }>(list: T[]) => list.filter((d) => d.distanceKm === null || d.distanceKm <= prefs.radius);
  const todayItems = today ? fresh(withinRadius(today.items), 6) : [];
  const hidden = sections.data?.sections.find((s) => s.id === "hiddenNear");
  const hiddenItems = hidden ? fresh(withinRadius(hidden.items), 4) : [];
  const mapPlaces = [...(featured ? [featured] : []), ...gridItems].slice(0, 9);

  const useMyLocation = () => {
    explore.useMyLocation();
    if (live.status !== "ready") live.requestLocation();
  };

  const toggleCategory = (id: string) => update({ cats: prefs.cats.includes(id) ? prefs.cats.filter((c) => c !== id) : [...prefs.cats, id] });

  const sortOptions: { id: DiscoverySort; label: string }[] = [
    { id: "recommended", label: "Recommended" },
    { id: "nearest", label: "Nearest" },
    { id: "popular", label: "Popular" },
  ];

  return (
    <GlassCard className="flex flex-col gap-5 p-4 sm:p-5">
      {/* Title and the way into the full directory */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-azure/25 to-neon-purple/25 text-[#c4b5fd]">
            <Compass size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight text-foreground sm:text-xl">{tr("Discover near you")}</h2>
            <p className="text-xs text-muted">{tr("The best places and things to do around you today.")}</p>
          </div>
        </div>
        <Link href="/explore" className="flex min-h-10 items-center gap-1.5 rounded-full border border-azure/40 bg-azure/10 px-4 text-sm font-semibold text-azure transition-colors hover:bg-azure/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
          <Compass size={15} aria-hidden="true" />
          {tr("Explore all Japan")}
        </Link>
      </div>

      {/* Where from — and whether that is the visitor's real position or a pick */}
      <section aria-label={tr("Location")} className="rounded-2xl border border-glass-border bg-glass-bg-strong/40 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {loc ? (
              <>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-foreground">
                  <span className="flex min-w-0 items-center gap-2">
                    <MapPin size={16} className="shrink-0 text-gold" aria-hidden="true" />
                    <span className="break-words">{known(loc.label, language)}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${loc.mode === "gps" ? "bg-mint/15 text-mint" : "bg-gold/15 text-gold"}`}>
                    {loc.mode === "gps" ? tr("Your current location") : tr("Place you picked")}
                  </span>
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  {loc.mode === "gps"
                    ? `${tr("Distances are measured from where you are.")}${loc.accuracyKm !== null ? ` ${tr("accuracy about")} ${loc.accuracyKm} km.` : ""}`
                    : tr("A place you chose — distances are measured from its centre, so they are approximate")}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-foreground">{tr("Where are you?")}</p>
                <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-muted">
                  {tr("Share your location to see what's around you — your browser will ask for permission, and your position is only used to find places and weather near you. Or choose a city.")}
                </p>
              </>
            )}
            {denied && !loc && <p role="status" className="mt-1.5 text-xs text-gold">{tr("Location permission was declined. Pick a city instead.")}</p>}
            {outsideJapan && !loc && <p role="status" className="mt-1.5 text-xs text-gold">{tr("You appear to be outside Japan. Pick a Japanese city to explore from.")}</p>}
            {explore.status === "unavailable" && !loc && <p role="status" className="mt-1.5 text-xs text-gold">{tr("Your location couldn't be determined. Pick a city instead.")}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="flex min-h-10 items-center gap-2 rounded-full bg-gradient-to-r from-azure to-neon-purple px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure disabled:opacity-60"
            >
              <LocateFixed size={15} aria-hidden="true" />
              {locating ? tr("Finding your location…") : loc?.mode === "gps" ? tr("Update location") : tr("Use my location")}
            </button>
            <button
              type="button"
              onClick={() => setPicking((p) => !p)}
              aria-expanded={picking}
              className="flex min-h-10 items-center gap-1.5 rounded-full border border-glass-border px-4 text-sm font-medium text-foreground/90 transition-colors hover:border-azure/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
            >
              {loc ? tr("Change location") : tr("Choose a city or prefecture")}
              <ChevronDown size={14} aria-hidden="true" className={picking ? "rotate-180" : ""} />
            </button>
          </div>
        </div>
        {(picking || !loc) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-glass-border pt-3">
            {MAP_CITIES.slice(0, 8).map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => {
                  explore.choosePlace("city", c.slug);
                  setPicking(false);
                }}
                className="rounded-full border border-glass-border bg-glass-bg px-3 py-1.5 text-xs text-foreground/85 transition-colors hover:border-gold/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
              >
                {localize(c.name, c.nameJa, language)}
              </button>
            ))}
            <select
              aria-label={tr("Prefecture")}
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                explore.choosePlace("prefecture", e.target.value);
                setPicking(false);
              }}
              className="rounded-full border border-glass-border bg-panel px-3 py-1.5 text-xs text-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
            >
              <option value="">{tr("Prefecture")}…</option>
              {PREFECTURES.map((p) => (
                <option key={p.id} value={p.id}>
                  {localize(p.en, p.ja, language)}
                </option>
              ))}
            </select>
            {explore.location && (
              <button type="button" onClick={explore.clear} className="ml-auto text-xs text-muted underline-offset-2 hover:text-foreground hover:underline">
                {tr("Clear my choice")}
              </button>
            )}
          </div>
        )}
      </section>

      {loc && (
        <>
          {/* Personal controls */}
          <div className="flex flex-col gap-3">
            <div role="group" aria-label={tr("Categories")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
              <button
                type="button"
                aria-pressed={prefs.cats.length === 0}
                onClick={() => update({ cats: [] })}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${prefs.cats.length === 0 ? "border-azure/50 bg-azure/20 text-foreground" : "border-glass-border text-foreground/75 hover:border-azure/40"}`}
              >
                {tr("All")}
              </button>
              {DISCOVERY_CATEGORIES.map((c) => {
                const on = prefs.cats.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleCategory(c.id)}
                    className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${on ? "border-neon-purple/60 bg-neon-purple/20 text-foreground" : "border-glass-border text-foreground/75 hover:border-azure/40"}`}
                  >
                    {tr(c.label)}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-foreground/80">
              <label className="flex items-center gap-2">
                {tr("Distance")}
                <select value={prefs.radius} onChange={(e) => update({ radius: Number(e.target.value) })} className="rounded-full border border-glass-border bg-panel px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                  {RADII.map((r) => (
                    <option key={r} value={r}>
                      {tr("Within {n} km").replace("{n}", String(r))}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                {tr("Sort by")}
                <select value={prefs.sort} onChange={(e) => update({ sort: e.target.value as DiscoverySort })} className="rounded-full border border-glass-border bg-panel px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                  {sortOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {tr(o.label)}
                    </option>
                  ))}
                </select>
              </label>
              <div role="group" aria-label={tr("View")} className="ml-auto inline-flex rounded-full border border-glass-border bg-glass-bg p-0.5">
                {([["list", LayoutGrid, "List"], ["map", MapIcon, "Map"]] as const).map(([id, Icon, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={view === id}
                    onClick={() => setView(id)}
                    className={`flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${view === id ? "bg-azure/25 text-foreground" : "text-muted hover:text-foreground"}`}
                  >
                    <Icon size={13} aria-hidden="true" />
                    {tr(label)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {main.loading ? (
            <Skeleton />
          ) : main.failed ? (
            <div role="alert" className="flex items-center gap-3 rounded-2xl border border-sakura/25 bg-sakura/5 p-4 text-sm text-foreground">
              {tr("Couldn't load places right now.")}
              <button type="button" onClick={main.retry} className="rounded-full bg-sakura/20 px-3 py-1 text-xs font-semibold text-sakura">
                {tr("Try again")}
              </button>
            </div>
          ) : items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-glass-border p-6 text-center text-sm text-muted">
              {tr("No places match these filters within {n} km. Try a wider distance or fewer categories.").replace("{n}", String(prefs.radius))}
            </p>
          ) : (
            <>
              {featured && <FeaturedPlace place={featured} approximate={approximate} month={month} />}

              <div className="flex flex-col gap-3">
                <Heading icon={Sparkles} title={tr("More ideas around you")} note={view === "map" ? tr("Places on the map") : undefined} />
                {view === "map" ? (
                  <DiscoveryMap origin={{ lat: loc.lat, lon: loc.lon }} places={mapPlaces} />
                ) : (
                  <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                    {gridItems.map((p) => (
                      <li key={p.id}>
                        <PlaceTile place={p} approximate={approximate} month={month} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {/* What suits right now */}
          {todayItems.length > 0 && today && (
            <section aria-label={tr("What can I do today?")} className="flex flex-col gap-3 rounded-2xl border border-azure/25 bg-gradient-to-br from-azure/10 via-transparent to-neon-purple/10 p-3.5 sm:p-4">
              <Heading
                icon={CloudSun}
                title={tr("What can I do today?")}
                note={`${tr(REASON_TEXT[today.reason && today.reason in REASON_TEXT ? today.reason : "default"])}${wx.data ? ` · ${wx.data.tempC}°C ${tr(wx.data.condition)}` : ""}`}
              />
              <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
                {todayItems.map((p) => (
                  <li key={p.id} className="w-56 shrink-0 snap-start sm:w-60">
                    <PlaceTile place={p} approximate={approximate} month={month} showWhy={false} />
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-muted">{tr("Opening hours aren't in our data, so check before you go.")}</p>
            </section>
          )}

          {/* Events happening soon, from the Events service (expired ones are never shown) */}
          {eventPlace && (
            <section aria-label={tr("Upcoming events nearby")} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Heading icon={CalendarDays} title={tr("Upcoming events nearby")} note={tr("Festivals, fireworks and seasonal events — with dates and official sources.")} />
                <Link href={`/events?near=1`} className="text-xs font-medium text-azure hover:underline">
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
          )}

          {/* Beyond the usual tourist stops */}
          {hiddenItems.length > 0 && (
            <section aria-label={tr("Hidden gems near you")} className="flex flex-col gap-3">
              <Heading icon={Sparkles} title={tr("Hidden gems near you")} note={tr("Less-visited places: they have a photo and a description but few international write-ups.")} />
              <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {hiddenItems.map((p) => (
                  <li key={p.id}>
                    <PlaceTile place={p} approximate={approximate} month={month} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="border-t border-glass-border pt-3 text-[11px] leading-relaxed text-muted">
            {tr("Places come from open data (Wikidata, Wikipedia and Wikimedia Commons). Distances are straight-line. Nothing here claims a place is open or an event is on unless the source says so.")}
          </p>
        </>
      )}

      {locating && !loc && <Skeleton />}
      <EventModal event={openEvent} onClose={() => setOpenEvent(null)} />
    </GlassCard>
  );
}
