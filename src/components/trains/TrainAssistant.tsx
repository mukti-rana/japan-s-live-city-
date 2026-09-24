"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Bot, Star, MapPin } from "lucide-react";
import Tabs from "@/components/ui/Tabs";
import GlassCard from "@/components/ui/GlassCard";
import T from "@/components/i18n/T";
import TrainLineCard from "@/components/trains/TrainLineCard";
import TrainStatusLegend from "@/components/trains/TrainStatusLegend";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useLiveLocation } from "@/lib/geo/useLiveLocation";
import { useSavedLines } from "@/lib/trains/useSavedLines";
import { TRAIN_LINES, TRAIN_CITY_META, TRAIN_CITIES, findTrainCity, type TrainCity, type TrainLineInfo } from "@/lib/data/trainLines";
import { TRAIN_STATUS_META, TRAIN_STATUS_ORDER, summarizeStatuses } from "@/lib/data/trainStatus";

const ALL_JAPAN = "__all_japan__";
const ALL_LINES = "__all_lines__";

const RAILWAY_TABS: string[] = [ALL_LINES, "jr", "private", "subway"];

function lineKey(city: TrainCity, name: string) {
  return `${city}|${name}`;
}

export default function TrainAssistant() {
  const { t } = useLanguage();
  const router = useRouter();
  const { status: locationStatus, location } = useLiveLocation();
  const { isFollowed, toggle, hydrated, followed } = useSavedLines();

  const [citySelection, setCitySelection] = useState<string>(ALL_JAPAN);
  const [autoSelected, setAutoSelected] = useState(false);
  const [railwayFilter, setRailwayFilter] = useState<string>(ALL_LINES);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [aiQuery, setAiQuery] = useState("");

  // Once real location resolves to a city this project has data for,
  // default the view to it — but only the first time, and never forcing
  // it (the user can always pick "All Japan" or another city afterward).
  useEffect(() => {
    if (autoSelected || citySelection !== ALL_JAPAN) return;
    if (locationStatus !== "ready" || !location?.name) return;
    const matched = findTrainCity(location.name);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (matched) setCitySelection(matched);
    setAutoSelected(true);
  }, [autoSelected, citySelection, locationStatus, location]);

  const cityTabs = [ALL_JAPAN, ...TRAIN_CITIES];
  function cityLabel(tab: string) {
    return tab === ALL_JAPAN ? t("trains.allJapan") : TRAIN_CITY_META[tab as TrainCity].name;
  }
  function railwayLabel(tab: string) {
    if (tab === ALL_LINES) return t("tabs.allLines");
    return t(tab === "jr" ? "tabs.jr" : tab === "private" ? "tabs.private" : "tabs.subway");
  }

  const visibleCities: TrainCity[] = useMemo(
    () => (citySelection === ALL_JAPAN ? TRAIN_CITIES : [citySelection as TrainCity]),
    [citySelection],
  );

  const scopedLines = useMemo(() => {
    return visibleCities.flatMap((city) => TRAIN_LINES[city].map((line) => ({ city, line })));
  }, [visibleCities]);

  const filteredLines = useMemo(() => {
    function matches(line: TrainLineInfo): boolean {
      if (railwayFilter !== ALL_LINES && line.category !== railwayFilter) return false;
      const trimmed = search.trim();
      if (!trimmed) return true;
      const needle = trimmed.toLowerCase();
      return line.name.toLowerCase().includes(needle) || Boolean(line.nameJa?.includes(trimmed));
    }
    return scopedLines.filter(({ line }) => matches(line));
  }, [scopedLines, railwayFilter, search]);

  const statusSummary = useMemo(
    () => summarizeStatuses(scopedLines.map(({ line }) => line.status)),
    [scopedLines],
  );

  const disruptions = useMemo(
    () => scopedLines.filter(({ line }) => line.status !== "normal"),
    [scopedLines],
  );

  const myLines = useMemo(() => {
    if (!hydrated || followed.length === 0) return [];
    return TRAIN_CITIES.flatMap((city) =>
      TRAIN_LINES[city]
        .filter((line) => followed.includes(lineKey(city, line.name)))
        .map((line) => ({ city, line })),
    );
  }, [hydrated, followed]);

  function askAi(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    router.push(`/ai-assistant?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Status summary */}
      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {TRAIN_STATUS_ORDER.filter((s) => statusSummary[s] > 0).map((status) => {
              const meta = TRAIN_STATUS_META[status];
              return (
                <span key={status} className={`flex items-center gap-1.5 text-sm font-medium ${meta.textClass}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${meta.dotClass}`} />
                  {statusSummary[status]} <T k={meta.labelKey} />
                </span>
              );
            })}
          </div>
          <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gold">
            <T k="footer.demoData" />
          </span>
        </div>
        <p className="mt-3 text-[11px] text-muted">
          <T k="trains.demoExplainer" />
        </p>
      </GlassCard>

      <div className="flex flex-col gap-3">
        <Tabs tabs={cityTabs} value={citySelection} onChange={setCitySelection} getLabel={cityLabel} />
        <TrainStatusLegend />
      </div>

      {/* Search */}
      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex items-center gap-2 rounded-full border border-glass-border bg-glass-bg px-3 py-2"
      >
        <Search size={15} className="shrink-0 text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("trains.searchPlaceholder")}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
        />
      </form>

      {/* Current disruptions */}
      <div>
        <p className="mb-3 text-sm font-semibold text-foreground">
          ⚠️ <T k="trains.currentDisruptions" />
        </p>
        {disruptions.length === 0 ? (
          <GlassCard className="flex items-center gap-2 p-4">
            <span className="h-2.5 w-2.5 rounded-full bg-mint" />
            <p className="text-sm text-foreground">
              <T k="trains.allNormal" />
            </p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {disruptions.map(({ city, line }) => (
              <TrainLineCard
                key={lineKey(city, line.name)}
                line={line}
                city={TRAIN_CITY_META[city].name}
                expanded={expanded === lineKey(city, line.name)}
                onToggleExpand={() =>
                  setExpanded(expanded === lineKey(city, line.name) ? null : lineKey(city, line.name))
                }
                followed={isFollowed(lineKey(city, line.name))}
                onToggleFollow={() => toggle(lineKey(city, line.name))}
              />
            ))}
          </div>
        )}
      </div>

      {/* My Lines */}
      {hydrated && myLines.length > 0 && (
        <div>
          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Star size={14} className="text-gold" />
            <T k="trains.myLines" />
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {myLines.map(({ city, line }) => (
              <TrainLineCard
                key={lineKey(city, line.name)}
                line={line}
                city={TRAIN_CITY_META[city].name}
                expanded={expanded === lineKey(city, line.name)}
                onToggleExpand={() =>
                  setExpanded(expanded === lineKey(city, line.name) ? null : lineKey(city, line.name))
                }
                followed
                onToggleFollow={() => toggle(lineKey(city, line.name))}
              />
            ))}
          </div>
        </div>
      )}

      {/* Ask LIVE CITY */}
      <GlassCard className="p-5">
        <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Bot size={15} className="text-neon-purple" />
          <T k="trains.askLiveCity" />
        </p>
        <p className="mb-3 text-xs text-muted">
          <T k="trains.askLiveCitySubtitle" />
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            askAi(aiQuery);
          }}
          className="flex items-center gap-2 rounded-full border border-glass-border bg-glass-bg px-3 py-2"
        >
          <input
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            placeholder={t("trains.askLiveCityPlaceholder")}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
          />
          <button
            type="submit"
            aria-label={t("ai.askButton")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-azure to-neon-purple text-white transition-opacity hover:opacity-90"
          >
            <Search size={14} />
          </button>
        </form>
      </GlassCard>

      {/* Railway filter + full listing, grouped by city */}
      <div className="flex flex-col gap-4">
        <Tabs tabs={RAILWAY_TABS} value={railwayFilter} onChange={setRailwayFilter} getLabel={railwayLabel} />

        {visibleCities.map((city) => {
          const cityLines = filteredLines.filter((entry) => entry.city === city);
          if (cityLines.length === 0) return null;
          const cityCounts = summarizeStatuses(TRAIN_LINES[city].map((l) => l.status));

          return (
            <div key={city}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold uppercase tracking-wide text-foreground">
                  {TRAIN_CITY_META[city].name}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                  {TRAIN_STATUS_ORDER.filter((s) => cityCounts[s] > 0).map((s) => (
                    <span key={s} className={`flex items-center gap-1 ${TRAIN_STATUS_META[s].textClass}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${TRAIN_STATUS_META[s].dotClass}`} />
                      {cityCounts[s]}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {cityLines.map(({ line }) => (
                  <TrainLineCard
                    key={lineKey(city, line.name)}
                    line={line}
                    city={TRAIN_CITY_META[city].name}
                    expanded={expanded === lineKey(city, line.name)}
                    onToggleExpand={() =>
                      setExpanded(expanded === lineKey(city, line.name) ? null : lineKey(city, line.name))
                    }
                    followed={isFollowed(lineKey(city, line.name))}
                    onToggleFollow={() => toggle(lineKey(city, line.name))}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {filteredLines.length === 0 && (
          <GlassCard className="p-6 text-center text-sm text-muted">
            <T k="trains.noResults" />
          </GlassCard>
        )}
      </div>

      <Link
        href="/map"
        className="flex items-center justify-center gap-1.5 rounded-full border border-glass-border bg-glass-bg px-4 py-2.5 text-sm font-medium text-foreground/85 hover:text-azure"
      >
        <MapPin size={14} />
        <T k="trains.openRailwayMap" />
      </Link>
    </div>
  );
}
