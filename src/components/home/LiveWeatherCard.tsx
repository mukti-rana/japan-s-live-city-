"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { CloudSun, Droplets, Eye, MapPin, RefreshCw, Sun as SunIcon, Sunrise, Sunset, Thermometer, Wind } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import ViewAllButton from "@/components/ui/ViewAllButton";
import WeatherIcon from "@/components/ui/WeatherIcon";
import DailyForecastList from "@/components/weather/DailyForecastList";
import WeatherAtmosphere from "@/components/home/weather/WeatherAtmosphere";
import { PREFECTURE_CENTER } from "@/lib/events/geo";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useInline, type Table } from "@/lib/i18n/inline";
import { useLiveLocation } from "@/lib/geo/useLiveLocation";
import { CITIES } from "@/lib/data/cities";
import { PREFECTURES } from "@/lib/news/places";
import type { WeatherSnapshot } from "@/lib/services/weather";
import { isNightNow } from "@/lib/weather/time";
import { useWeatherCity } from "@/lib/weather/useWeatherCity";

const DEFAULT_CITY = CITIES.find((c) => c.slug === "tokyo") ?? CITIES[0];
const REFRESH_MS = 10 * 60 * 1000;
// Open-Meteo updates its "current" reading every 15 minutes; past this the
// reading is no longer presented as live.
const FRESH_MINUTES = 45;

type TabId = "now" | "today" | "7days";

const TEXT = {
  tabNow: { en: "Now", ja: "現在" },
  tabToday: { en: "Today", ja: "今日" },
  tab7: { en: "7-Day Forecast", ja: "7日間" },
  tab7Short: { en: "7-Day", ja: "7日間" },
  tabs: { en: "Forecast view", ja: "予報の表示" },
  viewForecast: { en: "View forecast", ja: "予報を見る" },
  city: { en: "City", ja: "都市" },
  myLocation: { en: "My location", ja: "現在地" },
  feelsLike: { en: "Feels like", ja: "体感" },
  humidity: { en: "Humidity", ja: "湿度" },
  wind: { en: "Wind speed", ja: "風速" },
  rain: { en: "Chance of rain", ja: "降水確率" },
  uv: { en: "UV index", ja: "紫外線指数" },
  visibility: { en: "Visibility", ja: "視程" },
  sun: { en: "Sunrise · Sunset", ja: "日の出・日の入り" },
  sunrise: { en: "Sunrise", ja: "日の出" },
  sunset: { en: "Sunset", ja: "日の入り" },
  high: { en: "High", ja: "最高" },
  low: { en: "Low", ja: "最低" },
  next24: { en: "Next 24 hours", ja: "今後24時間" },
  now: { en: "Now", ja: "今" },
  japan: { en: "Japan", ja: "日本" },
  live: { en: "Live", ja: "ライブ" },
  updatedAgo: { en: "Updated {n} min ago", ja: "{n}分前に更新" },
  updatedNow: { en: "Updated just now", ja: "たった今更新" },
  stale: { en: "Not live — last reading {n} min ago", ja: "ライブではありません（{n}分前の観測）" },
  fallback: { en: "Location not shared — showing Tokyo", ja: "位置情報なし — 東京を表示中" },
  loading: { en: "Loading weather…", ja: "天気を読み込み中…" },
  failed: { en: "Weather couldn't be loaded right now.", ja: "天気を読み込めませんでした。" },
  retry: { en: "Try again", ja: "再試行" },
  unavailable: { en: "Unavailable", ja: "取得できません" },
  uvLow: { en: "Low", ja: "弱い" },
  uvModerate: { en: "Moderate", ja: "中程度" },
  uvHigh: { en: "High", ja: "強い" },
  uvVeryHigh: { en: "Very high", ja: "非常に強い" },
  uvExtreme: { en: "Extreme", ja: "極端に強い" },
} satisfies Table;

function uvKey(uv: number): keyof typeof TEXT {
  if (uv < 3) return "uvLow";
  if (uv < 6) return "uvModerate";
  if (uv < 8) return "uvHigh";
  if (uv < 11) return "uvVeryHigh";
  return "uvExtreme";
}

// ── Data ──────────────────────────────────────────────────────────────────

interface Fetched {
  key: string;
  data?: WeatherSnapshot;
  failed?: boolean;
}

// Real forecast for a fixed point, refreshed every 10 minutes (the same
// window the server caches for). Pass null to wait. A refresh that fails
// keeps the previous reading rather than blanking the card.
function useForecast(coords: [number, number] | null) {
  const key = coords ? `${coords[0]},${coords[1]}` : null;
  const [state, setState] = useState<Fetched | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!key) return;
    const [lat, lon] = key.split(",");
    const controller = new AbortController();
    fetch(`/api/weather/live?lat=${lat}&lon=${lon}`, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<WeatherSnapshot>) : Promise.reject(new Error("failed"))))
      .then((data) => setState({ key, data }))
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name === "AbortError") return;
        setState((prev) => (prev && prev.key === key && prev.data ? prev : { key, failed: true }));
      });
    return () => controller.abort();
  }, [key, attempt]);

  useEffect(() => {
    if (!key) return;
    const id = window.setInterval(() => setAttempt((n) => n + 1), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [key]);

  const current = state && state.key === key ? state : null;
  return {
    data: current?.data ?? null,
    failed: Boolean(current?.failed),
    loading: key !== null && !current,
    retry: () => {
      setState(null);
      setAttempt((n) => n + 1);
    },
  };
}

// A clock that ticks once a minute, so "is this reading still fresh" can be
// judged without reading the time during render.
function useMinuteClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

// Open-Meteo stamps its reading in Japan time without an offset.
function ageMinutes(updatedAt: string, now: number): number | null {
  const then = new Date(`${updatedAt.length === 16 ? `${updatedAt}:00` : updatedAt}+09:00`).getTime();
  if (Number.isNaN(then)) return null;
  return Math.round((now - then) / 60_000);
}

// ── Pieces ────────────────────────────────────────────────────────────────

function Tile({
  icon,
  label,
  value,
  note,
  bar,
  className = "",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  note?: string;
  // 0–100 of a real measured value (humidity, rain chance) — a quiet gauge.
  bar?: number;
  className?: string;
}) {
  return (
    <div
      className={`flex min-w-0 flex-col items-start gap-2 rounded-xl border border-glass-border bg-glass-bg px-3.5 py-3 transition-colors duration-200 sm:flex-row sm:items-center sm:gap-3 hover:border-azure/30 hover:bg-glass-bg-strong ${className}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-azure/12 text-azure">{icon}</span>
      <div className="w-full min-w-0 flex-1">
        <p className="text-[11px] leading-tight text-muted sm:truncate">{label}</p>
        <p className="flex flex-wrap items-baseline gap-x-1.5 text-lg font-semibold leading-tight tabular-nums text-foreground">
          {value}
          {note && <span className="text-[11px] font-medium text-muted">{note}</span>}
        </p>
        {bar !== undefined && (
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-glass-bg-strong" aria-hidden="true">
            <div
              className="h-full rounded-full bg-gradient-to-r from-azure to-neon-purple"
              style={{ width: `${Math.min(Math.max(bar, 0), 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Unit({ children }: { children: ReactNode }) {
  return <span className="text-xs font-medium text-muted">{children}</span>;
}

function HourlyStrip({ hours, text }: { hours: WeatherSnapshot["hourly"]; text: (k: keyof typeof TEXT) => string }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{text("next24")}</p>
      <ul
        className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2 [scrollbar-color:var(--glass-border)_transparent] [scrollbar-width:thin]"
        aria-label={text("next24")}
      >
        {hours.map((hour, i) => (
          <li
            key={hour.time}
            className={`flex w-[68px] shrink-0 snap-start flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-center transition-colors duration-200 hover:border-azure/30 ${
              i === 0 ? "border-azure/40 bg-azure/10" : "border-glass-border bg-glass-bg"
            }`}
          >
            <span className={`text-[11px] ${i === 0 ? "font-semibold text-azure" : "text-muted"}`}>
              {i === 0 ? text("now") : hour.hourLabel}
            </span>
            <WeatherIcon icon={hour.icon} size={20} className="text-foreground/90" aria-hidden="true" />
            <span className="text-sm font-semibold tabular-nums text-foreground">{hour.tempC}°</span>
            <span className={`flex h-3 items-center gap-0.5 text-[10px] tabular-nums ${hour.precipProbability > 0 ? "text-azure" : "text-transparent"}`}>
              {hour.precipProbability > 0 && (
                <>
                  <Droplets size={9} aria-hidden="true" />
                  {hour.precipProbability}%
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CityPicker({
  selected,
  onChange,
  text,
}: {
  selected: string;
  onChange: (id: string) => void;
  text: (k: keyof typeof TEXT) => string;
}) {
  const { language } = useLanguage();
  return (
    <label className="relative flex items-center">
      <span className="sr-only">{text("city")}</span>
      <MapPin size={13} className="pointer-events-none absolute left-2.5 text-gold" aria-hidden="true" />
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 max-w-[10.5rem] cursor-pointer appearance-none rounded-full border border-glass-border bg-glass-bg py-0 pl-8 pr-3 text-xs font-medium text-foreground/90 transition-colors hover:border-azure/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
      >
        <option value="auto" className="bg-panel">
          {text("myLocation")}
        </option>
        {PREFECTURES.filter((p) => PREFECTURE_CENTER[p.id]).map((p) => (
          <option key={p.id} value={p.id} className="bg-panel">
            {language === "ja" ? p.ja : p.en}
          </option>
        ))}
      </select>
    </label>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────

export default function LiveWeatherCard() {
  const { t, language } = useLanguage();
  const text = useInline(TEXT);
  const { status, location, weather: liveWeather } = useLiveLocation();
  const [selected, choose] = useWeatherCity();
  const [tab, setTab] = useState<TabId>("now");
  const [gaveUpWaiting, setGaveUpWaiting] = useState(false);
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({ now: null, today: null, "7days": null });
  const now = useMinuteClock();

  // A location prompt left unanswered shouldn't leave the card empty: after a
  // short wait, show the default city while the browser keeps waiting.
  useEffect(() => {
    const id = window.setTimeout(() => setGaveUpWaiting(true), 2500);
    return () => window.clearTimeout(id);
  }, []);

  const prefecture = selected === "auto" ? null : PREFECTURES.find((p) => p.id === selected && PREFECTURE_CENTER[p.id]);
  const useOwnLocation = !prefecture && Boolean(liveWeather);
  const waitingForLocation = !prefecture && !liveWeather && (status === "idle" || status === "locating") && !gaveUpWaiting;

  const coords = useMemo<[number, number] | null>(() => {
    if (prefecture) return PREFECTURE_CENTER[prefecture.id];
    if (useOwnLocation || waitingForLocation) return null;
    return [DEFAULT_CITY.lat, DEFAULT_CITY.lon];
  }, [prefecture, useOwnLocation, waitingForLocation]);

  const fetched = useForecast(coords);
  const weather = useOwnLocation ? liveWeather : fetched.data;
  const loading = !weather && (waitingForLocation || fetched.loading);
  const failed = !weather && fetched.failed;

  let cityName: string;
  let country: string;
  if (prefecture) {
    cityName = language === "ja" ? prefecture.ja : prefecture.en;
    country = text("japan");
  } else if (useOwnLocation) {
    cityName = location?.name ?? (language === "ja" ? DEFAULT_CITY.nameJa : DEFAULT_CITY.name);
    country = location?.countryName ?? text("japan");
  } else {
    cityName = language === "ja" ? DEFAULT_CITY.nameJa : DEFAULT_CITY.name;
    country = text("japan");
  }
  const showingFallback = !prefecture && !useOwnLocation && !loading && status !== "idle" && status !== "locating";

  const age = weather ? ageMinutes(weather.updatedAt, now) : null;
  const isFresh = age !== null && age >= -5 && age <= FRESH_MINUTES;
  const night = weather ? isNightNow(weather.sunrise, weather.sunset) : false;

  const tabs: { id: TabId; label: string }[] = [
    { id: "now", label: text("tabNow") },
    { id: "today", label: text("tabToday") },
    { id: "7days", label: text("tab7") },
  ];

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setTab(tabs[next].id);
    tabRefs.current[tabs[next].id]?.focus();
  }

  return (
    <GlassCard className="flex flex-col gap-4 p-4 sm:p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-azure/15 text-azure">
            <CloudSun size={16} aria-hidden="true" />
          </span>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/90">{t("weather.liveWeatherTitle")}</h2>
          {weather && isFresh && (
            <span className="flex items-center gap-1.5 rounded-full bg-mint/10 px-2 py-0.5 text-[10px] font-medium text-mint">
              <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_6px_1px_rgba(74,222,128,0.8)]" aria-hidden="true" />
              {text("live")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <CityPicker selected={prefecture ? selected : "auto"} onChange={choose} text={text} />
          <ViewAllButton href="/weather" label={text("viewForecast")} />
        </div>
      </div>

      {/* Segmented control */}
      <div
        role="tablist"
        aria-label={text("tabs")}
        className="grid grid-cols-3 gap-1 rounded-xl border border-glass-border bg-glass-bg p-1 sm:inline-grid sm:w-fit sm:min-w-[24rem]"
      >
        {tabs.map((item, index) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              ref={(el) => {
                tabRefs.current[item.id] = el;
              }}
              id={`wx-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="wx-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(item.id)}
              onKeyDown={(e) => onTabKey(e, index)}
              className={`min-h-9 truncate rounded-lg px-3 text-xs font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${
                active
                  ? "bg-gradient-to-r from-azure/25 to-neon-purple/25 text-foreground shadow-[inset_0_0_0_1px_rgba(77,163,255,0.35)]"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {item.id === "7days" ? (
                <>
                  <span className="sm:hidden">{text("tab7Short")}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </>
              ) : (
                item.label
              )}
            </button>
          );
        })}
      </div>

      {/* Body */}
      {!weather ? (
        <div className="flex min-h-[18rem] flex-col items-center justify-center gap-3 rounded-2xl border border-glass-border bg-glass-bg px-4 text-center">
          {loading ? (
            <>
              <span className="h-8 w-8 rounded-full border-2 border-azure/30 border-t-azure motion-safe:animate-spin" aria-hidden="true" />
              <p className="text-xs text-muted" role="status">
                {text("loading")}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-foreground/85">{failed ? text("failed") : t("widget.unavailableRightNow")}</p>
              <button
                type="button"
                onClick={fetched.retry}
                className="flex min-h-9 items-center gap-1.5 rounded-full border border-glass-border bg-glass-bg px-4 text-xs font-medium text-azure transition-colors hover:border-azure/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
              >
                <RefreshCw size={13} aria-hidden="true" />
                {text("retry")}
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <div id="wx-panel" role="tabpanel" aria-labelledby={`wx-tab-${tab}`} className="grid gap-4 md:grid-cols-2">
            {/* Left: place, temperature, condition */}
            <section className="relative isolate flex min-h-[16rem] flex-col justify-between gap-6 overflow-hidden rounded-2xl border border-glass-border p-5 sm:p-6 md:min-h-[20rem]">
              <WeatherAtmosphere icon={weather.icon} isNight={night} />
              <div className="relative">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <MapPin size={14} className="text-gold" aria-hidden="true" />
                  <span className="truncate">{cityName}</span>
                </p>
                <p className="mt-0.5 pl-5 text-xs text-foreground/65">{country}</p>
              </div>

              <div className="relative flex flex-col items-start gap-3 min-[420px]:flex-row min-[420px]:items-center sm:gap-5">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-foreground shadow-[0_0_30px_-6px_rgba(77,163,255,0.5)] backdrop-blur-sm sm:h-20 sm:w-20">
                  <WeatherIcon icon={weather.icon} size={40} strokeWidth={1.4} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-6xl font-semibold leading-none tracking-tight tabular-nums text-foreground sm:text-7xl">
                    {weather.tempC}
                    <span className="align-top text-3xl font-medium text-foreground/70 sm:text-4xl">°C</span>
                  </p>
                  <p className="mt-2 text-base font-medium text-foreground">{weather.condition}</p>
                  <p className="mt-0.5 text-xs text-foreground/70">
                    {text("feelsLike")} {weather.feelsLikeC}° · {text("high")} {weather.todayHigh}° · {text("low")} {weather.todayLow}°
                  </p>
                </div>
              </div>
            </section>

            {/* Right: the metrics for the chosen view */}
            <div key={tab} className="wx-fade min-w-0 md:min-h-[20rem]">
              {tab === "now" && (
                <div className="grid h-full auto-rows-fr grid-cols-2 gap-3">
                  <Tile
                    icon={<Droplets size={17} aria-hidden="true" />}
                    label={text("humidity")}
                    value={
                      <>
                        {weather.humidity}
                        <Unit>%</Unit>
                      </>
                    }
                    bar={weather.humidity}
                  />
                  <Tile
                    icon={<Wind size={17} aria-hidden="true" />}
                    label={text("wind")}
                    value={
                      <>
                        {weather.windKmh}
                        <Unit>km/h</Unit>
                      </>
                    }
                  />
                  <Tile
                    icon={<Droplets size={17} aria-hidden="true" />}
                    label={text("rain")}
                    value={
                      <>
                        {weather.todayPrecipProbability}
                        <Unit>%</Unit>
                      </>
                    }
                    bar={weather.todayPrecipProbability}
                  />
                  <Tile
                    icon={<SunIcon size={17} aria-hidden="true" />}
                    label={text("uv")}
                    value={weather.todayUvIndex}
                    note={text(uvKey(weather.todayUvIndex))}
                    bar={(weather.todayUvIndex / 11) * 100}
                  />
                  {weather.visibilityKm !== null && (
                    <Tile
                      icon={<Eye size={17} aria-hidden="true" />}
                      label={text("visibility")}
                      value={
                        <>
                          {weather.visibilityKm}
                          <Unit>km</Unit>
                        </>
                      }
                    />
                  )}
                  <Tile
                    icon={<Sunrise size={17} aria-hidden="true" />}
                    label={text("sun")}
                    value={
                      <span className="whitespace-nowrap text-base">
                        {weather.sunrise} · {weather.sunset}
                      </span>
                    }
                    className={weather.visibilityKm === null ? "col-span-2" : ""}
                  />
                </div>
              )}

              {tab === "today" && (
                <div className="grid h-full auto-rows-fr grid-cols-2 gap-3">
                  <Tile
                    icon={<SunIcon size={17} aria-hidden="true" />}
                    label={text("high")}
                    value={
                      <>
                        {weather.todayHigh}
                        <Unit>°C</Unit>
                      </>
                    }
                  />
                  <Tile
                    icon={<Thermometer size={17} aria-hidden="true" />}
                    label={text("low")}
                    value={
                      <>
                        {weather.todayLow}
                        <Unit>°C</Unit>
                      </>
                    }
                  />
                  <Tile
                    icon={<Droplets size={17} aria-hidden="true" />}
                    label={text("rain")}
                    value={
                      <>
                        {weather.todayPrecipProbability}
                        <Unit>%</Unit>
                      </>
                    }
                    bar={weather.todayPrecipProbability}
                  />
                  <Tile
                    icon={<SunIcon size={17} aria-hidden="true" />}
                    label={text("uv")}
                    value={weather.todayUvIndex}
                    note={text(uvKey(weather.todayUvIndex))}
                    bar={(weather.todayUvIndex / 11) * 100}
                  />
                  <Tile icon={<Sunrise size={17} aria-hidden="true" />} label={text("sunrise")} value={weather.sunrise} />
                  <Tile icon={<Sunset size={17} aria-hidden="true" />} label={text("sunset")} value={weather.sunset} />
                </div>
              )}

              {tab === "7days" && (
                <div className="flex h-full flex-col justify-center rounded-2xl border border-glass-border bg-glass-bg px-4 py-1.5">
                  <DailyForecastList
                    today={{
                      high: weather.todayHigh,
                      low: weather.todayLow,
                      icon: weather.icon,
                      precipProbability: weather.todayPrecipProbability,
                    }}
                    days={weather.forecast}
                  />
                </div>
              )}
            </div>
          </div>

          <HourlyStrip hours={weather.hourly} text={text} />

          {/* Freshness, stated plainly */}
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted" role="status">
            {age !== null && (
              <span className={isFresh ? "" : "text-gold"}>
                {isFresh
                  ? age <= 0
                    ? text("updatedNow")
                    : text("updatedAgo").replace("{n}", String(age))
                  : text("stale").replace("{n}", String(Math.max(age, 0)))}
              </span>
            )}
            {showingFallback && <span>{text("fallback")}</span>}
          </p>
        </>
      )}
    </GlassCard>
  );
}
