"use client";

import { useEffect, useState } from "react";
import { CloudSun, Droplets, Sun as SunIcon, Wind } from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import WeatherScene from "@/components/ui/WeatherScene";
import HourlyForecastRow from "@/components/weather/HourlyForecastRow";
import DailyForecastList from "@/components/weather/DailyForecastList";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useLiveLocation } from "@/lib/geo/useLiveLocation";
import { isNightNow } from "@/lib/weather/time";
import { CITIES } from "@/lib/data/cities";
import type { WeatherSnapshot } from "@/lib/services/weather";
import type { TranslationKey } from "@/lib/i18n/translationKeys";

const DEFAULT_CITY = CITIES.find((c) => c.slug === "tokyo")!;

type Tab = "now" | "today" | "7days";

const TABS: { id: Tab; labelKey: TranslationKey }[] = [
  { id: "now", labelKey: "widget.now" },
  { id: "today", labelKey: "weather.today" },
  { id: "7days", labelKey: "weather.dailyTitle" },
];

export default function LiveWeatherCard() {
  const { t } = useLanguage();
  const { status, location, weather: liveWeather } = useLiveLocation();
  const [fallbackWeather, setFallbackWeather] = useState<WeatherSnapshot | null>(null);
  const [tab, setTab] = useState<Tab>("now");

  // Live geolocation didn't produce weather (still resolving, denied, or
  // unavailable) — fetch a real snapshot for a default city instead of
  // ever falling back to mock data. Same pattern as WeatherSunWidget.
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

  const isLive = status === "ready" && Boolean(liveWeather);
  const weather = liveWeather ?? fallbackWeather;
  const cityName = isLive ? (location?.name ?? DEFAULT_CITY.name) : DEFAULT_CITY.name;

  return (
    <WidgetFrame
      icon={CloudSun}
      labelKey="weather.liveWeatherTitle"
      accent="azure"
      live={isLive}
      viewAll
      viewAllHref="/weather"
    >
      {!weather ? (
        <p className="py-6 text-center text-xs text-muted">{t("widget.unavailableRightNow")}</p>
      ) : (
        <>
          <div className="flex gap-1.5 rounded-full border border-glass-border bg-glass-bg p-1">
            {TABS.map((tabItem) => (
              <button
                key={tabItem.id}
                type="button"
                onClick={() => setTab(tabItem.id)}
                className={`flex-1 rounded-full px-2 py-1.5 text-xs font-medium transition-colors ${
                  tab === tabItem.id
                    ? "bg-azure/20 text-azure"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {t(tabItem.labelKey)}
              </button>
            ))}
          </div>

          {tab === "now" && <NowTab weather={weather} cityName={cityName} />}
          {tab === "today" && <HourlyForecastRow hours={weather.hourly} />}
          {tab === "7days" && (
            <DailyForecastList
              today={{
                high: weather.todayHigh,
                low: weather.todayLow,
                icon: weather.icon,
                precipProbability: weather.todayPrecipProbability,
              }}
              days={weather.forecast}
            />
          )}
        </>
      )}
    </WidgetFrame>
  );
}

function NowTab({ weather, cityName }: { weather: WeatherSnapshot; cityName: string }) {
  const { t } = useLanguage();
  const isNight = isNightNow(weather.sunrise, weather.sunset);

  const stats = [
    { icon: SunIcon, label: t("hero.feelsLike"), value: `${weather.feelsLikeC}°C` },
    { icon: Droplets, label: t("hero.humidity"), value: `${weather.humidity}%` },
    { icon: Wind, label: t("hero.wind"), value: `${weather.windKmh} km/h` },
    { icon: Droplets, label: t("weather.rainChance"), value: `${weather.todayPrecipProbability}%` },
    { icon: SunIcon, label: t("weather.uvIndex"), value: `${weather.todayUvIndex}` },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-glass-border">
      <div className="absolute inset-0">
        <WeatherScene icon={weather.icon} isNight={isNight} variant="panel" className="h-full w-full" />
      </div>
      <div className="relative z-10 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs text-foreground/70">{cityName}</p>
          <div className="mt-1 flex items-end gap-3">
            <p className="text-4xl font-semibold leading-none text-foreground">
              {weather.tempC}°C
            </p>
            <p className="mb-0.5 text-sm text-foreground/75">{weather.condition}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-x-6 gap-y-2 border-t border-glass-border pt-3 text-center sm:max-w-xl sm:flex-1 sm:grid-cols-5 sm:border-t-0 sm:pt-0">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-[9px] text-foreground/60">{stat.label}</p>
              <p className="mt-0.5 text-xs font-medium text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
