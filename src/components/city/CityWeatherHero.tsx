"use client";

import { MapPin, Sunrise, Sunset } from "lucide-react";
import WeatherIcon from "@/components/ui/WeatherIcon";
import FavoriteButton from "@/components/personalization/FavoriteButton";
import type { CityInfo } from "@/lib/data/cities";
import type { WeatherSnapshot } from "@/lib/services/weather";
import Tx from "@/components/i18n/Tx";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { known, useTranslate } from "@/lib/i18n/inline";

export default function CityWeatherHero({
  city,
  weather,
}: {
  city: CityInfo;
  weather: WeatherSnapshot | null;
}) {
  const { language } = useLanguage();
  const tr = useTranslate();
  const updatedLabel = weather ? weather.updatedAt.slice(11, 16) : null;

  return (
    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-glass-border bg-panel p-5 sm:p-6 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <div className="flex items-center gap-1.5 text-sm text-gold">
          <MapPin size={15} />
          {known(city.region, language)}, {tr("Japan")}
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {language === "ja" ? city.nameJa : known(city.name, language)}
          </h1>
          {language !== "ja" && (
            <span className="font-jp text-lg text-foreground/60">
              {city.nameJa}
            </span>
          )}
          <FavoriteButton kind="city" itemKey={city.slug} className="ml-1 self-center" />
        </div>

        {weather ? (
          <p className="mt-3 text-xs text-muted">
            {tr("Live weather · updated {time} JST · source: Open-Meteo").replace("{time}", updatedLabel ?? "")}
          </p>
        ) : (
          <p className="mt-3 text-xs text-sakura">
            <Tx en="Live weather is temporarily unavailable." />
          </p>
        )}
      </div>

      {weather && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-glass-border bg-glass-bg p-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
              <WeatherIcon icon={weather.icon} size={28} />
            </div>
            <div>
              <p className="text-3xl font-semibold leading-none text-foreground">
                {weather.tempC}°C
              </p>
              <p className="mt-1 text-sm text-muted">
                {tr(weather.condition)} · {tr("feels like")} {weather.feelsLikeC}°C
              </p>
            </div>
            <div className="ml-auto text-right text-xs text-muted">
              <p>{tr("High")} {weather.todayHigh}°</p>
              <p>{tr("Low")} {weather.todayLow}°</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <StatChip label="Humidity" value={`${weather.humidity}%`} />
            <StatChip label="Wind" value={`${weather.windKmh} km/h`} />
            <StatChip
              label="Sunrise"
              value={weather.sunrise}
              icon={<Sunrise size={13} className="text-gold" />}
            />
            <StatChip
              label="Sunset"
              value={weather.sunset}
              icon={<Sunset size={13} className="text-sakura" />}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatChip({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  const tr = useTranslate();
  return (
    <div className="rounded-xl border border-glass-border bg-glass-bg px-2 py-2.5">
      <p className="flex items-center justify-center gap-1 text-[10px] text-muted">
        {icon}
        {tr(label)}
      </p>
      <p className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}
