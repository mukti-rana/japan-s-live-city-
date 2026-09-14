import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Sunrise, Sunset, Droplets, Wind } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import WeatherIcon from "@/components/ui/WeatherIcon";
import { CITIES } from "@/lib/data/cities";
import { getWeather, type WeatherSnapshot } from "@/lib/services/weather";

export const metadata: Metadata = {
  title: "Weather — Live City Japan",
  description: "Live weather conditions for major Japanese cities.",
};

export default async function WeatherPage() {
  const cityWeather = await Promise.all(
    CITIES.map(async (city) => ({
      city,
      weather: await getWeather(city.lat, city.lon).catch<WeatherSnapshot | null>(() => null),
    })),
  );

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cityWeather.map(({ city, weather }, i) => (
          <Reveal key={city.slug} delay={0.06 + i * 0.06}>
            <Link href={`/${city.slug}`}>
              <GlassCard className="p-5">
                <div className="flex items-center gap-1.5 text-xs text-gold">
                  <MapPin size={13} />
                  {city.region}
                </div>
                <h2 className="mt-1 text-lg font-semibold text-foreground">
                  {city.name}
                </h2>

                {weather ? (
                  <>
                    <div className="mt-3 flex items-center gap-3">
                      <WeatherIcon icon={weather.icon} size={32} className="text-gold" />
                      <div>
                        <p className="text-2xl font-semibold leading-none text-foreground">
                          {weather.tempC}°C
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {weather.condition}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted">
                      <span className="flex items-center gap-1.5">
                        <Droplets size={13} className="text-azure" />
                        {weather.humidity}%
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Wind size={13} className="text-azure" />
                        {weather.windKmh} km/h
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Sunrise size={13} className="text-gold" />
                        {weather.sunrise}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Sunset size={13} className="text-sakura" />
                        {weather.sunset}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-xs text-sakura">
                    Live weather unavailable
                  </p>
                )}
              </GlassCard>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
