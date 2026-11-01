import { MAP_CITIES } from "@/lib/map/cities";
import { getMapWeather } from "@/lib/services/weather";

export const runtime = "nodejs";

// Current temperature, feels-like, condition and today's rain chance for the
// map's cities — one Open-Meteo call, cached for 10 minutes.
export async function GET() {
  try {
    const cities = await getMapWeather(MAP_CITIES);
    return Response.json({ cities }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch {
    return Response.json({ error: "Weather is unavailable." }, { status: 502 });
  }
}
