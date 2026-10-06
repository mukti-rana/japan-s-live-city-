import type { Metadata } from "next";
import Reveal from "@/components/ui/Reveal";
import LiveWeatherPanel from "@/components/weather/premium/LiveWeatherPanel";
import WeatherExperience from "@/components/weather/premium/WeatherExperience";
import { getWeatherCity, WEATHER_CITIES } from "@/lib/data/weatherCities";
import { getWeather, type WeatherSnapshot } from "@/lib/services/weather";
import { LiveLocationProvider } from "@/lib/geo/LiveLocationContext";

export const metadata: Metadata = {
  title: "Weather — Live City Japan",
  description: "Live weather for Japan's major cities — current conditions, forecast, rain and what to expect.",
};

async function fetchOrNull(lat: number, lon: number): Promise<WeatherSnapshot | null> {
  return getWeather(lat, lon).catch(() => null);
}

export default async function WeatherPage({ searchParams }: PageProps<"/weather">) {
  const { city: citySlugParam } = await searchParams;
  const citySlug = Array.isArray(citySlugParam) ? citySlugParam[0] : citySlugParam;
  const selected = getWeatherCity(citySlug);

  // A city URL is server-rendered so it stays indexable. The default view
  // (no city) uses the visitor's own location when they allow it, and falls
  // back to real Tokyo data otherwise.
  const selectedSnapshot = selected ? await fetchOrNull(selected.lat, selected.lon) : null;
  const tokyo = getWeatherCity("tokyo")!;
  const tokyoSnapshot = selected ? null : await fetchOrNull(tokyo.lat, tokyo.lon);

  return (
    <LiveLocationProvider>
      <div className="flex flex-col gap-5">
        <Reveal>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-sakura">Live</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Weather</h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted">A live window into what Japan feels like right now.</p>
          </div>
        </Reveal>

        <Reveal delay={0.04}>
          {selected ? (
            selectedSnapshot ? (
              <WeatherExperience snapshot={selectedSnapshot} city={selected} cityLabel={selected.name} isLocationMode={false} />
            ) : (
              <p className="text-sm text-muted">Weather data unavailable for this city right now.</p>
            )
          ) : tokyoSnapshot ? (
            <LiveWeatherPanel fallback={tokyoSnapshot} />
          ) : (
            <p className="text-sm text-muted">Weather data unavailable right now.</p>
          )}
        </Reveal>

        <Reveal delay={0.06}>
          <p className="text-[11px] text-muted">
            Forecasts from Open-Meteo · {WEATHER_CITIES.length} cities
          </p>
        </Reveal>
      </div>
    </LiveLocationProvider>
  );
}
