"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AlertTriangle, CalendarDays, Heart, MapPin, RefreshCw, Search, X } from "lucide-react";
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
import { formatUpdated, useSavedEvents } from "@/lib/events/useEvents";

interface Loaded {
  key: string;
  pages: EventsResult[];
  failed?: boolean;
}

const chip =
  "shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure";
const chipOff = "border-glass-border bg-glass-bg text-foreground/75 hover:border-white/25 hover:text-foreground";
const field =
  "h-10 w-full rounded-xl border border-glass-border bg-panel px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure";

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[11px] font-medium text-muted">
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
    return p ? (language === "ja" ? p.ja : p.en) : id;
  };

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.near) chips.push({ key: "near", label: `${t("events.when.near")}${placeInfo.place ? `: ${placeInfo.place}` : ""}`, clear: () => update({ near: false, radius: 0 }) });
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

  return (
    <div className="flex flex-col gap-5">
      {/* Hero */}
      <section className="relative isolate overflow-hidden rounded-3xl border border-glass-border">
        <Image
          src="/images/event-nebuta.jpg"
          alt=""
          fill
          preload
          sizes="(min-width: 1536px) 1400px, 100vw"
          className="-z-10 object-cover [object-position:50%_45%]"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0b0e1a]/95 via-[#1b1140]/75 to-[#0b0e1a]/40" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b0e1a] via-transparent to-transparent" />
        <div className="flex flex-col gap-5 p-6 sm:p-9 lg:p-12">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sakura">{t("events.eyebrow")}</p>
            <h1 className="mt-2 bg-gradient-to-r from-azure via-neon-purple to-sakura bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl lg:text-5xl">
              {t("events.title")}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-foreground/85 sm:text-base">{t("events.subtitle")}</p>
          </div>
          <div className="relative max-w-xl">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder={t("events.search")}
              aria-label={t("events.search")}
              className="h-12 w-full rounded-xl border border-white/15 bg-background/70 pl-10 pr-4 text-base text-foreground outline-none backdrop-blur-md placeholder:text-muted focus:border-azure/60 focus-visible:ring-2 focus-visible:ring-azure/40 sm:text-sm"
            />
          </div>
        </div>
      </section>

      {/* Near you */}
      <section aria-labelledby="near-title" className="rounded-2xl border border-glass-border bg-glass-bg p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-full flex-1 flex-col gap-2.5 sm:min-w-0">
            <h2 id="near-title" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground/90">
              <MapPin size={15} className="text-gold" aria-hidden="true" />
              {t("events.near.title")}
            </h2>
            <PlacePicker current={placeInfo} compact />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <button
              type="button"
              aria-pressed={filters.near}
              disabled={!placeInfo.place}
              onClick={() => update({ near: !filters.near, sort: !filters.near ? "nearest" : "date" })}
              className={`${chip} ${filters.near ? "border-gold/60 bg-gold/20 text-gold" : chipOff} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {t("events.when.near")}
            </button>
            <Labeled label={t("events.radius")}>
              <select
                value={filters.radius}
                disabled={!filters.near}
                onChange={(e) => update({ radius: Number(e.target.value) })}
                className={`${field} w-36 disabled:opacity-40`}
              >
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
        <p className="mt-3 text-[11px] text-muted">{t("events.near.measured")}</p>
      </section>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div
          role="group"
          aria-label="When"
          className="-mx-3 flex snap-x scroll-pl-3 gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {WHEN_IDS.map((w) => (
            <button key={w} type="button" aria-pressed={filters.when === w && !filters.date} onClick={() => update({ when: w, date: "" })} className={`${chip} snap-start ${filters.when === w && !filters.date ? "border-azure/50 bg-azure/20 text-azure" : chipOff}`}>
              {t(`events.when.${w}` as TranslationKey)}
            </button>
          ))}
        </div>

        <div
          role="group"
          aria-label="Categories"
          className="-mx-3 flex snap-x scroll-pl-3 gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {KIND_CHIPS.map((k) => (
            <button key={k.id} type="button" aria-pressed={filters.kind === k.id} onClick={() => update({ kind: filters.kind === k.id ? "" : k.id })} className={`${chip} snap-start ${filters.kind === k.id ? "border-neon-purple/50 bg-neon-purple/20 text-neon-purple" : chipOff}`}>
              {t(`events.kind.${k.id}` as TranslationKey)}
            </button>
          ))}
          <button type="button" aria-pressed={filters.free} onClick={() => update({ free: !filters.free })} className={`${chip} snap-start ${filters.free ? "border-mint/50 bg-mint/20 text-mint" : chipOff}`}>
            {t("events.filter.free")}
          </button>
          <button type="button" aria-pressed={filters.family} onClick={() => update({ family: !filters.family })} className={`${chip} snap-start ${filters.family ? "border-mint/50 bg-mint/20 text-mint" : chipOff}`}>
            {t("events.filter.family")}
          </button>
          <button type="button" aria-pressed={filters.saved} onClick={() => update({ saved: !filters.saved })} className={`${chip} snap-start ${filters.saved ? "border-sakura/50 bg-sakura/20 text-sakura" : chipOff}`}>
            <Heart size={11} className="mr-1 inline" aria-hidden="true" />
            {t("events.filter.saved")} ({saved.ids.length})
          </button>
          <button type="button" aria-pressed={filters.ended} onClick={() => update({ ended: !filters.ended })} className={`${chip} snap-start ${filters.ended ? "border-white/40 bg-white/15 text-foreground" : chipOff}`}>
            {t("events.filter.ended")}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <Labeled label={t("events.prefecture")}>
            <select value={filters.pref} onChange={(e) => update({ pref: e.target.value })} className={field}>
              <option value="">{t("events.anyPrefecture")}</option>
              {PREFECTURES.map((p) => (
                <option key={p.id} value={p.id}>
                  {language === "ja" ? p.ja : p.en}
                </option>
              ))}
            </select>
          </Labeled>
          <Labeled label={t("events.city")}>
            <input value={cityInput} onChange={(e) => setCityInput(e.target.value)} placeholder={t("events.cityPlaceholder")} className={`${field} placeholder:text-muted`} />
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
        </div>
      </div>

      {/* What's selected, and how many results */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2" aria-live="polite">
        {chips.length > 0 && <span className="text-[11px] font-medium text-muted">{t("events.showing")}:</span>}
        {chips.map((c) => (
          <button key={c.key} type="button" onClick={c.clear} className="flex items-center gap-1 rounded-full bg-azure/15 px-2.5 py-1 text-[11px] font-medium text-azure hover:bg-azure/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            {c.label}
            <X size={11} aria-hidden="true" />
          </button>
        ))}
        {chips.length > 0 && (
          <button type="button" onClick={clearAll} className="text-[11px] font-medium text-muted underline-offset-2 hover:text-foreground hover:underline">
            {t("events.clear")}
          </button>
        )}
        {lastPage && !loading && (
          <span className="ml-auto text-[11px] text-muted">
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
                className="rounded-full border border-glass-border bg-glass-bg px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-azure/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure disabled:opacity-60"
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

      {/* Where the data comes from, and how fresh it is */}
      <section aria-labelledby="sources-title" className="rounded-2xl border border-glass-border bg-glass-bg p-4 sm:p-5">
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
                  <span className="font-medium text-foreground">{s.name}</span>
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

      <EventModal event={openEvent} onClose={() => setOpenEvent(null)} />
    </div>
  );
}
