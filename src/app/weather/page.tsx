import type { Metadata } from "next";
import Link from "next/link";
import { LocateFixed, MapPin, Sunrise, Sunset } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import WeatherIcon from "@/components/ui/WeatherIcon";
import WeatherScene from "@/components/ui/WeatherScene";
import HourlyForecastRow from "@/components/weather/HourlyForecastRow";
import DailyForecastList from "@/components/weather/DailyForecastList";
import LiveWeatherView from "@/components/weather/LiveWeatherView";
import T from "@/components/i18n/T";
import { CITIES, getCity } from "@/lib/data/cities";
import { getWeather, type WeatherSnapshot } from "@/lib/services/weather";
import { isNightNow } from "@/lib/weather/time";

export const metadata: Metadata = {
  title: "Weather — Live City Japan",
  description: "Live weather conditions for major Japanese cities.",
};

export default async function WeatherPage({ searchParams }: PageProps<"/weather">) {
  const { city: citySlugParam } = await searchParams;
  const citySlug = Array.isArray(citySlugParam) ? citySlugParam[0] : citySlugParam;
  const selectedCity = citySlug ? getCity(citySlug) : undefined;

  const cityWeather = await Promise.all(
    CITIES.map(async (city) => ({
      city,
      weather: await getWeather(city.lat, city.lon).catch<WeatherSnapshot | null>(() => null),
    })),
  );

  const tokyoEntry = cityWeather.find((c) => c.city.slug === "tokyo")!;
  const selected = selectedCity ? cityWeather.find((c) => c.city.slug === selectedCity.slug) : undefined;
  const otherCities = selected ? cityWeather.filter((c) => c.city.slug !== selectedCity!.slug) : cityWeather;
  const weather = selected?.weather ?? null;
  const isNight = weather ? isNightNow(weather.sunrise, weather.sunset) : true;

  return (
    <div className="flex flex-col gap-5">
      <Reveal>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sakura">
            Live
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Weather
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            Live conditions across major cities, from Open-Meteo.
          </p>
        </div>
      </Reveal>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/weather"
          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
            !selectedCity
              ? "border-gold/40 bg-gold/15 text-gold"
              : "border-glass-border bg-glass-bg text-muted hover:text-foreground"
          }`}
        >
          <LocateFixed size={12} />
          <T k="weather.myLocation" />
        </Link>
        {cityWeather.map(({ city }) => (
          <Link
            key={city.slug}
            href={`/weather?city=${city.slug}`}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              city.slug === selectedCity?.slug
                ? "border-gold/40 bg-gold/15 text-gold"
                : "border-glass-border bg-glass-bg text-muted hover:text-foreground"
            }`}
          >
            {city.name}
          </Link>
        ))}
      </div>

      {!selectedCity ? (
        <Reveal delay={0.06}>
          <LiveWeatherView fallbackCity={tokyoEntry.city} fallbackWeather={tokyoEntry.weather} />
        </Reveal>
      ) : (
        <>
          <Reveal delay={0.06}>
            {weather ? (
              <div className="relative overflow-hidden rounded-3xl border border-glass-border">
                <div className="absolute inset-0">
                  <WeatherScene
                    icon={weather.icon}
                    isNight={isNight}
                    variant="backdrop"
                    className="h-full w-full"
                  />
                </div>
                <div className="relative z-10 flex flex-col gap-6 p-6 sm:p-8">
                  <div>
                    <div className="flex items-center gap-1.5 text-sm text-foreground/80">
                      <MapPin size={15} />
                      {selectedCity.region}, Japan
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
                    <p className="mt-1 text-xs text-foreground/60">
                      <T k="weather.updated" /> {weather.updatedAt.slice(11, 16)} JST
                    </p>
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
            ) : (
              <GlassCard className="p-5">
                <p className="text-xs text-sakura">
                  <T k="weather.unavailable" />
                </p>
              </GlassCard>
            )}
          </Reveal>

          {weather && (
            <Reveal delay={0.1}>
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
            </Reveal>
          )}
        </>
      )}

      {otherCities.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {otherCities.map(({ city, weather: cw }, i) => (
            <Reveal key={city.slug} delay={0.14 + i * 0.06}>
              <Link href={`/weather?city=${city.slug}`}>
                <GlassCard className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-gold">
                        <MapPin size={12} />
                        {city.region}
                      </div>
                      <h3 className="mt-0.5 text-sm font-semibold text-foreground">
                        {city.name}
                      </h3>
                    </div>
                    {cw ? (
                      <div className="flex items-center gap-2">
                        <WeatherIcon icon={cw.icon} size={22} className="text-gold" />
                        <span className="text-lg font-semibold text-foreground">
                          {cw.tempC}°
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-sakura">
                        <T k="weather.unavailable" />
                      </span>
                    )}
                  </div>
                </GlassCard>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
