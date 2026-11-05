import type { CategoryId, GroupId, Season } from "@/lib/explore/categories";

// One destination as it is sent to the browser. Every optional field is null
// when the open data doesn't have it — the interface then says "not yet
// available" rather than guessing.
export interface Destination {
  id: string;
  // The place's name in every language the open data has (always at least one).
  names: Partial<Record<"en" | "ja" | "ne" | "hi" | "zh" | "ko", string>>;
  prefectureId: string;
  region: string;
  city: string | null;
  lat: number;
  lon: number;
  category: CategoryId;
  categories: CategoryId[];
  group: GroupId;
  // Short introductions, as written on Wikipedia (CC BY-SA), per language.
  abouts: Partial<Record<"en" | "ja", { text: string; url: string | null }>>;
  image: { url: string; thumb: string; page: string; author: string | null; license: string | null } | null;
  website: string | null;
  worldHeritage: boolean;
  // Popularity signal: in how many Wikipedia languages the place has an article.
  languageEditions: number;
  // Lesser-known: has a photo or description but few language editions.
  hiddenGem: boolean;
  seasons: Season[];
  distanceKm: number | null;
}

export interface ExploreQuery {
  q?: string;
  region?: string;
  pref?: string;
  city?: string;
  cats?: string[];
  group?: string;
  setting?: "indoor" | "outdoor";
  family?: boolean;
  season?: string;
  maxHours?: number;
  heritage?: boolean;
  photo?: boolean;
  hidden?: boolean;
  lat?: number;
  lon?: number;
  radius?: number;
  minRadius?: number;
  sort?: "nearest" | "popular" | "recommended" | "name";
  offset?: number;
  limit?: number;
  // Restrict to a map window: south, west, north, east.
  bbox?: [number, number, number, number];
}

export interface ExploreResult {
  items: Destination[];
  total: number;
  nextOffset: number | null;
}

export interface CatalogueMeta {
  generatedAt: string;
  total: number;
  prefecturesCovered: number;
  byPrefecture: Record<string, number>;
  byCategory: Record<string, number>;
  withPhoto: number;
  withDescription: number;
  withWebsite: number;
  sources: string[];
}
