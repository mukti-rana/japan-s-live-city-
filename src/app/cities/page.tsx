import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, ChevronRight } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import WeatherIcon from "@/components/ui/WeatherIcon";
import { CITIES } from "@/lib/data/cities";
import { getWeather, type WeatherSnapshot } from "@/lib/services/weather";

export const metadata: Metadata = {
  title: "Cities — Live City Japan",
  description: "Live weather and train status for cities across Japan.",
};

export default async function CitiesPage() {
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
            Cities
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Live City Directory
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            Live weather and train status for cities across Japan.
          </p>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cityWeather.map(({ city, weather }, i) => {
          return (
            <Reveal key={city.slug} delay={0.06 + i * 0.06}>
              <Link href={`/${city.slug}`}>
                <GlassCard className="p-5">
                  <div className="flex items-center gap-1.5 text-xs text-gold">
                    <MapPin size={13} />
                    {city.region}
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">
                        {city.name}
                      </h2>
                      <p className="font-jp text-sm text-muted">{city.nameJa}</p>
                    </div>
                    <ChevronRight size={18} className="text-muted" />
                  </div>

                  {weather ? (
                    <div className="mt-4 flex items-center gap-3 rounded-xl border border-glass-border bg-glass-bg px-3.5 py-3">
                      <WeatherIcon icon={weather.icon} size={22} className="text-gold" />
                      <div>
                        <p className="text-lg font-semibold leading-none text-foreground">
                          {weather.tempC}°C
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {weather.condition}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-xs text-sakura">
                      Live weather unavailable
                    </p>
                  )}
                </GlassCard>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
