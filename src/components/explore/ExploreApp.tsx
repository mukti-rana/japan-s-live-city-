"use client";

import { useCallback, useMemo, useState } from "react";
import { LayoutGrid, LocateFixed, Map as MapIcon, MapPin, Sparkles } from "lucide-react";
import AllJapan from "@/components/explore/AllJapan";
import DiscoverSections from "@/components/explore/DiscoverSections";
import ExploreHero, { type Tab } from "@/components/explore/ExploreHero";
import ExploreResults from "@/components/explore/ExploreResults";
import SavedPlaces from "@/components/explore/SavedPlaces";
import SmartStrip from "@/components/explore/SmartStrip";
import TopicGrid from "@/components/explore/TopicGrid";
import { seasonOfMonth } from "@/lib/explore/categories";
import { EMPTY_FILTERS, filtersActive, type ExploreFilters } from "@/lib/explore/filters";
import { parseSearch } from "@/lib/explore/searchParse";
import type { CatalogueMeta } from "@/lib/explore/types";
import { useExploreLocation } from "@/lib/explore/useExploreLocation";
import { useTranslate } from "@/lib/i18n/inline";

type Mode = "highlights" | "list" | "map";

function jstMonth(): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", month: "numeric" }).format(new Date()));
}

const goToResults = () => setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);

// The whole Explore Japan page: a landing (search, where to look, categories),
// quick tools, then either curated highlights or the full list / map, and
// nationwide exploration. The Home page only previews this.
export default function ExploreApp({ meta }: { meta: CatalogueMeta }) {
  const tr = useTranslate();
  const loc = useExploreLocation();
  const [tabChoice, setTabChoice] = useState<Tab | null>(null);
  const [filters, setFiltersState] = useState<ExploreFilters>(EMPTY_FILTERS);
  const [mode, setMode] = useState<Mode>("highlights");
  const [savedCount, setSavedCount] = useState(0);
  const [month] = useState(jstMonth);

  const tab: Tab = tabChoice ?? (loc.gps ? "near" : loc.manual ? "city" : "all");
  // Near Me uses only a real device position; Choose City only a picked place.
  const origin = tab === "near" ? loc.gps : tab === "city" ? loc.manual : null;
  const needsGps = tab === "near" && !loc.gps;
  const needsCity = tab === "city" && !loc.manual;

  const setFilters = useCallback((patch: Partial<ExploreFilters>) => setFiltersState((f) => ({ ...f, ...patch })), []);
  const effectiveMode: Mode = mode === "highlights" && filtersActive(filters) ? "list" : mode;

  const toggleTopic = (id: string) => {
    setFilters({ topics: filters.topics.includes(id) ? filters.topics.filter((t) => t !== id) : [...filters.topics, id], bbox: null });
    setMode((m) => (m === "highlights" ? "list" : m));
    goToResults();
  };

  const onSearch = (text: string) => {
    const parsed = parseSearch(text);
    const found = parsed.topics.length > 0 || parsed.pref || parsed.season;
    // A named prefecture means "look there", so leave distance-based browsing.
    if (parsed.pref) setTabChoice("all");
    setFiltersState((f) => ({
      ...f,
      q: found ? parsed.text : text,
      topics: found ? parsed.topics : f.topics,
      pref: parsed.pref || f.pref,
      season: parsed.season || f.season,
      region: parsed.pref ? "" : f.region,
      bbox: null,
    }));
    setMode((m) => (m === "highlights" ? "list" : m));
    goToResults();
  };

  const browseTo = (patch: Partial<ExploreFilters>, nextTab?: Tab) => {
    if (nextTab) setTabChoice(nextTab);
    setFiltersState((f) => ({ ...f, ...patch, bbox: null }));
    setMode((m) => (m === "highlights" ? "list" : m));
    goToResults();
  };

  const modes: { id: Mode; label: string; icon: typeof Sparkles }[] = [
    { id: "highlights", label: "Highlights", icon: Sparkles },
    { id: "list", label: "All places", icon: LayoutGrid },
    { id: "map", label: "Map", icon: MapIcon },
  ];

  const season = useMemo(() => seasonOfMonth(month), [month]);

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-8">
      <ExploreHero
        tab={tab}
        setTab={(t) => {
          setTabChoice(t);
          setFiltersState((f) => ({ ...f, bbox: null }));
        }}
        loc={loc}
        onSearch={onSearch}
        outside={loc.status === "outside"}
      />

      <TopicGrid selected={filters.topics} onToggle={toggleTopic} />

      <SmartStrip filters={filters} origin={origin} month={month} savedCount={savedCount} />

      {/* Highlights, the full list, or the map */}
      <div role="group" aria-label={tr("View")} className="inline-flex w-fit rounded-2xl border border-glass-border bg-glass-bg p-1">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={effectiveMode === m.id}
            onClick={() => {
              if (m.id === "highlights") setFiltersState(EMPTY_FILTERS);
              setMode(m.id);
              if (m.id !== "highlights") goToResults();
            }}
            className={`flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${effectiveMode === m.id ? "bg-gradient-to-r from-azure/25 to-neon-purple/25 text-foreground shadow-[inset_0_0_0_1px_rgba(77,163,255,0.35)]" : "text-muted hover:text-foreground"}`}
          >
            <m.icon size={15} aria-hidden="true" />
            {tr(m.label)}
          </button>
        ))}
      </div>

      {needsGps ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-azure/30 bg-azure/5 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <LocateFixed size={16} className="text-azure" aria-hidden="true" />
            {tr("Near Me needs your location")}
          </p>
          <p className="max-w-xl text-xs text-muted">{tr("Press “Use my location” above, or choose a city, or explore all of Japan.")}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setTabChoice("city")} className="flex min-h-9 items-center gap-1.5 rounded-full border border-glass-border px-3.5 text-xs font-medium text-foreground/90 hover:border-azure/40">
              <MapPin size={13} aria-hidden="true" />
              {tr("Choose City")}
            </button>
            <button type="button" onClick={() => setTabChoice("all")} className="flex min-h-9 items-center gap-1.5 rounded-full border border-glass-border px-3.5 text-xs font-medium text-foreground/90 hover:border-azure/40">
              {tr("All Japan")}
            </button>
          </div>
        </div>
      ) : needsCity ? (
        <p className="rounded-2xl border border-dashed border-glass-border p-5 text-sm text-muted">{tr("Pick a city or prefecture above to see places around it.")}</p>
      ) : effectiveMode === "highlights" ? (
        <DiscoverSections origin={origin} />
      ) : (
        <ExploreResults filters={filters} setFilters={setFilters} origin={origin} view={effectiveMode === "map" ? "map" : "list"} setView={(v) => setMode(v)} month={month} />
      )}

      <SavedPlaces onCount={setSavedCount} />

      <AllJapan
        currentSeason={season}
        onRegion={(id) => browseTo({ region: id, pref: "" }, "all")}
        onPrefecture={(id) => browseTo({ pref: id, region: "" }, "all")}
        onSeason={(id) => browseTo({ season: id })}
        onCity={(slug) => {
          loc.choosePlace("city", slug);
          setTabChoice("city");
          setFiltersState(EMPTY_FILTERS);
          setMode("highlights");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      <p className="border-t border-glass-border pt-4 text-[11px] leading-relaxed text-muted">
        {tr("Coverage: {n} places across {m} prefectures, from open data (Wikidata, Wikipedia and Wikimedia Commons). Opening hours, prices and ratings are shown only when a source provides them.").replace("{n}", meta.total.toLocaleString()).replace("{m}", String(meta.prefecturesCovered))}
      </p>
    </div>
  );
}
