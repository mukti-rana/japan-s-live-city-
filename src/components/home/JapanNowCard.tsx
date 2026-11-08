"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { microSeasonOn, type MicroSeason } from "@/lib/japan/microSeasons";
import { dateFormatter } from "@/lib/i18n/datetime";
import { localize, translate, useTranslate } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { PREFECTURE_CENTER } from "@/lib/events/geo";
import { useSessionCity } from "@/lib/geo/sessionCity";
import { resolvePlace, PREFECTURES } from "@/lib/news/places";
import { useLiveLocation } from "@/lib/geo/useLiveLocation";
import { useWeatherCity } from "@/lib/weather/useWeatherCity";
import type { WeatherSnapshot } from "@/lib/services/weather";
import type { EarthquakeEvent, NearbyQuake } from "@/lib/services/earthquake";

interface Pulse {
  quake: { mine: NearbyQuake | null; latest: EarthquakeEvent | null } | null;
  trend: { id: string; title: string; names: Partial<Record<string, string>>; views: number; dataDate: string } | null;
  fetchedAt: number;
}

interface Fact {
  key: string;
  label: string;
  value: string;
  sub: string;
  source: string;
  href: string;
  // 0–1: a pulsing ring sized to the figure (earthquakes only).
  ring?: number;
}

const ROTATE_MS = 6500;
const PREFERS_REDUCED = "(prefers-reduced-motion: reduce)";

const subscribeNever = () => () => {};
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(PREFERS_REDUCED);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(PREFERS_REDUCED).matches,
    () => false,
  );
}

// Today's date in Japan as "M-D" — empty on the server, so the page and the
// browser agree while hydrating.
function useJstDay(): string {
  return useSyncExternalStore(
    subscribeNever,
    () => {
      const p = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric" }).formatToParts(new Date());
      return `${p.find((x) => x.type === "month")?.value}-${p.find((x) => x.type === "day")?.value}`;
    },
    () => "",
  );
}

interface Place {
  id: string | null;
  en: string;
  ja: string;
  center: [number, number];
  // Where the place came from: the device right now, a city the visitor
  // picked, the city their browser located them in earlier, or nothing known.
  source: "device" | "selected" | "session" | "none";
  // Rounded position, only when the device shared it.
  coords: { lat: number; lon: number } | null;
}

// Where the visitor is. First priority is their device's position right now
// (read automatically only if they already allowed it for this site; the
// browser asks nothing new), then the city picked on the weather card, then
// the city located earlier this session.
function usePlace(): Place {
  const live = useLiveLocation();
  const [selected] = useWeatherCity();
  const sessionCity = useSessionCity();
  return useMemo(() => {
    const device = live.status === "ready" ? resolvePlace(live.location?.name)?.prefectureId : undefined;
    let id: string | null = null;
    let source: Place["source"] = "none";
    if (device) {
      id = device;
      source = "device";
    } else if (selected !== "auto" && PREFECTURE_CENTER[selected]) {
      id = selected;
      source = "selected";
    } else {
      const s = resolvePlace(sessionCity)?.prefectureId;
      if (s) {
        id = s;
        source = "session";
      }
    }
    const p = PREFECTURES.find((x) => x.id === (id ?? "tokyo")) ?? PREFECTURES.find((x) => x.id === "tokyo")!;
    return { id, en: p.en, ja: p.ja, center: PREFECTURE_CENTER[p.id] ?? PREFECTURE_CENTER.tokyo, source, coords: source === "device" && live.coords ? { lat: live.coords.lat, lon: live.coords.lon } : null };
  }, [live.status, live.location, live.coords, selected, sessionCity]);
}

// The weather of that place (Tokyo when no place is known).
function usePulseWeather(place: Place): WeatherSnapshot | null {
  const key = `${place.center[0].toFixed(2)},${place.center[1].toFixed(2)}`;
  const [state, setState] = useState<{ key: string; w: WeatherSnapshot } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const [lat, lon] = key.split(",");
    const load = () =>
      fetch(`/api/weather/live?lat=${lat}&lon=${lon}`)
        .then((r) => (r.ok ? (r.json() as Promise<WeatherSnapshot>) : Promise.reject(new Error("failed"))))
        .then((w) => !cancelled && setState({ key, w }))
        .catch(() => {});
    load();
    const id = window.setInterval(() => document.visibilityState === "visible" && load(), 10 * 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [key]);

  return state && state.key === key ? state.w : null;
}

// The live facts. The earthquake is looked up for the visitor's place.
function usePulse(place: Place): Pulse | null {
  const [state, setState] = useState<{ key: string; pulse: Pulse } | null>(null);
  const key = new URLSearchParams({ ...(place.id ? { pref: place.id } : {}), ...(place.coords ? { lat: place.coords.lat.toFixed(1), lon: place.coords.lon.toFixed(1) } : {}) }).toString();
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch(`/api/pulse?${key}`)
        .then((r) => (r.ok ? (r.json() as Promise<Pulse>) : Promise.reject(new Error("failed"))))
        .then((pulse) => !cancelled && setState({ key, pulse }))
        .catch(() => {});
    load();
    const id = window.setInterval(() => document.visibilityState === "visible" && load(), 5 * 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [key]);
  return state && state.key === key ? state.pulse : null;
}

// A few drifting particles that match the micro-season (petals, light, leaves, snow).
const SPOTS = Array.from({ length: 9 }, (_, i) => ({ x: (i * 41 + 9) % 100, delay: -((i * 2.3) % 14), dur: 13 + ((i * 3) % 6), size: 6 + ((i * 5) % 7), dx: ((i * 17) % 50) - 25 }));

function SeasonParticles({ season }: { season: MicroSeason["season"] }) {
  return (
    <div aria-hidden="true" className="atm-root atm-anim pointer-events-none absolute inset-0 overflow-hidden">
      {SPOTS.map((p, i) =>
        season === "summer" ? (
          <span key={i} className="atm-rise absolute rounded-full bg-[#ffd9a0]" style={{ left: `${p.x}%`, bottom: 0, width: p.size / 2.4, height: p.size / 2.4, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, boxShadow: "0 0 10px 3px rgba(255,190,110,0.55)", ["--dx" as string]: `${p.dx}px` }} />
        ) : (
          <span key={i} className="atm-fall absolute top-0 block" style={{ left: `${p.x}%`, width: p.size, height: p.size, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, ["--dx" as string]: `${p.dx}px` }}>
            <span className={`atm-sway block h-full w-full ${season === "spring" ? "atm-petal" : season === "autumn" ? "atm-leaf" : "atm-flake"}`} style={{ animationDuration: `${3 + (i % 4)}s`, animationDelay: `${p.delay}s` }} />
          </span>
        ),
      )}
    </div>
  );
}

// "Japan right now": the card on the Home page's top row. The headline is
// today's micro-season of the traditional calendar (a different poem about
// nature every five days); underneath, real facts rotate — the latest
// earthquake, the weather and the most-viewed article — each with its
// source and time. A fact that can't be fetched is left out, never made up.
export default function JapanNowCard() {
  const tr = useTranslate();
  const { language } = useLanguage();
  const reduced = useReducedMotion();
  const day = useJstDay();
  const live = useLiveLocation();
  const place = usePlace();
  const pulse = usePulse(place);
  const weather = usePulseWeather(place);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const season = useMemo(() => {
    if (!day) return null;
    const [m, d] = day.split("-").map(Number);
    return microSeasonOn(m, d);
  }, [day]);

  const facts = useMemo<Fact[]>(() => {
    const out: Fact[] = [];
    const placeName = place.id ? localize(place.en, place.ja, language) : null;
    const q = pulse?.quake?.mine ?? pulse?.quake?.latest;
    const mine = pulse?.quake?.mine ?? null;
    if (q) {
      const when = dateFormatter(language, { timeZone: "Asia/Tokyo", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(q.time.replace(/\//g, "-").replace(" ", "T") + "+09:00"));
      let sub = `${q.location} · ${tr("Max intensity")} ${q.maxIntensity}`;
      if (mine?.relation === "felt" && placeName) sub = `${q.location} · ${tr("Felt in {place}: intensity {n}").replace("{place}", placeName).replace("{n}", mine.feltScale ?? "—")}`;
      else if (mine?.relation === "near" && placeName) sub = `${q.location} · ${tr("{n} km from {place}").replace("{n}", String(mine.distanceKm)).replace("{place}", placeName)}`;
      else if (placeName && pulse?.quake && !mine) sub += ` · ${tr("None felt in {place} in the last 7 days.").replace("{place}", placeName)}`;
      out.push({
        key: "quake",
        label: mine ? tr("Earthquake near you") : tr("Latest earthquake in Japan"),
        value: `M${q.magnitude.toFixed(1)}`,
        sub,
        source: `${tr("Source")}: JMA via P2P Quake · ${tr("Reported {time} JST").replace("{time}", when)}`,
        href: "/earthquakes",
        ring: Math.min(1, Math.max(0.2, q.magnitude / 8)),
      });
    }
    if (weather) {
      out.push({
        key: "weather",
        label: tr("Weather in {city}").replace("{city}", localize(place.en, place.ja, language)),
        value: `${weather.tempC}°C`,
        sub: `${translate(weather.condition, language)} · ${tr("feels like")} ${weather.feelsLikeC}°C`,
        source: `${tr("Source")}: Open-Meteo`,
        href: "/weather",
      });
    }
    if (pulse?.trend) {
      const t = pulse.trend;
      const local = language === "ja" ? null : t.names[language];
      out.push({
        key: "trend",
        label: tr("Most viewed in Japan"),
        value: local ?? t.title,
        sub: tr("{n} page views").replace("{n}", t.views >= 1000 ? `${Math.round(t.views / 1000)}K` : String(t.views)),
        source: `${tr("Source")}: ${tr("Japanese Wikipedia")} · ${t.dataDate}`,
        href: `/trending/${encodeURIComponent(t.id)}`,
      });
    }
    return out;
  }, [pulse, weather, place, language, tr]);

  const count = facts.length;
  const at = count ? index % count : 0;

  useEffect(() => {
    if (count < 2 || reduced || paused) return;
    const id = window.setInterval(() => document.visibilityState === "visible" && setIndex((i) => i + 1), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [count, reduced, paused]);

  const cur = season?.current;
  const fact = facts[at];

  return (
    <div className="relative h-full min-h-[260px] overflow-hidden" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
      <Image src="/images/sakura-pagoda.jpg" alt="" fill sizes="(min-width: 1280px) 20vw, 100vw" className="jn-drift object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e1a]/90 via-[#0b0e1a]/45 to-[#0b0e1a]/55" />
      {cur && <SeasonParticles season={cur.season} />}

      <div className="relative flex h-full flex-col gap-3 p-5">
        <div className="min-h-[5.5rem]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sakura">{tr("Micro-season")} · 七十二候</p>
          {cur ? (
            <>
              <p className="font-jp mt-1.5 text-xl font-medium leading-snug tracking-wide text-foreground">{cur.ja}</p>
              <p className="font-jp text-[11px] text-foreground/65">{cur.kana}</p>
              {language !== "ja" && <p className="mt-1 text-xs leading-snug text-foreground/85">{tr(cur.en)}</p>}
            </>
          ) : (
            <div className="mt-2 h-14 animate-pulse rounded-lg bg-white/5" />
          )}
        </div>

        {season && <p className="text-[10px] text-foreground/55">{tr("Next: {name} in about {n} days").replace("{name}", language === "ja" ? season.next.ja : tr(season.next.en)).replace("{n}", String(season.daysToNext))}</p>}

        {fact && (
          <div className="mt-auto rounded-2xl border border-white/10 bg-[#0b0e1a]/60 p-3.5 backdrop-blur-md">
            <div key={fact.key} className="jn-fade">
              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-azure">
                {fact.ring !== undefined && (
                  <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                    <span className="atm-neon absolute inline-flex h-full w-full rounded-full bg-sakura/70" style={{ transform: `scale(${1 + fact.ring * 1.4})` }} />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sakura" />
                  </span>
                )}
                {fact.label}
              </p>
              <Link href={fact.href} className="group mt-1 flex items-start justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                <span className="min-w-0">
                  <span className={`block text-2xl font-semibold leading-tight tracking-tight text-foreground ${fact.key === "trend" ? "font-jp line-clamp-2 text-lg" : "tabular-nums"}`}>{fact.value}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-foreground/70">{fact.sub}</span>
                </span>
                <ArrowUpRight size={15} className="mt-1 shrink-0 text-foreground/50 transition-colors group-hover:text-azure" aria-hidden="true" />
              </Link>
              <p className="mt-1.5 text-[10px] leading-snug text-muted">{fact.source}</p>
              {fact.key === "quake" && place.source !== "device" && live.status === "prompt" && (
                <button type="button" onClick={live.requestLocation} className="mt-1.5 text-[10px] font-medium text-azure underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                  {tr("Use my location to see earthquakes near you")}
                </button>
              )}
            </div>
            {count > 1 && (
              <div className="mt-2.5 flex items-center gap-1.5" role="tablist" aria-label={tr("Japan right now")}>
                {facts.map((f, i) => (
                  <button key={f.key} type="button" role="tab" aria-selected={i === at} aria-label={f.label} onClick={() => setIndex(i)} className="group flex h-4 items-center focus-visible:outline-none">
                    <span className={`block h-1 rounded-full transition-all duration-300 group-focus-visible:ring-2 group-focus-visible:ring-azure ${i === at ? "w-5 bg-gradient-to-r from-azure to-neon-purple" : "w-1.5 bg-white/25 group-hover:bg-white/50"}`} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

