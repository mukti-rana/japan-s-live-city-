"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Building2, Landmark, MapPin, Search, X } from "lucide-react";
import { PREFECTURE_CENTER } from "@/lib/events/geo";
import { useInline, type Table } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { MAP_CITIES } from "@/lib/map/cities";
import { PREFECTURES, resolvePlace } from "@/lib/news/places";
import { WEATHER_CITIES } from "@/lib/data/weatherCities";

export interface SearchEntry {
  id: string;
  name: string;
  nameJa: string;
  sub: string;
  lat: number;
  lon: number;
  zoom: number;
  kind: "city" | "prefecture";
  // A city shown on the map with its own panel.
  mapCitySlug?: string;
  prefectureId?: string;
}

const TEXT = {
  placeholder: { en: "City or prefecture…", ja: "都市・都道府県を検索" },
  clear: { en: "Clear search", ja: "検索をクリア" },
  none: { en: "No match. Try a city or prefecture name.", ja: "該当なし。都市名・都道府県名でお試しください。" },
  city: { en: "City", ja: "都市" },
  prefecture: { en: "Prefecture", ja: "都道府県" },
  note: { en: "Stations, attractions and street addresses aren't searchable yet.", ja: "駅・観光地・住所の検索は未対応です。" },
} satisfies Table;

// Everything the map can find: the major cities, the other cities the site
// has real coordinates for, and all 47 prefectures (by their centre).
function buildIndex(): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const seen = new Set<string>();
  for (const c of MAP_CITIES) {
    seen.add(c.name.toLowerCase());
    entries.push({ id: `city-${c.slug}`, name: c.name, nameJa: c.nameJa, sub: c.prefecture, lat: c.lat, lon: c.lon, zoom: 10, kind: "city", mapCitySlug: c.slug, prefectureId: c.prefectureId });
  }
  for (const c of WEATHER_CITIES) {
    if (seen.has(c.name.toLowerCase())) continue;
    seen.add(c.name.toLowerCase());
    const pref = resolvePlace(c.name);
    entries.push({ id: `wc-${c.slug}`, name: c.name, nameJa: c.nameJa, sub: pref?.prefectureName ?? "Japan", lat: c.lat, lon: c.lon, zoom: 10, kind: "city", prefectureId: pref?.prefectureId });
  }
  for (const p of PREFECTURES) {
    const centre = PREFECTURE_CENTER[p.id];
    if (!centre) continue;
    entries.push({ id: `pref-${p.id}`, name: p.en, nameJa: p.ja, sub: "", lat: centre[0], lon: centre[1], zoom: 8, kind: "prefecture", prefectureId: p.id });
  }
  return entries;
}

const INDEX = buildIndex();

export default function MapSearch({ onPick }: { onPick: (entry: SearchEntry) => void }) {
  const { language } = useLanguage();
  const text = useInline(TEXT);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const ref = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return [];
    const scored: { e: SearchEntry; score: number }[] = [];
    for (const e of INDEX) {
      const hay = [e.name.toLowerCase(), e.nameJa, e.sub.toLowerCase()];
      let score = 0;
      if (hay[0] === q || hay[1] === q) score = 100;
      else if (hay[0].startsWith(q) || hay[1].startsWith(q)) score = 80;
      else if (hay[0].includes(q) || hay[1].includes(q)) score = 50;
      else if (hay[2].includes(q)) score = 20;
      if (score) scored.push({ e, score: score - (e.kind === "prefecture" ? 1 : 0) });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, 7).map((s) => s.e);
  }, [q]);

  function pick(e: SearchEntry | undefined) {
    if (!e) return;
    setOpen(false);
    setQuery(language === "ja" ? e.nameJa : e.name);
    onPick(e);
  }

  function onKeyDown(ev: KeyboardEvent<HTMLInputElement>) {
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      setOpen(true);
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      pick(results[active] ?? results[0]);
    } else if (ev.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative w-full">
      <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        type="search"
        role="combobox"
        aria-expanded={open && q.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && results.length ? `${listId}-${active}` : undefined}
        aria-label={text("placeholder")}
        autoComplete="off"
        value={query}
        placeholder={text("placeholder")}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
        onKeyDown={onKeyDown}
        className={`h-10 w-full rounded-full border border-glass-border bg-panel/90 pl-10 ${query ? "pr-9" : "pr-3"} text-base text-foreground shadow-lg backdrop-blur-xl transition-colors placeholder:text-muted [&::-webkit-search-cancel-button]:hidden focus:border-azure/50 focus:outline-none focus:ring-2 focus:ring-azure/25 sm:text-sm`}
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setOpen(false);
          }}
          aria-label={text("clear")}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}

      {open && q && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-glass-border bg-panel p-1.5 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.8)]">
          <ul id={listId} role="listbox">
            {results.length === 0 && <li className="px-3 py-3 text-xs text-muted">{text("none")}</li>}
            {results.map((e, i) => (
              <li key={e.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseDown={(ev) => ev.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(e)}
                  className={`flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm transition-colors ${i === active ? "bg-glass-bg-strong text-foreground" : "text-foreground/85"}`}
                >
                  {e.mapCitySlug ? <Landmark size={15} className="shrink-0 text-azure" aria-hidden="true" /> : e.kind === "prefecture" ? <Building2 size={15} className="shrink-0 text-muted" aria-hidden="true" /> : <MapPin size={15} className="shrink-0 text-muted" aria-hidden="true" />}
                  <span className="min-w-0 flex-1 truncate">
                    {language === "ja" ? e.nameJa : e.name}
                    <span className="ml-2 text-xs text-muted">{language === "ja" ? e.name : e.nameJa}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">{e.kind === "prefecture" ? text("prefecture") : e.sub || text("city")}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="border-t border-glass-border px-3 pb-1.5 pt-2 text-[11px] text-muted">{text("note")}</p>
        </div>
      )}
    </div>
  );
}
