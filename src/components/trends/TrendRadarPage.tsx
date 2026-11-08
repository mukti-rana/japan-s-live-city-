"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Flame, RefreshCw, Search, SlidersHorizontal, TrendingUp } from "lucide-react";
import { CATEGORIES, CATEGORY_LABEL, STATUS_LABEL, STATUS_TONE, TrendImage, ago, useNow, useTrendText } from "@/components/trends/shared";
import type { RadarTopic, TrendCategory, TrendRadarData, TrendStatus } from "@/lib/services/trendRadar";
import { useTranslate } from "@/lib/i18n/inline";

const NAV: ("all" | TrendCategory)[] = ["all", "news", "entertainment", "anime", "sports", "tech", "travel", "local"];
const REFRESH_MS = 10 * 60 * 1000;
const STALE_AFTER_MS = 3 * 3600_000;
const GRID = 12;

type Sort = "rank" | "views" | "change";

const href = (t: RadarTopic) => `/trending/${encodeURIComponent(t.id)}`;
const changePct = (t: RadarTopic) => (t.previous ? Math.round((t.views / t.previous.views - 1) * 100) : null);

function Skeleton() {
  return (
    <div className="flex flex-col gap-5" role="status" aria-busy="true">
      <div className="h-80 animate-pulse rounded-3xl bg-glass-bg-strong" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-72 animate-pulse rounded-2xl bg-glass-bg-strong" />
        ))}
      </div>
    </div>
  );
}

function Badges({ t }: { t: RadarTopic }) {
  const tr = useTranslate();
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
      {t.category && <span className="rounded-full bg-azure/15 px-2.5 py-0.5 font-medium text-azure">{tr(CATEGORY_LABEL.get(t.category) ?? "")}</span>}
      {t.status && (
        <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold ${STATUS_TONE[t.status]}`}>
          <TrendingUp size={11} aria-hidden="true" />
          {tr(STATUS_LABEL[t.status])}
        </span>
      )}
    </div>
  );
}

function Source({ data, now }: { data: TrendRadarData; now: number }) {
  const tr = useTranslate();
  const text = useTrendText();
  return (
    <p className="text-[11px] leading-relaxed text-muted">
      {tr("Source")}: {tr("Japanese Wikipedia page views")} · {text.measured(data)} · {text.retrieved(data, now)}
    </p>
  );
}

function Featured({ topic, data, now }: { topic: RadarTopic; data: TrendRadarData; now: number }) {
  const tr = useTranslate();
  const text = useTrendText();
  const names = text.title(topic);
  const about = text.explanation(topic);
  const change = text.change(topic, data);
  return (
    <article className="trend-in grid overflow-hidden rounded-3xl border border-azure/25 bg-gradient-to-br from-azure/10 via-glass-bg to-neon-purple/10 lg:grid-cols-[1.35fr_1fr]">
      <Link href={href(topic)} aria-label={names.title} className="relative block min-h-60 lg:min-h-[22rem]">
        <TrendImage topic={topic} alt={names.title} priority className="absolute inset-0 h-full w-full" />
        <span className="absolute left-4 top-4 flex h-11 min-w-11 items-center justify-center rounded-2xl bg-background/80 px-3 text-lg font-bold tabular-nums text-foreground backdrop-blur-sm">#{topic.rank}</span>
        {topic.image && <span className="absolute bottom-2 left-4 rounded bg-black/55 px-1.5 py-0.5 text-[9px] text-white/80">{tr("Image")}: Wikipedia</span>}
      </Link>
      <div className="flex flex-col justify-center gap-3 p-5 sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-sakura">{tr("Most viewed")}</p>
        <Badges t={topic} />
        <h2 className={`text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-3xl ${names.original ? "" : "font-jp"}`}>
          <Link href={href(topic)} className="hover:text-azure focus-visible:outline-none focus-visible:underline">{names.title}</Link>
        </h2>
        {names.original && <p className="font-jp -mt-2 text-sm text-muted">{names.original}</p>}
        {about.text ? <p className={`line-clamp-4 text-sm leading-relaxed text-foreground/80 ${about.lang === "ja" ? "font-jp" : ""}`}>{about.text}</p> : <p className="text-sm text-muted">{tr("No description is available for this topic yet.")}</p>}
        <div className="rounded-xl border border-glass-border bg-glass-bg px-3.5 py-2.5 text-xs leading-relaxed text-foreground/80">
          <p className="font-semibold text-foreground">{text.views(topic)} · {text.rank(topic)}</p>
          <p className="mt-0.5">{text.why(data)}</p>
          {change && <p className="mt-0.5 font-medium">{change}</p>}
        </div>
        <Source data={data} now={now} />
        <div>
          <Link href={href(topic)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-azure to-neon-purple px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            {tr("Explore story")}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function Card({ topic, data, index }: { topic: RadarTopic; data: TrendRadarData; index: number }) {
  const tr = useTranslate();
  const text = useTrendText();
  const names = text.title(topic);
  const about = text.explanation(topic);
  const change = text.change(topic, data);
  return (
    <li className="trend-in" style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
      <Link href={href(topic)} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-glass-border bg-glass-bg transition duration-300 hover:-translate-y-0.5 hover:border-azure/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure motion-reduce:transition-none motion-reduce:hover:translate-y-0">
        <div className="relative">
          <TrendImage topic={topic} alt={names.title} className="aspect-video w-full" />
          <span className="absolute left-3 top-3 flex h-8 min-w-8 items-center justify-center rounded-lg bg-background/80 px-2 text-xs font-bold tabular-nums text-foreground backdrop-blur-sm">#{topic.rank}</span>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <Badges t={topic} />
          <h3 className={`line-clamp-2 text-base font-semibold leading-snug text-foreground group-hover:text-azure ${names.original ? "" : "font-jp"}`}>{names.title}</h3>
          {about.text && <p className={`line-clamp-2 text-xs leading-relaxed text-foreground/70 ${about.lang === "ja" ? "font-jp" : ""}`}>{about.text}</p>}
          <div className="mt-auto flex flex-col gap-0.5 pt-1 text-[11px] text-muted">
            <span className="font-medium text-foreground/85">{text.views(topic)}</span>
            {change && <span>{change}</span>}
            <span>{tr("Japanese Wikipedia")} · {data.dataDate}</span>
          </div>
        </div>
      </Link>
    </li>
  );
}

// The whole Japan Trend Radar: the same topics as the Home section, laid out
// across the page — a featured topic, a grid of the next ones, and the full
// ranking. Search and the category row narrow all three together.
export default function TrendRadarPage({ initial }: { initial: TrendRadarData | null }) {
  const tr = useTranslate();
  const text = useTrendText();
  const [data, setData] = useState<TrendRadarData | null>(initial && initial.items.length > 0 ? initial : null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(!initial);
  const now = useNow();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<"all" | TrendCategory>("all");
  const [status, setStatus] = useState<"" | TrendStatus>("");
  const [withImage, setWithImage] = useState(false);
  const [sort, setSort] = useState<Sort>("rank");
  const [panel, setPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchTrends = useCallback(() => {
    fetch("/api/trends")
      .then((r) => (r.ok ? (r.json() as Promise<TrendRadarData>) : Promise.reject(new Error("failed"))))
      .then((d) => {
        if (d.items?.length > 0) {
          setData(d);
          setFailed(false);
        } else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);
  const refresh = useCallback(() => {
    setLoading(true);
    fetchTrends();
  }, [fetchTrends]);
  useEffect(() => {
    if (!data) fetchTrends();
    const id = window.setInterval(() => document.visibilityState === "visible" && fetchTrends(), REFRESH_MS);
    return () => {
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!panel) return;
    const onDown = (e: MouseEvent) => !panelRef.current?.contains(e.target as Node) && setPanel(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanel(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [panel]);

  const items = useMemo(() => data?.items ?? [], [data]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = items.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (status && t.status !== status) return false;
      if (withImage && !t.image) return false;
      if (needle) {
        const hay = `${t.title} ${Object.values(t.names).join(" ")} ${t.description ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    if (sort === "views") list = [...list].sort((a, b) => b.views - a.views);
    else if (sort === "change") list = [...list].filter((t) => t.previous).sort((a, b) => (changePct(b) ?? 0) - (changePct(a) ?? 0));
    return list;
  }, [items, q, category, status, withImage, sort]);

  const [featured, ...rest] = filtered;
  const grid = rest.slice(0, GRID);
  const maxViews = Math.max(1, ...filtered.map((t) => t.views));
  const age = data && now ? now - data.fetchedAt : 0;
  const old = Boolean(data && now && (data.stale || age > STALE_AFTER_MS));
  const activeFilters = [status !== "", withImage, sort !== "rank", category === "festival"].filter(Boolean).length;
  const reset = () => {
    setQ("");
    setCategory("all");
    setStatus("");
    setWithImage(false);
    setSort("rank");
  };
  const selectCls = "h-10 w-full rounded-xl border border-glass-border bg-panel px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure";

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-sakura">
              <Flame size={14} aria-hidden="true" />
              {tr("Japan Trend Radar")}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{tr("Discover the topics capturing attention across Japan.")}</h1>
            <p className="mt-1.5 max-w-3xl text-sm text-muted">
              {tr("A daily ranking of the most-viewed Japanese Wikipedia articles. It measures how many people opened each article — not social media, news coverage or search volume.")}
            </p>
          </div>
          {data && (
            <div className="flex flex-col items-start gap-1 text-[11px] text-muted sm:items-end">
              {now > 0 && (
                <span className={`rounded-full px-2.5 py-1 font-medium ${old ? "bg-gold/15 text-gold" : "bg-glass-bg-strong text-foreground/80"}`}>
                  {old ? `${tr("Older data")} · ${ago(age, tr)}` : `${tr("Updated")} ${ago(age, tr)}`}
                </span>
              )}
              <span>{text.measured(data)}</span>
              <span>{tr("Checks for new data every 10 minutes; the ranking itself changes once a day.")}</span>
            </div>
          )}
        </div>

        <div className="relative flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-0 flex-1 basis-64">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Search trending topics…")} aria-label={tr("Search trending topics…")} className="h-11 w-full rounded-xl border border-glass-border bg-glass-bg pl-10 pr-4 text-base text-foreground outline-none placeholder:text-muted focus:border-azure/50 focus-visible:ring-2 focus-visible:ring-azure/40 sm:text-sm" />
          </div>
          <div ref={panelRef} className="relative">
            <button type="button" onClick={() => setPanel((p) => !p)} aria-expanded={panel} aria-haspopup="dialog" className="flex h-11 items-center gap-2 rounded-xl border border-azure/40 bg-azure/10 px-4 text-sm font-semibold text-azure transition-colors hover:bg-azure/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              <SlidersHorizontal size={16} aria-hidden="true" />
              {tr("Filters")}
              {activeFilters > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-neon-purple px-1 text-[10px] font-bold text-white">{activeFilters}</span>}
            </button>
            {panel && (
              <div role="dialog" aria-label={tr("Filters")} className="absolute right-0 top-full z-30 mt-2 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3.5 rounded-2xl border border-glass-border bg-panel p-4 shadow-2xl">
                <label className="flex flex-col gap-1 text-[11px] font-medium text-muted">
                  {tr("Category")}
                  <select className={selectCls} value={category} onChange={(e) => setCategory(e.target.value as "all" | TrendCategory)}>
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>{tr(c.label)}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[11px] font-medium text-muted">
                  {tr("Trend")}
                  <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as "" | TrendStatus)}>
                    <option value="">{tr("Any")}</option>
                    {(["new", "rising", "popular"] as const).map((s) => (
                      <option key={s} value={s}>{tr(STATUS_LABEL[s])}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[11px] font-medium text-muted">
                  {tr("Sort by")}
                  <select className={selectCls} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                    <option value="rank">{tr("Rank")}</option>
                    <option value="views">{tr("Most page views")}</option>
                    <option value="change">{tr("Biggest increase vs previous day")}</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-xs text-foreground/85">
                  <input type="checkbox" checked={withImage} onChange={(e) => setWithImage(e.target.checked)} className="h-4 w-4 accent-[#4da3ff]" />
                  {tr("Only topics with a picture")}
                </label>
                <dl className="rounded-xl bg-glass-bg px-3 py-2 text-[11px] leading-relaxed text-muted">
                  <div className="flex justify-between gap-3"><dt>{tr("Source")}</dt><dd className="text-right text-foreground/80">{tr("Japanese Wikipedia")}</dd></div>
                  <div className="flex justify-between gap-3"><dt>{tr("Period")}</dt><dd className="text-right text-foreground/80">{tr("Latest complete UTC day")}</dd></div>
                  <div className="flex justify-between gap-3"><dt>{tr("Language")}</dt><dd className="text-right text-foreground/80">{tr("Japanese articles")}</dd></div>
                </dl>
                <div className="flex items-center justify-between">
                  <button type="button" onClick={reset} className="text-xs font-medium text-muted underline-offset-2 hover:text-foreground hover:underline">{tr("Reset filters")}</button>
                  <button type="button" onClick={() => setPanel(false)} className="rounded-full bg-gradient-to-r from-azure to-neon-purple px-4 py-1.5 text-xs font-semibold text-white">{tr("Done")}</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div role="group" aria-label={tr("Categories")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV.map((id) => {
            const n = id === "all" ? items.length : items.filter((i) => i.category === id).length;
            const on = category === id;
            return (
              <button key={id} type="button" aria-pressed={on} disabled={Boolean(data) && n === 0} title={data && n === 0 ? tr("No topics in this category right now.") : undefined} onClick={() => setCategory(id)} className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure disabled:cursor-not-allowed disabled:opacity-40 ${on ? "border-azure/50 bg-azure/20 text-azure" : "border-glass-border bg-glass-bg text-foreground/75 hover:border-white/25 hover:text-foreground"}`}>
                {tr(CATEGORY_LABEL.get(id) ?? "")}
                {data && id !== "all" && n > 0 && <span className="ml-1.5 text-muted">{n}</span>}
              </button>
            );
          })}
        </div>
      </header>

      {!data && loading ? (
        <Skeleton />
      ) : !data ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-3xl border border-sakura/25 bg-sakura/5 p-10 text-center">
          <p className="font-semibold text-foreground">{tr("Trending topics couldn't be loaded right now. Please try again shortly.")}</p>
          <p className="max-w-md text-xs text-muted">{tr("The ranking comes from Wikimedia's page-view data. Nothing is shown in its place.")}</p>
          <button type="button" onClick={refresh} className="flex items-center gap-1.5 rounded-full bg-sakura/20 px-5 py-2 text-sm font-semibold text-sakura hover:bg-sakura/30"><RefreshCw size={14} aria-hidden="true" />{tr("Try again")}</button>
        </div>
      ) : (
        <>
          {(failed || old) && now > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-xs text-foreground/85" role="status">
              {tr("Showing the last data we retrieved, {age}. A fresh update couldn't be fetched.").replace("{age}", ago(age, tr))}
              <button type="button" onClick={refresh} className="rounded-full bg-gold/20 px-3 py-1 font-semibold text-gold">{tr("Try again")}</button>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-glass-border p-10 text-center">
              <p className="font-semibold text-foreground">{tr("No topics match.")}</p>
              <p className="text-sm text-muted">{tr("Try a different word or category.")}</p>
              <button type="button" onClick={reset} className="rounded-full bg-azure/15 px-4 py-2 text-sm font-semibold text-azure hover:bg-azure/25">{tr("Reset filters")}</button>
            </div>
          ) : (
            <>
              {featured && <Featured key={featured.id} topic={featured} data={data} now={now} />}

              {grid.length > 0 && (
                <section aria-label={tr("Trending topics")} className="flex flex-col gap-3">
                  <h2 className="text-xl font-semibold text-foreground">{tr("Trending topics")}</h2>
                  <ul key={`${category}-${status}-${sort}-${q}`} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {grid.map((t, i) => (
                      <Card key={t.id} topic={t} data={data} index={i} />
                    ))}
                  </ul>
                </section>
              )}

              <section aria-label={tr("Full ranking")} className="flex flex-col gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{tr("Full ranking")}</h2>
                  <p className="text-xs text-muted">{tr("{n} topics, ranked by page views on {date} (UTC).").replace("{n}", String(filtered.length)).replace("{date}", data.dataDate)}</p>
                </div>
                <ol className="overflow-hidden rounded-2xl border border-glass-border bg-glass-bg">
                  {filtered.map((t) => {
                    const names = text.title(t);
                    const pct = changePct(t);
                    return (
                      <li key={t.id} className="border-b border-glass-border last:border-0">
                        <Link href={href(t)} className="group grid grid-cols-[2.5rem_1fr] items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-glass-bg-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-azure sm:grid-cols-[2.5rem_minmax(0,1.6fr)_9rem_minmax(0,1fr)_6rem]">
                          <span className="text-sm font-bold tabular-nums text-muted">#{t.rank}</span>
                          <span className={`min-w-0 truncate text-sm font-medium text-foreground group-hover:text-azure ${names.original ? "" : "font-jp"}`}>{names.title}</span>
                          <span className="col-start-2 truncate text-[11px] text-muted sm:col-start-auto">{t.category ? tr(CATEGORY_LABEL.get(t.category) ?? "") : "—"}</span>
                          <span className="col-start-2 flex items-center gap-2 sm:col-start-auto">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-glass-bg-strong" aria-hidden="true">
                              <span className="block h-full rounded-full bg-gradient-to-r from-azure to-neon-purple" style={{ width: `${Math.max(3, (t.views / maxViews) * 100)}%` }} />
                            </span>
                            <span className="w-14 shrink-0 text-right text-[11px] font-medium tabular-nums text-foreground/85">{text.views(t)}</span>
                          </span>
                          <span className="col-start-2 text-[11px] text-muted sm:col-start-auto sm:text-right">{pct !== null ? `${pct >= 0 ? "+" : ""}${pct}%` : t.status ? tr(STATUS_LABEL[t.status]) : "—"}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
                <p className="text-[11px] text-muted">{tr("The percentage compares page views with the previous day, where the article was also in that day's top 1,000.")}</p>
              </section>
            </>
          )}
          <p className="border-t border-glass-border pt-4 text-[11px] leading-relaxed text-muted">
            {tr("Source")}: {tr("Japanese Wikipedia page views")} (Wikimedia, CC0) · {tr("Pictures and introductions")}: Wikipedia (CC BY-SA 4.0) · {text.measured(data)} · {text.retrieved(data, now)}
          </p>
        </>
      )}
    </div>
  );
}
