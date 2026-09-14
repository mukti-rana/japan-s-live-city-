export type CitySlug = "osaka" | "kyoto" | "tokyo";

export interface CityInfo {
  slug: CitySlug;
  name: string;
  nameJa: string;
  region: string;
  lat: number;
  lon: number;
}

export const CITIES: CityInfo[] = [
  {
    slug: "osaka",
    name: "Osaka",
    nameJa: "大阪",
    region: "Kansai",
    lat: 34.6937,
    lon: 135.5023,
  },
  {
    slug: "kyoto",
    name: "Kyoto",
    nameJa: "京都",
    region: "Kansai",
    lat: 35.0116,
    lon: 135.7681,
  },
  {
    slug: "tokyo",
    name: "Tokyo",
    nameJa: "東京",
    region: "Kanto",
    lat: 35.6762,
    lon: 139.6503,
  },
];

export function getCity(slug: string): CityInfo | undefined {
  return CITIES.find((city) => city.slug === slug);
}

// MOCK DATA — no free, keyless real-time Japan train status API exists yet.
// Replace with a real TrainService (e.g. ODPT) once API access is set up.
export const CITY_TRAIN_LINES: Record<
  CitySlug,
  { name: string; color: string; status: string }[]
> = {
  osaka: [
    { name: "Osaka Loop Line", color: "#F2994A", status: "Normal" },
    { name: "Midosuji Line", color: "#F2544A", status: "Normal" },
    { name: "Tanimachi Line", color: "#6FCF52", status: "Normal" },
    { name: "Yotsubashi Line", color: "#4DA3FF", status: "1 delay" },
  ],
  kyoto: [
    { name: "Karasuma Line", color: "#6FCF52", status: "Normal" },
    { name: "Tozai Line", color: "#F2704A", status: "Normal" },
    { name: "Keihan Main Line", color: "#6FCF52", status: "Normal" },
    { name: "Hankyu Kyoto Line", color: "#F2704A", status: "Normal" },
  ],
  tokyo: [
    { name: "Yamanote Line", color: "#6FCF52", status: "Normal" },
    { name: "Chuo Line", color: "#F2994A", status: "Normal" },
    { name: "Ginza Line", color: "#F2C572", status: "Normal" },
    { name: "Toei Oedo Line", color: "#A78BFA", status: "1 delay" },
  ],
};
