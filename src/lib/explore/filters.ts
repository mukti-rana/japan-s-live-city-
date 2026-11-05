import { topicParams } from "@/lib/explore/topics";
import type { ExploreLocation } from "@/lib/explore/useExploreLocation";

// Everything the visitor can narrow the Explore list by, and how it becomes
// a request to /api/explore. Kept in one place so the list, the map and the
// "N places" count always ask the same question.
export interface ExploreFilters {
  q: string;
  topics: string[];
  sort: "" | "nearest" | "popular" | "recommended" | "name";
  radius: number;
  region: string;
  pref: string;
  season: string;
  setting: "" | "indoor" | "outdoor";
  photo: boolean;
  heritage: boolean;
  // "Search this area": south, west, north, east.
  bbox: [number, number, number, number] | null;
}

export const EMPTY_FILTERS: ExploreFilters = { q: "", topics: [], sort: "", radius: 25, region: "", pref: "", season: "", setting: "", photo: false, heritage: false, bbox: null };
export const RADII = [5, 10, 25, 50, 100, 200] as const;

// True when anything beyond the default view is chosen.
export function filtersActive(f: ExploreFilters): boolean {
  return Boolean(f.q || f.topics.length || f.region || f.pref || f.season || f.setting || f.photo || f.heritage || f.bbox);
}

export type Scope = "near" | "pref" | "all";

export function scopeFor(origin: ExploreLocation | null): Scope {
  if (!origin) return "all";
  return origin.kind === "prefecture" ? "pref" : "near";
}

export function buildParams(f: ExploreFilters, origin: ExploreLocation | null, language: string, limit: number): URLSearchParams {
  const scope = scopeFor(origin);
  const p = new URLSearchParams({ lang: language, limit: String(limit) });
  if (f.q) p.set("q", f.q);
  if (f.region) p.set("region", f.region);
  const pref = scope === "pref" ? origin?.prefectureId ?? "" : f.pref;
  if (pref) p.set("pref", pref);
  for (const [k, v] of Object.entries(topicParams(f.topics))) p.set(k, v);
  if (f.season) p.set("season", f.season);
  if (f.setting) p.set("setting", f.setting);
  if (f.photo) p.set("photo", "1");
  if (f.heritage) p.set("heritage", "1");
  if (f.bbox) p.set("bbox", f.bbox.map((n) => n.toFixed(4)).join(","));
  if (origin) {
    p.set("lat", String(origin.lat));
    p.set("lon", String(origin.lon));
    if (scope === "near" && !f.bbox) p.set("radius", String(f.radius));
  }
  p.set("sort", f.sort || (scope === "near" ? "nearest" : origin ? "recommended" : "popular"));
  return p;
}
