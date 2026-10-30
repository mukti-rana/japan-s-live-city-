import { CATEGORIES, type CategoryId } from "@/lib/news/categories";
import { PREFECTURES } from "@/lib/news/places";
import { toQueryString, type NewsParams } from "@/lib/news/queryString";

export const PAGE_SIZE = 12;

export interface HubFilters {
  cat: CategoryId;
  q: string;
  src: string;
  lang: string;
  range: string;
  pref: string;
  video: boolean;
}

// The News page opens on All Japan: stories from across the country, not the
// visitor's own area (that is "Near You") and not world news.
export const DEFAULT_CATEGORY: CategoryId = "japan";

export const DEFAULT_FILTERS: HubFilters = { cat: DEFAULT_CATEGORY, q: "", src: "", lang: "", range: "", pref: "", video: false };

const CATEGORY_IDS = new Set<string>(CATEGORIES.map((c) => c.id));

export function filtersFromParams(sp: Record<string, string | string[] | undefined>): HubFilters {
  const get = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const cat = get("cat");
  return {
    cat: CATEGORY_IDS.has(cat) ? (cat as CategoryId) : DEFAULT_CATEGORY,
    q: get("q").slice(0, 100),
    src: get("src"),
    lang: get("lang") === "en" || get("lang") === "ja" ? get("lang") : "",
    range: ["24h", "7d", "30d"].includes(get("range")) ? get("range") : "",
    pref: PREFECTURES.some((p) => p.id === get("pref")) ? get("pref") : "",
    video: get("video") === "1",
  };
}

// The request for one page of the main grid. Videos are left out of the grid
// (they have their own strip) unless the visitor asked for videos only.
export function gridParams(f: HubFilters, place: string | null, offset = 0): NewsParams {
  return {
    cat: f.cat === "all" ? "" : f.cat,
    q: f.q,
    src: f.src,
    lang: f.lang,
    range: f.range,
    pref: f.pref,
    place: f.cat === "local" ? place : null,
    video: f.video ? 1 : 0,
    limit: PAGE_SIZE,
    offset: offset || undefined,
  };
}

export function pageQuery(f: HubFilters): string {
  return toQueryString({
    // The default view keeps a clean address; every other view is spelled out.
    cat: f.cat === DEFAULT_CATEGORY ? "" : f.cat,
    q: f.q,
    src: f.src,
    lang: f.lang,
    range: f.range,
    pref: f.pref,
    video: f.video,
  });
}

