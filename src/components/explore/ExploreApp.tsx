"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, CloudSun, Compass, ListChecks, LocateFixed, MapPin, Search, X as XIcon } from "lucide-react";
import DestinationCard from "@/components/explore/DestinationCard";
import { X } from "@/components/explore/explore-text";
import { useLazyJson } from "@/components/map/useMapData";
import { CATEGORIES, GROUPS, SEASONS, pickLabel, type GroupId } from "@/lib/explore/categories";
import { REGIONS } from "@/lib/explore/regions";
import type { Section, WeatherKind } from "@/lib/explore/sections";
import type { Suggestion } from "@/lib/explore/catalogue";
import type { CatalogueMeta, Destination, ExploreResult } from "@/lib/explore/types";
import { useExploreLocation } from "@/lib/explore/useExploreLocation";
import { useTrip } from "@/lib/explore/useTrip";
import { useInline, localize, translate } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { MAP_CITIES } from "@/lib/map/cities";
import { PREFECTURES } from "@/lib/news/places";
import type { WeatherSnapshot } from "@/lib/services/weather";
import Tx from "@/components/i18n/Tx";

type Scope = "near" | "pref" | "all";

function weatherKind(icon: WeatherSnapshot["icon"]): WeatherKind {
  if (icon === "rain" || icon === "drizzle" || icon === "storm") return "rain";
  if (icon === "snow") return "snow";
  if (icon === "clear" || icon === "partly") return "clear";
  return "cloud";
}

const REASON_KEY = { rain: "todayRain", sunny: "todaySunny", cloudy: "todayCloudy", cold: "todayCold", evening: "todayEvening", default: "todayDefault" } as const;

// ── Location bar ─────────────────────────────────────────────────────────
function LocationBar({ loc, scope, setScope }: { loc: ReturnType<typeof useExploreLocation>; scope: Scope; setScope: (s: Scope) => void }) {
  const x = useInline(X);
  const { language } = useLanguage();
  const [picking, setPicking] = useState(false);
  const { location, status } = loc;

  const messages: Record<string, string> = { denied: x("denied"), unavailable: x("unavailable"), outside: x("outside") };
  const scopes: { id: Scope; label: string; needs: boolean }[] = [
    { id: "near", label: x("scopeNear"), needs: true },
    { id: "pref", label: x("scopePref"), needs: true },
    { id: "all", label: x("scopeAll"), needs: false },
  ];

  return (
    <section aria-label={x("exploringNear")} className="rounded-2xl border border-glass-border bg-glass-bg p-4 backdrop-blur-xl sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {location ? (
            <>
              <p className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <MapPin size={18} className="shrink-0 text-gold" aria-hidden="true" />
                <span className="truncate">
                  {x("exploringNear")} {location.label}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted">
                {location.mode === "gps"
                  ? `${x("fromDevice")}${location.accuracyKm !== null ? ` · ${x("accuracy")} ${location.accuracyKm} km` : ""}`
                  : x("selectedByYou")}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-foreground">{x("noLocation")}</p>
              <p className="mt-1 text-xs text-muted">{x("chooseCityHint")}</p>
            </>
          )}
          {messages[status] && (
            <p role="status" className="mt-2 text-xs text-gold">
              {messages[status]}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loc.useMyLocation}
            disabled={status === "locating"}
            className="flex min-h-10 items-center gap-2 rounded-full bg-gradient-to-r from-azure to-neon-purple px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure disabled:opacity-60"
          >
            <LocateFixed size={16} aria-hidden="true" />
            {status === "locating" ? x("locating") : x("useLocation")}
          </button>
          <button
            type="button"
            onClick={() => setPicking((p) => !p)}
            aria-expanded={picking}
            className="flex min-h-10 items-center gap-1.5 rounded-full border border-glass-border px-4 text-sm font-medium text-foreground/90 transition-colors hover:border-azure/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
          >
            {location ? x("changeLocation") : x("chooseCity")}
            <ChevronDown size={14} aria-hidden="true" className={picking ? "rotate-180" : ""} />
          </button>
        </div>
      </div>

      {picking && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-glass-border pt-4">
          {MAP_CITIES.slice(0, 8).map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => {
                loc.choosePlace("city", c.slug);
                setPicking(false);
              }}
              className="rounded-full border border-glass-border bg-glass-bg px-3 py-1.5 text-xs text-foreground/85 transition-colors hover:border-gold/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
            >
              {localize(c.name, c.nameJa, language)}
            </button>
          ))}
          <select
            aria-label={x("prefecture")}
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              loc.choosePlace("prefecture", e.target.value);
              setPicking(false);
            }}
            className="rounded-full border border-glass-border bg-panel px-3 py-1.5 text-xs text-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
          >
            <option value="">{x("prefecture")}…</option>
            {PREFECTURES.map((p) => (
              <option key={p.id} value={p.id}>
                {localize(p.en, p.ja, language)}
              </option>
            ))}
          </select>
          {location && (
            <button type="button" onClick={loc.clear} className="ml-auto text-xs text-muted underline-offset-2 hover:text-foreground hover:underline">
              <XIcon size={12} className="mr-1 inline" aria-hidden="true" />
              {x("clearFilters")}
            </button>
          )}
        </div>
      )}

      <div role="group" aria-label={x("scope")} className="mt-4 inline-flex rounded-xl border border-glass-border bg-glass-bg p-1">
        {scopes.map((s) => {
          const disabled = s.needs && !location;
          const active = scope === s.id;
          return (
            <button
              key={s.id}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => setScope(s.id)}
              className={`min-h-9 rounded-lg px-3.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 ${
                active ? "bg-gradient-to-r from-azure/25 to-neon-purple/25 text-foreground shadow-[inset_0_0_0_1px_rgba(77,163,255,0.35)]" : "text-muted hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ── A row of recommendations ─────────────────────────────────────────────
function Row({ section, approx, title, note }: { section: Section; approx: boolean; title: string; note?: string }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <div>
        <h3 className="text-base font-semibold text-foreground sm:text-lg">{title}</h3>
        {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
      </div>
      <ul className="-mx-3 flex snap-x scroll-pl-3 gap-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0 [scrollbar-width:thin]">
        {section.items.map((p) => (
          <li key={p.id} className="w-[17rem] shrink-0 snap-start sm:w-[18.5rem]">
            <DestinationCard place={p} approximateDistance={approx} />
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── The searchable, filterable catalogue ─────────────────────────────────
interface Filters {
  q: string;
  region: string;
  pref: string;
  cats: string[];
  group: string;
  setting: string;
  season: string;
  maxHours: string;
  family: boolean;
  heritage: boolean;
  photo: boolean;
  hidden: boolean;
  sort: string;
}
const EMPTY_FILTERS: Filters = { q: "", region: "", pref: "", cats: [], group: "", setting: "", season: "", maxHours: "", family: false, heritage: false, photo: false, hidden: false, sort: "" };

function Browse({ scope, loc }: { scope: Scope; loc: ReturnType<typeof useExploreLocation> }) {
  const x = useInline(X);
  const { language } = useLanguage();
  const [f, setF] = useState<Filters>(EMPTY_FILTERS);
  const [qInput, setQInput] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const listId = useId();
  const router = useRouter();
  const location = loc.location;

  // Typing is applied after a short pause.
  useEffect(() => {
    const id = setTimeout(() => setF((p) => (p.q === qInput.trim() ? p : { ...p, q: qInput.trim() })), 350);
    return () => clearTimeout(id);
  }, [qInput]);
  useEffect(() => {
    const q = qInput.trim();
    if (!q) return;
    const c = new AbortController();
    const id = setTimeout(() => {
      fetch(`/api/explore/suggest?q=${encodeURIComponent(q)}&lang=${language}`, { signal: c.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { suggestions: Suggestion[] } | null) => d && setSuggestions(d.suggestions))
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(id);
      c.abort();
    };
  }, [qInput, language]);

  const base = useMemo(() => {
    const p = new URLSearchParams();
    if (f.q) p.set("q", f.q);
    if (f.region) p.set("region", f.region);
    const pref = scope === "pref" ? location?.prefectureId ?? "" : f.pref;
    if (pref) p.set("pref", pref);
    if (f.cats.length) p.set("cats", f.cats.join(","));
    if (f.group) p.set("group", f.group);
    if (f.setting) p.set("setting", f.setting);
    if (f.season) p.set("season", f.season);
    if (f.maxHours) p.set("maxHours", f.maxHours);
    for (const k of ["family", "heritage", "photo", "hidden"] as const) if (f[k]) p.set(k, "1");
    if (location) {
      p.set("lat", String(location.lat));
      p.set("lon", String(location.lon));
      if (scope === "near") p.set("radius", "60");
    }
    p.set("sort", f.sort || (scope === "near" ? "nearest" : location ? "recommended" : "popular"));
    p.set("limit", "24");
    return p.toString();
  }, [f, scope, location]);

  const [pages, setPages] = useState<{ key: string; items: Destination[]; total: number; next: number | null; failed?: boolean } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const c = new AbortController();
    fetch(`/api/explore?${base}`, { signal: c.signal })
      .then((r) => (r.ok ? (r.json() as Promise<ExploreResult>) : Promise.reject(new Error("failed"))))
      .then((d) => setPages({ key: base, items: d.items, total: d.total, next: d.nextOffset }))
      .catch((e: unknown) => {
        if ((e as { name?: string })?.name !== "AbortError") setPages({ key: base, items: [], total: 0, next: null, failed: true });
      });
    return () => c.abort();
  }, [base, attempt]);

  const current = pages && pages.key === base ? pages : null;

  async function more() {
    if (!current?.next || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await fetch(`/api/explore?${base}&offset=${current.next}`);
      if (!r.ok) throw new Error("failed");
      const d = (await r.json()) as ExploreResult;
      setPages((p) => (p && p.key === base ? { ...p, items: [...p.items, ...d.items.filter((i) => !p.items.some((o) => o.id === i.id))], next: d.nextOffset } : p));
    } catch {
      /* the button stays; try again */
    } finally {
      setLoadingMore(false);
    }
  }

  const sentinel = useRef<HTMLDivElement>(null);
  const moreRef = useRef(more);
  useEffect(() => {
    moreRef.current = more;
  });
  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const o = new IntersectionObserver((e) => e.some((i) => i.isIntersecting) && void moreRef.current(), { rootMargin: "300px" });
    o.observe(node);
    return () => o.disconnect();
  }, [current?.next]);

  const prefsInRegion = f.region ? REGIONS.find((r) => r.id === f.region)?.prefectureIds ?? [] : PREFECTURES.map((p) => p.id);
  const active = JSON.stringify({ ...f, q: "" }) !== JSON.stringify({ ...EMPTY_FILTERS, q: "" }) || f.q !== "";
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((p) => ({ ...p, [k]: v }));

  const select = "h-10 w-full rounded-xl border border-glass-border bg-panel px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure";
  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${on ? "border-azure/50 bg-azure/20 text-azure" : "border-glass-border bg-glass-bg text-foreground/75 hover:border-white/25"}`;

  return (
    <section id="browse" aria-labelledby="browse-title" className="scroll-mt-20 flex flex-col gap-4">
      <h2 id="browse-title" className="text-xl font-semibold text-foreground">
        {x("allJapan")}
      </h2>

      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          type="search"
          value={qInput}
          onChange={(e) => {
            setQInput(e.target.value);
            setSuggestOpen(true);
          }}
          onFocus={() => setSuggestOpen(true)}
          onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
          placeholder={x("search")}
          aria-label={x("search")}
          role="combobox"
          aria-expanded={suggestOpen && suggestions.length > 0 && qInput.trim().length > 0}
          aria-controls={listId}
          autoComplete="off"
          className="h-11 w-full rounded-xl border border-glass-border bg-glass-bg pl-10 pr-4 text-base text-foreground outline-none placeholder:text-muted focus:border-azure/50 focus-visible:ring-2 focus-visible:ring-azure/40 sm:text-sm"
        />
        {suggestOpen && qInput.trim() && suggestions.length > 0 && (
          <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-80 overflow-y-auto rounded-2xl border border-glass-border bg-panel p-1.5 shadow-2xl">
            {suggestions.map((s) => (
              <li key={`${s.type}-${s.value}`} role="option" aria-selected="false">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSuggestOpen(false);
                    if (s.type === "prefecture") {
                      setQInput("");
                      setF((p) => ({ ...p, q: "", pref: s.value, region: "" }));
                    } else if (s.type === "place") {
                      router.push(`/explore/${s.value}`);
                    } else {
                      setQInput(s.label);
                    }
                  }}
                  className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm text-foreground/90 hover:bg-glass-bg-strong"
                >
                  <span className="shrink-0 rounded bg-glass-bg-strong px-1.5 py-0.5 text-[10px] uppercase text-muted">{s.type === "place" ? "★" : s.type === "city" ? "◎" : "▣"}</span>
                  <span className="min-w-0 flex-1 truncate">{s.label}</span>
                  <span className="shrink-0 text-xs text-muted">{s.sub}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <label className="flex flex-col gap-1 text-[11px] font-medium text-muted">
          {x("region")}
          <select className={select} value={f.region} onChange={(e) => setF((p) => ({ ...p, region: e.target.value, pref: "" }))}>
            <option value="">{x("anyRegion")}</option>
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {localize(r.en, r.ja, language)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-medium text-muted">
          {x("prefecture")}
          <select className={select} value={scope === "pref" ? location?.prefectureId ?? "" : f.pref} disabled={scope === "pref"} onChange={(e) => set("pref", e.target.value)}>
            <option value="">{x("anyPref")}</option>
            {PREFECTURES.filter((p) => prefsInRegion.includes(p.id)).map((p) => (
              <option key={p.id} value={p.id}>
                {localize(p.en, p.ja, language)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-medium text-muted">
          {x("season")}
          <select className={select} value={f.season} onChange={(e) => set("season", e.target.value)}>
            <option value="">{x("anySeason")}</option>
            {SEASONS.map((s) => (
              <option key={s.id} value={s.id}>
                {pickLabel(s.label, language)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-medium text-muted">
          {x("sort")}
          <select className={select} value={f.sort} onChange={(e) => set("sort", e.target.value)}>
            <option value="">{x("sortRecommended")}</option>
            {location && <option value="nearest">{x("sortNearest")}</option>}
            <option value="popular">{x("sortPopular")}</option>
            <option value="name">{x("sortName")}</option>
          </select>
        </label>
      </div>

      <div role="group" aria-label={x("category")} className="-mx-3 flex snap-x gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.filter((c) => c.id !== "attraction").map((c) => (
          <button key={c.id} type="button" aria-pressed={f.cats.includes(c.id)} onClick={() => set("cats", f.cats.includes(c.id) ? f.cats.filter((i) => i !== c.id) : [...f.cats, c.id])} className={`shrink-0 whitespace-nowrap ${chip(f.cats.includes(c.id))}`}>
            {pickLabel(c.label, language)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {([["indoor", "indoor"], ["outdoor", "outdoor"]] as const).map(([v, key]) => (
          <button key={v} type="button" aria-pressed={f.setting === v} onClick={() => set("setting", f.setting === v ? "" : v)} className={chip(f.setting === v)}>
            {x(key)}
          </button>
        ))}
        <button type="button" aria-pressed={f.maxHours === "2"} onClick={() => set("maxHours", f.maxHours === "2" ? "" : "2")} className={chip(f.maxHours === "2")}>
          {x("upTo2")}
        </button>
        <button type="button" aria-pressed={f.maxHours === "4"} onClick={() => set("maxHours", f.maxHours === "4" ? "" : "4")} className={chip(f.maxHours === "4")}>
          {x("upTo4")}
        </button>
        {([["family", "family"], ["heritage", "heritage"], ["photo", "withPhoto"], ["hidden", "hiddenGems"]] as const).map(([k, key]) => (
          <button key={k} type="button" aria-pressed={f[k]} onClick={() => set(k, !f[k])} className={chip(f[k])}>
            {x(key)}
          </button>
        ))}
        <select aria-label={x("thingGroup")} className="h-9 rounded-full border border-glass-border bg-panel px-3 text-xs text-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure" value={f.group} onChange={(e) => set("group", e.target.value)}>
          <option value="">{x("thingGroup")}…</option>
          {GROUPS.map((g) => (
            <option key={g.id} value={g.id}>
              {pickLabel(g.label, language)}
            </option>
          ))}
        </select>
        {active && (
          <button
            type="button"
            onClick={() => {
              setQInput("");
              setF(EMPTY_FILTERS);
            }}
            className="ml-auto text-xs font-medium text-muted underline-offset-2 hover:text-foreground hover:underline"
          >
            {x("clearFilters")}
          </button>
        )}
      </div>
      <p className="text-[11px] leading-snug text-muted">
        {x("sortNote")} {x("unavailableFilters")}
      </p>

      <div aria-live="polite" className="text-xs text-muted">
        {current && !current.failed ? `${current.total.toLocaleString()} ${x("results")}` : ""}
      </div>

      {!current ? (
        <p role="status" className="py-10 text-center text-sm text-muted">
          {x("loading")}
        </p>
      ) : current.failed ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-sakura/25 bg-sakura/5 p-8 text-center">
          <p className="text-sm text-foreground">{x("failed")}</p>
          <button type="button" onClick={() => { setPages(null); setAttempt((n) => n + 1); }} className="rounded-full bg-sakura/20 px-4 py-2 text-sm font-semibold text-sakura">
            {x("retry")}
          </button>
        </div>
      ) : current.items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-glass-border p-8 text-center text-sm text-muted">{scope === "near" ? x("emptyNear") : x("empty")}</p>
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {current.items.map((p) => (
              <li key={p.id}>
                <DestinationCard place={p} approximateDistance={location?.mode === "manual"} />
              </li>
            ))}
          </ul>
          <div ref={sentinel} className="flex justify-center py-2">
            {current.next !== null && (
              <button type="button" onClick={() => void more()} disabled={loadingMore} className="rounded-full border border-glass-border bg-glass-bg px-6 py-2.5 text-sm font-semibold text-foreground hover:border-azure/40 disabled:opacity-60">
                {loadingMore ? x("loading") : x("loadMore")}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

// ── The page ─────────────────────────────────────────────────────────────
export default function ExploreApp({ meta }: { meta: CatalogueMeta }) {
  const x = useInline(X);
  const { language } = useLanguage();
  const loc = useExploreLocation();
  const trip = useTrip();
  const { location } = loc;
  const [scopeChoice, setScopeChoice] = useState<Scope | null>(null);

  // Near Me when there is a usable position; otherwise All Japan.
  const scope: Scope = scopeChoice && (scopeChoice === "all" || location) ? scopeChoice : location ? "near" : "all";
  const setScope = useCallback((s: Scope) => setScopeChoice(s), []);

  // Weather for the place being explored (a coarse word, rounded position).
  const wx = useLazyJson<WeatherSnapshot>(location ? `/api/weather/live?lat=${location.lat.toFixed(2)}&lon=${location.lon.toFixed(2)}` : null);
  const weatherWord = wx.data ? weatherKind(wx.data.icon) : null;

  const sectionsUrl = useMemo(() => {
    const p = new URLSearchParams({ scope, lang: language });
    if (location) {
      p.set("lat", String(location.lat));
      p.set("lon", String(location.lon));
      if (location.accuracyKm !== null && location.mode === "gps") p.set("acc", String(location.accuracyKm));
      if (location.prefectureId) p.set("pref", location.prefectureId);
    }
    if (weatherWord) p.set("wx", weatherWord);
    if (wx.data) p.set("temp", String(wx.data.tempC));
    return `/api/explore/sections?${p.toString()}`;
  }, [scope, location, weatherWord, wx.data, language]);
  // Wait for the weather before asking (one request), unless there's no position to get weather for.
  const ready = !location || !wx.loading;
  const sections = useLazyJson<{ sections: Section[] }>(ready ? sectionsUrl : null);

  const approx = location?.mode === "manual";
  const list = sections.data?.sections ?? [];
  const today = list.find((s) => s.id === "today");
  const rows = list.filter((s) => s.id !== "today" && !s.id.startsWith("group:"));
  const groupRows = list.filter((s) => s.id.startsWith("group:"));
  const rowTitle = (id: string) => x(`s_${id}` as keyof typeof X);
  const thingsTitle = scope === "near" ? x("thingsNear") : scope === "pref" ? x("thingsPref") : x("thingsAll");

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sakura">🇯🇵 {x("scopeAll")}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{x("title")}</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted">{x("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/map?layer=places" className="flex min-h-10 items-center gap-1.5 rounded-full border border-glass-border px-4 text-sm font-medium text-foreground/90 hover:border-azure/40">
            <Compass size={15} aria-hidden="true" />
            <Tx en="Map" />
          </Link>
          <Link href="/explore/trip" className="flex min-h-10 items-center gap-1.5 rounded-full border border-neon-purple/40 bg-neon-purple/10 px-4 text-sm font-medium text-[#c4b5fd] hover:bg-neon-purple/20">
            <ListChecks size={15} aria-hidden="true" />
            {x("trip")}
            {trip.ids.length > 0 && <span className="rounded-full bg-neon-purple px-1.5 text-[10px] font-bold text-white">{trip.ids.length}</span>}
          </Link>
        </div>
      </header>

      <LocationBar loc={loc} scope={scope} setScope={setScope} />

      {sections.loading && (
        <p role="status" className="text-sm text-muted">
          {x("loading")}
        </p>
      )}
      {sections.failed && (
        <div role="alert" className="flex items-center gap-3 rounded-2xl border border-sakura/25 bg-sakura/5 p-4 text-sm text-foreground">
          {x("failed")}
          <button type="button" onClick={sections.retry} className="rounded-full bg-sakura/20 px-3 py-1 text-xs font-semibold text-sakura">
            {x("retry")}
          </button>
        </div>
      )}

      {today && (
        <section aria-label={x("today")} className="rounded-2xl border border-azure/25 bg-gradient-to-br from-azure/10 via-transparent to-neon-purple/10 p-4 sm:p-5">
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
          <ul className="-mx-3 mt-4 flex snap-x scroll-pl-3 gap-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0">
            {today.items.map((p) => (
              <li key={p.id} className="w-[17rem] shrink-0 snap-start sm:w-[18.5rem]">
                <DestinationCard place={p} approximateDistance={approx} compact />
              </li>
            ))}
          </ul>
        </section>
      )}

      {rows.map((s) => (
        <Row key={s.id} section={s} approx={approx} title={rowTitle(s.id)} note={s.id === "seasonal" ? x("explainSeason") : s.reason === "weekend" ? x("weekendNote") : undefined} />
      ))}

      {groupRows.length > 0 && (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{thingsTitle}</h2>
            <p className="text-xs text-muted">{x("thingsNote")}</p>
          </div>
          {groupRows.map((s) => {
            const g = GROUPS.find((gr) => gr.id === (s.id.slice(6) as GroupId));
            return <Row key={s.id} section={s} approx={approx} title={g ? pickLabel(g.label, language) : s.id} />;
          })}
        </div>
      )}

      <Browse scope={scope} loc={loc} />

      <p className="border-t border-glass-border pt-4 text-[11px] leading-relaxed text-muted">
        {x("coverage")}: {meta.total.toLocaleString()} {x("coverageText")} {meta.prefecturesCovered} {x("coveragePrefs")}
      </p>
    </div>
  );
}
