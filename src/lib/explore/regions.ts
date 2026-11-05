import { PREFECTURES, type RegionId } from "@/lib/news/places";

// The eight regions Japan is usually divided into. Kyushu and Okinawa share
// one region here, matching the prefecture list used across the site.
export interface RegionInfo {
  id: RegionId;
  en: string;
  ja: string;
  prefectureIds: string[];
}

const NAMES: Record<RegionId, { en: string; ja: string }> = {
  hokkaido: { en: "Hokkaido", ja: "北海道" },
  tohoku: { en: "Tohoku", ja: "東北" },
  kanto: { en: "Kanto", ja: "関東" },
  chubu: { en: "Chubu", ja: "中部" },
  kansai: { en: "Kansai", ja: "近畿" },
  chugoku: { en: "Chugoku", ja: "中国" },
  shikoku: { en: "Shikoku", ja: "四国" },
  kyushu: { en: "Kyushu & Okinawa", ja: "九州・沖縄" },
};

export const REGION_ORDER: RegionId[] = ["hokkaido", "tohoku", "kanto", "chubu", "kansai", "chugoku", "shikoku", "kyushu"];

export const REGIONS: RegionInfo[] = REGION_ORDER.map((id) => ({
  id,
  ...NAMES[id],
  prefectureIds: PREFECTURES.filter((p) => p.region === id).map((p) => p.id),
}));

export const REGION_OF_PREFECTURE = new Map(PREFECTURES.map((p) => [p.id, p.region]));
