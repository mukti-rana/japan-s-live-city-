"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Landmark, MapPin, Newspaper, Search, X, type LucideIcon } from "lucide-react";
import { CITIES } from "@/lib/data/cities";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useInline, type Table } from "@/lib/i18n/inline";
import { ICON_BUTTON, useDismiss } from "@/components/layout/usePopover";

const TEXT = {
  news: { en: "Search news for", ja: "ニュースを検索：" },
  events: { en: "Search events for", ja: "イベントを検索：" },
  pages: { en: "Go to", ja: "移動" },
  cities: { en: "Cities", ja: "都市" },
  search: { en: "Search", ja: "検索" },
  close: { en: "Close search", ja: "検索を閉じる" },
  none: { en: "Type to search news and events, or jump to a page.", ja: "ニュースやイベントを検索、またはページへ移動できます。" },
} satisfies Table;

interface Suggestion {
  id: string;
  label: string;
  hint?: string;
  href: string;
  icon: LucideIcon;
  group: "search" | "page" | "city";
}

// Destinations people look for first. Labels come from the site's own
// navigation translations; the English name always matches too.
const PAGES: { href: string; key: string; en: string; ja: string }[] = [
  { href: "/map", key: "nav.map", en: "map", ja: "地図" },
  { href: "/trains", key: "nav.trains", en: "trains stations", ja: "電車 駅 鉄道" },
  { href: "/weather", key: "nav.weather", en: "weather forecast", ja: "天気" },
  { href: "/news", key: "nav.news", en: "news", ja: "ニュース" },
  { href: "/events", key: "nav.events", en: "events festivals", ja: "イベント 祭り" },
  { href: "/calendar", key: "nav.calendar", en: "calendar", ja: "カレンダー" },
  { href: "/emergency", key: "nav.emergency", en: "emergency sos", ja: "緊急" },
  { href: "/explore", key: "nav.explore", en: "explore places", ja: "観光" },
  { href: "/trending", key: "nav.trending", en: "trending", ja: "トレンド" },
  { href: "/cities", key: "nav.cities", en: "cities", ja: "都市" },
];

// The header's search. Typing offers: a news search, an events search (both
// open those pages already filtered), and shortcuts to matching pages and
// cities. Phones show a search icon that opens a full-width search row.
export default function HeaderSearch() {
  const { t, language } = useLanguage();
  const text = useInline(TEXT);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();
  const mobileInput = useRef<HTMLInputElement>(null);

  // Opening the phone search row puts the cursor straight into it.
  useEffect(() => {
    if (expanded) mobileInput.current?.focus();
  }, [expanded]);

  const q = query.trim();
  const close = useCallback(() => {
    setOpen(false);
    setExpanded(false);
  }, []);
  useDismiss(open || expanded, close, ref);

  const suggestions = useMemo<Suggestion[]>(() => {
    const needle = q.toLowerCase();
    const out: Suggestion[] = [];
    if (q) {
      out.push({ id: "news", label: `${text("news")} “${q}”`, href: `/news?q=${encodeURIComponent(q)}`, icon: Newspaper, group: "search" });
      out.push({ id: "events", label: `${text("events")} “${q}”`, href: `/events?q=${encodeURIComponent(q)}`, icon: CalendarDays, group: "search" });
    }
    const pages = PAGES.filter((p) => {
      if (!needle) return true;
      return `${t(p.key as never)} ${p.en} ${p.ja}`.toLowerCase().includes(needle);
    }).slice(0, q ? 4 : 6);
    for (const p of pages) out.push({ id: p.href, label: t(p.key as never), href: p.href, icon: Landmark, group: "page" });
    if (q) {
      for (const c of CITIES) {
        if (`${c.name} ${c.nameJa}`.toLowerCase().includes(needle)) {
          out.push({ id: `city-${c.slug}`, label: language === "ja" ? c.nameJa : c.name, hint: c.region, href: `/${c.slug}`, icon: MapPin, group: "city" });
        }
      }
    }
    return out;
  }, [q, language, t, text]);

  function go(s: Suggestion | undefined) {
    if (!s) return;
    close();
    setQuery("");
    router.push(s.href);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % Math.max(suggestions.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + suggestions.length) % Math.max(suggestions.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(suggestions[active] ?? suggestions[0]);
    }
  }

  const input = (id: string, extra: string, autoFocus = false) => (
    <input
      id={id}
      ref={autoFocus ? mobileInput : undefined}
      type="search"
      role="combobox"
      aria-expanded={open}
      aria-controls={listId}
      aria-autocomplete="list"
      aria-activedescendant={open ? `${listId}-${active}` : undefined}
      aria-label={t("topbar.searchPlaceholder")}
      autoFocus={autoFocus}
      autoComplete="off"
      value={query}
      placeholder={t("topbar.searchPlaceholder")}
      onChange={(e) => {
        setQuery(e.target.value);
        setActive(0);
        setOpen(true);
      }}
      onFocus={() => setOpen(true)}
      onKeyDown={onKeyDown}
      className={`h-9 w-full rounded-full border border-glass-border bg-glass-bg pl-9 pr-3 text-xs text-foreground placeholder:text-muted transition-colors [&::-webkit-search-cancel-button]:hidden hover:border-azure/30 focus:border-azure/50 focus:outline-none focus:ring-2 focus:ring-azure/20 ${extra}`}
    />
  );

  return (
    <div ref={ref} className={`${expanded ? "max-sm:absolute max-sm:inset-0 max-sm:z-40 max-sm:flex max-sm:items-center max-sm:gap-2 max-sm:bg-sidebar-bg max-sm:px-4" : ""} min-w-0 sm:relative sm:max-w-2xl sm:flex-1`}>
      {/* Phones: a search icon that opens a full-width row. */}
      {!expanded && (
        <button type="button" onClick={() => setExpanded(true)} aria-label={text("search")} title={text("search")} className={`${ICON_BUTTON} ml-auto sm:hidden`}>
          <Search size={18} aria-hidden="true" />
        </button>
      )}

      <div className={`${expanded ? "relative flex-1" : "relative hidden sm:block"}`}>
        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-muted" aria-hidden="true" />
        {input(`${listId}-input`, "", expanded)}
      </div>
      {expanded && (
        <button type="button" onClick={close} aria-label={text("close")} className={`${ICON_BUTTON} sm:hidden`}>
          <X size={18} aria-hidden="true" />
        </button>
      )}

      {open && (
        <div
          className={`z-50 overflow-hidden rounded-2xl border border-glass-border bg-panel p-1.5 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.7)] max-sm:fixed max-sm:inset-x-3 max-sm:top-full max-sm:mt-2 sm:absolute sm:inset-x-0 sm:top-full sm:mt-2 ${expanded || "max-sm:hidden"}`}
        >
          <ul id={listId} role="listbox" className="max-h-80 overflow-y-auto">
            {suggestions.length === 0 && <li className="px-3 py-3 text-xs text-muted">{text("none")}</li>}
            {suggestions.map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={s.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(s)}
                    className={`flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm transition-colors ${
                      i === active ? "bg-glass-bg-strong text-foreground" : "text-foreground/85"
                    }`}
                  >
                    <Icon size={15} className={s.group === "search" ? "shrink-0 text-azure" : "shrink-0 text-muted"} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{s.label}</span>
                    {s.hint && <span className="shrink-0 text-xs text-muted">{s.hint}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
