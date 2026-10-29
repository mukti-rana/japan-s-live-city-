import { cleanPoint, facilitiesNear } from "@/lib/emergency/nearby";

export const runtime = "nodejs";

// Hospitals, pharmacies, police stations, fire stations and AEDs from
// OpenStreetMap, around a point rounded to ~1 km by the caller.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const point = cleanPoint(searchParams.get("lat"), searchParams.get("lon"));
  if (!point) return Response.json({ error: "A position in Japan is required." }, { status: 400 });
  try {
    const facilities = await facilitiesNear(point, 3000);
    return Response.json({ facilities, source: "OpenStreetMap contributors (ODbL)", checkedAt: Date.now() }, { headers: { "Cache-Control": "public, s-maxage=900" } });
  } catch {
    return Response.json({ facilities: [], unavailable: true, source: "OpenStreetMap contributors (ODbL)", checkedAt: Date.now() });
  }
}
