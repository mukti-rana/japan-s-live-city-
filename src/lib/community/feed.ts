import { isCategorySlug } from "@/lib/community/categories";
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
  // A group of prefectures (Kansai, Kanto...). Only used on the all-Japan page.
  region?: RegionId;
  category?: string;
  q?: string;
  sort: FeedSort;
  page: number;
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function feedFiltersFromParams(sp: Record<string, string | string[] | undefined>, fixedArea?: string): FeedFilters {
  const category = first(sp.category);
  const sort = first(sp.sort);
  const region = first(sp.region);
  const q = (first(sp.q) ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
  const page = Number.parseInt(first(sp.page) ?? "1", 10);
  return {
    // The area comes from the page (/community/<area>), never from the query string.
    area: fixedArea,
    region: !fixedArea && REGION_ORDER.includes(region as RegionId) ? (region as RegionId) : undefined,
    category: isCategorySlug(category) ? category : undefined,
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
  if (f.region) p.set("region", f.region);
  if (f.category) p.set("category", f.category);
  if (f.q) p.set("q", f.q);
  if (f.sort && f.sort !== "latest") p.set("sort", f.sort);
  if (f.page && f.page > 1) p.set("page", String(f.page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

// True when the page is anything but the plain first page of the unfiltered feed.
export function isFiltered(f: FeedFilters): boolean {
  return Boolean(f.q || f.category || f.region || f.sort !== "latest" || f.page > 1);
}
