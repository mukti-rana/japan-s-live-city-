import JapanMapView from "@/components/home/widgets/JapanMapView";
import { MAP_CITIES } from "@/lib/data/mapCities";
import { HERO_CITIES } from "@/lib/data/heroCities";
import { getWeather } from "@/lib/services/weather";

// Real temperatures for each city on the map, from the same cached
// Open-Meteo service the Weather page uses (fixed coordinates, so the
// results are shared and cached for 10 minutes rather than fetched per
// visitor). A city whose lookup fails simply shows no temperature — never
// a made-up one — and the "Live" badge only appears if at least one real
// temperature loaded.
export default async function JapanMapWidget() {
  const cities = await Promise.all(
    MAP_CITIES.map(async (city) => {
      const coords = HERO_CITIES.find((c) => c.slug === city.slug);
      if (!coords) return { ...city, tempC: null };
      try {
        const weather = await getWeather(coords.lat, coords.lon);
        return { ...city, tempC: weather.tempC };
      } catch {
        return { ...city, tempC: null };
      }
    }),
  );

  return <JapanMapView cities={cities} />;
}
