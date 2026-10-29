import { haversineKm, inJapan } from "@/lib/events/geo";

const USER_AGENT = "LiveCityJapan/1.0 (educational project; emergency information)";

// Positions arrive rounded to 0.01° (about 1 km) — the browser keeps the exact
// position and measures real distances itself. Results are returned for a wide
// enough area around the rounded point that nothing close to the exact position
// is missed.
export function cleanPoint(latRaw: string | null, lonRaw: string | null): { lat: number; lon: number } | null {
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inJapan(lat, lon)) return null;
  return { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 };
}

// ── Designated evacuation sites (Geospatial Information Authority of Japan) ──
//
// The national dataset of 指定緊急避難場所 — sites that municipalities have
// designated for each type of hazard. It is a list of designations, not a live
// status: whether a site is open during a disaster is announced by the
// municipality. Published as vector tiles at zoom 10 (one tile ≈ 30 km wide).

export const HAZARDS = ["flood", "landslide", "storm_surge", "earthquake", "tsunami", "fire", "inland_flood", "volcano"] as const;
export type Hazard = (typeof HAZARDS)[number];

export interface Shelter {
  name: string;
  address: string | null;
  remarks: string | null;
  lat: number;
  lon: number;
  // Hazards this site is designated for.
  hazards: Hazard[];
}

interface ShelterFeature {
  geometry: { coordinates: [number, number] };
  properties: Record<string, string | number | null>;
}

function tileOf(lat: number, lon: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor(((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n);
  return { x, y };
}

async function shelterTile(x: number, y: number): Promise<ShelterFeature[]> {
  const res = await fetch(`https://cyberjapandata.gsi.go.jp/xyz/skhb01/10/${x}/${y}.geojson`, {
    signal: AbortSignal.timeout(9000),
    next: { revalidate: 86400 },
    headers: { "User-Agent": USER_AGENT },
  });
  if (res.status === 404) return []; // no sites in this tile
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return ((await res.json()) as { features?: ShelterFeature[] }).features ?? [];
}

export async function sheltersNear(center: { lat: number; lon: number }, radiusKm = 5, limit = 150): Promise<Shelter[]> {
  const base = tileOf(center.lat, center.lon, 10);
  // A tile is ~30 km wide, but a search near its edge needs the neighbour too.
  const margin = 0.06;
  const dx = tileOf(center.lat, center.lon + margin, 10).x !== base.x ? 1 : tileOf(center.lat, center.lon - margin, 10).x !== base.x ? -1 : 0;
  const dy = tileOf(center.lat + margin, center.lon, 10).y !== base.y ? -1 : tileOf(center.lat - margin, center.lon, 10).y !== base.y ? 1 : 0;
  const tiles = [base, ...(dx ? [{ x: base.x + dx, y: base.y }] : []), ...(dy ? [{ x: base.x, y: base.y + dy }] : [])];

  const all = (await Promise.all(tiles.map((t) => shelterTile(t.x, t.y)))).flat();
  return all
    .map((f) => {
      const [lon, lat] = f.geometry.coordinates;
      const p = f.properties;
      return {
        distance: haversineKm(center.lat, center.lon, lat, lon),
        shelter: {
          name: String(p.name ?? "").trim(),
          address: p.address ? String(p.address) : null,
          remarks: p.remarks ? String(p.remarks) : null,
          lat,
          lon,
          hazards: HAZARDS.filter((_, i) => Number(p[`disaster${i + 1}`]) === 1),
        } satisfies Shelter,
      };
    })
    .filter((x) => x.shelter.name && x.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((x) => x.shelter);
}

// ── Hospitals, pharmacies, police and AEDs (OpenStreetMap) ──────────────
//
// OpenStreetMap is volunteer-edited: addresses and opening hours are shown only
// where a mapper recorded them, exactly as recorded, and coverage varies. The
// public Overpass service is shared and can be busy — when it is, the page says
// so and offers the official directories instead.

export type FacilityType = "hospital" | "clinic" | "pharmacy" | "police" | "fire_station" | "aed";

export interface Facility {
  id: string;
  type: FacilityType;
  name: string | null;
  nameEn: string | null;
  address: string | null;
  openingHours: string | null;
  website: string | null;
  lat: number;
  lon: number;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const MIRRORS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
const cache = new Map<string, { at: number; data: Facility[] }>();
const CACHE_TTL = 6 * 60 * 60 * 1000;
// When the shared service is busy we remember that for a few minutes, so
// visitors get an immediate answer instead of each waiting for a timeout.
const failures = new Map<string, number>();
const FAILURE_TTL = 3 * 60 * 1000;
// Total time allowed for a lookup — a free hosting plan cuts requests off at
// about ten seconds.
const LOOKUP_BUDGET_MS = 8000;

function address(tags: Record<string, string>): string | null {
  const parts = [tags["addr:full"], tags["addr:province"], tags["addr:city"], tags["addr:suburb"], tags["addr:quarter"], tags["addr:neighbourhood"], tags["addr:block_number"], tags["addr:housenumber"], tags["addr:street"]].filter(Boolean);
  const text = parts.join(" ").trim();
  return text || null;
}

function typeOf(tags: Record<string, string>): FacilityType | null {
  if (tags.emergency === "defibrillator") return "aed";
  const a = tags.amenity;
  return a === "hospital" || a === "clinic" || a === "pharmacy" || a === "police" || a === "fire_station" ? a : null;
}

export async function facilitiesNear(center: { lat: number; lon: number }, radiusM = 2500): Promise<Facility[]> {
  const key = `${center.lat},${center.lon},${radiusM}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data;
  const failedAt = failures.get(key);
  if (failedAt && Date.now() - failedAt < FAILURE_TTL) throw new Error("Service busy (recently failed)");
  const deadline = Date.now() + LOOKUP_BUDGET_MS;

  const around = `(around:${radiusM},${center.lat},${center.lon})`;
  const query = `[out:json][timeout:20];(nwr["amenity"~"^(hospital|clinic|pharmacy|police|fire_station)$"]${around};nwr["emergency"="defibrillator"]${around};);out center 300;`;

  let lastError = "Unavailable";
  for (const mirror of MIRRORS) {
    const remaining = deadline - Date.now();
    if (remaining < 1500) break;
    try {
      const res = await fetch(mirror, {
        method: "POST",
        signal: AbortSignal.timeout(Math.min(5000, remaining)),
        cache: "no-store",
        headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: query }),
      });
      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        continue;
      }
      const elements = ((await res.json()) as { elements?: OverpassElement[] }).elements ?? [];
      const data: Facility[] = [];
      for (const e of elements) {
        const tags = e.tags ?? {};
        const type = typeOf(tags);
        const lat = e.lat ?? e.center?.lat;
        const lon = e.lon ?? e.center?.lon;
        if (!type || lat === undefined || lon === undefined) continue;
        const website = tags.website ?? tags["contact:website"] ?? null;
        data.push({
          id: `${e.type}/${e.id}`,
          type,
          name: tags.name ?? null,
          nameEn: tags["name:en"] ?? null,
          address: address(tags),
          openingHours: tags.opening_hours ?? null,
          website: website && /^https?:\/\//.test(website) ? website : null,
          lat,
          lon,
        });
      }
      cache.set(key, { at: Date.now(), data });
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Request failed";
    }
  }
  failures.set(key, Date.now());
  throw new Error(lastError);
}
