import { getTrendRadar } from "@/lib/services/trendRadar";

export const runtime = "nodejs";

// The Trend Radar for the Home page's background refresh.
export async function GET() {
  try {
    const data = await getTrendRadar();
    return Response.json(data, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" } });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 502 });
  }
}
