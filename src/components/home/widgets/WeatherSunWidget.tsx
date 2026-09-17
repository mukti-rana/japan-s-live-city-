"use client";

import { useEffect, useState } from "react";
import { Sun } from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import WeatherIcon from "@/components/ui/WeatherIcon";
import { CITIES } from "@/lib/data/cities";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useLiveLocation } from "@/lib/geo/useLiveLocation";
import { dayProgress } from "@/lib/weather/time";
import type { WeatherSnapshot } from "@/lib/services/weather";

const DEFAULT_CITY = CITIES.find((c) => c.slug === "tokyo")!;

export default function WeatherSunWidget() {
  const { t } = useLanguage();
  const { status, location, weather: liveWeather } = useLiveLocation();
  const [fallbackWeather, setFallbackWeather] = useState<WeatherSnapshot | null>(null);

  // Live geolocation didn't produce weather (still resolving, denied, or
  // unavailable) — fetch a real snapshot for a default city instead of
  // ever falling back to mock data.
  useEffect(() => {
    if (liveWeather) return;
    let cancelled = false;
    fetch(`/api/weather/live?lat=${DEFAULT_CITY.lat}&lon=${DEFAULT_CITY.lon}`)
      .then((r) => (r.ok ? (r.json() as Promise<WeatherSnapshot>) : null))
      .then((data) => {
        if (!cancelled && data) setFallbackWeather(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [liveWeather]);

  const weather = liveWeather ?? fallbackWeather;
  const cityName = status === "ready" ? (location?.name ?? DEFAULT_CITY.name) : DEFAULT_CITY.name;

  if (!weather) {
    return (
      <WidgetFrame icon={Sun} labelKey="widget.weatherSun" accent="gold">
        <p className="py-4 text-center text-xs text-muted">{t("widget.unavailableRightNow")}</p>
      </WidgetFrame>
    );
  }

  const progress = dayProgress(weather.sunrise, weather.sunset);
  const hours = weather.hourly.slice(0, 4);

  return (
    <WidgetFrame icon={Sun} labelKey="widget.weatherSun" accent="gold">
      <p className="-mt-1 text-center text-xs text-muted">{cityName}</p>

      <div className="flex items-center gap-3">
        <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl">
          <svg viewBox="0 0 120 100" className="h-full w-full" aria-hidden="true">
            <defs>
              <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F2994A" />
                <stop offset="55%" stopColor="#E8563F" />
                <stop offset="100%" stopColor="#2a1330" />
              </linearGradient>
            </defs>
            <rect width="120" height="100" fill="url(#dusk)" />
            <circle cx="60" cy="58" r="17" fill="#FFE3AE" opacity="0.95" />
            <g fill="#2a1030" opacity="0.92">
              <path d="M0 100 L0 86 L30 76 L60 84 L90 72 L120 82 L120 100 Z" />
              <path d="M50 96 v-18 h20 v18 z" />
              <path d="M44 78 h32 l-6 -8 h-20 z" />
              <path d="M54 70 v-12 h12 v12 z" />
              <path d="M48 58 h24 l-5 -7 h-14 z" />
            </g>
          </svg>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-2 text-center">
          <div>
            <p className="text-[10px] text-muted">{t("widget.sunrise")}</p>
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {weather.sunrise}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted">{t("widget.sunset")}</p>
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {weather.sunset}
            </p>
          </div>
        </div>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-glass-bg-strong">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold to-sakura"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="grid grid-cols-4 gap-1 border-t border-glass-border pt-3">
        {hours.map((hour) => (
          <div key={hour.time} className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] text-muted">
              {hour.hourLabel === "Now" ? t("widget.now") : hour.hourLabel}
            </span>
            <WeatherIcon icon={hour.icon} size={15} className="text-azure" />
            <span className="text-xs font-medium tabular-nums text-foreground">
              {hour.tempC}°
            </span>
          </div>
        ))}
      </div>
    </WidgetFrame>
  );
}
