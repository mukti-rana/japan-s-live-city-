import { PREFECTURES } from "@/lib/news/places";
import { OSM_REF_RE, type CommunityPlace, type PlaceCategory } from "@/lib/community/placeTypes";

// Searching OpenStreetMap through its public Nominatim service, politely.
//
// Nominatim's usage policy (https://operations.osmfoundation.org/policies/nominatim/)
// is followed here: at most ONE request per second (calls are queued), results are
// cached, a clear User-Agent names this site (and nothing personal), and the search
// only runs when a person asks for it — never on every keystroke. The data is
// © OpenStreetMap contributors (ODbL); the pages that show it say so.

const BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "LiveCityJapan/1.0 (community place search; https://livecityjapan.app)";
const MIN_GAP_MS = 1100;
const CACHE_MS = 60 * 60 * 1000;
const CACHE_MAX = 400;

// ── a one-per-second queue and a small cache ──

let lastCall = 0;
let chain: Promise<unknown> = Promise.resolve();
const cache = new Map<string, { at: number; value: unknown }>();

function throttled<T>(work: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = lastCall + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
    return work();
  });
  // A failed call must not block the queue.
  chain = run.catch(() => undefined);
  return run;
}

async function cached<T>(key: string, work: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value as T;
  const value = await throttled(work);
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
  cache.set(key, { at: Date.now(), value });
  return value;
}

// ── what Nominatim returns ──

interface NominatimItem {
  osm_type?: string;
  osm_id?: number;
  lat?: string;
  lon?: string;
  category?: string;
  class?: string;
  type?: string;
  name?: string;
  display_name?: string;
  address?: Record<string, string>;
  namedetails?: Record<string, string>;
}

const JAPANESE = /[぀-ヿ㐀-鿿]/;

// OpenStreetMap tags → the place types people filter by.
export function categoryFor(cls: string | undefined, type: string | undefined): PlaceCategory {
  const c = cls ?? "";
  const t = type ?? "";
  if (c === "amenity") {
    if (t === "cafe") return "cafe";
    if (["restaurant", "fast_food", "food_court", "bar", "pub", "biergarten", "izakaya"].includes(t)) return "restaurant";
    if (["place_of_worship", "theatre", "cinema", "arts_centre", "marketplace"].includes(t)) return "attraction";
    return "other";
  }
  if (c === "tourism") {
    if (["hotel", "hostel", "guest_house", "motel", "apartment", "chalet", "ryokan", "resort"].includes(t)) return "hotel";
    return "attraction";
  }
  if (c === "shop") {
    if (t === "department_store") return "department_store";
    if (["hairdresser", "beauty", "cosmetics", "massage", "nail_salon", "tattoo"].includes(t)) return "salon";
    return "shopping";
  }
  if (c === "leisure") {
    if (["fitness_centre", "sports_centre", "fitness_station"].includes(t)) return "gym";
    if (["park", "garden", "nature_reserve", "water_park", "stadium"].includes(t)) return "attraction";
    return "other";
  }
  if (["historic", "natural", "man_made"].includes(c)) return "attraction";
  if (c === "building" && ["temple", "shrine", "castle"].includes(t)) return "attraction";
  return "other";
}

// "JP-13" → the site's prefecture id for Tokyo. The site's list is in the official
// order (Hokkaido = 01 … Okinawa = 47).
export function areaFromIso(iso: string | undefined): string | null {
  const m = /^JP-(\d{2})$/.exec(iso ?? "");
  const n = m ? Number(m[1]) : 0;
  return n >= 1 && n <= 47 ? (PREFECTURES[n - 1]?.id ?? null) : null;
}

// Roads, footpaths, platforms and the like are not places anyone reviews or photographs.
const NOT_A_PLACE_CLASS = new Set(["highway", "waterway", "landuse", "power", "route", "boundary_marker"]);
const NOT_A_PLACE_TYPE = new Set(["stop", "platform", "tram_stop", "halt", "subway_entrance", "stop_position", "bus_stop", "entrance"]);
export function isRealPlace(item: { category?: string; class?: string; type?: string }): boolean {
  const cls = item.category ?? item.class ?? "";
  return !NOT_A_PLACE_CLASS.has(cls) && !NOT_A_PLACE_TYPE.has(item.type ?? "");
}

export function refFor(item: NominatimItem): string | null {
  const letter = item.osm_type === "node" ? "N" : item.osm_type === "way" ? "W" : item.osm_type === "relation" ? "R" : null;
  return letter && item.osm_id ? `${letter}${item.osm_id}` : null;
}

const trimText = (s: string | undefined | null, max: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

// A Nominatim result as one of our places — or null when it cannot be one
// (not in Japan, no position, no prefecture): nothing is guessed.
export function toPlace(item: NominatimItem): CommunityPlace | null {
  if (!isRealPlace(item)) return null;
  const ref = refFor(item);
  const lat = Number(item.lat);
  const lon = Number(item.lon);
  const a = item.address ?? {};
  const areaId = areaFromIso(a["ISO3166-2-lvl4"]);
  if (!ref || !Number.isFinite(lat) || !Number.isFinite(lon) || !areaId || a.country_code !== "jp") return null;
  if (lat < 20 || lat > 46.6 || lon < 122 || lon > 154.5) return null;

  const nd = item.namedetails ?? {};
  const own = trimText(nd.name ?? item.name, 150);
  const nameJa = trimText(nd["name:ja"] ?? (JAPANESE.test(own) ? own : ""), 150) || null;
  const nameEn = trimText(nd["name:en"] ?? nd["name:ja-Latn"] ?? nd["name:ja_rm"] ?? (own && !JAPANESE.test(own) ? own : ""), 150) || null;
  const parts = (item.display_name ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  // English first when OpenStreetMap has an English name, like the Explore catalogue.
  const name = nameEn || own || nameJa || parts[0] || "";
  if (!name) return null;

  // The address without the country (and without the postcode, which is noise here).
  const address = trimText(parts.filter((p) => p !== "日本" && p !== "Japan" && !/^\d{3}-?\d{4}$/.test(p)).join(", "), 300) || null;
  const city = trimText(a.city ?? a.town ?? a.village ?? a.municipality ?? a.city_district ?? a.suburb, 100) || null;
  return { ref, name, nameEn, nameJa, address, city, areaId, lat, lon, category: categoryFor(item.category ?? item.class, item.type), source: "osm" };
}

export interface OsmPlace extends CommunityPlace {
  osmClass: string;
}

const withClass = (item: NominatimItem, p: CommunityPlace): OsmPlace => ({ ...p, osmClass: `${item.category ?? item.class ?? ""}=${item.type ?? ""}`.slice(0, 60) });

async function call(path: string, params: Record<string, string>): Promise<NominatimItem[]> {
  const url = `${BASE}${path}?${new URLSearchParams({ format: "jsonv2", addressdetails: "1", namedetails: "1", "accept-language": "ja,en", ...params })}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, signal: AbortSignal.timeout(9000), cache: "no-store" });
  if (!res.ok) throw new Error(`OpenStreetMap search answered ${res.status}`);
  return (await res.json()) as NominatimItem[];
}

// Search by a name, a Japanese name, an address, a city or a prefecture.
export async function searchOsm(q: string): Promise<OsmPlace[]> {
  const text = q.replace(/\s+/g, " ").trim().slice(0, 120);
  if (text.length < 2) return [];
  const items = await cached(`s:${text.toLowerCase()}`, () => call("/search", { q: text, countrycodes: "jp", limit: "40", dedupe: "1" }));
  const out: OsmPlace[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const p = toPlace(item);
    if (!p || seen.has(p.ref)) continue;
    seen.add(p.ref);
    out.push(withClass(item, p));
  }
  return out;
}

// Re-read one place straight from OpenStreetMap, so what gets saved is what
// OpenStreetMap says, never what a browser claims.
export async function lookupOsm(ref: string): Promise<OsmPlace | null> {
  if (!OSM_REF_RE.test(ref)) return null;
  const items = await cached(`l:${ref}`, () => call("/lookup", { osm_ids: ref }));
  const item = items[0];
  const p = item ? toPlace(item) : null;
  return item && p ? withClass(item, p) : null;
}
