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

export type TrainLineCategory = "jr" | "private" | "subway";

export interface TrainLineInfo {
  name: string;
  color: string;
  category: TrainLineCategory;
  status: string;
  delayMinutes?: number;
  note?: string;
}

// MOCK DATA — no free, keyless real-time Japan train status API exists yet.
// Replace with a real TrainService (e.g. ODPT, developer.odpt.org) once API
// access is set up. Line names, colors, and categories are real; status/
// delay values are illustrative only, not connected to any live feed.
export const CITY_TRAIN_LINES: Record<CitySlug, TrainLineInfo[]> = {
  osaka: [
    { name: "Osaka Loop Line", color: "#F2994A", category: "jr", status: "Normal" },
    { name: "JR Kyoto Line", color: "#4DA3FF", category: "jr", status: "Normal" },
    { name: "JR Tozai Line", color: "#6FCF52", category: "jr", status: "Normal" },
    { name: "Hankyu Kyoto Line", color: "#F2704A", category: "private", status: "Normal" },
    { name: "Keihan Main Line", color: "#6FCF52", category: "private", status: "Normal" },
    { name: "Kintetsu Nara Line", color: "#F2544A", category: "private", status: "Normal", note: "Osaka ↔ Nara" },
    { name: "Nankai Main Line", color: "#A78BFA", category: "private", status: "Delayed", delayMinutes: 4 },
    { name: "Midosuji Line", color: "#F2544A", category: "subway", status: "Normal" },
    { name: "Tanimachi Line", color: "#6FCF52", category: "subway", status: "Normal" },
    { name: "Yotsubashi Line", color: "#4DA3FF", category: "subway", status: "Normal" },
  ],
  kyoto: [
    { name: "JR Kyoto Line", color: "#4DA3FF", category: "jr", status: "Normal" },
    { name: "Sagano Line", color: "#6FCF52", category: "jr", status: "Normal" },
    { name: "Hankyu Kyoto Line", color: "#F2704A", category: "private", status: "Normal" },
    { name: "Keihan Main Line", color: "#6FCF52", category: "private", status: "Normal" },
    { name: "Kintetsu Kyoto Line", color: "#F2544A", category: "private", status: "Delayed", delayMinutes: 2 },
    { name: "Eizan Line", color: "#A78BFA", category: "private", status: "Normal" },
    { name: "Karasuma Line", color: "#6FCF52", category: "subway", status: "Normal" },
    { name: "Tozai Line", color: "#F2704A", category: "subway", status: "Normal" },
  ],
  tokyo: [
    { name: "Yamanote Line", color: "#6FCF52", category: "jr", status: "Normal" },
    { name: "Chuo Line (Rapid)", color: "#F2994A", category: "jr", status: "Normal" },
    { name: "Keihin-Tohoku Line", color: "#4DA3FF", category: "jr", status: "Normal" },
    { name: "Saikyo Line", color: "#6FCF52", category: "jr", status: "Delayed", delayMinutes: 5 },
    { name: "Tokyu Toyoko Line", color: "#F2544A", category: "private", status: "Normal", note: "Shibuya ↔ Yokohama" },
    { name: "Odakyu Odawara Line", color: "#4DA3FF", category: "private", status: "Normal" },
    { name: "Keio Line", color: "#A78BFA", category: "private", status: "Normal" },
    { name: "Ginza Line", color: "#F2C572", category: "subway", status: "Normal" },
    { name: "Marunouchi Line", color: "#F2544A", category: "subway", status: "Normal" },
    { name: "Toei Oedo Line", color: "#A78BFA", category: "subway", status: "Delayed", delayMinutes: 3 },
    { name: "Tozai Line", color: "#4DA3FF", category: "subway", status: "Normal" },
  ],
};
