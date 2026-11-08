"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Flame, TrendingUp } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import ViewAllButton from "@/components/ui/ViewAllButton";
import type { RadarTopic, TrendCategory, TrendRadarData, TrendStatus } from "@/lib/services/trendRadar";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTranslate } from "@/lib/i18n/inline";

const CATEGORIES: { id: "all" | TrendCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "news", label: "Japan News" },
  { id: "local", label: "Local Trends" },
  { id: "anime", label: "Anime & Manga" },
  { id: "tech", label: "Technology & AI" },
  { id: "sports", label: "Sports" },
  { id: "entertainment", label: "Entertainment" },
  { id: "travel", label: "Travel & Culture" },
  { id: "festival", label: "Festivals & Events" },
];
const CATEGORY_LABEL = new Map(CATEGORIES.map((c) => [c.id, c.label]));

const STATUS_LABEL: Record<TrendStatus, string> = { new: "New", rising: "Rising", popular: "Popular" };
const STATUS_TONE: Record<TrendStatus, string> = { new: "bg-mint/15 text-mint", rising: "bg-sakura/15 text-sakura", popular: "bg-gold/15 text-gold" };

const SLIDE_MS = 7000;
const REFRESH_MS = 10 * 60 * 1000;
const STALE_AFTER_MS = 3 * 3600_000;
const SLIDES = 6;

// Whether the visitor's system asks for less motion.
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia("(prefers-reduced-motion: reduce)");
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

const views = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1000)}K` : String(n));

// A name in the reader's language when Wikipedia has one, else the Japanese title.
function useTitles() {
  const { language } = useLanguage();
  return (t: RadarTopic): { title: string; original: string | null } => {
    const local = language === "ja" ? null : t.names[language];
    return local ? { title: local, original: t.title } : { title: t.title, original: null };
  };
}

function ago(ms: number, tr: (s: string) => string): string {
  const mins = Math.max(0, Math.round(ms / 60_000));
  if (mins < 2) return tr("just now");
  if (mins < 60) return tr("{n} min ago").replace("{n}", String(mins));
  const hours = Math.round(mins / 60);
  return hours < 48 ? tr("{n} h ago").replace("{n}", String(hours)) : tr("{n} days ago").replace("{n}", String(Math.round(hours / 24)));
}

function Slide({ topic, active, data, now }: { topic: RadarTopic; active: boolean; data: TrendRadarData; now: number }) {
  const tr = useTranslate();
  const { language } = useLanguage();
  const names = useTitles()(topic);
  // The explanation is Wikipedia's own introduction: English when the reader
  // reads English or another non-Japanese language and an English one exists.
  const summary = language === "ja" ? (topic.summary.ja ?? topic.description) : (topic.summary.en ?? topic.summary.ja ?? topic.description);
  const inJapanese = language !== "ja" && !topic.summary.en && Boolean(topic.summary.ja ?? topic.description);
  // Say so when the introduction is in a language other than the reader's.
  const inEnglish = language !== "en" && language !== "ja" && Boolean(topic.summary.en);

  return (
    <article aria-hidden={!active} className="grid w-full shrink-0 gap-4 sm:grid-cols-[1.05fr_1fr] sm:gap-6" >
      <div className="relative min-h-52 overflow-hidden rounded-2xl border border-glass-border sm:min-h-64">
        {topic.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- Wikipedia thumbnails are served by Wikimedia's own image service
          <img src={topic.image.url} alt={names.title} loading="lazy" decoding="async" referrerPolicy="no-referrer" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#16204a] via-[#1b1647] to-[#2a1459]" aria-hidden="true">
            <Flame size={56} strokeWidth={1.2} className="text-[#c4b5fd]/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e1a]/80 via-transparent to-transparent" aria-hidden="true" />
        <span className="absolute left-3 top-3 flex h-9 min-w-9 items-center justify-center rounded-xl bg-background/80 px-2 text-sm font-bold tabular-nums text-foreground backdrop-blur-sm">#{topic.rank}</span>
        {topic.image && (
          <a href={topic.image.page} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 left-3 rounded bg-black/55 px-1.5 py-0.5 text-[9px] text-white/80 hover:text-white" tabIndex={active ? 0 : -1}>
            {tr("Image")}: Wikipedia
          </a>
        )}
      </div>

      <div className="flex min-w-0 flex-col justify-center gap-2.5 py-1">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {topic.status && <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold ${STATUS_TONE[topic.status]}`}><TrendingUp size={11} aria-hidden="true" />{tr(STATUS_LABEL[topic.status])}</span>}
          {topic.category && <span className="rounded-full bg-azure/15 px-2.5 py-0.5 font-medium text-azure">{tr(CATEGORY_LABEL.get(topic.category) ?? "")}</span>}
          <span className="text-muted">{tr("{n} views").replace("{n}", views(topic.views))}</span>
        </div>
        <h3 className={`text-xl font-semibold leading-snug tracking-tight text-foreground sm:text-2xl ${names.original ? "" : "font-jp"}`}>{names.title}</h3>
        {names.original && <p className="font-jp -mt-1.5 text-xs text-muted">{names.original}</p>}
        {summary ? (
          <p className={`line-clamp-4 text-sm leading-relaxed text-foreground/75 ${language === "ja" || inJapanese ? "font-jp" : ""}`}>
            {summary}
            {(inJapanese || inEnglish) && <span className="ml-1.5 whitespace-nowrap rounded-full bg-glass-bg-strong px-2 py-0.5 font-sans text-[10px] text-foreground/70">{inJapanese ? tr("Original: Japanese") : tr("Original: English")}</span>}
          </p>
        ) : (
          <p className="text-sm text-muted">{tr("No description is available for this topic yet.")}</p>
        )}
        <p className="text-[11px] text-muted">
          {tr("Source")}: {tr("Japanese Wikipedia")} · {tr("Data for {date}").replace("{date}", data.dataDate)} · {tr("updated")} {ago(now - data.fetchedAt, tr)}
        </p>
        <div>
          <a href={topic.url} target="_blank" rel="noopener noreferrer" tabIndex={active ? 0 : -1} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-gradient-to-r from-azure to-neon-purple px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            {tr("Explore story")}
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}

// An animated window onto what Japan is reading about: the featured trending
// topics slide on their own every 7 seconds (never when the visitor has asked
// for reduced motion, and paused while they hover, focus, touch or drag), with
// arrows, dots, swipe and drag. Data comes from the same Wikimedia source as
// the Trending page; nothing here is made up.
export default function TrendRadar({ initial }: { initial: TrendRadarData | null }) {
  const tr = useTranslate();
  const reduced = useReducedMotion();
  const names = useTitles();
  const [data, setData] = useState<TrendRadarData | null>(initial && initial.items.length > 0 ? initial : null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [category, setCategory] = useState<"all" | TrendCategory>("all");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [drag, setDrag] = useState<{ startX: number; dx: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const moved = useRef(false);

  // Background refresh: on mount if nothing came with the page, then every
  // 10 minutes. A failed refresh keeps what is on screen (its age stays visible).
  const refresh = useCallback(() => {
    fetch("/api/trends")
      .then((r) => (r.ok ? (r.json() as Promise<TrendRadarData>) : Promise.reject(new Error("failed"))))
      .then((d) => {
        if (d.items?.length > 0) {
          setData(d);
          setLoadFailed(false);
        }
      })
      .catch(() => setLoadFailed(true));
  }, []);
  useEffect(() => {
    if (!data) refresh();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, REFRESH_MS);
    const tick = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      window.clearInterval(id);
      window.clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = useMemo(() => data?.items ?? [], [data]);
  const filtered = useMemo(() => (category === "all" ? items : items.filter((i) => i.category === category)), [items, category]);
  const slides = filtered.slice(0, SLIDES);
  const strip = filtered.slice(SLIDES, SLIDES + 8);
  const count = slides.length;
  const at = count ? Math.min(index, count - 1) : 0;

  const go = useCallback((i: number) => setIndex(count ? (i + count) % count : 0), [count]);

  // Slide on its own — only with something to slide to, motion allowed, and no
  // interaction in progress; not while the tab is hidden.
  useEffect(() => {
    if (count < 2 || reduced || paused || drag) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") setIndex((i) => (i + 1) % count);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [count, reduced, paused, drag]);

  const age = data ? now - data.fetchedAt : 0;
  const old = Boolean(data && (data.stale || age > STALE_AFTER_MS));

  function onPointerDown(e: React.PointerEvent) {
    if (count < 2 || (e.pointerType === "mouse" && e.button !== 0)) return;
    moved.current = false;
    setDrag({ startX: e.clientX, dx: 0 });
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) > 6) moved.current = true;
    setDrag({ ...drag, dx });
  }
  function onPointerUp() {
    if (!drag) return;
    if (drag.dx < -50) go(at + 1);
    else if (drag.dx > 50) go(at - 1);
    setDrag(null);
  }

  return (
    <GlassCard className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sakura/15 text-sakura">
            <Flame size={17} aria-hidden="true" />
          </span>
          <div>
            <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-foreground/90">
              {tr("Japan Trend Radar")}
              {data && !old && (
                <span title={tr("Refreshed in the background; the counts are for the latest complete day.")} className="flex items-center gap-1.5 rounded-full bg-mint/10 px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-mint">
                  <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_6px_1px_rgba(74,222,128,0.8)] motion-safe:animate-pulse" aria-hidden="true" />
                  {tr("Live")}
                </span>
              )}
              {data && old && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-gold">{tr("Older data")} · {ago(age, tr)}</span>}
            </h2>
            <p className="text-xs text-muted">{tr("What's capturing Japan's attention right now?")}</p>
          </div>
        </div>
        <ViewAllButton href="/trending" label={tr("View All")} />
      </div>

      {/* Categories */}
      <div role="group" aria-label={tr("Categories")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((c) => {
          const n = c.id === "all" ? items.length : items.filter((i) => i.category === c.id).length;
          const on = category === c.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              disabled={n === 0}
              title={n === 0 ? tr("No topics in this category right now.") : undefined}
              onClick={() => {
                setCategory(c.id);
                setIndex(0);
              }}
              className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure disabled:cursor-not-allowed disabled:opacity-40 ${on ? "border-azure/50 bg-azure/20 text-azure" : "border-glass-border bg-glass-bg text-foreground/75 hover:border-white/25 hover:text-foreground"}`}
            >
              {tr(c.label)}
            </button>
          );
        })}
      </div>

      {!data ? (
        <div className="rounded-2xl border border-dashed border-glass-border p-8 text-center text-sm text-muted" role="status">
          {loadFailed ? tr("Trending topics couldn't be loaded right now. Please try again shortly.") : tr("Loading…")}
          {loadFailed && (
            <div className="mt-3">
              <button type="button" onClick={refresh} className="rounded-full bg-sakura/20 px-4 py-1.5 text-xs font-semibold text-sakura">
                {tr("Try again")}
              </button>
            </div>
          )}
        </div>
      ) : count === 0 ? (
        <p className="rounded-2xl border border-dashed border-glass-border p-8 text-center text-sm text-muted">{tr("No topics in this category right now.")}</p>
      ) : (
        <>
          <div
            role="region"
            aria-roledescription="carousel"
            aria-label={tr("Trending topics")}
            className="relative"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") go(at + 1);
              if (e.key === "ArrowLeft") go(at - 1);
            }}
          >
            <div
              className="overflow-hidden"
              style={{ touchAction: "pan-y" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onClickCapture={(e) => {
                // A drag that ended on a link must not open it.
                if (moved.current) {
                  e.preventDefault();
                  e.stopPropagation();
                  moved.current = false;
                }
              }}
            >
              <div
                className={`flex ${drag || reduced ? "" : "transition-[transform,opacity] duration-700 ease-out"}`}
                style={{ transform: `translateX(calc(${-at * 100}% + ${drag ? drag.dx : 0}px))` }}
                aria-live={paused || reduced ? "polite" : "off"}
              >
                {slides.map((t, i) => (
                  <div key={t.id} className={`w-full shrink-0 ${reduced ? "" : "transition-opacity duration-700"} ${i === at ? "opacity-100" : "opacity-0"}`} role="group" aria-roledescription="slide" aria-label={`${i + 1} / ${count}`}>
                    <Slide topic={t} active={i === at} data={data} now={now} />
                  </div>
                ))}
              </div>
            </div>
            {count > 1 && (
              <>
                <button type="button" aria-label={tr("Previous topic")} onClick={() => go(at - 1)} className="absolute left-1 top-24 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-background/70 text-foreground backdrop-blur-sm hover:bg-background/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure sm:top-28">
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <button type="button" aria-label={tr("Next topic")} onClick={() => go(at + 1)} className="absolute right-1 top-24 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-background/70 text-foreground backdrop-blur-sm hover:bg-background/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure sm:top-28 sm:right-[calc(50%+0.25rem)]">
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </>
            )}
            {count > 1 && (
              <div className="mt-3 flex items-center justify-center gap-2" role="tablist" aria-label={tr("Choose a topic")}>
                {slides.map((t, i) => (
                  <button key={t.id} type="button" role="tab" aria-selected={i === at} aria-label={`${tr("Topic")} ${i + 1}: ${names(t).title}`} onClick={() => go(i)} className="group flex h-4 items-center focus-visible:outline-none">
                    <span className={`block h-1.5 rounded-full transition-all duration-300 group-focus-visible:ring-2 group-focus-visible:ring-azure ${i === at ? "w-6 bg-gradient-to-r from-azure to-neon-purple" : "w-1.5 bg-glass-border group-hover:bg-white/40"}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {strip.length > 0 && (
            <ul className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]" aria-label={tr("More trending topics")}>
              {strip.map((t) => (
                <li key={t.id} className="w-48 shrink-0">
                  <a href={t.url} target="_blank" rel="noopener noreferrer" className="group flex h-full flex-col gap-1 rounded-xl border border-glass-border bg-glass-bg p-3 transition-colors hover:border-azure/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                    <span className="flex items-center gap-1.5 text-[10px] text-muted">
                      <span className="font-bold tabular-nums text-foreground/80">#{t.rank}</span>
                      {t.status ? <span className={`rounded-full px-1.5 py-0.5 font-semibold ${STATUS_TONE[t.status]}`}>{tr(STATUS_LABEL[t.status])}</span> : t.category && <span className="truncate">{tr(CATEGORY_LABEL.get(t.category) ?? "")}</span>}
                    </span>
                    <span className={`line-clamp-2 text-xs font-medium leading-snug text-foreground group-hover:text-azure ${names(t).original ? "" : "font-jp"}`}>{names(t).title}</span>
                    {t.status && t.category && <span className="truncate text-[10px] text-muted">{tr(CATEGORY_LABEL.get(t.category) ?? "")}</span>}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </GlassCard>
  );
}
