"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe2, LocateFixed, MapPin, Navigation, Search } from "lucide-react";
import type { Suggestion } from "@/lib/explore/catalogue";
import type { useExploreLocation } from "@/lib/explore/useExploreLocation";
import { localize, useTranslate } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { MAP_CITIES } from "@/lib/map/cities";
import { PREFECTURES } from "@/lib/news/places";

export type Tab = "near" | "city" | "all";

const EXAMPLES = ["temples in Kyoto", "hot springs in winter", "hidden gems in Nagano", "family activities Osaka"];

// The top of the page: what it is, where to look (Near Me / Choose City / All
// Japan) and a search that understands places, cities, prefectures, kinds of
// place and short sentences.
export default function ExploreHero({
  tab,
  setTab,
  loc,
  onSearch,
  outside,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  loc: ReturnType<typeof useExploreLocation>;
  onSearch: (text: string) => void;
  outside: boolean;
}) {
  const tr = useTranslate();
  const { language } = useLanguage();
  const router = useRouter();
  const listId = useId();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const { gps, manual, status } = loc;

  useEffect(() => {
    const q = text.trim();
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
  }, [text, language]);

  const submit = (value: string) => {
    const v = value.trim();
    if (!v) return;
    setOpen(false);
    onSearch(v);
  };

  const tabs: { id: Tab; label: string; icon: typeof MapPin }[] = [
    { id: "near", label: "Near Me", icon: LocateFixed },
    { id: "city", label: "Choose City", icon: MapPin },
    { id: "all", label: "All Japan", icon: Globe2 },
  ];

  return (
    <header className="relative overflow-hidden rounded-3xl border border-glass-border bg-gradient-to-br from-azure/15 via-panel to-neon-purple/20 p-5 sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-neon-purple/20 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-azure/20 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#c4b5fd]">{tr("Explore Japan")}</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">{tr("Where would you like to go?")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground/75 sm:text-base">{tr("Discover amazing places, activities and experiences across Japan.")}</p>
        </div>

        {/* Search */}
        <div className="relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(text);
            }}
            role="search"
            className="relative"
          >
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="search"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder={tr("Search places, cities, prefectures, activities…")}
              aria-label={tr("Search places, cities, prefectures, activities…")}
              role="combobox"
              aria-expanded={open && suggestions.length > 0 && text.trim().length > 0}
              aria-controls={listId}
              autoComplete="off"
              className="h-14 w-full rounded-2xl border border-white/15 bg-background/60 pl-12 pr-28 text-base text-foreground outline-none backdrop-blur-md placeholder:text-muted focus:border-azure/60 focus-visible:ring-2 focus-visible:ring-azure/40"
            />
            <button type="submit" className="absolute right-2 top-1/2 flex h-10 -translate-y-1/2 items-center rounded-xl bg-gradient-to-r from-azure to-neon-purple px-5 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              {tr("Search")}
            </button>
          </form>
          {open && text.trim() && suggestions.length > 0 && (
            <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-80 overflow-y-auto rounded-2xl border border-glass-border bg-panel p-1.5 shadow-2xl">
              {suggestions.map((s) => (
                <li key={`${s.type}-${s.value}`} role="option" aria-selected="false">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setOpen(false);
                      if (s.type === "place") router.push(`/explore/${s.value}`);
                      else submit(s.type === "prefecture" ? s.label : s.value);
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
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground/65">
            {tr("Try")}:
            {EXAMPLES.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  setText(tr(e));
                  submit(e);
                }}
                className="rounded-full border border-white/15 bg-background/40 px-2.5 py-1 text-foreground/80 hover:border-azure/50 hover:text-foreground"
              >
                {tr(e)}
              </button>
            ))}
          </p>
        </div>

        {/* Where to look */}
        <div className="flex flex-col gap-3">
          <div role="tablist" aria-label={tr("Where to look")} className="flex w-full rounded-2xl border border-white/15 bg-background/50 p-1 backdrop-blur-md sm:inline-flex sm:w-fit">
            {tabs.map((t) => {
              const on = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setTab(t.id)}
                  className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-medium sm:flex-none sm:gap-2 sm:px-4 sm:text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${on ? "bg-gradient-to-r from-azure/30 to-neon-purple/30 text-foreground shadow-[inset_0_0_0_1px_rgba(77,163,255,0.4)]" : "text-foreground/70 hover:text-foreground"}`}
                >
                  <t.icon size={15} aria-hidden="true" />
                  {tr(t.label)}
                </button>
              );
            })}
          </div>

          {tab === "near" && (
            <div role="tabpanel" className="rounded-2xl border border-white/10 bg-background/40 p-3.5 backdrop-blur-md">
              {gps ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-foreground">
                      <MapPin size={16} className="text-gold" aria-hidden="true" />
                      {gps.label}
                      <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-semibold text-mint">{tr("Your current location")}</span>
                    </p>
                    <p className="mt-1 text-[11px] text-muted">
                      {tr("Distances are measured from where you are.")}
                      {gps.accuracyKm !== null ? ` ${tr("accuracy about")} ${gps.accuracyKm} km.` : ""}
                    </p>
                  </div>
                  <button type="button" onClick={loc.useMyLocation} disabled={status === "locating"} className="flex min-h-10 items-center gap-2 rounded-full border border-azure/40 px-4 text-sm font-semibold text-azure hover:bg-azure/10 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                    <LocateFixed size={15} aria-hidden="true" />
                    {status === "locating" ? tr("Finding your location…") : tr("Update location")}
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="max-w-xl">
                    <p className="text-sm font-semibold text-foreground">{tr("See what's around you")}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted">
                      {tr("Your browser will ask for permission. Your position is only used to find places and weather near you, and stays in this browser session.")}
                    </p>
                    {status === "denied" && <p role="status" className="mt-1.5 text-xs text-gold">{tr("Location permission was declined. Pick a city instead.")}</p>}
                    {status === "unavailable" && <p role="status" className="mt-1.5 text-xs text-gold">{tr("Your location couldn't be determined. Pick a city instead.")}</p>}
                    {outside && <p role="status" className="mt-1.5 text-xs text-gold">{tr("You appear to be outside Japan. Pick a Japanese city to explore from.")}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={loc.useMyLocation} disabled={status === "locating"} className="flex min-h-10 items-center gap-2 rounded-full bg-gradient-to-r from-azure to-neon-purple px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                      <LocateFixed size={15} aria-hidden="true" />
                      {status === "locating" ? tr("Finding your location…") : tr("Use my location")}
                    </button>
                    {(status === "denied" || status === "unavailable" || outside) && (
                      <button type="button" onClick={() => setTab("city")} className="flex min-h-10 items-center gap-1.5 rounded-full border border-glass-border px-4 text-sm font-medium text-foreground/90 hover:border-azure/40">
                        <MapPin size={14} aria-hidden="true" />
                        {tr("Choose City")}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "city" && (
            <div role="tabpanel" className="rounded-2xl border border-white/10 bg-background/40 p-3.5 backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-2">
                {MAP_CITIES.slice(0, 8).map((c) => {
                  const on = manual?.kind === "city" && manual.label === c.name;
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      aria-pressed={on}
                      onClick={() => loc.choosePlace("city", c.slug)}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${on ? "border-gold/60 bg-gold/15 text-gold" : "border-glass-border bg-glass-bg text-foreground/85 hover:border-gold/50"}`}
                    >
                      {localize(c.name, c.nameJa, language)}
                    </button>
                  );
                })}
                <select
                  aria-label={tr("Prefecture")}
                  value={manual?.kind === "prefecture" ? (manual.prefectureId ?? "") : ""}
                  onChange={(e) => e.target.value && loc.choosePlace("prefecture", e.target.value)}
                  className="h-9 rounded-full border border-glass-border bg-panel px-3 text-xs text-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
                >
                  <option value="">{tr("Prefecture")}…</option>
                  {PREFECTURES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {localize(p.en, p.ja, language)}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted">
                <Navigation size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                {manual ? tr("A place you chose — distances are measured from its centre, so they are approximate") : tr("Pick a city or prefecture. No location is requested.")}
              </p>
            </div>
          )}

          {tab === "all" && (
            <p role="tabpanel" className="text-xs text-foreground/70">
              {tr("Exploring all 47 prefectures. Switch to Near Me or Choose City whenever you want places close to you.")}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
