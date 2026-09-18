// City list for the homepage hero's dynamic background — independent of
// src/lib/data/cities.ts's CitySlug (which only covers the 3 cities with
// full /weather, /[city], and train-status support). This list exists
// purely to give the hero a real photo/atmosphere and real coordinates
// (for a real weather fetch) for a wider set of major cities, without
// expanding those other, more tightly-scoped features.
//
// Real hero-quality photography only exists for Tokyo today. Where a
// usable landmark photo already exists elsewhere in the project
// (src/lib/data/places.ts), it's reused here. Kobe/Fukuoka/Sendai have no
// photography anywhere in the project, so they fall back to a gradient
// "atmosphere" instead of a photo until real images are added.
export interface HeroCityInfo {
  slug: string;
  name: string;
  nameJa: string;
  region: string;
  lat: number;
  lon: number;
  heroImage: string | null;
  atmosphere: { day: string; night: string };
}

export const HERO_CITIES: HeroCityInfo[] = [
  {
    slug: "tokyo",
    name: "Tokyo",
    nameJa: "東京",
    region: "Kanto",
    lat: 35.6762,
    lon: 139.6503,
    heroImage: "/images/hero-tokyo.jpg",
    atmosphere: { day: "from-azure/40 to-sakura/20", night: "from-[#141033] to-[#0b0e1a]" },
  },
  {
    slug: "osaka",
    name: "Osaka",
    nameJa: "大阪",
    region: "Kansai",
    lat: 34.6937,
    lon: 135.5023,
    heroImage: "/images/place-dotonbori-canal.jpg",
    atmosphere: { day: "from-sakura/40 to-azure/20", night: "from-[#2a1440] to-[#0b0e1a]" },
  },
  {
    slug: "kyoto",
    name: "Kyoto",
    nameJa: "京都",
    region: "Kansai",
    lat: 35.0116,
    lon: 135.7681,
    heroImage: "/images/place-fushimi-inari.jpg",
    atmosphere: { day: "from-gold/40 to-sakura/20", night: "from-[#301a20] to-[#0b0e1a]" },
  },
  {
    slug: "nara",
    name: "Nara",
    nameJa: "奈良",
    region: "Kansai",
    lat: 34.6851,
    lon: 135.8048,
    heroImage: "/images/place-nara-park.jpg",
    atmosphere: { day: "from-gold/35 to-mint/20", night: "from-[#241f10] to-[#0b0e1a]" },
  },
  {
    slug: "kobe",
    name: "Kobe",
    nameJa: "神戸",
    region: "Kansai",
    lat: 34.6901,
    lon: 135.1955,
    heroImage: null,
    atmosphere: { day: "from-azure/40 to-mint/20", night: "from-[#0f2436] to-[#0b0e1a]" },
  },
  {
    slug: "hiroshima",
    name: "Hiroshima",
    nameJa: "広島",
    region: "Chugoku",
    lat: 34.3853,
    lon: 132.4553,
    heroImage: "/images/place-itsukushima.jpg",
    atmosphere: { day: "from-azure/40 to-sakura/20", night: "from-[#141c33] to-[#0b0e1a]" },
  },
  {
    slug: "fukuoka",
    name: "Fukuoka",
    nameJa: "福岡",
    region: "Kyushu",
    lat: 33.5904,
    lon: 130.4017,
    heroImage: null,
    atmosphere: { day: "from-gold/35 to-azure/25", night: "from-[#231d38] to-[#0b0e1a]" },
  },
  {
    slug: "sapporo",
    name: "Sapporo",
    nameJa: "札幌",
    region: "Hokkaido",
    lat: 43.0618,
    lon: 141.3545,
    heroImage: "/images/place-sapporo-clock-tower.jpg",
    atmosphere: { day: "from-azure/30 to-mint/20", night: "from-[#101f2c] to-[#0b0e1a]" },
  },
  {
    slug: "sendai",
    name: "Sendai",
    nameJa: "仙台",
    region: "Tohoku",
    lat: 38.2682,
    lon: 140.8694,
    heroImage: null,
    atmosphere: { day: "from-mint/30 to-azure/25", night: "from-[#132a20] to-[#0b0e1a]" },
  },
];

// Neutral atmosphere used when a real detected location doesn't match any
// city in the list above — never falls back to another city's photo.
export const DEFAULT_HERO_ATMOSPHERE = {
  day: "from-azure/30 to-panel",
  night: "from-[#161a30] to-[#0b0e1a]",
};

export function findHeroCity(name: string): HeroCityInfo | undefined {
  const needle = name.toLowerCase();
  return HERO_CITIES.find((city) => needle.includes(city.name.toLowerCase()));
}
