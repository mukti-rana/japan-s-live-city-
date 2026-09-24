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
