"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LayoutGrid, Map as MapIcon, X as XIcon } from "lucide-react";
import DestinationCard from "@/components/explore/DestinationCard";
import ExploreMap from "@/components/explore/ExploreMapLoader";
import PlaceTile from "@/components/discovery/PlaceTile";
import { REGIONS } from "@/lib/explore/regions";
import { SEASONS, pickLabel } from "@/lib/explore/categories";
import { EMPTY_FILTERS, RADII, buildParams, filtersActive, scopeFor, type ExploreFilters } from "@/lib/explore/filters";
import { TOPIC_BY_ID } from "@/lib/explore/topics";
import type { Destination, ExploreResult } from "@/lib/explore/types";
import type { ExploreLocation } from "@/lib/explore/useExploreLocation";
import { localize, useTranslate } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { PREFECTURES } from "@/lib/news/places";

interface Page {
  key: string;
  items: Destination[];
  total: number;
  next: number | null;
  failed?: boolean;
}

const chip = (on: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${on ? "border-azure/50 bg-azure/20 text-azure" : "border-glass-border bg-glass-bg text-foreground/75 hover:border-white/25"}`;
const selectCls = "h-9 rounded-full border border-glass-border bg-panel px-3 text-xs text-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure";

// The full list of places, as a list or on a map, narrowed by the filters.
// The map and the list always show the same places in the same order.
export default function ExploreResults({
  filters,
  setFilters,
  origin,
  view,
  setView,
  month,
}: {
  filters: ExploreFilters;
  setFilters: (patch: Partial<ExploreFilters>) => void;
  origin: ExploreLocation | null;
  view: "list" | "map";
  setView: (v: "list" | "map") => void;
  month: number;
}) {
  const tr = useTranslate();
  const { language } = useLanguage();
  const scope = scopeFor(origin);
  const approximate = origin?.mode === "manual";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [more, setMore] = useState(false);

  // One request for the list view (paged) and one for the map (a bigger window).
  const base = useMemo(() => buildParams(filters, origin, language, view === "map" ? 100 : 24).toString(), [filters, origin, language, view]);
  const [page, setPage] = useState<Page | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const c = new AbortController();
    fetch(`/api/explore?${base}`, { signal: c.signal })
      .then((r) => (r.ok ? (r.json() as Promise<ExploreResult>) : Promise.reject(new Error("failed"))))
      .then((d) => setPage({ key: base, items: d.items, total: d.total, next: d.nextOffset }))
      .catch((e: unknown) => {
        if ((e as { name?: string })?.name !== "AbortError") setPage({ key: base, items: [], total: 0, next: null, failed: true });
      });
    return () => c.abort();
  }, [base, attempt]);
  const current = page && page.key === base ? page : null;
  const items = useMemo(() => current?.items ?? [], [current]);

  async function loadMore() {
    if (!current?.next || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await fetch(`/api/explore?${base}&offset=${current.next}`);
      if (!r.ok) throw new Error("failed");
      const d = (await r.json()) as ExploreResult;
      setPage((p) => (p && p.key === base ? { ...p, items: [...p.items, ...d.items.filter((i) => !p.items.some((o) => o.id === i.id))], next: d.nextOffset } : p));
    } catch {
      /* the button stays; try again */
    } finally {
      setLoadingMore(false);
    }
  }

  // Load the next page as the end of the list scrolls into view.
  const sentinel = useRef<HTMLDivElement>(null);
  const moreRef = useRef(loadMore);
  useEffect(() => {
    moreRef.current = loadMore;
  });
  useEffect(() => {
    const node = sentinel.current;
    if (!node || view !== "list") return;
    const o = new IntersectionObserver((e) => e.some((i) => i.isIntersecting) && void moreRef.current(), { rootMargin: "300px" });
    o.observe(node);
    return () => o.disconnect();
  }, [current?.next, view]);

  // Scroll the chosen list entry into view when it was picked on the map.
  useEffect(() => {
    if (!selectedId || view !== "map") return;
    document.querySelector(`[data-place="${selectedId}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId, view]);

  const selected = items.find((i) => i.id === selectedId) ?? null;
  const set = <K extends keyof ExploreFilters>(k: K, v: ExploreFilters[K]) => setFilters({ [k]: v } as Partial<ExploreFilters>);
  const prefsInRegion = filters.region ? (REGIONS.find((r) => r.id === filters.region)?.prefectureIds ?? []) : PREFECTURES.map((p) => p.id);
  const active = filtersActive(filters);
  const fitKey = `${base}|${items.length}`;

  const sortOptions = [
    ...(origin ? [{ id: "nearest", label: "Nearest" }] : []),
    { id: "popular", label: "Popular" },
    { id: "recommended", label: "Recommended" },
    { id: "name", label: "Name (A–Z)" },
  ];
  const effectiveSort = filters.sort || (scope === "near" ? "nearest" : origin ? "recommended" : "popular");

  const list = (compact: boolean) => (
    <ul className={compact ? "flex flex-col gap-3" : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"}>
      {items.map((p) => (
        <li
          key={p.id}
          data-place={p.id}
          onMouseEnter={() => view === "map" && setSelectedId(p.id)}
          onFocusCapture={() => view === "map" && setSelectedId(p.id)}
          className={`rounded-2xl transition-shadow ${p.id === selectedId && view === "map" ? "ring-2 ring-azure" : ""}`}
        >
          <DestinationCard place={p} approximateDistance={approximate} compact={compact} />
        </li>
      ))}
    </ul>
  );

  return (
    <section id="results" aria-label={tr("Results")} className="scroll-mt-24 flex flex-col gap-3.5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-foreground/80">
          {tr("Sort by")}
          <select className={selectCls} value={effectiveSort} onChange={(e) => set("sort", e.target.value as ExploreFilters["sort"])}>
            {sortOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {tr(o.label)}
              </option>
            ))}
          </select>
        </label>
        {scope === "near" && (
          <label className="flex items-center gap-1.5 text-xs text-foreground/80">
            {tr("Distance")}
            <select className={selectCls} value={filters.radius} onChange={(e) => set("radius", Number(e.target.value))}>
              {RADII.map((r) => (
                <option key={r} value={r}>
                  {tr("Within {n} km").replace("{n}", String(r))}
                </option>
              ))}
            </select>
          </label>
        )}
        {/* These two need data the open sources do not carry, so they are shown switched off rather than faked. */}
        <button type="button" disabled title={tr("Admission prices aren't in our open data yet.")} className={`${chip(false)} cursor-not-allowed opacity-45`}>
          {tr("Free places")}
        </button>
        <button type="button" disabled title={tr("Verified opening hours aren't in our open data yet.")} className={`${chip(false)} cursor-not-allowed opacity-45`}>
          {tr("Open now")}
        </button>
        {(["indoor", "outdoor"] as const).map((v) => (
          <button key={v} type="button" aria-pressed={filters.setting === v} onClick={() => set("setting", filters.setting === v ? "" : v)} className={chip(filters.setting === v)}>
            {tr(v === "indoor" ? "Indoor" : "Outdoor")}
          </button>
        ))}
        <button type="button" aria-pressed={filters.photo} onClick={() => set("photo", !filters.photo)} className={chip(filters.photo)}>
          {tr("With photo")}
        </button>
        <button type="button" aria-expanded={more} onClick={() => setMore((m) => !m)} className={chip(more)}>
          {tr("More filters")}
        </button>

        <div role="group" aria-label={tr("View")} className="ml-auto inline-flex rounded-full border border-glass-border bg-glass-bg p-0.5">
          {([["list", LayoutGrid, "List"], ["map", MapIcon, "Map"]] as const).map(([id, Icon, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={`flex min-h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${view === id ? "bg-azure/25 text-foreground" : "text-muted hover:text-foreground"}`}
            >
              <Icon size={13} aria-hidden="true" />
              {tr(label)}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[11px] leading-snug text-muted">{tr("Free places and Open now are switched off: admission prices and verified opening hours aren't in our open data yet, and we don't guess.")}</p>

      {more && (
        <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-glass-border bg-glass-bg p-3 md:grid-cols-4">
          <label className="flex flex-col gap-1 text-[11px] font-medium text-muted">
            {tr("Region")}
            <select className={selectCls} value={filters.region} onChange={(e) => setFilters({ region: e.target.value, pref: "" })}>
              <option value="">{tr("All regions")}</option>
              {REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {localize(r.en, r.ja, language)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium text-muted">
            {tr("Prefecture")}
            <select className={selectCls} value={scope === "pref" ? (origin?.prefectureId ?? "") : filters.pref} disabled={scope === "pref"} onChange={(e) => set("pref", e.target.value)}>
              <option value="">{tr("All prefectures")}</option>
              {PREFECTURES.filter((p) => prefsInRegion.includes(p.id)).map((p) => (
                <option key={p.id} value={p.id}>
                  {localize(p.en, p.ja, language)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium text-muted">
            {tr("Season")}
            <select className={selectCls} value={filters.season} onChange={(e) => set("season", e.target.value)}>
              <option value="">{tr("Any season")}</option>
              {SEASONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {pickLabel(s.label, language)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button type="button" aria-pressed={filters.heritage} onClick={() => set("heritage", !filters.heritage)} className={chip(filters.heritage)}>
              {tr("World Heritage")}
            </button>
          </div>
        </div>
      )}

      {/* What is being shown */}
      {(active || filters.bbox) && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {filters.q && <span className="rounded-full bg-glass-bg-strong px-2.5 py-1 text-foreground/85">“{filters.q}”</span>}
          {filters.topics.map((id) => (
            <button key={id} type="button" onClick={() => set("topics", filters.topics.filter((t) => t !== id))} className="flex items-center gap-1 rounded-full bg-neon-purple/20 px-2.5 py-1 text-foreground">
              {tr(TOPIC_BY_ID.get(id)?.label ?? id)}
              <XIcon size={11} aria-hidden="true" />
              <span className="sr-only">{tr("Remove filter")}</span>
            </button>
          ))}
          {filters.bbox && (
            <button type="button" onClick={() => set("bbox", null)} className="flex items-center gap-1 rounded-full bg-azure/20 px-2.5 py-1 text-foreground">
              {tr("Map area")}
              <XIcon size={11} aria-hidden="true" />
              <span className="sr-only">{tr("Remove filter")}</span>
            </button>
          )}
          <button type="button" onClick={() => setFilters({ ...EMPTY_FILTERS, sort: filters.sort, radius: filters.radius })} className="ml-auto text-muted underline-offset-2 hover:text-foreground hover:underline">
            {tr("Clear filters")}
          </button>
        </div>
      )}

      <div aria-live="polite" className="text-xs text-muted">
        {current && !current.failed ? `${tr("{n} places").replace("{n}", current.total.toLocaleString())}${view === "map" && current.total > items.length ? ` · ${tr("showing the first {n} on the map").replace("{n}", String(items.length))}` : ""}` : ""}
        {origin && approximate ? ` · ${tr("distances from the centre of {place}, so approximate").replace("{place}", origin.label)}` : ""}
      </div>

      {!current ? (
        <p role="status" className="py-10 text-center text-sm text-muted">
          {tr("Loading…")}
        </p>
      ) : current.failed ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-sakura/25 bg-sakura/5 p-8 text-center">
          <p className="text-sm text-foreground">{tr("Couldn't load places right now.")}</p>
          <button type="button" onClick={() => { setPage(null); setAttempt((n) => n + 1); }} className="rounded-full bg-sakura/20 px-4 py-2 text-sm font-semibold text-sakura">
            {tr("Try again")}
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-glass-border p-8 text-center text-sm text-muted">
          {scope === "near" ? tr("No places match these filters within {n} km. Try a wider distance or fewer categories.").replace("{n}", String(filters.radius)) : tr("No places match these filters. Try removing one.")}
        </p>
      ) : view === "map" ? (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="relative h-[26rem] lg:sticky lg:top-24 lg:h-[34rem]">
            <ExploreMap
              items={items}
              origin={origin ? { lat: origin.lat, lon: origin.lon } : null}
              gps={origin?.mode === "gps"}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onSearchArea={(bbox) => setFilters({ bbox })}
              fitKey={fitKey}
            />
            {selected && (
              <div className="absolute bottom-3 left-3 z-[600] w-56 shadow-2xl">
                <button type="button" aria-label={tr("Close preview")} onClick={() => setSelectedId(null)} className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white">
                  <XIcon size={12} aria-hidden="true" />
                </button>
                <PlaceTile place={selected} approximate={approximate} month={month} />
              </div>
            )}
          </div>
          <div className="max-h-[34rem] overflow-y-auto pr-1 [scrollbar-width:thin]">{list(true)}</div>
        </div>
      ) : (
        <>
          {list(false)}
          <div ref={sentinel} className="flex justify-center py-2">
            {current.next !== null && (
              <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="rounded-full border border-glass-border bg-glass-bg px-6 py-2.5 text-sm font-semibold text-foreground hover:border-azure/40 disabled:opacity-60">
                {loadingMore ? tr("Loading…") : tr("Load more")}
              </button>
            )}
          </div>
        </>
      )}
      <Link href="/explore/trip" className="sr-only">
        {tr("Trip planner")}
      </Link>
    </section>
  );
}
