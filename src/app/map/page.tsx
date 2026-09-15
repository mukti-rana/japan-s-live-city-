import type { Metadata } from "next";
import Reveal from "@/components/ui/Reveal";
import MapLoader from "@/components/map/MapLoader";
import { CITIES } from "@/lib/data/cities";
import { getWeather, type WeatherSnapshot } from "@/lib/services/weather";

export const metadata: Metadata = {
  title: "Japan Map — Live City Japan",
  description: "Interactive map of Japan with live weather for major cities.",
};

export default async function MapPage() {
  const cities = await Promise.all(
    CITIES.map(async (city) => ({
      ...city,
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
            Japan Map
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            Pan and zoom to explore Japan. Pins show live weather for major
            cities.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <div className="h-[70vh] min-h-[420px] overflow-hidden rounded-2xl border border-glass-border">
          <MapLoader cities={cities} />
        </div>
      </Reveal>
    </div>
  );
}
