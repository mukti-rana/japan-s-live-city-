"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AlertTriangle, CalendarDays, ChevronDown, Heart, MapPin, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import "@/components/home/cinematic/cinematic.css";
import SlideInHeading from "@/components/home/cinematic/SlideInHeading";
import { playfair } from "@/components/home/cinematic/fonts";
import EventCard from "@/components/events/EventCard";
import EventModal from "@/components/events/EventModal";
import PlacePicker from "@/components/news/PlacePicker";
import { CardSkeleton, FeaturedSkeleton } from "@/components/news/NewsSkeleton";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translationKeys";
import { PREFECTURES } from "@/lib/news/places";
import { useNewsPlace } from "@/lib/news/useNews";
import { toQueryString } from "@/lib/news/queryString";
import type { EventView, EventsResult } from "@/lib/events/query";
import {
  DEFAULT_EVENT_FILTERS,
  eventGridParams,
  eventPageQuery,
  KIND_CHIPS,
  RADII,
  WHEN_IDS,
  type EventFilters,
} from "@/lib/events/hubFilters";
import { formatUpdated, useEventsFeed, useSavedEvents } from "@/lib/events/useEvents";
import { known, localize, translate } from "@/lib/i18n/inline";

interface Loaded {
  key: string;
  pages: EventsResult[];
  failed?: boolean;
}

// Everything here is small and see-through: a hairline border and no fill, so the photograph behind shows through.
const chip =
  "shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60";
const chipOff = "border-white/20 bg-transparent text-white/75 hover:border-white/45 hover:text-white";
const field =
  "h-9 w-full rounded-full border border-white/20 bg-transparent px-3.5 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 [&>option]:bg-[#0b0b0c] [&>option]:text-white";

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[11px] font-medium text-white/60">
      {label}
      {children}
    </label>
  );
}

export default function EventsHub({
  initialFilters,
  initialResult,
}: {
  initialFilters: EventFilters;
  initialResult: EventsResult | null;
}) {
  const { t, language } = useLanguage();
  const placeInfo = useNewsPlace();
  const saved = useSavedEvents();
  const [filters, setFilters] = useState<EventFilters>(initialFilters);
  const [qInput, setQInput] = useState(initialFilters.q);
  const [cityInput, setCityInput] = useState(initialFilters.city);
  const [openEvent, setOpenEvent] = useState<EventView | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [openFilters, setOpenFilters] = useState(false);
  // The first line of the page: events near the visitor's city (or the one they chose), whatever the list below is showing.
  const nearRow = useEventsFeed(placeInfo.place ? { near: placeInfo.place, sort: "nearest", limit: 8 } : null);

  const initialKey = initialResult ? toQueryString(eventGridParams(initialFilters, null, [])) : null;
  const [loaded, setLoaded] = useState<Loaded | null>(initialResult && initialKey ? { key: initialKey, pages: [initialResult] } : null);
  const loadedKeyRef = useRef<string | null>(initialKey);

  const waitingForPlace = filters.near && !placeInfo.place;
  const savedKey = filters.saved ? saved.ids.join(",") : "";
  const baseParams = useMemo(
    () => eventGridParams(filters, placeInfo.place, savedKey ? savedKey.split(",") : []),
    [filters, placeInfo.place, savedKey],
  );
  const emptySaved = filters.saved && saved.ids.length === 0;
  const baseKey = waitingForPlace || emptySaved ? null : toQueryString(baseParams);

  // Typing in search or city settles for a moment before it filters.
  useEffect(() => {
    const id = setTimeout(() => {
      setFilters((f) => (f.q === qInput.trim() && f.city === cityInput.trim() ? f : { ...f, q: qInput.trim(), city: cityInput.trim() }));
    }, 400);
    return () => clearTimeout(id);
  }, [qInput, cityInput]);

  // Keep the address bar in step so a view can be shared or returned to.
  useEffect(() => {
    const qs = eventPageQuery(filters);
    window.history.replaceState(null, "", qs ? `/events?${qs}` : "/events");
  }, [filters]);

  useEffect(() => {
    if (baseKey === null || loadedKeyRef.current === baseKey) return;
    const controller = new AbortController();
    fetch(`/api/events?${baseKey}`, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<EventsResult>) : Promise.reject(new Error("failed"))))
      .then((result) => {
        loadedKeyRef.current = baseKey;
        setMoreFailed(false);
        setLoaded({ key: baseKey, pages: [result] });
      })
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name !== "AbortError") setLoaded({ key: baseKey, pages: [], failed: true });
      });
    return () => controller.abort();
  }, [baseKey, attempt]);

  const current = loaded && loaded.key === baseKey ? loaded : null;
  const loading = baseKey !== null && !current;
  const failed = Boolean(current?.failed);
  const pages = useMemo(() => current?.pages ?? [], [current]);
  const lastPage = pages[pages.length - 1];

  const items = useMemo(() => {
    const seen = new Set<string>();
    return pages.flatMap((p) => p.items).filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
  }, [pages]);

  const featured = !filters.ended && !filters.saved ? (items.slice(0, 8).find((i) => i.image) ?? null) : null;
  const rest = featured ? items.filter((i) => i.id !== featured.id) : items;

  const loadMore = useCallback(async () => {
    if (!lastPage?.nextOffset || loadingMore || baseKey === null) return;
    setLoadingMore(true);
    setMoreFailed(false);
    try {
      const res = await fetch(`/api/events?${toQueryString({ ...baseParams, offset: lastPage.nextOffset })}`);
      if (!res.ok) throw new Error("failed");
      const result = (await res.json()) as EventsResult;
      setLoaded((l) => (l && l.key === baseKey ? { ...l, pages: [...l.pages, result] } : l));
    } catch {
      setMoreFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }, [lastPage, loadingMore, baseKey, baseParams]);

  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMoreRef.current();
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [lastPage?.nextOffset]);

  const update = (patch: Partial<EventFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const clearAll = () => {
    setQInput("");
    setCityInput("");
    setFilters(DEFAULT_EVENT_FILTERS);
  };

  const prefLabel = (id: string) => {
    const p = PREFECTURES.find((x) => x.id === id);
    return p ? (localize(p.en, p.ja, language)) : id;
  };

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.near) chips.push({ key: "near", label: `${t("events.when.near")}${placeInfo.place ? `: ${known(placeInfo.place, language)}` : ""}`, clear: () => update({ near: false, radius: 0 }) });
  if (filters.when !== "all") chips.push({ key: "when", label: t(`events.when.${filters.when}` as TranslationKey), clear: () => update({ when: "all" }) });
  if (filters.date) chips.push({ key: "date", label: filters.date, clear: () => update({ date: "" }) });
  if (filters.kind) chips.push({ key: "kind", label: t(`events.kind.${filters.kind}` as TranslationKey), clear: () => update({ kind: "" }) });
  if (filters.free) chips.push({ key: "free", label: t("events.filter.free"), clear: () => update({ free: false }) });
  if (filters.family) chips.push({ key: "family", label: t("events.filter.family"), clear: () => update({ family: false }) });
  if (filters.pref) chips.push({ key: "pref", label: prefLabel(filters.pref), clear: () => update({ pref: "" }) });
  if (filters.city) chips.push({ key: "city", label: filters.city, clear: () => { setCityInput(""); update({ city: "" }); } });
  if (filters.q) chips.push({ key: "q", label: `“${filters.q}”`, clear: () => { setQInput(""); update({ q: "" }); } });
  if (filters.ended) chips.push({ key: "ended", label: t("events.filter.ended"), clear: () => update({ ended: false }) });
  if (filters.saved) chips.push({ key: "saved", label: t("events.filter.saved"), clear: () => update({ saved: false }) });

  const sources = lastPage?.sources ?? [];
  const okSources = sources.filter((s) => s.ok);

  const activeExtra = [filters.near, Boolean(filters.kind), filters.free, filters.family, Boolean(filters.pref), Boolean(filters.city), Boolean(filters.date), filters.ended, filters.saved, filters.sort !== "date"].filter(Boolean).length;
  const nearItems = nearRow.data?.items ?? [];
  const showNearRow = !filters.near;

  return (
    <div
      data-events-page
      className="keep-dark-ink relative isolate flex flex-col"
      style={{ color: "#fff", "--btn-ink": "#ffffff", "--btn-line": "rgba(255,255,255,0.34)", "--btn-line-hover": "rgba(255,255,255,0.7)" } as React.CSSProperties}
    >
      {/* The photograph is fixed behind the whole page, so it stays full screen as the page scrolls. */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 bg-black">
        <Image src="/images/event-nebuta.jpg" alt="" fill preload sizes="100vw" className="explore-kenburns object-cover [object-position:50%_45%]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,5,10,0.6)_0%,rgba(4,5,10,0.28)_35%,rgba(4,5,10,0.7)_80%,rgba(4,5,10,0.85)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,5,10,0.78)_0%,rgba(4,5,10,0.15)_62%,transparent_100%)]" />
      </div>

      {/* Hero: full screen, running up behind the (fully transparent) top bar. */}
      <header data-events-hero className={`${playfair.variable} relative -mx-3 -mt-3 flex min-h-[100svh] flex-col justify-end sm:-mx-4 sm:-mt-4`}>
        <div className="relative mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-5 pb-10 pt-24 sm:px-10 lg:px-14 lg:pb-14">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "rgba(255,255,255,0.78)" }}>{t("events.eyebrow")}</p>
            <h1 className="mt-3 font-[family-name:var(--font-home-serif)] text-[clamp(44px,6.6vw,96px)] font-normal leading-[1] tracking-[-0.02em] [text-shadow:0_2px_30px_rgba(0,0,0,0.6)]" style={{ color: "#fff" }}>
              <SlideInHeading en={t("events.title")} />
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: "rgba(255,255,255,0.88)" }}>{t("events.subtitle")}</p>
          </div>
          {/* Search: small and see-through. */}
          <div className="relative w-full max-w-sm">
            <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-white/60" aria-hidden="true" />
            <input
              type="search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder={t("events.search")}
              aria-label={t("events.search")}
              className="h-9 w-full rounded-full border border-white/25 bg-transparent pl-9 pr-4 text-base text-white outline-none placeholder:text-white/55 focus:border-white/60 focus-visible:ring-2 focus-visible:ring-white/40 sm:text-sm"
            />
          </div>
          {/* Where "near you" is measured from. */}
          <div className="flex flex-wrap items-center gap-2 text-white/80">
            <MapPin size={14} className="shrink-0" aria-hidden="true" />
            <PlacePicker current={placeInfo} compact />
          </div>
        </div>
      </header>

      {/* Below the hero the sections glide over the photograph, under a shade that deepens so they stay readable. */}
      <div className="-mx-3 bg-[linear-gradient(180deg,rgba(5,6,12,0)_0,rgba(5,6,12,0.72)_14rem)] px-3 pb-6 pt-10 sm:-mx-4 sm:px-4 sm:pt-14">
        <div className={`${playfair.variable} mx-auto flex w-full max-w-[1500px] flex-col gap-10 px-2 sm:gap-14 sm:px-6 lg:px-10`}>
          {/* The first line: events near you. */}
          {showNearRow && (
            <section aria-labelledby="near-title" className="flex flex-col gap-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 id="near-title" className="font-[family-name:var(--font-home-serif)] text-[clamp(26px,3.2vw,40px)] font-normal leading-tight tracking-[-0.015em] text-foreground">
                  {t("events.near.title")}
                  {placeInfo.place ? <span className="text-white/60"> · {known(placeInfo.place, language)}</span> : null}
                </h2>
                <p className="text-[11px] text-white/55">{t("events.near.measured")}</p>
              </div>
              {placeInfo.locating || (placeInfo.place && nearRow.loading) ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label={t("news.hub.loadingMore")}>
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              ) : !placeInfo.place ? (
                <p className="rounded-xl border border-dashed border-white/20 px-4 py-3 text-sm text-white/70">{translate("Choose a city above to see events near you.", language)}</p>
              ) : nearRow.failed || nearItems.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/20 px-4 py-3 text-sm text-white/70">{translate("No upcoming events found near you yet.", language)}</p>
              ) : (
                <ul className="-mx-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-3 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                  {nearItems.map((e) => (
                    <li key={e.id} className="flex w-[78vw] max-w-[22rem] shrink-0 snap-start flex-col sm:w-[20rem] [&>*]:flex-1">
                      <EventCard event={e} onOpen={setOpenEvent} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Then the whole of Japan, by default. */}
          <section aria-labelledby="japan-title" className="flex flex-col gap-4">
            <h2 id="japan-title" className="font-[family-name:var(--font-home-serif)] text-[clamp(26px,3.2vw,40px)] font-normal leading-tight tracking-[-0.015em] text-foreground">
              {filters.near ? t("events.near.title") : translate("Across Japan", language)}
            </h2>

            {/* The filters, minimised: the time chips in one small row, and everything else behind one small button. */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <div role="group" aria-label={translate("When", language)} className="-mx-3 flex snap-x scroll-pl-3 gap-1.5 overflow-x-auto px-3 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
                  {WHEN_IDS.map((w) => {
                    const on = filters.when === w && !filters.date;
                    return (
                      <button key={w} type="button" aria-pressed={on} onClick={() => update({ when: w, date: "" })} className={`${chip} snap-start ${on ? "border-white/65 bg-white/12 text-white" : chipOff}`}>
                        {t(`events.when.${w}` as TranslationKey)}
                      </button>
                    );
                  })}
                </div>
                <button type="button" aria-expanded={openFilters} aria-controls="events-filters" onClick={() => setOpenFilters((o) => !o)} className={`${chip} inline-flex items-center gap-1.5 ${openFilters || activeExtra > 0 ? "border-white/65 bg-white/12 text-white" : chipOff}`}>
                  <SlidersHorizontal size={12} aria-hidden="true" />
                  {translate("Filters", language)}
                  {activeExtra > 0 ? ` (${activeExtra})` : ""}
                  <ChevronDown size={12} aria-hidden="true" className={`transition-transform duration-300 motion-reduce:transition-none ${openFilters ? "rotate-180" : ""}`} />
                </button>
              </div>

              <div id="events-filters" aria-hidden={!openFilters} className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${openFilters ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className={`min-h-0 overflow-hidden ${openFilters ? "" : "pointer-events-none"}`}>
                  <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-transparent p-3 sm:p-4">
                    <div role="group" aria-label={translate("Categories", language)} className="flex flex-wrap gap-1.5">
                      <button type="button" aria-pressed={filters.near} disabled={!placeInfo.place} onClick={() => update({ near: !filters.near, sort: !filters.near ? "nearest" : "date" })} className={`${chip} ${filters.near ? "border-[#ffc26b]/70 bg-[#ffc26b]/15 text-[#ffd9a0]" : chipOff} disabled:cursor-not-allowed disabled:opacity-40`}>
                        {t("events.when.near")}
                      </button>
                      {KIND_CHIPS.map((k) => (
                        <button key={k.id} type="button" aria-pressed={filters.kind === k.id} onClick={() => update({ kind: filters.kind === k.id ? "" : k.id })} className={`${chip} ${filters.kind === k.id ? "border-[#b496ff]/70 bg-[#b496ff]/15 text-[#dccfff]" : chipOff}`}>
                          {t(`events.kind.${k.id}` as TranslationKey)}
                        </button>
                      ))}
                      <button type="button" aria-pressed={filters.free} onClick={() => update({ free: !filters.free })} className={`${chip} ${filters.free ? "border-[#4ade80]/70 bg-[#4ade80]/15 text-[#a6f0c0]" : chipOff}`}>
                        {t("events.filter.free")}
                      </button>
                      <button type="button" aria-pressed={filters.family} onClick={() => update({ family: !filters.family })} className={`${chip} ${filters.family ? "border-[#4ade80]/70 bg-[#4ade80]/15 text-[#a6f0c0]" : chipOff}`}>
                        {t("events.filter.family")}
                      </button>
                      <button type="button" aria-pressed={filters.saved} onClick={() => update({ saved: !filters.saved })} className={`${chip} ${filters.saved ? "border-[#ff7fb0]/70 bg-[#ff7fb0]/15 text-[#ffb8d2]" : chipOff}`}>
                        <Heart size={11} className="mr-1 inline" aria-hidden="true" />
                        {t("events.filter.saved")} ({saved.ids.length})
                      </button>
                      <button type="button" aria-pressed={filters.ended} onClick={() => update({ ended: !filters.ended })} className={`${chip} ${filters.ended ? "border-white/65 bg-white/12 text-white" : chipOff}`}>
                        {t("events.filter.ended")}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
                      <Labeled label={t("events.prefecture")}>
                        <select value={filters.pref} onChange={(e) => update({ pref: e.target.value })} className={field}>
                          <option value="">{t("events.anyPrefecture")}</option>
                          {PREFECTURES.map((p) => (
                            <option key={p.id} value={p.id}>
                              {localize(p.en, p.ja, language)}
                            </option>
                          ))}
                        </select>
                      </Labeled>
                      <Labeled label={t("events.city")}>
                        <input value={cityInput} onChange={(e) => setCityInput(e.target.value)} placeholder={t("events.cityPlaceholder")} className={`${field} placeholder:text-white/50`} />
                      </Labeled>
                      <Labeled label={t("events.date")}>
                        <input type="date" value={filters.date} onChange={(e) => update({ date: e.target.value })} className={field} />
                      </Labeled>
                      <Labeled label={t("events.sort")}>
                        <select value={filters.sort} onChange={(e) => update({ sort: e.target.value as EventFilters["sort"] })} className={field}>
                          <option value="date">{t("events.sort.date")}</option>
                          <option value="announced">{t("events.sort.announced")}</option>
                          <option value="nearest" disabled={!placeInfo.place}>
                            {t("events.sort.nearest")}
                          </option>
                        </select>
                      </Labeled>
                      <Labeled label={t("events.radius")}>
                        <select value={filters.radius} disabled={!filters.near} onChange={(e) => update({ radius: Number(e.target.value) })} className={`${field} disabled:opacity-40`}>
                          <option value={0}>{t("events.radius.any")}</option>
                          {RADII.map((r) => (
                            <option key={r} value={r}>
                              {r} km
                            </option>
                          ))}
                        </select>
                      </Labeled>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* What's selected, and how many results */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2" aria-live="polite">
              {chips.length > 0 && <span className="text-[11px] font-medium text-white/60">{t("events.showing")}:</span>}
              {chips.map((c) => (
                <button key={c.key} type="button" onClick={c.clear} className="flex items-center gap-1 rounded-full border border-white/25 bg-transparent px-2.5 py-1 text-[11px] font-medium text-white hover:border-white/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                  {c.label}
                  <X size={11} aria-hidden="true" />
                </button>
              ))}
              {chips.length > 0 && (
                <button type="button" onClick={clearAll} className="text-[11px] font-medium text-white/60 underline-offset-2 hover:text-white hover:underline">
                  {t("events.clear")}
                </button>
              )}
              {lastPage && !loading && (
                <span className="ml-auto text-[11px] text-white/60">
                  {lastPage.total} {t("events.sources.count")}
                </span>
              )}
            </div>

            {/* Results */}
      {waitingForPlace ? (
        placeInfo.locating ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-glass-border p-6 text-center text-sm text-muted">{t("news.place.needed")}</p>
        )
      ) : emptySaved ? (
        <p className="rounded-2xl border border-dashed border-glass-border p-8 text-center text-sm text-muted">{t("events.savedNote")}</p>
      ) : loading ? (
        <div className="flex flex-col gap-4" role="status" aria-label={t("news.hub.loadingMore")}>
          <FeaturedSkeleton />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : failed ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-sakura/25 bg-sakura/5 p-8 text-center">
          <AlertTriangle className="text-sakura" size={26} aria-hidden="true" />
          <div>
            <p className="font-semibold text-foreground">{t("events.errorTitle")}</p>
            <p className="mt-1 text-sm text-muted">{t("news.hub.errorHelp")}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              loadedKeyRef.current = null;
              setLoaded(null);
              setAttempt((n) => n + 1);
            }}
            className="flex items-center gap-1.5 rounded-full bg-sakura/20 px-4 py-2 text-sm font-semibold text-sakura hover:bg-sakura/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sakura"
          >
            <RefreshCw size={14} aria-hidden="true" />
            {t("news.hub.retry")}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-glass-border p-8 text-center">
          <CalendarDays className="text-muted" size={26} aria-hidden="true" />
          <p className="font-semibold text-foreground">{t("events.emptyTitle")}</p>
          <p className="max-w-lg text-sm text-muted">{t("events.emptyHelp")}</p>
          {chips.length > 0 && (
            <button type="button" onClick={clearAll} className="mt-2 rounded-full bg-azure/15 px-4 py-2 text-sm font-semibold text-azure hover:bg-azure/25">
              {t("events.clear")}
            </button>
          )}
        </div>
      ) : (
        <>
          {featured && <EventCard event={featured} variant="featured" onOpen={setOpenEvent} priority />}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rest.map((e) => (
              <EventCard key={e.id} event={e} onOpen={setOpenEvent} />
            ))}
          </div>
          <div ref={sentinelRef} className="flex flex-col items-center gap-2 py-2">
            {lastPage?.nextOffset ? (
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="rounded-full border border-white/25 bg-transparent px-5 py-2 text-xs font-semibold text-white transition-colors hover:border-white/55 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-60"
              >
                {loadingMore ? t("news.hub.loadingMore") : t("news.hub.loadMore")}
              </button>
            ) : null}
            {moreFailed && (
              <p role="alert" className="text-xs text-sakura">
                {t("events.errorTitle")}
              </p>
            )}
          </div>
        </>
      )}

          </section>

          {/* Where the data comes from, and how fresh it is */}
      <section aria-labelledby="sources-title" className="rounded-2xl border border-white/10 bg-transparent p-4 sm:p-5">
        <h2 id="sources-title" className="text-sm font-semibold uppercase tracking-wide text-foreground/90">
          {t("events.sources.title")}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-muted">{t("events.coverage")}</p>
        {sources.length > 0 && (
          <details className="mt-3 text-xs text-foreground/80">
            <summary className="cursor-pointer font-medium text-azure">
              {okSources.length}/{sources.length} · {t("events.sources.official")}
            </summary>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {sources.map((s) => (
                <li key={s.id} className="rounded-lg border border-glass-border px-3 py-2">
                  <span className="font-medium text-foreground">{known(s.name, language)}</span>
                  <span className="mt-0.5 block text-[11px] text-muted">
                    {s.ok ? (
                      <>
                        {s.count} {t("events.sources.count")}
                        {s.type === "annual-reference"
                          ? ` · ${t("events.typical")}`
                          : s.updatedAt
                            ? ` · ${t("events.sources.updated")} ${formatUpdated(s.updatedAt, language)}`
                            : ""}
                      </>
                    ) : (
                      <span className="text-sakura">{t("events.sources.unavailable")}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted">{t("events.sources.reference")}</p>
          </details>
        )}
      </section>
        </div>
      </div>

      <EventModal event={openEvent} onClose={() => setOpenEvent(null)} />
    </div>
  );
}
