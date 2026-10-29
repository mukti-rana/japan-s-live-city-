import { cleanPoint, sheltersNear } from "@/lib/emergency/nearby";

export const runtime = "nodejs";

// Official designated evacuation sites around a point (rounded to ~1 km by
// the caller; nothing is stored or logged).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const point = cleanPoint(searchParams.get("lat"), searchParams.get("lon"));
  if (!point) return Response.json({ error: "A position in Japan is required." }, { status: 400 });
  try {
    const shelters = await sheltersNear(point, 6);
    return Response.json({ shelters, source: "Geospatial Information Authority of Japan", checkedAt: Date.now() }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
  } catch {
    return Response.json({ shelters: [], unavailable: true, source: "Geospatial Information Authority of Japan", checkedAt: Date.now() });
  }
}
