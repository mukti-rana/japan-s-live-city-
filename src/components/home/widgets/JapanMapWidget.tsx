import JapanMapView, { type HomeMapCity } from "@/components/home/widgets/JapanMapView";
import { MAP_CITY_BY_SLUG } from "@/lib/map/cities";
import { getMapWeather } from "@/lib/services/weather";

// The cities on the Home preview: a handful of readings, not a crowd.
const HOME_SLUGS = ["sapporo", "sendai", "tokyo", "nagoya", "osaka", "fukuoka"] as const;

// Real temperatures from the same cached Open-Meteo request the full map
// uses — one call for all six cities, shared across visitors for 10 minutes.
// If it fails, the cities still show, just without a temperature; nothing is
// made up, and the Live badge only appears when real readings arrived.
export default async function JapanMapWidget() {
  const cities = HOME_SLUGS.map((slug) => MAP_CITY_BY_SLUG.get(slug)!);
  const weather = await getMapWeather(cities).catch(() => ({}) as Awaited<ReturnType<typeof getMapWeather>>);

  const data: HomeMapCity[] = cities.map((c) => ({
    slug: c.slug,
    name: c.name,
    nameJa: c.nameJa,
    prefectureId: c.prefectureId,
    lat: c.lat,
    lon: c.lon,
    tempC: weather[c.slug]?.tempC ?? null,
    updatedAt: weather[c.slug]?.updatedAt ?? null,
  }));
  return <JapanMapView cities={data} />;
}
