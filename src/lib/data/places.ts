export type PlaceCity =
  | "Tokyo"
  | "Kyoto"
  | "Osaka"
  | "Nara"
  | "Hiroshima"
  | "Hokkaido"
  | "Gifu"
  | "Kanazawa"
  | "Okinawa";

// Real geographic region for each city above — used to group/filter
// Explore Japan by region. Only regions with at least one real curated
// place are ever shown in the UI; this file doesn't claim coverage of
// regions (Tohoku, Hokuriku, Shikoku, Kyushu) that have no real entries
// yet.
export type PlaceRegion = "Kanto" | "Kansai" | "Chugoku" | "Hokkaido" | "Chubu" | "Okinawa";

// Real, well-known aliases for each city that has curated places — used to
// match a live reverse-geocoded location name against one of the 9 cities
// this project actually has data for. Deliberately short (prefecture
// capital + one or two major sub-areas) rather than exhaustive.
const CITY_ALIASES: Record<PlaceCity, string[]> = {
  Tokyo: ["Tokyo", "Shibuya", "Shinjuku", "Asakusa"],
  Kyoto: ["Kyoto"],
  Osaka: ["Osaka", "Namba", "Umeda", "Tennoji", "Tennōji"],
  Nara: ["Nara"],
  Hiroshima: ["Hiroshima"],
  Hokkaido: ["Hokkaido", "Sapporo", "Hakodate"],
  Gifu: ["Gifu", "Takayama", "Shirakawa"],
  Kanazawa: ["Kanazawa"],
  Okinawa: ["Okinawa", "Naha"],
};

export function findPlaceCity(name: string): PlaceCity | undefined {
  const needle = name.toLowerCase();
  return (Object.keys(CITY_ALIASES) as PlaceCity[]).find((city) =>
    CITY_ALIASES[city].some((alias) => needle.includes(alias.toLowerCase())),
  );
}

export const CITY_REGION: Record<PlaceCity, PlaceRegion> = {
  Tokyo: "Kanto",
  Kyoto: "Kansai",
  Osaka: "Kansai",
  Nara: "Kansai",
  Hiroshima: "Chugoku",
  Hokkaido: "Hokkaido",
  Gifu: "Chubu",
  Kanazawa: "Chubu",
  Okinawa: "Okinawa",
};

// An honest, objective classification of what each real place actually
// is (shrine vs. castle vs. park, etc.) — not a subjective quality claim
// like "hidden gem" or a rating, which this project has no real data
// source for.
export type PlaceCategory =
  | "shrineTemple"
  | "historyCulture"
  | "natureParks"
  | "cityscape"
  | "observation";

export interface PlaceInfo {
  name: string;
  // Real Japanese name, only included where it's a single, well-known,
  // unambiguous fact — left undefined rather than guessed when not
  // certain (see Takayama Old Town below).
  nameJa?: string;
  city: PlaceCity;
  category: PlaceCategory;
  wikipediaTitle: string;
  // Only real project photography — left undefined (never a stock/
  // generic substitute) for places this project doesn't have a real
  // photo of yet. UI falls back to a category icon on the gradient.
  image?: string;
  gradient: string;
}

export const POPULAR_PLACES: PlaceInfo[] = [
  {
    name: "Shibuya Crossing",
    nameJa: "渋谷スクランブル交差点",
    city: "Tokyo",
    category: "cityscape",
    wikipediaTitle: "Shibuya_Crossing",
    image: "/images/place-shibuya.jpg",
    gradient: "from-sakura/40 to-azure/25",
  },
  {
    name: "Tokyo Skytree",
    nameJa: "東京スカイツリー",
    city: "Tokyo",
    category: "observation",
    wikipediaTitle: "Tokyo_Skytree",
    image: "/images/place-skytree.jpg",
    gradient: "from-azure/40 to-sakura/20",
  },
  {
    name: "Sensō-ji",
    nameJa: "浅草寺",
    city: "Tokyo",
    category: "shrineTemple",
    wikipediaTitle: "Sensō-ji",
    image: "/images/place-asakusa.jpg",
    gradient: "from-gold/40 to-sakura/20",
  },
  {
    name: "Fushimi Inari-taisha",
    nameJa: "伏見稲荷大社",
    city: "Kyoto",
    category: "shrineTemple",
    wikipediaTitle: "Fushimi_Inari-taisha",
    image: "/images/place-fushimi-inari.jpg",
    gradient: "from-sakura/40 to-gold/20",
  },
  {
    name: "Kiyomizu-dera",
    nameJa: "清水寺",
    city: "Kyoto",
    category: "shrineTemple",
    wikipediaTitle: "Kiyomizu-dera",
    image: "/images/place-kiyomizu.jpg",
    gradient: "from-gold/30 to-sakura/25",
  },
  {
    name: "Arashiyama Bamboo Grove",
    nameJa: "嵐山竹林の道",
    city: "Kyoto",
    category: "natureParks",
    wikipediaTitle: "Arashiyama_Bamboo_Grove",
    image: "/images/place-arashiyama.jpg",
    gradient: "from-mint/30 to-azure/20",
  },
  {
    name: "Osaka Castle",
    nameJa: "大阪城",
    city: "Osaka",
    category: "historyCulture",
    wikipediaTitle: "Osaka_Castle",
    image: "/images/place-osaka-castle.jpg",
    gradient: "from-gold/40 to-azure/20",
  },
  {
    name: "Dōtonbori",
    nameJa: "道頓堀",
    city: "Osaka",
    category: "cityscape",
    wikipediaTitle: "Dotonbori",
    image: "/images/place-dotonbori-canal.jpg",
    gradient: "from-sakura/30 to-azure/25",
  },
  {
    name: "Umeda Sky Building",
    nameJa: "梅田スカイビル",
    city: "Osaka",
    category: "observation",
    wikipediaTitle: "Umeda_Sky_Building",
    image: "/images/place-umeda-sky.jpg",
    gradient: "from-azure/30 to-gold/20",
  },
  {
    name: "Tsūtenkaku",
    nameJa: "通天閣",
    city: "Osaka",
    category: "observation",
    wikipediaTitle: "Tsūtenkaku",
    gradient: "from-gold/40 to-sakura/20",
  },
  {
    name: "Abeno Harukas",
    nameJa: "あべのハルカス",
    city: "Osaka",
    category: "observation",
    wikipediaTitle: "Abeno_Harukas",
    gradient: "from-azure/30 to-neon-purple/20",
  },
  {
    name: "Tennōji Zoo",
    nameJa: "天王寺動物園",
    city: "Osaka",
    category: "natureParks",
    wikipediaTitle: "Tennōji_Zoo",
    gradient: "from-mint/30 to-gold/20",
  },
  {
    name: "Nara Park",
    nameJa: "奈良公園",
    city: "Nara",
    category: "natureParks",
    wikipediaTitle: "Nara_Park",
    image: "/images/place-nara-park.jpg",
    gradient: "from-gold/40 to-mint/20",
  },
  {
    name: "Tōdai-ji",
    nameJa: "東大寺",
    city: "Nara",
    category: "shrineTemple",
    wikipediaTitle: "Tōdai-ji",
    image: "/images/place-todaiji.jpg",
    gradient: "from-sakura/30 to-gold/25",
  },
  {
    name: "Itsukushima Shrine",
    nameJa: "厳島神社",
    city: "Hiroshima",
    category: "shrineTemple",
    wikipediaTitle: "Itsukushima_Shrine",
    image: "/images/place-itsukushima.jpg",
    gradient: "from-azure/40 to-sakura/20",
  },
  {
    name: "Hiroshima Peace Memorial",
    nameJa: "原爆ドーム",
    city: "Hiroshima",
    category: "historyCulture",
    wikipediaTitle: "Hiroshima_Peace_Memorial",
    image: "/images/place-genbaku-dome.jpg",
    gradient: "from-mint/20 to-azure/25",
  },
  {
    name: "Sapporo Clock Tower",
    nameJa: "札幌市時計台",
    city: "Hokkaido",
    category: "historyCulture",
    wikipediaTitle: "Sapporo_Clock_Tower",
    image: "/images/place-sapporo-clock-tower.jpg",
    gradient: "from-azure/30 to-mint/20",
  },
  {
    name: "Mount Hakodate",
    nameJa: "函館山",
    city: "Hokkaido",
    category: "natureParks",
    wikipediaTitle: "Mount_Hakodate",
    image: "/images/place-mount-hakodate.jpg",
    gradient: "from-azure/40 to-gold/20",
  },
  {
    name: "Shirakawa-gō",
    nameJa: "白川郷",
    city: "Gifu",
    category: "historyCulture",
    wikipediaTitle: "Shirakawa-gō",
    image: "/images/place-shirakawa-go.jpg",
    gradient: "from-sakura/30 to-azure/20",
  },
  {
    name: "Takayama Old Town",
    city: "Gifu",
    category: "historyCulture",
    wikipediaTitle: "Takayama,_Gifu",
    image: "/images/place-takayama.jpg",
    gradient: "from-gold/30 to-azure/20",
  },
  {
    name: "Kenroku-en",
    nameJa: "兼六園",
    city: "Kanazawa",
    category: "natureParks",
    wikipediaTitle: "Kenroku-en",
    image: "/images/place-kenrokuen.jpg",
    gradient: "from-mint/30 to-gold/20",
  },
  {
    name: "Kanazawa Castle",
    nameJa: "金沢城",
    city: "Kanazawa",
    category: "historyCulture",
    wikipediaTitle: "Kanazawa_Castle",
    image: "/images/place-kanazawa-castle.jpg",
    gradient: "from-sakura/30 to-mint/20",
  },
  {
    name: "Shuri Castle",
    nameJa: "首里城",
    city: "Okinawa",
    category: "historyCulture",
    wikipediaTitle: "Shuri_Castle",
    image: "/images/place-shuri-castle.jpg",
    gradient: "from-sakura/40 to-gold/25",
  },
  {
    name: "Churaumi Aquarium",
    nameJa: "沖縄美ら海水族館",
    city: "Okinawa",
    category: "natureParks",
    wikipediaTitle: "Okinawa_Churaumi_Aquarium",
    image: "/images/place-churaumi-aquarium.jpg",
    gradient: "from-azure/40 to-mint/25",
  },
];
