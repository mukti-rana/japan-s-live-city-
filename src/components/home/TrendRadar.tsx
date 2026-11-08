"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, Flame, TrendingUp } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import ViewAllButton from "@/components/ui/ViewAllButton";
import Link from "next/link";
import { CATEGORIES, CATEGORY_LABEL, STATUS_LABEL, STATUS_TONE, TrendImage, ago, useNow, useTrendText } from "@/components/trends/shared";
import type { RadarTopic, TrendCategory, TrendRadarData } from "@/lib/services/trendRadar";
import { useTranslate } from "@/lib/i18n/inline";

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

function Slide({ topic, active, data, now }: { topic: RadarTopic; active: boolean; data: TrendRadarData; now: number }) {
  const tr = useTranslate();
  const text = useTrendText();
  const names = text.title(topic);
  const about = text.explanation(topic);
  const change = text.change(topic, data);

  return (
    <article aria-hidden={!active} className="grid w-full shrink-0 gap-4 sm:grid-cols-[1.1fr_1fr] sm:gap-6">
      <div className="relative">
        <TrendImage topic={topic} alt={names.title} className="aspect-video w-full rounded-2xl border border-glass-border" />
        <span className="absolute left-3 top-3 flex h-9 min-w-9 items-center justify-center rounded-xl bg-background/80 px-2 text-sm font-bold tabular-nums text-foreground backdrop-blur-sm" title={text.rank(topic)}>#{topic.rank}</span>
        {topic.image && (
          <a href={topic.image.page} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 left-3 rounded bg-black/55 px-1.5 py-0.5 text-[9px] text-white/80 hover:text-white" tabIndex={active ? 0 : -1}>
            {tr("Image")}: Wikipedia
          </a>
        )}
      </div>

      <div className="flex min-w-0 flex-col justify-center gap-2.5 py-1">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {topic.category && <span className="rounded-full bg-azure/15 px-2.5 py-0.5 font-medium text-azure">{tr(CATEGORY_LABEL.get(topic.category) ?? "")}</span>}
          {topic.status && <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold ${STATUS_TONE[topic.status]}`}><TrendingUp size={11} aria-hidden="true" />{tr(STATUS_LABEL[topic.status])}</span>}
          <span className="font-medium text-foreground/80">{text.views(topic)}</span>
        </div>
        <h3 className={`text-xl font-semibold leading-snug tracking-tight text-foreground sm:text-2xl ${names.original ? "" : "font-jp"}`}>{names.title}</h3>
        {names.original && <p className="font-jp -mt-1.5 text-xs text-muted">{names.original}</p>}
        {about.text ? (
          <p className={`line-clamp-3 text-sm leading-relaxed text-foreground/75 ${about.lang === "ja" ? "font-jp" : ""}`}>
            {about.text}
          </p>
        ) : (
          <p className="text-sm text-muted">{tr("No description is available for this topic yet.")}</p>
        )}
        <div className="rounded-xl border border-glass-border bg-glass-bg px-3 py-2 text-[11px] leading-relaxed text-foreground/75">
          <p>{text.why(data)}</p>
          {change && <p className="mt-0.5 font-medium text-foreground/85">{change}</p>}
        </div>
        <p className="text-[11px] leading-relaxed text-muted">
          {tr("Source")}: {tr("Japanese Wikipedia page views")} · {text.measured(data)} · {text.retrieved(data, now)}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/trending/${encodeURIComponent(topic.id)}`} tabIndex={active ? 0 : -1} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-gradient-to-r from-azure to-neon-purple px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            {tr("Explore story")}
          </Link>
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
  const text = useTrendText();
  const [data, setData] = useState<TrendRadarData | null>(initial && initial.items.length > 0 ? initial : null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [category, setCategory] = useState<"all" | TrendCategory>("all");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [drag, setDrag] = useState<{ startX: number; dx: number } | null>(null);
  const now = useNow();
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
    return () => {
      window.clearInterval(id);
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

  const age = data && now ? now - data.fetchedAt : 0;
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
              {data && !old && now > 0 && (
                <span title={tr("Page views are counted per day, so this ranking changes once a day. The page checks for new data every 10 minutes.")} className="rounded-full bg-glass-bg-strong px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-foreground/75">
                  {tr("Updated")} {ago(age, tr)}
                </span>
              )}
              {data && old && now > 0 && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-gold">{tr("Older data")} · {ago(age, tr)}</span>}
            </h2>
            <p className="text-xs text-muted">{tr("What's capturing Japan's attention right now?")} <span className="text-muted/80">· {tr("Most-viewed Japanese Wikipedia articles")}</span></p>
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
                  <button key={t.id} type="button" role="tab" aria-selected={i === at} aria-label={`${tr("Topic")} ${i + 1}: ${text.title(t).title}`} onClick={() => go(i)} className="group flex h-4 items-center focus-visible:outline-none">
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
                  <Link href={`/trending/${encodeURIComponent(t.id)}`} className="group flex h-full flex-col gap-1 rounded-xl border border-glass-border bg-glass-bg p-3 transition-colors hover:border-azure/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                    <span className="flex items-center gap-1.5 text-[10px] text-muted">
                      <span className="font-bold tabular-nums text-foreground/80">#{t.rank}</span>
                      {t.status ? <span className={`rounded-full px-1.5 py-0.5 font-semibold ${STATUS_TONE[t.status]}`}>{tr(STATUS_LABEL[t.status])}</span> : t.category && <span className="truncate">{tr(CATEGORY_LABEL.get(t.category) ?? "")}</span>}
                    </span>
                    <span className={`line-clamp-2 text-xs font-medium leading-snug text-foreground group-hover:text-azure ${text.title(t).original ? "" : "font-jp"}`}>{text.title(t).title}</span>
                    {t.status && t.category && <span className="truncate text-[10px] text-muted">{tr(CATEGORY_LABEL.get(t.category) ?? "")}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </GlassCard>
  );
}
