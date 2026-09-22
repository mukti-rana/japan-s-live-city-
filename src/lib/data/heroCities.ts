// City list for the homepage hero's dynamic background — independent of
// src/lib/data/cities.ts's CitySlug (which only covers the 3 cities with
// full /weather, /[city], and train-status support). This list exists
// purely to give the hero real photos/atmosphere and real coordinates
// (for a real weather fetch) for a wider set of major cities, without
// expanding those other, more tightly-scoped features.
//
// Real photography only exists for some cities today, reusing the same
// real landmark photos already used elsewhere in the project
// (src/lib/data/places.ts) — the hero cycles through all of a city's
// photos rather than showing just one. Kobe/Fukuoka/Sendai have no
// photography anywhere in the project, so they fall back to a gradient
// "atmosphere" instead of photos until real images are added.
export interface HeroCityInfo {
  slug: string;
  name: string;
  nameJa: string;
  region: string;
  lat: number;
  lon: number;
  heroImages: string[];
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
    heroImages: [
      "/images/hero-tokyo.jpg",
      "/images/place-shibuya.jpg",
      "/images/place-skytree.jpg",
      "/images/place-asakusa.jpg",
    ],
    atmosphere: { day: "from-azure/40 to-sakura/20", night: "from-[#141033] to-[#0b0e1a]" },
  },
  {
    slug: "osaka",
    name: "Osaka",
    nameJa: "大阪",
    region: "Kansai",
    lat: 34.6937,
    lon: 135.5023,
    heroImages: [
      "/images/place-dotonbori-canal.jpg",
      "/images/place-osaka-castle.jpg",
      "/images/place-umeda-sky.jpg",
    ],
    atmosphere: { day: "from-sakura/40 to-azure/20", night: "from-[#2a1440] to-[#0b0e1a]" },
  },
  {
    slug: "kyoto",
    name: "Kyoto",
    nameJa: "京都",
    region: "Kansai",
    lat: 35.0116,
    lon: 135.7681,
    heroImages: [
      "/images/place-fushimi-inari.jpg",
      "/images/place-kiyomizu.jpg",
      "/images/place-arashiyama.jpg",
    ],
    atmosphere: { day: "from-gold/40 to-sakura/20", night: "from-[#301a20] to-[#0b0e1a]" },
  },
  {
    slug: "nara",
    name: "Nara",
    nameJa: "奈良",
    region: "Kansai",
    lat: 34.6851,
    lon: 135.8048,
    heroImages: ["/images/place-nara-park.jpg", "/images/place-todaiji.jpg"],
    atmosphere: { day: "from-gold/35 to-mint/20", night: "from-[#241f10] to-[#0b0e1a]" },
  },
  {
    slug: "kobe",
    name: "Kobe",
    nameJa: "神戸",
    region: "Kansai",
    lat: 34.6901,
    lon: 135.1955,
    heroImages: [],
    atmosphere: { day: "from-azure/40 to-mint/20", night: "from-[#0f2436] to-[#0b0e1a]" },
  },
  {
    slug: "hiroshima",
    name: "Hiroshima",
    nameJa: "広島",
    region: "Chugoku",
    lat: 34.3853,
    lon: 132.4553,
    heroImages: ["/images/place-itsukushima.jpg", "/images/place-genbaku-dome.jpg"],
    atmosphere: { day: "from-azure/40 to-sakura/20", night: "from-[#141c33] to-[#0b0e1a]" },
  },
  {
    slug: "fukuoka",
    name: "Fukuoka",
    nameJa: "福岡",
    region: "Kyushu",
    lat: 33.5904,
    lon: 130.4017,
    heroImages: [],
    atmosphere: { day: "from-gold/35 to-azure/25", night: "from-[#231d38] to-[#0b0e1a]" },
  },
  {
    slug: "sapporo",
    name: "Sapporo",
    nameJa: "札幌",
    region: "Hokkaido",
    lat: 43.0618,
    lon: 141.3545,
    heroImages: ["/images/place-sapporo-clock-tower.jpg", "/images/place-mount-hakodate.jpg"],
    atmosphere: { day: "from-azure/30 to-mint/20", night: "from-[#101f2c] to-[#0b0e1a]" },
  },
  {
    slug: "sendai",
    name: "Sendai",
    nameJa: "仙台",
    region: "Tohoku",
    lat: 38.2682,
    lon: 140.8694,
    heroImages: [],
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
