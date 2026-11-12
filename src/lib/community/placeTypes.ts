// What a "place" is in the Community, in code that both the browser and the server
// can use (no data files, no database).
//
// A place reference (`place_ref`) is one of:
//   Q123   an Explore catalogue place (a Wikidata id) — shrines, castles, parks…
//   N123   an OpenStreetMap node   ┐
//   W123   an OpenStreetMap way    ├ a restaurant, cafe, hotel, shop, gym, salon… anywhere in Japan
//   R123   an OpenStreetMap relation ┘

export const PLACE_REF_RE = /^(Q[0-9]{1,12}|[NWR][0-9]{1,15})$/;
export const OSM_REF_RE = /^[NWR][0-9]{1,15}$/;

export const isPlaceRef = (v: unknown): v is string => typeof v === "string" && PLACE_REF_RE.test(v);
export const isOsmRef = (v: unknown): v is string => typeof v === "string" && OSM_REF_RE.test(v);

export type PlaceCategory = "attraction" | "restaurant" | "cafe" | "hotel" | "shopping" | "department_store" | "gym" | "salon" | "other";

// The kinds of place people can filter by, in the order shown.
export const PLACE_CATEGORIES: { id: PlaceCategory; en: string; ja: string }[] = [
  { id: "attraction", en: "Attractions", ja: "観光スポット" },
  { id: "restaurant", en: "Restaurants", ja: "レストラン" },
  { id: "cafe", en: "Cafes", ja: "カフェ" },
  { id: "hotel", en: "Hotels", ja: "ホテル" },
  { id: "shopping", en: "Shopping", ja: "ショッピング" },
  { id: "department_store", en: "Department stores", ja: "百貨店" },
  { id: "gym", en: "Gyms", ja: "ジム" },
  { id: "salon", en: "Hair & beauty salons", ja: "美容室・サロン" },
  { id: "other", en: "Other places", ja: "その他" },
];

export const PLACE_CATEGORY_IDS = PLACE_CATEGORIES.map((c) => c.id);
export const PLACE_CATEGORY_BY_ID = new Map(PLACE_CATEGORIES.map((c) => [c.id, c]));
export const isPlaceCategory = (v: unknown): v is PlaceCategory => typeof v === "string" && PLACE_CATEGORY_BY_ID.has(v as PlaceCategory);

// One place, wherever it came from.
export interface CommunityPlace {
  ref: string;
  name: string;
  nameEn: string | null;
  nameJa: string | null;
  address: string | null;
  city: string | null;
  areaId: string;
  lat: number;
  lon: number;
  category: PlaceCategory;
  source: "catalogue" | "osm";
}

// Google Maps links need no key and no billing. They open Google Maps at the
// exact coordinates, so the pin is always where the place really is.
export const googleMapsUrl = (p: { lat: number; lon: number }) => `https://www.google.com/maps/search/?api=1&query=${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
export const googleDirectionsUrl = (p: { lat: number; lon: number }) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;

// A small OpenStreetMap picture of the spot (an embedded map, no key needed).
export function osmEmbedUrl(p: { lat: number; lon: number }, span = 0.006): string {
  const bbox = [p.lon - span, p.lat - span * 0.6, p.lon + span, p.lat + span * 0.6].map((n) => n.toFixed(6)).join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
}
export const osmLargerUrl = (p: { lat: number; lon: number }) => `https://www.openstreetmap.org/?mlat=${p.lat.toFixed(6)}&mlon=${p.lon.toFixed(6)}#map=17/${p.lat.toFixed(6)}/${p.lon.toFixed(6)}`;

// Straight-line distance in kilometres (for "near me", worked out in the browser).
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
