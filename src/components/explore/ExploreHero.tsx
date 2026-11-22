"use client";

import { useEffect, useId, useState, type FocusEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ExploreCaption } from "@/components/explore/ExploreBackdrop";
import ShineBorder from "@/components/ui/ShineBorder";
import SlideInHeading from "@/components/home/cinematic/SlideInHeading";
import { playfair } from "@/components/home/cinematic/fonts";
import "@/components/home/cinematic/cinematic.css";
import { ArrowRight, Globe2, LocateFixed, MapPin, Navigation, Search } from "lucide-react";
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
  const reduced = useReducedMotion();
  // The search is a small pill that opens out when it is used (focus, or anything typed), and its example searches turn over inside it.
  const [active, setActive] = useState(false);
  const [example, setExample] = useState(0);
  const leave = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setActive(false);
  };
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setExample((i) => (i + 1) % EXAMPLES.length), 3400);
    return () => window.clearInterval(id);
  }, [reduced]);
  const wide = active || text.trim().length > 0;
  // A soft light follows the pointer across the pill (CSS variables, no re-render).
  const follow = (e: ReactPointerEvent<HTMLFormElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  };

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
    <header data-explore-hero className={`${playfair.variable} keep-dark-ink relative -mx-3 -mt-3 flex min-h-[100svh] flex-col justify-end overflow-hidden sm:-mx-4 sm:-mt-4`} style={{ color: "#fff", "--btn-ink": "#ffffff", "--btn-line": "rgba(255,255,255,0.34)", "--btn-line-hover": "rgba(255,255,255,0.7)" } as React.CSSProperties}>
      {/* From a tablet up it stands at the top right of the screen, under the top bar, as it always did. */}
      <ExploreCaption className="absolute right-10 top-24 z-10 hidden sm:block lg:right-14" />
      <div className="relative mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-5 pb-10 pt-24 sm:px-10 lg:px-14 lg:pb-14">
        {/* On a phone the recommended place sits above the heading (the top-right corner is taken by the controls when they open). */}
        <ExploreCaption className="relative sm:hidden" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "rgba(255,255,255,0.78)" }}>{tr("Explore Japan")}</p>
          <h1 className="mt-3 max-w-[16ch] font-[family-name:var(--font-home-serif)] text-[clamp(44px,7.4vw,112px)] font-normal leading-[0.98] tracking-[-0.025em] [text-shadow:0_4px_40px_rgba(0,0,0,0.55)]">
            <SlideInHeading en="Where would you like to go?" />
          </h1>
          <p className="mt-4 max-w-xl text-[clamp(15px,1.35vw,19px)] leading-relaxed" style={{ color: "rgba(255,255,255,0.86)" }}>{tr("Discover amazing places, activities and experiences across Japan.")}</p>
        </div>

        {/* Search: a small pill that opens out when it is used */}
        <div className="relative w-full max-w-[40rem]" onFocus={() => setActive(true)} onBlur={leave}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(text);
            }}
            role="search"
            onPointerMove={follow}
            className={`group/search relative h-11 rounded-full border border-white/20 bg-transparent transition-[width,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none hover:border-white/50 ${wide ? "w-full border-white/40" : "w-full sm:w-[21rem] sm:hover:w-[24rem]"}`}
          >
            {/* the light under the pointer */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover/search:opacity-100 motion-reduce:hidden" style={{ background: "radial-gradient(150px circle at var(--mx, 50%) 50%, rgba(255,255,255,0.14), transparent 70%)" }} />
            {wide && <ShineBorder colors={["#ffffff", "#9fb4ff", "#ffffff"]} width={1} duration={5} />}
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-white/75 transition-all duration-300 group-hover/search:scale-110 group-hover/search:text-white group-focus-within/search:text-white motion-reduce:transition-none" aria-hidden="true" />
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
              className={`h-full w-full rounded-full bg-transparent pl-11 pr-24 text-sm text-white outline-none focus-visible:ring-0 ${!text && !active ? "placeholder:text-transparent" : "placeholder:text-white/50"}`}
            />
            {/* While it is resting and empty, example searches turn over inside it (decoration; the field's own label says what it is). */}
            {!text && !active && (
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-11 right-4 flex items-center overflow-hidden text-sm text-white/55">
                <motion.span key={example} initial={reduced ? false : { y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.45, ease: "easeOut" }} className="truncate">
                  {tr("Try")}: {tr(EXAMPLES[example])}
                </motion.span>
              </span>
            )}
            <button
              type="submit"
              tabIndex={wide ? 0 : -1}
              className={`group/go absolute right-1.5 top-1/2 flex h-8 -translate-y-1/2 items-center gap-1 rounded-full border border-white/30 bg-transparent px-3.5 text-xs font-semibold text-white transition-all duration-300 hover:scale-105 hover:border-white hover:bg-white/20 hover:shadow-[0_0_22px_-4px_rgba(255,255,255,0.55)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 motion-reduce:transition-none motion-reduce:hover:scale-100 ${wide ? "opacity-100" : "pointer-events-none translate-x-2 opacity-0 group-hover/search:pointer-events-auto group-hover/search:translate-x-0 group-hover/search:opacity-100"}`}
            >
              {tr("Search")}
              <ArrowRight size={13} aria-hidden="true" className="-ml-0.5 w-0 opacity-0 transition-all duration-300 group-hover/go:ml-0 group-hover/go:w-[13px] group-hover/go:translate-x-0.5 group-hover/go:opacity-100 motion-reduce:transition-none" />
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
          {/* The example searches as chips: they slide open under the pill only while it is in use. */}
          <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out motion-reduce:transition-none ${wide && !(open && text.trim() && suggestions.length > 0) ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`} aria-hidden={!wide}>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5 overflow-hidden pt-2 text-xs text-white/65">
              {tr("Try")}:
              {EXAMPLES.map((e) => (
                <button
                  key={e}
                  type="button"
                  tabIndex={wide ? 0 : -1}
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => {
                    setText(tr(e));
                    submit(e);
                  }}
                  className="rounded-full border border-white/20 bg-transparent px-2.5 py-1 text-white/80 transition-colors hover:border-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  {tr(e)}
                </button>
              ))}
            </p>
          </div>
        </div>

        {/* Where to look: one tidy row, the choice and, beside it, the place in a small chip */}
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
            <div role="tablist" aria-label={tr("Where to look")} className="flex w-full rounded-full border border-white/15 bg-transparent p-0.5 sm:inline-flex sm:w-fit">
              {tabs.map((t) => {
                const on = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setTab(t.id)}
                    className={`relative flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:flex-none sm:px-4 ${on ? "text-white" : "text-white/65 hover:text-white"}`}
                  >
                    {on && <motion.span layoutId="explore-tab" aria-hidden="true" className="absolute inset-0 rounded-full border border-white/35 bg-white/[0.12]" transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }} />}
                    <t.icon size={14} aria-hidden="true" className="relative" />
                    <span className="relative">{tr(t.label)}</span>
                  </button>
                );
              })}
            </div>

            {tab === "near" &&
              (gps ? (
                <div role="tabpanel" className="flex items-center gap-2 rounded-full border border-white/12 bg-transparent py-1 pl-3 pr-1 text-xs" title={`${tr("Distances are measured from where you are.")}${gps.accuracyKm !== null ? ` ${tr("accuracy about")} ${gps.accuracyKm} km.` : ""}`}>
                  <MapPin size={14} className="text-gold" aria-hidden="true" />
                  <span className="font-semibold text-white">{gps.label}</span>
                  <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-semibold text-mint">{tr("Your current location")}</span>
                  <span className="sr-only">
                    {tr("Distances are measured from where you are.")}
                    {gps.accuracyKm !== null ? ` ${tr("accuracy about")} ${gps.accuracyKm} km.` : ""}
                  </span>
                  <button type="button" onClick={loc.useMyLocation} disabled={status === "locating"} aria-label={status === "locating" ? tr("Finding your location…") : tr("Update location")} title={tr("Update location")} className="flex h-7 w-7 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:border-white/60 hover:bg-white/10 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                    <LocateFixed size={14} aria-hidden="true" className={status === "locating" ? "motion-safe:animate-spin" : ""} />
                  </button>
                </div>
              ) : (
                <div role="tabpanel" className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={loc.useMyLocation} disabled={status === "locating"} className="flex min-h-8 items-center gap-1.5 rounded-full border border-white/30 bg-transparent px-3 text-xs font-medium text-white transition-colors hover:border-white/60 hover:bg-white/10 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                    <LocateFixed size={14} aria-hidden="true" />
                    {status === "locating" ? tr("Finding your location…") : tr("Use my location")}
                  </button>
                  {(status === "denied" || status === "unavailable" || outside) && (
                    <button type="button" onClick={() => setTab("city")} className="flex min-h-8 items-center gap-1.5 rounded-full border border-white/20 bg-transparent px-3 text-xs font-medium text-white/90 transition-colors hover:border-white/50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                      <MapPin size={13} aria-hidden="true" />
                      {tr("Choose City")}
                    </button>
                  )}
                </div>
              ))}

            {tab === "all" && (
              <p role="tabpanel" className="text-xs text-white/65">
                {tr("Exploring all 47 prefectures. Switch to Near Me or Choose City whenever you want places close to you.")}
              </p>
            )}
          </div>

          {tab === "near" && !gps && (
            <p className="max-w-xl text-[11px] leading-relaxed text-white/60">
              {tr("Your browser will ask for permission. Your position is only used to find places and weather near you, and stays in this browser session.")}
            </p>
          )}
          {tab === "near" && !gps && status === "denied" && <p role="status" className="text-xs text-gold">{tr("Location permission was declined. Pick a city instead.")}</p>}
          {tab === "near" && !gps && status === "unavailable" && <p role="status" className="text-xs text-gold">{tr("Your location couldn't be determined. Pick a city instead.")}</p>}
          {tab === "near" && !gps && outside && <p role="status" className="text-xs text-gold">{tr("You appear to be outside Japan. Pick a Japanese city to explore from.")}</p>}

          {tab === "city" && (
            <div role="tabpanel" className="flex flex-wrap items-center gap-2">
              {MAP_CITIES.slice(0, 8).map((c) => {
                const on = manual?.kind === "city" && manual.label === c.name;
                return (
                  <button
                    key={c.slug}
                    type="button"
                    aria-pressed={on}
                    onClick={() => loc.choosePlace("city", c.slug)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${on ? "border-gold/60 bg-gold/15 text-gold" : "border-white/20 bg-transparent text-white/85 hover:border-white/50"}`}
                  >
                    {localize(c.name, c.nameJa, language)}
                  </button>
                );
              })}
              <select
                aria-label={tr("Prefecture")}
                value={manual?.kind === "prefecture" ? (manual.prefectureId ?? "") : ""}
                onChange={(e) => e.target.value && loc.choosePlace("prefecture", e.target.value)}
                className="h-8 rounded-full border border-white/20 bg-black/40 px-3 text-xs text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <option value="">{tr("Prefecture")}…</option>
                {PREFECTURES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {localize(p.en, p.ja, language)}
                  </option>
                ))}
              </select>
              <span className="flex items-center gap-1.5 text-[11px] text-white/60">
                <Navigation size={11} aria-hidden="true" />
                {manual ? tr("A place you chose — distances are measured from its centre, so they are approximate") : tr("Pick a city or prefecture. No location is requested.")}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
