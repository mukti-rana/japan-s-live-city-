"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { MapPin, Map as MapIcon, ShieldCheck, Sunrise, Sunset, Droplets, Wind, Sun as SunIcon, CloudRain } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import WeatherScene from "@/components/ui/WeatherScene";
import WeatherIcon from "@/components/ui/WeatherIcon";
import AnimatedNumber from "@/components/weather/premium/AnimatedNumber";
import T from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { WEATHER_CITIES, type WeatherCity } from "@/lib/data/weatherCities";
import type { WeatherSnapshot, HourlyPoint, WeatherIconKind } from "@/lib/services/weather";
import {
  tempBand,
  rainOutlook,
  hourOf,
  clockOf,
  maxRain,
  firstLikelyRainPoint,
  temperatureTrend,
  segmentAverages,
  recommendationsFor,
  type TempBand,
} from "@/lib/weather/insights";
import type { TranslationKey } from "@/lib/i18n/translationKeys";

const BAND_KEY: Record<TempBand, TranslationKey> = {
  cold: "weather.v2.band.cold",
  cool: "weather.v2.band.cool",
  mild: "weather.v2.band.mild",
  warm: "weather.v2.band.warm",
  hot: "weather.v2.band.hot",
};

const SKY_KEY: Record<WeatherIconKind, TranslationKey> = {
  clear: "weather.v2.sky.clear",
  partly: "weather.v2.sky.partly",
  cloud: "weather.v2.sky.cloud",
  fog: "weather.v2.sky.fog",
  drizzle: "weather.v2.sky.drizzle",
  rain: "weather.v2.sky.rain",
  snow: "weather.v2.sky.snow",
  storm: "weather.v2.sky.storm",
};

const SEGMENT_KEY = {
  morning: "weather.v2.morning",
  afternoon: "weather.v2.afternoon",
  evening: "weather.v2.evening",
  night: "weather.v2.night",
} as const;

const REC_TONE_CLASS = {
  good: "text-mint",
  caution: "text-gold",
  neutral: "text-foreground/85",
} as const;

// Current Japan time (JST) as HH:MM, from the real clock.
function jstNow(now: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(now));
}

function minutesOf(hhmm: string): number {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
}

function phaseKey(hour: number): "weather.v2.morning" | "weather.v2.afternoon" | "weather.v2.evening" | "weather.v2.night" {
  if (hour >= 5 && hour <= 11) return "weather.v2.morning";
  if (hour >= 12 && hour <= 17) return "weather.v2.afternoon";
  if (hour >= 18 && hour <= 19) return "weather.v2.evening";
  return "weather.v2.night";
}

export default function WeatherExperience({
  snapshot,
  city,
  cityLabel,
  isLocationMode,
}: {
  snapshot: WeatherSnapshot;
  city: WeatherCity | undefined;
  cityLabel: string;
  isLocationMode: boolean;
}) {
  const { t } = useLanguage();
  // Starts at the forecast's own timestamp so the server and the first browser
  // render produce identical markup (and search engines see the full content),
  // then switches to the live clock once mounted.
  const [now, setNow] = useState<number>(() => Date.parse(`${snapshot.updatedAt}:00+09:00`));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const clock = jstNow(now);
  const hour = Number(clock.slice(0, 2));
  const updatedMs = Date.parse(`${snapshot.updatedAt}:00+09:00`);
  const minutesAgo = Number.isFinite(updatedMs) ? Math.max(0, Math.round((now - updatedMs) / 60_000)) : null;
  const isStale = minutesAgo !== null && minutesAgo > 60;

  const band = tempBand(snapshot.tempC);
  const next12 = snapshot.hourly.slice(0, 12);
  const rainNext12 = maxRain(next12);
  const likelyRain = firstLikelyRainPoint(next12);
  const nowMinutes = minutesOf(clock);
  const sunriseMin = minutesOf(snapshot.sunrise);
  const sunsetMin = minutesOf(snapshot.sunset);
  const isNight = nowMinutes < sunriseMin || nowMinutes >= sunsetMin;
  const nearSunrise = Math.abs(nowMinutes - sunriseMin) <= 45;
  const nearSunset = Math.abs(nowMinutes - sunsetMin) <= 45;
  const sceneTint = nearSunrise
    ? "bg-gradient-to-br from-[#ff9a8b]/25 via-[#ffcf7a]/15 to-transparent"
    : nearSunset
      ? "bg-gradient-to-br from-[#7b5cff]/30 via-[#ff6fa0]/20 to-[#ffb36b]/15"
      : "";

  const cityDisplay = city ? `${city.name} · ${city.nameJa}` : cityLabel;

  const segments = segmentAverages(snapshot.hourly.slice(0, 24));
  const journeyPoints: HourlyPoint[] = [0, 6, 12, 18].map((i) => snapshot.hourly[i]).filter(Boolean) as HourlyPoint[];
  const trend = temperatureTrend(snapshot.hourly.slice(0, 12));
  const recs = recommendationsFor(snapshot);
  const sunProgress = isNight ? null : Math.min(1, Math.max(0, (nowMinutes - sunriseMin) / (sunsetMin - sunriseMin)));

  const expectSlots: { key: TranslationKey; point: HourlyPoint | undefined }[] = [
    { key: "widget.now", point: snapshot.hourly[0] },
    { key: "weather.v2.next", point: snapshot.hourly[1] },
    { key: "weather.v2.later", point: snapshot.hourly[4] },
    { key: "weather.v2.tonight", point: snapshot.hourly.find((p) => hourOf(p.time) >= 20) ?? snapshot.hourly[12] },
  ];

  const trendKey: TranslationKey =
    trend === "fall" ? "weather.v2.temp.fall" : trend === "rise" ? "weather.v2.temp.rise" : "weather.v2.temp.steady";

  const rainLine: TranslationKey =
    rainOutlook(rainNext12) === "likely"
      ? "weather.v2.rain.likely"
      : rainOutlook(rainNext12) === "possible"
        ? "weather.v2.rain.possible"
        : "weather.v2.rain.unlikely";

  const hasAnyHourly = snapshot.hourly.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl border border-glass-border">
        <div className="absolute inset-0">
          <WeatherScene icon={snapshot.icon} isNight={isNight} variant="backdrop" className="h-full w-full" />
        </div>
        {sceneTint && <div className={`pointer-events-none absolute inset-0 ${sceneTint}`} />}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/30 to-transparent" />

        <div className="relative z-10 flex min-h-[320px] flex-col justify-between gap-6 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-mint/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-mint">
              <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_6px_1px_rgba(74,222,128,0.8)]" />
              <T k="widget.live" />
            </span>
            <span className={`text-xs ${isStale ? "text-gold" : "text-foreground/65"}`}>
              {minutesAgo === null
                ? t("weather.v2.noData")
                : t("weather.v2.updatedAgo").replace("{minutes}", String(minutesAgo))}
            </span>
          </div>

          <div>
            <p className="flex items-center gap-1.5 text-sm text-foreground/80">
              <MapPin size={15} className="text-sakura" />
              {cityDisplay}
            </p>
            {isLocationMode && (
              <p className="mt-0.5 text-xs text-foreground/60">
                {t("weather.v2.youreIn").replace("{city}", cityLabel)}
              </p>
            )}
            <p className="mt-4 font-light leading-none tracking-tight text-foreground drop-shadow-[0_0_24px_rgba(255,255,255,0.25)]">
              <span className="text-[88px] sm:text-[120px]">
                <AnimatedNumber value={snapshot.tempC} />
              </span>
              <span className="text-4xl align-top sm:text-5xl">°</span>
            </p>
            <p className="mt-3 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-foreground/90">
              <WeatherIcon icon={snapshot.icon} size={18} />
              {snapshot.condition}
            </p>
            <p className="mt-1 text-xs text-foreground/65">
              <T k="hero.feelsLike" /> {snapshot.feelsLikeC}°C · <T k={phaseKey(hour)} />
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-lg leading-snug text-foreground/95 sm:text-xl">
              {t("weather.v2.heroSentence")
                .replace("{band}", t(BAND_KEY[band]))
                .replace("{sky}", t(SKY_KEY[snapshot.icon]))}
              {likelyRain && " "}
              {likelyRain && (
                <span className="text-foreground/80">
                  {t("weather.v2.rain.likely").replace("{time}", clockOf(likelyRain.time))}
                </span>
              )}
            </p>
            <p className="text-xs text-foreground/55">
              <span className="font-jp">{clock} JST</span>
            </p>
          </div>
        </div>
      </div>

      {/* WHAT'S HAPPENING NOW */}
      <GlassCard className="p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/70">
          <T k="weather.v2.whatHappening" />
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat icon={<CloudRain size={14} />} label={<T k="weather.rainChance" />} value={`${snapshot.todayPrecipProbability}%`} />
          <Stat icon={<Wind size={14} />} label={<T k="hero.wind" />} value={`${snapshot.windKmh} km/h`} />
          <Stat icon={<Droplets size={14} />} label={<T k="hero.humidity" />} value={`${snapshot.humidity}%`} />
          <Stat icon={<SunIcon size={14} />} label={<T k="weather.uvIndex" />} value={`${snapshot.todayUvIndex}`} />
          <Stat icon={<SunIcon size={14} />} label={<T k="hero.feelsLike" />} value={`${snapshot.feelsLikeC}°C`} />
        </div>
      </GlassCard>

      {/* WHAT TO EXPECT */}
      {hasAnyHourly && (
        <GlassCard className="p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/70">
            <T k="weather.v2.whatExpect" />
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {expectSlots.map(({ key, point }) => (
              <div key={key} className="flex flex-col items-center gap-1 rounded-xl border border-glass-border bg-glass-bg p-3">
                <span className="text-[10px] uppercase tracking-wide text-muted">
                  <T k={key} />
                </span>
                {point ? (
                  <>
                    <WeatherIcon icon={point.icon} size={22} />
                    <span className="text-lg font-semibold text-foreground">{point.tempC}°</span>
                    <span className="text-[10px] text-foreground/60">
                      {clockOf(point.time)} · <T k={SKY_KEY[point.icon]} />
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted">—</span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-foreground/85">
            <T k={trendKey} />
          </p>
        </GlassCard>
      )}

      {/* HOURLY (horizontal scroll) */}
      {hasAnyHourly && (
        <GlassCard className="p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/70">
            <T k="weather.hourlyTitle" />
          </p>
          <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
            {snapshot.hourly.slice(0, 24).map((p, i) => (
              <div
                key={p.time}
                className={`flex min-w-[64px] snap-start flex-col items-center gap-1 rounded-xl border p-2.5 ${
                  i === 0 ? "border-azure/40 bg-azure/10" : "border-glass-border bg-glass-bg"
                }`}
              >
                <span className="text-[10px] text-muted">{i === 0 ? <T k="widget.now" /> : clockOf(p.time)}</span>
                <WeatherIcon icon={p.icon} size={18} />
                <span className="text-sm font-semibold text-foreground">{p.tempC}°</span>
                <span className="text-[10px] text-azure">{p.precipProbability}%</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* RAIN + TEMPERATURE JOURNEY */}
      <div className="grid gap-4 md:grid-cols-2">
        {hasAnyHourly && (
          <GlassCard className="p-5">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-foreground/70">
              <CloudRain size={13} className="text-azure" />
              <T k="weather.v2.rainForecast" />
            </p>
            <div className="flex h-24 items-end gap-1.5">
              {next12.map((p) => (
                <div key={p.time} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-azure/30 to-azure/80 transition-[height] duration-700"
                    style={{ height: `${Math.max(4, p.precipProbability)}%` }}
                    title={`${clockOf(p.time)} · ${p.precipProbability}%`}
                  />
                  <span className="text-[9px] text-muted">{clockOf(p.time)}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-foreground/85">
              {t(rainLine).replace("{time}", likelyRain ? clockOf(likelyRain.time) : "")}
            </p>
          </GlassCard>
        )}

        {journeyPoints.length > 0 && (
          <GlassCard className="p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/70">
              <T k="weather.v2.tempJourney" />
            </p>
            <TemperatureLine points={journeyPoints} />
          </GlassCard>
        )}
      </div>

      {/* TODAY'S STORY */}
      {hasAnyHourly && (
        <GlassCard className="p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/70">
            <T k="weather.v2.story" />
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(SEGMENT_KEY) as (keyof typeof SEGMENT_KEY)[]).map((seg) => (
              <div key={seg} className="rounded-xl border border-glass-border bg-glass-bg p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted">
                  <T k={SEGMENT_KEY[seg]} />
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {segments[seg] !== null ? `${segments[seg]}°` : "—"}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* RECOMMENDATIONS */}
      <GlassCard className="p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/70">
          <T k="weather.v2.recommendations" />
        </p>
        <ul className="flex flex-col gap-2">
          {recs.map((rec, i) => (
            <li key={`${rec.key}-${i}`} className={`text-sm ${REC_TONE_CLASS[rec.tone]}`}>
              <T k={rec.key} />
            </li>
          ))}
        </ul>
      </GlassCard>

      {/* SUN PATH + 7-DAY */}
      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard className="p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/70">
            <T k="weather.v2.sunPath" />
          </p>
          <SunArc progress={sunProgress} />
          <div className="mt-2 flex justify-between text-xs text-foreground/75">
            <span className="flex items-center gap-1.5">
              <Sunrise size={13} className="text-gold" /> <T k="widget.sunrise" /> {snapshot.sunrise}
            </span>
            <span className="flex items-center gap-1.5">
              <Sunset size={13} className="text-sakura" /> <T k="widget.sunset" /> {snapshot.sunset}
            </span>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/70">
            <T k="weather.dailyTitle" />
          </p>
          <div className="flex flex-col gap-1.5">
            <DayRow
              label={<T k="weather.today" />}
              icon={snapshot.icon}
              high={snapshot.todayHigh}
              low={snapshot.todayLow}
              rain={snapshot.todayPrecipProbability}
              highlight
            />
            {snapshot.forecast.map((d) => (
              <DayRow key={d.date} label={d.weekday} icon={d.icon} high={d.high} low={d.low} rain={d.precipProbability} />
            ))}
          </div>
        </GlassCard>
      </div>

      {/* ALERTS */}
      <GlassCard className="flex items-start gap-3 p-5">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-muted" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            <T k="weather.v2.alerts" />
          </p>
          <p className="mt-1 text-xs text-muted">
            <T k="weather.v2.alertsNotConnected" />
          </p>
        </div>
      </GlassCard>

      {/* MAP */}
      <Link
        href="/map"
        className="flex items-center justify-center gap-2 rounded-2xl border border-glass-border bg-glass-bg px-5 py-3 text-sm font-medium text-foreground/90 transition-colors hover:border-azure/40 hover:text-foreground"
      >
        <MapIcon size={15} className="text-azure" />
        <T k="weather.v2.openMap" />
      </Link>

      <CityChips activeSlug={city?.slug} />
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: ReactNode; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-glass-border bg-glass-bg p-3">
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted">
        {icon}
        {label}
      </span>
      <span className="text-base font-semibold text-foreground">{value}</span>
    </div>
  );
}

function DayRow({
  label,
  icon,
  high,
  low,
  rain,
  highlight = false,
}: {
  label: ReactNode;
  icon: WeatherIconKind;
  high: number;
  low: number;
  rain: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm ${
        highlight ? "bg-azure/10 text-foreground" : "text-foreground/85"
      }`}
    >
      <span className="w-14 text-xs font-medium">{label}</span>
      <WeatherIcon icon={icon} size={16} />
      <span className="w-10 text-right text-[11px] text-azure">{rain}%</span>
      <span className="w-20 text-right font-medium">
        {high}° <span className="text-muted">/ {low}°</span>
      </span>
    </div>
  );
}

function TemperatureLine({ points }: { points: HourlyPoint[] }) {
  const temps = points.map((p) => p.tempC);
  const min = Math.min(...temps) - 1;
  const max = Math.max(...temps) + 1;
  const W = 280;
  const H = 110;
  const coords = points.map((p, i) => {
    const x = points.length === 1 ? W / 2 : 20 + (i * (W - 40)) / (points.length - 1);
    const y = H - 20 - ((p.tempC - min) / (max - min || 1)) * (H - 40);
    return { x, y, p };
  });
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-28 w-full" role="img" aria-label="Temperature over the next hours">
      <path d={path} fill="none" stroke="#4DA3FF" strokeWidth="2" strokeLinecap="round" />
      {coords.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r="4" fill="#FF6B9D" />
          <text x={c.x} y={c.y - 10} textAnchor="middle" fontSize="11" fill="currentColor" className="text-foreground">
            {c.p.tempC}°
          </text>
          <text x={c.x} y={H - 4} textAnchor="middle" fontSize="10" fill="currentColor" className="text-muted">
            {clockOf(c.p.time)}
          </text>
        </g>
      ))}
    </svg>
  );
}

function SunArc({ progress }: { progress: number | null }) {
  const W = 260;
  const H = 110;
  const cx = W / 2;
  const cy = H - 10;
  const r = 100;
  const angle = progress === null ? 0 : Math.PI * (1 - progress);
  const dotX = cx + r * Math.cos(angle);
  const dotY = cy - r * Math.sin(angle);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-28 w-full" role="img" aria-label="Sun position">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="currentColor" className="text-glass-border" strokeWidth="1.5" strokeDasharray="4 4" />
      <line x1={cx - r - 10} y1={cy} x2={cx + r + 10} y2={cy} stroke="currentColor" className="text-glass-border" strokeWidth="1" />
      {progress !== null ? (
        <circle cx={dotX} cy={dotY} r="8" fill="#F2C572" className="drop-shadow-[0_0_8px_rgba(242,197,114,0.8)]" />
      ) : (
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize="11" className="fill-muted">
          night
        </text>
      )}
    </svg>
  );
}

function CityChips({ activeSlug }: { activeSlug: string | undefined }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {WEATHER_CITIES.map((c) => (
        <Link
          key={c.slug}
          href={`/weather?city=${c.slug}`}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            c.slug === activeSlug
              ? "border-gold/40 bg-gold/15 text-gold"
              : "border-glass-border bg-glass-bg text-muted hover:text-foreground"
          }`}
        >
          {c.name.replace(/ \(.*\)/, "")}
        </Link>
      ))}
    </div>
  );
}
