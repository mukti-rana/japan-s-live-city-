import { json } from "@/lib/community/http";
import { searchOsm } from "@/lib/community/osm";
import { isPlaceCategory } from "@/lib/community/placeTypes";
import { isAreaId } from "@/lib/community/areas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Search OpenStreetMap for places in Japan (restaurants, cafes, hotels, shops…).
// The service is shared and free, so this is deliberately gentle: a person may
// search at most 10 times a minute, identical searches are answered from a cache,
// and the site's calls to OpenStreetMap are queued one per second. It only runs
// when someone presses Search — nothing is looked up as they type.
const hits = new Map<string, number[]>();
const LIMIT = 10;

function tooMany(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > LIMIT;
}

export async function GET(request: Request) {
  // Only this website's own pages ask (browsers say so; anything odd is refused).
  const site = request.headers.get("sec-fetch-site");
  if (site && !["same-origin", "same-site", "none"].includes(site)) return json({ error: "This request isn't allowed." }, 403);

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").replace(/\s+/g, " ").trim();
  if (q.length < 2 || q.length > 120) return json({ places: [] });
  const area = url.searchParams.get("area") ?? undefined;
  const cat = url.searchParams.get("cat") ?? undefined;

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (tooMany(ip)) return json({ error: "You're searching very quickly. Please wait a moment." }, 429, { "Retry-After": "30" });

  try {
    let places = await searchOsm(q);
    if (area && isAreaId(area)) places = places.filter((p) => p.areaId === area);
    if (cat && isPlaceCategory(cat)) places = places.filter((p) => p.category === cat);
    // Businesses first, bare map areas last.
    places.sort((a, b) => Number(a.category === "other") - Number(b.category === "other"));
    return json({ places: places.slice(0, 10) }, 200, { "Cache-Control": "private, max-age=600" });
  } catch (error) {
    console.error(`[community] place search: ${String(error instanceof Error ? error.message : error).slice(0, 160)}`);
    return json({ error: "Map search isn't available right now. You can still pick a place from the list or type its name." }, 503);
  }
}
