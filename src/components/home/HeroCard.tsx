"use client";

import Image from "next/image";
import { MapPin } from "lucide-react";
import LiveClock from "@/components/home/LiveClock";
import WeatherIcon from "@/components/ui/WeatherIcon";
import WeatherScene from "@/components/ui/WeatherScene";
import { mockCity, mockWeather, mockForecast } from "@/lib/mock/dashboard";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useLiveLocation } from "@/lib/geo/useLiveLocation";
import { isNightNow } from "@/lib/weather/time";

const FORECAST_ICON_KIND = { sun: "clear", partly: "partly", cloud: "cloud" } as const;

export default function HeroCard() {
  const { t } = useLanguage();
  const { status, location, weather } = useLiveLocation();

  const isLive = status === "ready" && Boolean(location || weather);
  const cityName = location?.name ?? mockCity.name;
  const tempC = weather ? Math.round(weather.tempC) : mockWeather.tempC;
  const condition = weather?.condition ?? mockWeather.condition;
  const humidity = weather ? `${weather.humidity}%` : `${mockWeather.humidity}%`;
  const wind = weather ? `${Math.round(weather.windKmh)} km/h` : `${mockWeather.windMs} m/s`;
  const feelsLike = weather ? `${Math.round(weather.feelsLikeC)}°C` : `${mockWeather.feelsLikeC}°C`;

  // Defaults to a night scene when there's no live sunrise/sunset yet,
  // matching this card's night-skyline artwork.
  const isNight = weather ? isNightNow(weather.sunrise, weather.sunset) : true;
  const sceneIcon = weather?.icon ?? "clear";

  return (
    <div className="grid grid-cols-1 gap-3 overflow-hidden rounded-2xl border border-glass-border bg-panel lg:grid-cols-[1.6fr_1fr]">
      <div className="relative min-h-[240px] overflow-hidden rounded-2xl p-5 sm:p-6">
        <Image
          src="/images/hero-tokyo.jpg"
          alt="Tokyo skyline at night"
          fill
          priority
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0e1a]/90 via-[#0b0e1a]/55 to-[#0b0e1a]/20" />

        <div className="relative">
          <LiveClock timeZone={mockCity.timeZone}>
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
            </div>
            {isLive ? (
              location?.countryName && location.countryName !== "Japan" ? (
                <p className="ml-7 text-sm text-foreground/60">{location.countryName}</p>
              ) : null
            ) : (
              <p className="ml-7 font-jp text-sm text-foreground/60">{mockCity.nameJa}</p>
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
          <div className="absolute inset-0">
            <WeatherScene icon={sceneIcon} isNight={isNight} variant="panel" className="h-full w-full" />
          </div>
          <div className="relative z-10 p-4">
            <p className="text-3xl font-semibold leading-none text-foreground">
              {tempC}°C
            </p>
            <p className="mt-1 text-sm text-foreground/75">{condition}</p>

            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-glass-border pt-3 text-center">
              {[
                { label: t("hero.humidity"), value: humidity },
                { label: t("hero.wind"), value: wind },
                { label: t("hero.feelsLike"), value: feelsLike },
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
            mockForecast.map((day) => (
              <div key={day.day} className="flex min-w-[52px] flex-1 flex-col items-center gap-1 text-center">
                <WeatherIcon icon={FORECAST_ICON_KIND[day.icon]} size={16} className="text-gold" />
                <p className="text-[10px] text-muted">{day.day}</p>
                <p className="text-[11px] font-medium tabular-nums text-foreground">
                  {day.high}°/{day.low}°
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
