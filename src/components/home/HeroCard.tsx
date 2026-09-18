"use client";

import { useState } from "react";
import Image from "next/image";
import { MapPin } from "lucide-react";
import LiveClock from "@/components/home/LiveClock";
import WeatherIcon from "@/components/ui/WeatherIcon";
import WeatherScene from "@/components/ui/WeatherScene";
import HeroAtmosphere from "@/components/home/HeroAtmosphere";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useLiveLocation } from "@/lib/geo/useLiveLocation";
import { isNightNow, currentSeasonJST } from "@/lib/weather/time";
import { useAmbientLighting } from "@/lib/theme/ambientLighting";
import { HERO_CITIES, DEFAULT_HERO_ATMOSPHERE, findHeroCity, type HeroCityInfo } from "@/lib/data/heroCities";
import type { WeatherSnapshot } from "@/lib/services/weather";

export default function HeroCard() {
  const { t } = useLanguage();
  useAmbientLighting();
  const { status, location, weather: liveWeather } = useLiveLocation();
  const [manualCity, setManualCity] = useState<HeroCityInfo | null>(null);
  const [manualWeather, setManualWeather] = useState<WeatherSnapshot | null>(null);
  const [manualLoading, setManualLoading] = useState(false);

  function pickCity(city: HeroCityInfo) {
    setManualCity(city);
    setManualWeather(null);
    setManualLoading(true);
    fetch(`/api/weather/live?lat=${city.lat}&lon=${city.lon}`)
      .then((r) => (r.ok ? (r.json() as Promise<WeatherSnapshot>) : null))
      .then((data) => setManualWeather(data))
      .catch(() => setManualWeather(null))
      .finally(() => setManualLoading(false));
  }

  function changeCity() {
    setManualCity(null);
    setManualWeather(null);
  }

  const isLive = status === "ready" && Boolean(liveWeather);
  const isManual = !isLive && Boolean(manualCity);
  const isLoadingLocation = status === "idle" || status === "locating";
  const needsPicker = !isLive && !isManual && !isLoadingLocation;

  const weather = isLive ? liveWeather : isManual ? manualWeather : null;
  const matchedCity = isLive ? (location?.name ? findHeroCity(location.name) : undefined) : (manualCity ?? undefined);

  const cityName = isLive ? (location?.name ?? matchedCity?.name) : manualCity?.name;
  const subLabel = isLive && location?.countryName && location.countryName !== "Japan" ? location.countryName : undefined;

  const heroImage = matchedCity?.heroImage ?? null;
  const atmosphere = matchedCity?.atmosphere ?? DEFAULT_HERO_ATMOSPHERE;
  const isNight = weather ? isNightNow(weather.sunrise, weather.sunset) : true;
  const sceneIcon = weather?.icon ?? "clear";
  const season = currentSeasonJST();

  return (
    <div className="grid grid-cols-1 gap-3 overflow-hidden rounded-2xl border border-glass-border bg-panel lg:grid-cols-[1.6fr_1fr]">
      <div className="relative min-h-[240px] overflow-hidden rounded-2xl p-5 sm:p-6">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={`${matchedCity?.name ?? "Japan"} skyline`}
            fill
            priority
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${isNight ? atmosphere.night : atmosphere.day}`} />
        )}
        <HeroAtmosphere condition={sceneIcon} season={season} isNight={isNight} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0e1a]/90 via-[#0b0e1a]/55 to-[#0b0e1a]/20" />

        <div className="relative">
          <LiveClock timeZone="Asia/Tokyo">
            {isLoadingLocation && (
              <div className="mt-2 h-9 w-40 animate-pulse rounded-lg bg-glass-bg-strong" />
            )}

            {needsPicker && (
              <div className="mt-1">
                <p className="flex items-center gap-1.5 text-sm text-foreground/85">
                  <MapPin size={18} className="text-sakura" />
                  {t("hero.chooseCity")}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {HERO_CITIES.map((city) => (
                    <button
                      key={city.slug}
                      type="button"
                      onClick={() => pickCity(city)}
                      className="rounded-full border border-glass-border bg-glass-bg px-2.5 py-1 text-xs text-foreground/80 transition-colors hover:border-sakura/40 hover:text-foreground"
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(isLive || isManual) && (
              <>
                <div className="mt-1 flex items-center gap-1.5">
                  <MapPin size={20} className="text-sakura" />
                  <span className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                    {cityName}
                  </span>
                  {isLive && (
                    <span className="flex items-center gap-1 rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-medium text-mint">
                      <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_6px_1px_rgba(74,222,128,0.8)]" />
                      {t("widget.live")}
                    </span>
                  )}
                  {isManual && (
                    <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold">
                      <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                      {t("hero.selected")}
                    </span>
                  )}
                </div>
                {matchedCity?.nameJa && (
                  <p className="ml-7 font-jp text-sm text-foreground/60">{matchedCity.nameJa}</p>
                )}
                {subLabel && <p className="ml-7 text-sm text-foreground/60">{subLabel}</p>}
                {isManual && (
                  <button
                    type="button"
                    onClick={changeCity}
                    className="ml-7 mt-1 text-xs text-azure hover:underline"
                  >
                    {t("hero.changeCity")}
                  </button>
                )}
              </>
            )}
          </LiveClock>

          <div className="mt-4 flex items-start gap-2">
            <span className="text-sm">🌸</span>
            <div>
              <p className="font-jp text-sm text-foreground/85">
                今日もいい一日を
              </p>
              <p className="text-xs text-muted">{t("hero.haveGreatDay")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="relative overflow-hidden rounded-xl border border-glass-border">
          {weather ? (
            <>
              <div className="absolute inset-0">
                <WeatherScene icon={sceneIcon} isNight={isNight} variant="panel" className="h-full w-full" />
              </div>
              <div className="relative z-10 p-4">
                <p className="text-3xl font-semibold leading-none text-foreground">
                  {Math.round(weather.tempC)}°C
                </p>
                <p className="mt-1 text-sm text-foreground/75">{weather.condition}</p>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-glass-border pt-3 text-center">
                  {[
                    { label: t("hero.humidity"), value: `${weather.humidity}%` },
                    { label: t("hero.wind"), value: `${Math.round(weather.windKmh)} km/h` },
                    { label: t("hero.feelsLike"), value: `${Math.round(weather.feelsLikeC)}°C` },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <p className="text-[10px] text-foreground/60">{stat.label}</p>
                      <p className="mt-0.5 text-sm font-medium text-foreground">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-[132px] items-center justify-center p-4">
              {manualLoading || isLoadingLocation ? (
                <div className="h-8 w-24 animate-pulse rounded-lg bg-glass-bg-strong" />
              ) : (
                <p className="text-xs text-sakura">{t("weather.unavailable")}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto rounded-xl border border-glass-border bg-glass-bg p-3">
          {weather ? (
            weather.forecast.map((day) => (
              <div key={day.date} className="flex min-w-[52px] flex-1 flex-col items-center gap-1 text-center">
                <WeatherIcon icon={day.icon} size={16} className="text-gold" />
                <p className="text-[10px] text-muted">{day.weekday}</p>
                <p className="text-[11px] font-medium tabular-nums text-foreground">
                  {day.high}°/{day.low}°
                </p>
              </div>
            ))
          ) : (
            <div className="h-[68px] w-full animate-pulse rounded-lg bg-glass-bg-strong" />
          )}
        </div>
      </div>
    </div>
  );
}
