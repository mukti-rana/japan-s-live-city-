"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Activity, ChevronDown, ExternalLink, MapPin, RefreshCw, Search, ShieldAlert, Waves } from "lucide-react";
import type { QuakeDetail } from "@/lib/services/earthquake";
import Tx from "@/components/i18n/Tx";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { dateFormatter, relativeTime } from "@/lib/i18n/datetime";
import { useTranslate } from "@/lib/i18n/inline";
import { SHINDO_COLOR, SHINDO_FEEL, REPORT_LABEL, TONE_COLOR, depthClass, feltByPrefecture, magnitudeClass, quakeDate, shindoColor, tsunamiTone } from "@/components/earthquakes/quakeStyle";

const EarthquakeMap = dynamic(() => import("@/components/earthquakes/EarthquakeMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0a1024] text-sm text-white/60" role="status">
      <Tx en="Loading map…" />
    </div>
  ),
});

type Filter = "all" | "shindo3" | "m4" | "m5";
type Sort = "new" | "strong";
const PAGE = 20;
const DAY = 24 * 3600_000;

const timeOf = (q: QuakeDetail) => quakeDate(q.time).getTime();
const fmt = (text: string, vars: Record<string, string | number>) => Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), text);

// The Earthquakes page: a row of live figures, a map of where each quake began, filters, and the list of earthquakes. Tapping a quake
// opens everything the JMA bulletin says about it (and flies the map to it). Fresh data is fetched every two minutes while the page is
// open. Every figure comes from the JMA's bulletins relayed by P2P Quake; none is estimated.
export default function EarthquakeDashboard({ initial }: { initial: QuakeDetail[] }) {
  const tr = useTranslate();
  const { language } = useLanguage();
  const reduced = useReducedMotion() ?? false;
  const [quakes, setQuakes] = useState(initial);
  const [updated, setUpdated] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("new");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);

  // "x minutes ago" needs the browser's clock, so it appears after the page has loaded (the server and the first render agree).
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await fetch("/api/earthquakes", { cache: "no-store" });
      if (r.ok) {
        const data = (await r.json()) as { quakes: QuakeDetail[] };
        setQuakes(data.quakes);
        setUpdated(Date.now());
      }
    } catch {
      // keep what is on screen
    } finally {
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    const id = window.setInterval(() => void refresh(), 120_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const time = timeOf;
  const ago = (ms: number) => {
    if (now === null) return "";
    const s = Math.max(0, (now - ms) / 1000);
    if (s < 90) return tr("just now");
    if (s < 3600) return relativeTime(language, -Math.round(s / 60), "minute");
    if (s < 86400) return relativeTime(language, -Math.round(s / 3600), "hour");
    return relativeTime(language, -Math.round(s / 86400), "day");
  };
  const clock = (ms: number, long = false) =>
    dateFormatter(language, { timeZone: "Asia/Tokyo", ...(long ? { weekday: "short", year: "numeric" } : {}), month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(ms));

  // ── The figures ──
  const stats = useMemo(() => {
    // Until the browser's clock is read, the newest quake's time stands in for "now" (server and first render agree).
    const t0 = now ?? (quakes[0] ? timeOf(quakes[0]) : 0);
    const last24 = quakes.filter((q) => {
      const age = t0 - timeOf(q);
      return age >= 0 && age <= DAY;
    });
    const strongest = quakes.reduce<QuakeDetail | null>((a, b) => (!a || b.magnitude > a.magnitude ? b : a), null);
    const hardest = quakes.reduce<QuakeDetail | null>((a, b) => (!a || b.scaleCode > a.scaleCode ? b : a), null);
    const alert = last24.find((q) => tsunamiTone(q.tsunamiCode) === "alert") ?? null;
    return { last24: last24.length, strongest, hardest, alert };
  }, [quakes, now]);

  // Quakes per day over the last 14 days (Japan time), each bar coloured by the strongest shindo that day.
  const days = useMemo(() => {
    const t0 = now ?? (quakes[0] ? timeOf(quakes[0]) : 0);
    const key = (ms: number) => new Date(ms + 9 * 3600_000).toISOString().slice(0, 10);
    const list = Array.from({ length: 14 }, (_, i) => {
      const ms = t0 - (13 - i) * DAY;
      return { key: key(ms), ms, count: 0, top: 0, topLabel: "" };
    });
    for (const q of quakes) {
      const d = list.find((x) => x.key === key(quakeDate(q.time).getTime()));
      if (!d) continue;
      d.count += 1;
      if (q.scaleCode > d.top) {
        d.top = q.scaleCode;
        d.topLabel = q.maxIntensity;
      }
    }
    return list;
  }, [quakes, now]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = quakes.filter((q) => {
      if (filter === "shindo3" && q.scaleCode < 30) return false;
      if (filter === "m4" && q.magnitude < 4) return false;
      if (filter === "m5" && q.magnitude < 5) return false;
      if (needle && !`${q.location} ${q.felt.map((f) => f.pref).join(" ")}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    if (sort === "strong") list = [...list].sort((a, b) => b.scaleCode - a.scaleCode || b.magnitude - a.magnitude || timeOf(b) - timeOf(a));
    return list;
  }, [quakes, filter, sort, query]);

  const select = (id: string, scroll = false) => {
    const next = openId === id ? null : id;
    setOpenId(next);
    if (next && scroll) {
      const idx = visible.findIndex((q) => q.id === id);
      if (idx >= shown) setShown(idx + 1);
      window.setTimeout(() => document.getElementById(`eq-${id}`)?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" }), 60);
    }
  };

  const latest = quakes[0];
  const newest = (q: QuakeDetail) => now !== null && now - time(q) < 3600_000;
  const card = "rounded-2xl border border-line bg-surface-1 p-4";

  return (
    <div className="flex flex-col gap-5">
      {/* The live bar. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-xs text-muted">
          <span className="relative flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full rounded-full bg-mint opacity-70 ${reduced ? "" : "animate-ping"}`} />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
          </span>
          {tr("Live from the JMA")}
          {updated && <span className="text-text-tertiary">· {fmt(tr("Updated {time}"), { time: clock(updated) })}</span>}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong px-3.5 text-xs text-foreground/85 transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure disabled:opacity-60"
        >
          <RefreshCw size={13} className={refreshing && !reduced ? "animate-spin" : ""} aria-hidden="true" />
          {tr("Refresh")}
        </button>
      </div>

      {/* The figures. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={card}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">{tr("Latest quake")}</p>
          {latest && (
            <>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{now === null ? clock(time(latest)) : ago(time(latest))}</p>
              <p className="mt-1 truncate font-jp text-xs text-muted">{latest.location}</p>
            </>
          )}
        </div>
        <div className={card}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">{tr("Strongest magnitude")}</p>
          {stats.strongest && (
            <>
              <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-foreground">M{stats.strongest.magnitude.toFixed(1)}</p>
              <p className="mt-1 truncate font-jp text-xs text-muted">{stats.strongest.location}</p>
            </>
          )}
        </div>
        <div className={card}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">{tr("Strongest shaking")}</p>
          {stats.hardest && (
            <>
              <p className="mt-2 text-2xl font-semibold tracking-tight" style={{ color: shindoColor(stats.hardest.maxIntensity) }}>
                {tr("Shindo")} {stats.hardest.maxIntensity}
              </p>
              <p className="mt-1 truncate font-jp text-xs text-muted">{stats.hardest.location}</p>
            </>
          )}
        </div>
        <div className={card}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">{tr("Tsunami")}</p>
          <p className="mt-2 flex items-center gap-2 text-lg font-semibold tracking-tight" style={{ color: stats.alert ? TONE_COLOR.alert : TONE_COLOR.ok }}>
            <Waves size={18} aria-hidden="true" />
            {stats.alert ? tr(stats.alert.tsunami) : tr("No warnings")}
          </p>
          <p className="mt-1 text-xs text-muted">{fmt(tr(stats.last24 === 1 ? "{n} earthquake in the last 24 hours" : "{n} earthquakes in the last 24 hours"), { n: stats.last24 })}</p>
        </div>
      </div>

      {/* The map. */}
      <div className="relative h-[340px] overflow-hidden rounded-2xl border border-line sm:h-[440px]">
        <EarthquakeMap quakes={quakes} selectedId={openId} onSelect={(id) => select(id, true)} still={reduced} />
        <div className="pointer-events-none absolute bottom-8 left-3 z-[500] sm:bottom-3 rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-[11px] text-white/85 backdrop-blur-md">
          <p className="mb-1.5">{tr("Colour shows the strongest shindo; size shows magnitude.")}</p>
          <div className="flex items-center gap-1.5">
            {Object.keys(SHINDO_COLOR).map((k) => (
              <span key={k} className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: SHINDO_COLOR[k] }} />
                <span className="tabular-nums text-white/60">{k}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
        {/* The list. */}
        <div className="min-w-0">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div role="group" aria-label={tr("Filter earthquakes")} className="flex flex-wrap gap-1.5">
              {(
                [
                  ["all", "All"],
                  ["shindo3", "Shindo 3 and up"],
                  ["m4", "M4 and up"],
                  ["m5", "M5 and up"],
                ] as [Filter, string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={filter === k}
                  onClick={() => {
                    setFilter(k);
                    setShown(PAGE);
                  }}
                  className={`h-9 rounded-full border px-3.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${filter === k ? "border-foreground/45 bg-foreground/[0.1] text-foreground" : "border-line-strong text-muted hover:border-foreground/40 hover:text-foreground"}`}
                >
                  {tr(label)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="relative">
                <span className="sr-only">{tr("Search a place")}</span>
                <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShown(PAGE);
                  }}
                  placeholder={tr("Search a place")}
                  className="h-9 w-40 rounded-full border border-line-strong bg-transparent pl-8 pr-3 text-xs text-foreground outline-none placeholder:text-text-tertiary focus:border-foreground/40 sm:w-44"
                />
              </label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                aria-label={tr("Sort")}
                className="h-9 rounded-full border border-line-strong bg-surface-1 px-3 text-xs text-foreground outline-none focus:border-foreground/40"
              >
                <option value="new">{tr("Newest first")}</option>
                <option value="strong">{tr("Strongest first")}</option>
              </select>
            </div>
          </div>

          {visible.length === 0 ? (
            <p className={`${card} text-sm text-muted`}>{tr("No earthquakes match.")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {visible.slice(0, shown).map((q) => {
                const open = openId === q.id;
                const color = shindoColor(q.maxIntensity);
                const tone = tsunamiTone(q.tsunamiCode);
                const places = open ? feltByPrefecture(q) : [];
                const t = time(q);
                return (
                  <li key={q.id} id={`eq-${q.id}`} className={`overflow-hidden rounded-2xl border bg-surface-1 transition-colors ${open ? "border-foreground/30" : "border-line hover:border-line-strong"}`} style={open ? { boxShadow: `0 0 0 1px ${color}33, 0 18px 50px -28px ${color}` } : undefined}>
                    <button type="button" aria-expanded={open} aria-controls={`eq-${q.id}-d`} onClick={() => select(q.id)} className="flex w-full items-center gap-3.5 px-3.5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-azure sm:gap-4 sm:px-4">
                      <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
                        <span className="text-[10px] leading-none">{tr("Shindo")}</span>
                        <span className="text-base font-bold leading-tight">{q.maxIntensity}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-jp text-sm font-medium text-foreground">{q.location}</span>
                          {newest(q) && <span className="shrink-0 rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-semibold text-mint">{tr("New")}</span>}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                          <span className="inline-flex items-center gap-1 font-medium text-foreground/85">
                            <Activity size={11} aria-hidden="true" />M{q.magnitude.toFixed(1)}
                          </span>
                          <span>
                            {tr("Depth")} {q.depthKm} km
                          </span>
                          <span className="inline-flex items-center gap-1" style={{ color: tone === "ok" ? undefined : TONE_COLOR[tone] }}>
                            <Waves size={11} aria-hidden="true" />
                            {tr(q.tsunami)}
                          </span>
                        </span>
                        <span aria-hidden="true" className="mt-2 block h-[3px] overflow-hidden rounded-full bg-foreground/[0.08]">
                          <span className="block h-full rounded-full" style={{ width: `${Math.min(100, (q.magnitude / 8) * 100)}%`, background: color }} />
                        </span>
                      </span>
                      <span className="hidden shrink-0 text-right sm:block">
                        <span className="block text-xs text-foreground/85">{clock(t)}</span>
                        <span className="block text-[11px] text-text-tertiary">{ago(t)}</span>
                      </span>
                      <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          id={`eq-${q.id}-d`}
                          initial={reduced ? false : { height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                          transition={{ duration: reduced ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-line px-3.5 pb-4 pt-4 sm:px-4">
                            {/* On a phone the time sits here, since the row has no room for it. */}
                            <p className="mb-3 text-xs text-muted sm:hidden">
                              {clock(t, true)} · {ago(t)}
                            </p>

                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                              <Fact label={tr("Magnitude")} value={`M${q.magnitude.toFixed(1)}`} note={tr(magnitudeClass(q.magnitude))} accent={color} />
                              <Fact label={tr("Depth")} value={`${q.depthKm} km`} note={tr(depthClass(q.depthKm))}>
                                <span aria-hidden="true" className="mt-2 block h-[3px] overflow-hidden rounded-full bg-foreground/[0.1]">
                                  <span className="block h-full rounded-full bg-foreground/60" style={{ width: `${Math.min(100, (q.depthKm / 300) * 100)}%` }} />
                                </span>
                              </Fact>
                              <Fact label={tr("Strongest shaking")} value={`${tr("Shindo")} ${q.maxIntensity}`} note={q.felt.length ? fmt(tr(q.felt.length === 1 ? "Felt in {n} place" : "Felt in {n} places"), { n: q.felt.length }) : undefined} accent={color} />
                              <Fact label={tr("Tsunami")} value={tr(q.tsunami)} accent={TONE_COLOR[tone]} />
                            </div>

                            <p className="mt-4 rounded-xl border border-line bg-foreground/[0.04] px-3.5 py-3 text-sm leading-relaxed text-foreground/85">
                              <span className="font-semibold" style={{ color }}>
                                {tr("Shindo")} {q.maxIntensity}:{" "}
                              </span>
                              {tr(SHINDO_FEEL[q.maxIntensity] ?? "")}
                            </p>

                            {places.length > 0 && (
                              <div className="mt-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">{fmt(tr(places.length === 1 ? "Felt in {n} prefecture" : "Felt in {n} prefectures"), { n: places.length })}</p>
                                <ul className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                                  {places.slice(0, 10).map((p) => (
                                    <li key={p.pref} className="flex items-center gap-2.5 text-sm">
                                      <span className="flex h-6 w-9 shrink-0 items-center justify-center rounded-md text-xs font-bold" style={{ background: `${shindoColor(p.label)}22`, color: shindoColor(p.label) }}>
                                        {p.label}
                                      </span>
                                      <span className="min-w-0 flex-1 truncate font-jp text-foreground/90">{p.pref}</span>
                                      <span className="shrink-0 text-xs text-text-tertiary">{fmt(tr(p.count === 1 ? "{n} place" : "{n} places"), { n: p.count })}</span>
                                    </li>
                                  ))}
                                </ul>
                                {places.length > 10 && <p className="mt-1.5 text-xs text-text-tertiary">{fmt(tr("and {n} more prefectures"), { n: places.length - 10 })}</p>}
                              </div>
                            )}

                            {q.comment && <p className="mt-4 text-sm leading-relaxed text-foreground/80 font-jp">{q.comment}</p>}

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-xs text-text-tertiary">
                              <p>
                                {fmt(tr("Issued {time} by the {source}"), { time: clock(quakeDate(q.issuedAt).getTime()), source: tr(q.issuedBy === "JMA" ? "Japan Meteorological Agency" : q.issuedBy) })} · {tr(REPORT_LABEL[q.reportType] ?? REPORT_LABEL.Other)}
                              </p>
                              {q.latitude != null && q.longitude != null && (
                                <a
                                  href={`https://www.openstreetmap.org/?mlat=${q.latitude}&mlon=${q.longitude}#map=9/${q.latitude}/${q.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-foreground/85 transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
                                >
                                  <MapPin size={12} aria-hidden="true" />
                                  {q.latitude.toFixed(1)}°N, {q.longitude.toFixed(1)}°E
                                  <ExternalLink size={11} aria-hidden="true" />
                                </a>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          )}

          {visible.length > shown && (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="mx-auto mt-4 flex h-10 items-center rounded-full border border-line-strong px-5 text-sm text-foreground/85 transition-colors hover:border-foreground/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
            >
              {fmt(tr("Show more ({n} left)"), { n: visible.length - shown })}
            </button>
          )}
          <p className="mt-4 text-xs text-muted">{tr("Source: P2P Quake (relaying JMA data). Updated every few minutes.")}</p>
        </div>

        {/* The sidebar. */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <div className={card}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">{tr("Earthquakes per day")}</p>
            <div className="mt-3 flex h-28 items-end gap-1" role="img" aria-label={tr("Earthquakes per day, last 14 days")}>
              {(() => {
                const max = Math.max(1, ...days.map((d) => d.count));
                return days.map((d) => (
                  <div key={d.key} className="group relative flex h-full flex-1 items-end" title={`${d.key}: ${d.count}`}>
                    <motion.span
                      initial={reduced ? false : { height: 0 }}
                      animate={{ height: `${Math.max(d.count ? 6 : 2, (d.count / max) * 100)}%` }}
                      transition={{ duration: reduced ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
                      className="block w-full rounded-t-[3px]"
                      style={{ background: d.count ? shindoColor(d.topLabel) : "rgba(128,128,128,0.25)", opacity: d.count ? 0.9 : 1 }}
                    />
                  </div>
                ));
              })()}
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-text-tertiary">
              <span>{dateFormatter(language, { timeZone: "Asia/Tokyo", month: "short", day: "numeric" }).format(new Date(days[0].ms))}</span>
              <span>{tr("today")}</span>
            </div>
          </div>

          <div className={card}>
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldAlert size={16} className="text-gold" aria-hidden="true" />
              {tr("If an earthquake strikes")}
            </p>
            <ul className="mt-3 flex flex-col gap-2.5 text-sm leading-relaxed text-foreground/80">
              <li>{tr("Drop, cover and hold on: get under a sturdy table and protect your head.")}</li>
              <li>{tr("Stay away from windows, shelves and anything that can fall.")}</li>
              <li>{tr("On the coast, move to high ground at once after strong shaking, without waiting for a warning.")}</li>
            </ul>
            <Link href="/emergency" className="mt-4 inline-flex h-10 items-center rounded-full border border-line-strong px-4 text-sm text-foreground/90 transition-colors hover:border-foreground/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              {tr("Emergency guide")}
              <span aria-hidden="true" className="ml-1.5">→</span>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Fact({ label, value, note, accent, children }: { label: string; value: string; note?: string; accent?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-foreground/[0.04] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">{label}</p>
      <p className="mt-1 text-base font-semibold leading-tight text-foreground" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
      {children}
    </div>
  );
}
