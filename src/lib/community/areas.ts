import { PREFECTURES } from "@/lib/news/places";

// Community content belongs to an AREA: one of Japan's 47 prefectures, using
// the same ids as the rest of the site (and as the Explore catalogue's `pref`).
// People look for cities more than prefectures, so well-known cities appear as
// shortcuts that open their prefecture's community page.

export interface Area {
  id: string;
  en: string;
  ja: string;
  // Main cities of the area, English names, for display (e.g. Aichi: Nagoya).
  cities: string[];
}

export const AREAS: Area[] = PREFECTURES.map((p) => ({
  id: p.id,
  en: p.en,
  ja: p.ja,
  // enTokens holds the prefecture name first (or "<name> Prefecture"), then its cities.
  cities: p.enTokens.slice(1).filter((t) => !t.endsWith("Prefecture")),
}));

export const AREA_BY_ID = new Map(AREAS.map((a) => [a.id, a]));

export interface FeaturedArea {
  slug: string;     // the shortcut people know it by
  areaId: string;   // the community page it opens
  en: string;
  ja: string;
}

// Shown as quick filters. Order is roughly how visitors ask for them.
export const FEATURED_AREAS: FeaturedArea[] = [
  { slug: "tokyo", areaId: "tokyo", en: "Tokyo", ja: "東京" },
  { slug: "osaka", areaId: "osaka", en: "Osaka", ja: "大阪" },
  { slug: "kyoto", areaId: "kyoto", en: "Kyoto", ja: "京都" },
  { slug: "nara", areaId: "nara", en: "Nara", ja: "奈良" },
  { slug: "hokkaido", areaId: "hokkaido", en: "Hokkaido", ja: "北海道" },
  { slug: "okinawa", areaId: "okinawa", en: "Okinawa", ja: "沖縄" },
  { slug: "hiroshima", areaId: "hiroshima", en: "Hiroshima", ja: "広島" },
  { slug: "fukuoka", areaId: "fukuoka", en: "Fukuoka", ja: "福岡" },
  { slug: "nagoya", areaId: "aichi", en: "Nagoya", ja: "名古屋" },
  { slug: "kobe", areaId: "hyogo", en: "Kobe", ja: "神戸" },
  { slug: "kanazawa", areaId: "ishikawa", en: "Kanazawa", ja: "金沢" },
  { slug: "gifu", areaId: "gifu", en: "Gifu", ja: "岐阜" },
  { slug: "sendai", areaId: "miyagi", en: "Sendai", ja: "仙台" },
];

const FEATURED_BY_SLUG = new Map(FEATURED_AREAS.map((f) => [f.slug, f]));

// Every city name that should open some area's page: the featured shortcuts
// plus each area's own cities (Sapporo -> Hokkaido, Yokohama -> Kanagawa...).
const CITY_TO_AREA = new Map<string, string>();
for (const a of AREAS) for (const c of a.cities) CITY_TO_AREA.set(c.toLowerCase(), a.id);
for (const f of FEATURED_AREAS) CITY_TO_AREA.set(f.slug, f.areaId);

// What a URL like /community/<slug> means: a prefecture id opens that area; a
// city name opens its area (so /community/nagoya is the Aichi page, labelled
// with the city). Returns null for anything else.
export function resolveArea(slug: string): { area: Area; canonical: string; featured?: FeaturedArea } | null {
  const key = slug.toLowerCase();
  const direct = AREA_BY_ID.get(key);
  if (direct) return { area: direct, canonical: direct.id, featured: FEATURED_AREAS.find((f) => f.areaId === direct.id && f.slug === direct.id) };
  const areaId = CITY_TO_AREA.get(key);
  const area = areaId ? AREA_BY_ID.get(areaId) : undefined;
  if (!area) return null;
  return { area, canonical: area.id, featured: FEATURED_BY_SLUG.get(key) };
}

export function isAreaId(value: string | undefined): value is string {
  return Boolean(value && AREA_BY_ID.has(value));
}
