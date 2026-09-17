"use client";

import { MapPin, Sunrise, Sunset } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import WeatherScene from "@/components/ui/WeatherScene";
import HourlyForecastRow from "@/components/weather/HourlyForecastRow";
import DailyForecastList from "@/components/weather/DailyForecastList";
import T from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useLiveLocation } from "@/lib/geo/useLiveLocation";
import { isNightNow } from "@/lib/weather/time";
import type { CityInfo } from "@/lib/data/cities";
import type { WeatherSnapshot } from "@/lib/services/weather";

// The default "no ?city= selected" view — real GPS location, wherever the
// user actually is, not limited to the 3 preset cities. Falls back to a
// server-fetched snapshot (passed in) while locating, or if the browser
// denies/lacks geolocation, so there's always real data on screen.
export default function LiveWeatherView({
  fallbackCity,
  fallbackWeather,
}: {
  fallbackCity: CityInfo;
  fallbackWeather: WeatherSnapshot | null;
}) {
  const { t } = useLanguage();
  const { status, location, weather: liveWeather } = useLiveLocation();

  const isLive = status === "ready" && Boolean(liveWeather);
  const weather = liveWeather ?? fallbackWeather;
  const cityName = isLive ? (location?.name ?? fallbackCity.name) : fallbackCity.name;
  const subLabel = isLive
    ? location?.countryName && location.countryName !== "Japan"
      ? location.countryName
      : "Japan"
    : `${fallbackCity.region}, Japan`;
  const showFallbackNote = !isLive && status !== "idle" && status !== "locating";

  if (!weather) {
    return (
      <GlassCard className="p-5">
        <p className="text-xs text-sakura">
          <T k="weather.unavailable" />
        </p>
      </GlassCard>
    );
  }

  const isNight = isNightNow(weather.sunrise, weather.sunset);

  return (
    <div className="flex flex-col gap-5">
      <div className="relative overflow-hidden rounded-3xl border border-glass-border">
        <div className="absolute inset-0">
          <WeatherScene icon={weather.icon} isNight={isNight} variant="backdrop" className="h-full w-full" />
        </div>
        <div className="relative z-10 flex flex-col gap-6 p-6 sm:p-8">
          <div>
            <div className="flex items-center gap-1.5 text-sm text-foreground/90">
              <MapPin size={15} />
              <span className="font-semibold text-foreground">{cityName}</span>
              <span className="text-foreground/60">· {subLabel}</span>
              {isLive && (
                <span className="flex items-center gap-1 rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-medium text-mint">
                  <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_6px_1px_rgba(74,222,128,0.8)]" />
                  {t("widget.live")}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-end gap-3">
              <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                {weather.tempC}°
              </h2>
              <div className="mb-1">
                <p className="text-sm font-medium text-foreground">{weather.condition}</p>
                <p className="text-xs text-foreground/70">
                  H:{weather.todayHigh}° L:{weather.todayLow}°
                </p>
              </div>
            </div>
            {showFallbackNote && (
              <p className="mt-1 text-xs text-foreground/50">
                <T k="weather.locationUnavailable" />
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
            <div className="flex items-center gap-1.5 rounded-xl border border-glass-border bg-glass-bg px-3 py-2 text-xs text-foreground/80">
              <Sunrise size={14} className="text-gold" />
              {weather.sunrise}
            </div>
            <div className="flex items-center gap-1.5 rounded-xl border border-glass-border bg-glass-bg px-3 py-2 text-xs text-foreground/80">
              <Sunset size={14} className="text-sakura" />
              {weather.sunset}
            </div>
          </div>

          <div className="rounded-2xl border border-glass-border bg-glass-bg p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/70">
              <T k="weather.hourlyTitle" />
            </p>
            <HourlyForecastRow hours={weather.hourly} />
          </div>
        </div>
      </div>

      <GlassCard className="p-5">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
          <T k="weather.dailyTitle" />
        </p>
        <DailyForecastList
          today={{
            high: weather.todayHigh,
            low: weather.todayLow,
            icon: weather.icon,
            precipProbability: weather.todayPrecipProbability,
          }}
          days={weather.forecast}
        />
      </GlassCard>
    </div>
  );
}
