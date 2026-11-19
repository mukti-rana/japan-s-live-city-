import { getEarthquakeFeed } from "@/lib/services/earthquake";

export const runtime = "nodejs";

// The full recent earthquake feed (JMA via P2P Quake) for the Earthquakes page, which asks again every couple of minutes while it is open.
// If the provider cannot be reached the answer is an error, never a guess.
export async function GET() {
  try {
    const quakes = await getEarthquakeFeed();
    return Response.json({ quakes, fetchedAt: new Date().toISOString() }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 502 });
  }
}
