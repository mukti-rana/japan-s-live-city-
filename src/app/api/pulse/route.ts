import { getRecentEarthquakes } from "@/lib/services/earthquake";
import { getTrendRadar } from "@/lib/services/trendRadar";

export const runtime = "nodejs";

// The few live facts the Home "Japan right now" card rotates through, from
// the services the rest of the site already uses (JMA via P2P Quake and the
// Trend Radar). Each is optional:
// one that can't be fetched is simply left out — never replaced by a guess.
export async function GET() {
  const [quake, radar] = await Promise.allSettled([getRecentEarthquakes(1), getTrendRadar()]);
  const q = quake.status === "fulfilled" ? quake.value[0] : undefined;
  const top = radar.status === "fulfilled" ? radar.value.items[0] : undefined;
  return Response.json(
    {
      quake: q ? { id: q.id, location: q.location, magnitude: q.magnitude, maxIntensity: q.maxIntensity, depthKm: q.depthKm, tsunami: q.tsunami, tsunamiCode: q.tsunamiCode, time: q.time } : null,
      trend: top && radar.status === "fulfilled" ? { id: top.id, title: top.title, names: top.names, views: top.views, dataDate: radar.value.dataDate } : null,
      fetchedAt: Date.now(),
    },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
