import { CATEGORIES } from "@/lib/community/categories";
import { PLACE_CATEGORIES, type PlaceCategory } from "@/lib/community/placeTypes";
import { REGION_ORDER } from "@/lib/explore/regions";
import type { RegionId } from "@/lib/news/places";

// What the Community feed can be narrowed and ordered by. Parsed from the URL,
// so every value is checked here and anything unexpected falls back to a safe
// default — never passed on as-is.

export type FeedSort = "latest" | "liked";
export const FEED_SORTS: FeedSort[] = ["latest", "liked"];
export const PAGE_SIZE = 24;
export const MAX_QUERY_LENGTH = 80;

export interface FeedFilters {
  area?: string;
  // Groups of prefectures (Kansai, Kanto...), any number of them. Only used on the all-Japan page.
  regions: RegionId[];
  // Topics (nature, food...), any number of them.
  categories: string[];
  // The kinds of place the post is about (restaurant, cafe, hotel…), any number of them.
  placeTypes: PlaceCategory[];
  q?: string;
  sort: FeedSort;
  page: number;
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// A list value: "food,nature" (or the key repeated). Only values that exist are
// kept, each once, in their natural order, so the same choice always gives the
// same address.
function pickList<T extends string>(raw: string | string[] | undefined, allowed: readonly T[]): T[] {
  const given = new Set((Array.isArray(raw) ? raw : [raw]).flatMap((v) => (v ?? "").split(",")).map((v) => v.trim()));
  return allowed.filter((a) => given.has(a));
}

const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);
const PLACE_TYPE_IDS = PLACE_CATEGORIES.map((c) => c.id);

export function feedFiltersFromParams(sp: Record<string, string | string[] | undefined>, fixedArea?: string): FeedFilters {
  const sort = first(sp.sort);
  const q = (first(sp.q) ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
  const page = Number.parseInt(first(sp.page) ?? "1", 10);
  return {
    // The area comes from the page (/community/<area>), never from the query string.
    area: fixedArea,
    regions: fixedArea ? [] : pickList(sp.region, REGION_ORDER),
    categories: pickList(sp.category, CATEGORY_SLUGS),
    placeTypes: pickList(sp.type, PLACE_TYPE_IDS),
    q: q || undefined,
    sort: sort === "liked" ? "liked" : "latest",
    page: Number.isFinite(page) && page >= 1 && page <= 200 ? page : 1,
  };
}

// The same filters as a query string (for links), leaving out defaults.
// `withArea` is for pages (like Photos) where the city is a query value rather
// than part of the address.
export function feedQuery(f: Partial<FeedFilters>, withArea = false): string {
  const p = new URLSearchParams();
  if (withArea && f.area) p.set("area", f.area);
  if (f.regions?.length) p.set("region", f.regions.join(","));
  if (f.categories?.length) p.set("category", f.categories.join(","));
  if (f.placeTypes?.length) p.set("type", f.placeTypes.join(","));
  if (f.q) p.set("q", f.q);
  if (f.sort && f.sort !== "latest") p.set("sort", f.sort);
  if (f.page && f.page > 1) p.set("page", String(f.page));
  const s = p.toString().replace(/%2C/gi, ",");
  return s ? `?${s}` : "";
}

// True when the page is anything but the plain first page of the unfiltered feed.
export function isFiltered(f: FeedFilters): boolean {
  return Boolean(f.q || f.categories.length || f.placeTypes.length || f.regions.length || f.sort !== "latest" || f.page > 1);
}
