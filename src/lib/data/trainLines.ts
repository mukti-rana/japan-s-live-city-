import type { TrainStatus } from "@/lib/data/trainStatus";

export type TrainCity = "tokyo" | "osaka" | "kyoto" | "nagoya" | "fukuoka";
export type TrainLineCategory = "jr" | "private" | "subway";

export interface TrainCityMeta {
  name: string;
  nameJa: string;
  region: string;
}

export const TRAIN_CITY_META: Record<TrainCity, TrainCityMeta> = {
  tokyo: { name: "Tokyo", nameJa: "東京", region: "Kanto" },
  osaka: { name: "Osaka", nameJa: "大阪", region: "Kansai" },
  kyoto: { name: "Kyoto", nameJa: "京都", region: "Kansai" },
  nagoya: { name: "Nagoya", nameJa: "名古屋", region: "Chubu" },
  fukuoka: { name: "Fukuoka", nameJa: "福岡", region: "Kyushu" },
};

export const TRAIN_CITIES: TrainCity[] = ["tokyo", "osaka", "kyoto", "nagoya", "fukuoka"];

// Real, well-known aliases for each city — used to match a live
// reverse-geocoded location name against one of the 5 cities this project
// has train-line data for.
const CITY_ALIASES_LOWER: Record<TrainCity, string[]> = {
  tokyo: ["tokyo", "shibuya", "shinjuku", "asakusa"],
  osaka: ["osaka", "namba", "umeda", "tennoji", "tennōji"],
  kyoto: ["kyoto"],
  nagoya: ["nagoya"],
  fukuoka: ["fukuoka", "hakata", "tenjin"],
};

export function findTrainCity(name: string): TrainCity | undefined {
  const needle = name.toLowerCase();
  return TRAIN_CITIES.find((city) => CITY_ALIASES_LOWER[city].some((alias) => needle.includes(alias)));
}

export interface TrainLineInfo {
  name: string;
  nameJa?: string;
  color: string;
  category: TrainLineCategory;
  status: TrainStatus;
  delayMinutes?: number;
  // The following three are only ever populated for the small number of
  // demo "delayed" lines below, purely to make the redesigned UI's Details
  // panel demonstrable — exactly the same "illustrative, not live" status
  // this file's data has always used for status/delayMinutes. Never shown
  // without the page's own prominent "DEMO DATA" framing.
  reason?: string;
  affectedArea?: string;
  direction?: string;
}

// MOCK DATA — no free, keyless real-time Japan train status API exists yet.
// A real integration (e.g. ODPT, developer.odpt.org) was investigated and
// deliberately deferred: it needs the user's own registered API key and
// has uncertain coverage of operators outside Tokyo. Line names, colors,
// categories, and Japanese names are real; status/delay/reason/affected-
// area values are illustrative only, not connected to any live feed —
// always shown behind an explicit "DEMO DATA" label, never as "live".
export const TRAIN_LINES: Record<TrainCity, TrainLineInfo[]> = {
  osaka: [
    { name: "Osaka Loop Line", nameJa: "大阪環状線", color: "#F2994A", category: "jr", status: "normal" },
    { name: "JR Kyoto Line", nameJa: "JR京都線", color: "#4DA3FF", category: "jr", status: "normal" },
    { name: "JR Tozai Line", nameJa: "JR東西線", color: "#6FCF52", category: "jr", status: "normal" },
    { name: "Hankyu Kyoto Line", nameJa: "阪急京都線", color: "#F2704A", category: "private", status: "normal" },
    { name: "Keihan Main Line", nameJa: "京阪本線", color: "#6FCF52", category: "private", status: "normal" },
    {
      name: "Kintetsu Nara Line",
      nameJa: "近鉄奈良線",
      color: "#F2544A",
      category: "private",
      status: "delayed",
      delayMinutes: 12,
      reason: "Signal inspection",
      affectedArea: "Osaka Namba → Nara",
      direction: "Nara",
    },
    {
      name: "Nankai Main Line",
      nameJa: "南海本線",
      color: "#A78BFA",
      category: "private",
      status: "minorDelay",
      delayMinutes: 4,
      reason: "Congestion",
      affectedArea: "Namba → Wakayamashi",
      direction: "Wakayama",
    },
    { name: "Midosuji Line", nameJa: "御堂筋線", color: "#F2544A", category: "subway", status: "normal" },
    { name: "Tanimachi Line", nameJa: "谷町線", color: "#6FCF52", category: "subway", status: "normal" },
    { name: "Yotsubashi Line", nameJa: "四つ橋線", color: "#4DA3FF", category: "subway", status: "normal" },
  ],
  kyoto: [
    { name: "JR Kyoto Line", nameJa: "JR京都線", color: "#4DA3FF", category: "jr", status: "normal" },
    { name: "Sagano Line", nameJa: "嵯峨野線", color: "#6FCF52", category: "jr", status: "normal" },
    { name: "Hankyu Kyoto Line", nameJa: "阪急京都線", color: "#F2704A", category: "private", status: "normal" },
    { name: "Keihan Main Line", nameJa: "京阪本線", color: "#6FCF52", category: "private", status: "normal" },
    {
      name: "Kintetsu Kyoto Line",
      nameJa: "近鉄京都線",
      color: "#F2544A",
      category: "private",
      status: "minorDelay",
      delayMinutes: 2,
      reason: "Congestion",
      affectedArea: "Kyoto → Kintetsu Nara",
      direction: "Nara",
    },
    { name: "Eizan Line", nameJa: "叡山線", color: "#A78BFA", category: "private", status: "normal" },
    { name: "Karasuma Line", nameJa: "烏丸線", color: "#6FCF52", category: "subway", status: "normal" },
    { name: "Tozai Line", nameJa: "東西線", color: "#F2704A", category: "subway", status: "normal" },
  ],
  tokyo: [
    { name: "Yamanote Line", nameJa: "山手線", color: "#6FCF52", category: "jr", status: "normal" },
    { name: "Chuo Line (Rapid)", nameJa: "中央線快速", color: "#F2994A", category: "jr", status: "normal" },
    { name: "Keihin-Tohoku Line", nameJa: "京浜東北線", color: "#4DA3FF", category: "jr", status: "normal" },
    {
      name: "Saikyo Line",
      nameJa: "埼京線",
      color: "#6FCF52",
      category: "jr",
      status: "delayed",
      delayMinutes: 10,
      reason: "Passenger incident",
      affectedArea: "Ikebukuro → Omiya",
      direction: "Omiya",
    },
    {
      name: "Tokyu Toyoko Line",
      nameJa: "東急東横線",
      color: "#F2544A",
      category: "private",
      status: "normal",
      affectedArea: "Shibuya ↔ Yokohama",
    },
    { name: "Odakyu Odawara Line", nameJa: "小田急小田原線", color: "#4DA3FF", category: "private", status: "normal" },
    { name: "Keio Line", nameJa: "京王線", color: "#A78BFA", category: "private", status: "normal" },
    { name: "Ginza Line", nameJa: "銀座線", color: "#F2C572", category: "subway", status: "normal" },
    { name: "Marunouchi Line", nameJa: "丸ノ内線", color: "#F2544A", category: "subway", status: "normal" },
    {
      name: "Toei Oedo Line",
      nameJa: "都営大江戸線",
      color: "#A78BFA",
      category: "subway",
      status: "minorDelay",
      delayMinutes: 3,
      reason: "Signal inspection",
      affectedArea: "Shinjuku → Tochomae",
      direction: "Tochomae",
    },
    { name: "Tozai Line", nameJa: "東西線", color: "#4DA3FF", category: "subway", status: "normal" },
  ],
  nagoya: [
    { name: "JR Tokaido Main Line", nameJa: "JR東海道本線", color: "#4DA3FF", category: "jr", status: "normal" },
    { name: "JR Chuo Main Line", nameJa: "JR中央本線", color: "#F2994A", category: "jr", status: "normal" },
    {
      name: "Meitetsu Nagoya Main Line",
      nameJa: "名鉄名古屋本線",
      color: "#F2544A",
      category: "private",
      status: "minorDelay",
      delayMinutes: 5,
      reason: "Weather",
      affectedArea: "Nagoya → Toyohashi",
      direction: "Toyohashi",
    },
    { name: "Kintetsu Nagoya Line", nameJa: "近鉄名古屋線", color: "#A78BFA", category: "private", status: "normal" },
    {
      name: "Higashiyama Line",
      nameJa: "地下鉄東山線",
      color: "#6FCF52",
      category: "subway",
      status: "normal",
    },
    { name: "Meijo Line", nameJa: "地下鉄名城線", color: "#F2704A", category: "subway", status: "normal" },
  ],
  fukuoka: [
    { name: "JR Kagoshima Main Line", nameJa: "JR鹿児島本線", color: "#4DA3FF", category: "jr", status: "normal" },
    {
      name: "Nishitetsu Tenjin Omuta Line",
      nameJa: "西鉄天神大牟田線",
      color: "#F2544A",
      category: "private",
      status: "normal",
    },
    { name: "Kuko Line", nameJa: "地下鉄空港線", color: "#6FCF52", category: "subway", status: "normal" },
    {
      name: "Hakozaki Line",
      nameJa: "地下鉄箱崎線",
      color: "#F2C572",
      category: "subway",
      status: "unknown",
    },
  ],
};
