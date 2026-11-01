// The cities shown on the maps. Coordinates are the real city centres. The
// prefecture id ties each city to the site's news, events and JMA alert data.
export interface MapCity {
  slug: string;
  name: string;
  nameJa: string;
  prefectureId: string;
  prefecture: string;
  lat: number;
  lon: number;
  // Lower number = more important: it keeps its label when labels would collide.
  rank: number;
  // Has its own page on this site (/tokyo, /osaka, /kyoto).
  cityPage: boolean;
}

export const MAP_CITIES: MapCity[] = [
  { slug: "tokyo", name: "Tokyo", nameJa: "東京", prefectureId: "tokyo", prefecture: "Tokyo", lat: 35.6762, lon: 139.6503, rank: 1, cityPage: true },
  { slug: "osaka", name: "Osaka", nameJa: "大阪", prefectureId: "osaka", prefecture: "Osaka", lat: 34.6937, lon: 135.5023, rank: 2, cityPage: true },
  { slug: "sapporo", name: "Sapporo", nameJa: "札幌", prefectureId: "hokkaido", prefecture: "Hokkaido", lat: 43.0618, lon: 141.3545, rank: 3, cityPage: false },
  { slug: "fukuoka", name: "Fukuoka", nameJa: "福岡", prefectureId: "fukuoka", prefecture: "Fukuoka", lat: 33.5904, lon: 130.4017, rank: 4, cityPage: false },
  { slug: "nagoya", name: "Nagoya", nameJa: "名古屋", prefectureId: "aichi", prefecture: "Aichi", lat: 35.1815, lon: 136.9066, rank: 5, cityPage: false },
  { slug: "kyoto", name: "Kyoto", nameJa: "京都", prefectureId: "kyoto", prefecture: "Kyoto", lat: 35.0116, lon: 135.7681, rank: 6, cityPage: true },
  { slug: "sendai", name: "Sendai", nameJa: "仙台", prefectureId: "miyagi", prefecture: "Miyagi", lat: 38.2682, lon: 140.8694, rank: 7, cityPage: false },
  { slug: "hiroshima", name: "Hiroshima", nameJa: "広島", prefectureId: "hiroshima", prefecture: "Hiroshima", lat: 34.3853, lon: 132.4553, rank: 8, cityPage: false },
  { slug: "naha", name: "Naha", nameJa: "那覇", prefectureId: "okinawa", prefecture: "Okinawa", lat: 26.2124, lon: 127.6809, rank: 9, cityPage: false },
  { slug: "kobe", name: "Kobe", nameJa: "神戸", prefectureId: "hyogo", prefecture: "Hyogo", lat: 34.6901, lon: 135.1955, rank: 10, cityPage: false },
  { slug: "yokohama", name: "Yokohama", nameJa: "横浜", prefectureId: "kanagawa", prefecture: "Kanagawa", lat: 35.4437, lon: 139.638, rank: 11, cityPage: false },
];

export const MAP_CITY_BY_SLUG = new Map(MAP_CITIES.map((c) => [c.slug, c]));

// Temperature bands used by the weather layer's markers and legend.
export const TEMP_BANDS: { max: number; color: string; label: string }[] = [
  { max: 5, color: "#60a5fa", label: "< 5°" },
  { max: 14, color: "#22d3ee", label: "5–14°" },
  { max: 21, color: "#4ade80", label: "15–21°" },
  { max: 27, color: "#fbbf24", label: "22–27°" },
  { max: Infinity, color: "#fb923c", label: "28°+" },
];

export function tempColor(tempC: number): string {
  return (TEMP_BANDS.find((b) => tempC < b.max) ?? TEMP_BANDS[TEMP_BANDS.length - 1]).color;
}
