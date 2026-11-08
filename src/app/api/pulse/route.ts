import { getQuakeFeed } from "@/lib/services/earthquake";
import { getTrendRadar } from "@/lib/services/trendRadar";
import { PREFECTURES } from "@/lib/news/places";

export const runtime = "nodejs";

const num = (v: string | null) => {
  const n = v === null || v === "" ? NaN : Number(v);
  return Number.isFinite(n) ? n : null;
};

// The few live facts the Home "Japan right now" card rotates through, from
// services the site already uses (JMA via P2P Quake, the Trend Radar). Given a
// prefecture (and, if the visitor shared it, a position rounded to ~10 km) the
// earthquake is the latest one felt or begun near them. Each fact is optional:
// one that can't be fetched is left out — never replaced by a guess.
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const pref = PREFECTURES.find((x) => x.id === p.get("pref"));
  const lat = num(p.get("lat"));
  const lon = num(p.get("lon"));
  const [quake, radar] = await Promise.allSettled([
    getQuakeFeed({ prefJa: pref?.ja ?? null, lat: lat === null ? null : Math.round(lat * 10) / 10, lon: lon === null ? null : Math.round(lon * 10) / 10 }),
    getTrendRadar(),
  ]);
  const top = radar.status === "fulfilled" ? radar.value.items[0] : undefined;
  return Response.json(
    {
      quake: quake.status === "fulfilled" ? quake.value : null,
      trend: top && radar.status === "fulfilled" ? { id: top.id, title: top.title, names: top.names, views: top.views, dataDate: radar.value.dataDate } : null,
      fetchedAt: Date.now(),
    },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
