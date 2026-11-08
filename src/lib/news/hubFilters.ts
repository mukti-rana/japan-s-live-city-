import type { CategoryId } from "@/lib/news/categories";
import { PREFECTURES } from "@/lib/news/places";
import { toQueryString, type NewsParams } from "@/lib/news/queryString";

export const PAGE_SIZE = 12;

// What the News page can be narrowed by. The scope (All / Japan / World) sits
// on the page itself; everything else lives in the Filters panel.
export interface HubFilters {
  scope: "all" | "japan" | "world";
  // A topic category id, or "all".
  topic: CategoryId;
  // "" = any, "near" = the visitor's own place, otherwise a prefecture id.
  loc: string;
  src: string;
  lang: string;
  // "" = latest, "today", "7d", or "custom" (with from / to).
  range: string;
  from: string;
  to: string;
  video: boolean;
  q: string;
}

export const DEFAULT_FILTERS: HubFilters = { scope: "all", topic: "all", loc: "", src: "", lang: "", range: "", from: "", to: "", video: false, q: "" };

// The categories offered in the Filters panel, in the order they are listed.
export const TOPIC_FILTERS: CategoryId[] = [
  "politics", "economy", "tech", "transport", "weather", "earthquake", "crime", "society",
  "sports", "entertainment", "travel", "science", "world-politics", "asia",
];

const TOPIC_IDS = new Set<string>(TOPIC_FILTERS);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Addresses used before the redesign still work: ?cat=local, ?cat=japan,
// ?cat=international, ?cat=osaka, ?cat=weather, ?pref=…
export function filtersFromParams(sp: Record<string, string | string[] | undefined>): HubFilters {
  const get = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const f: HubFilters = { ...DEFAULT_FILTERS };
  const scope = get("scope");
  if (scope === "japan" || scope === "world") f.scope = scope;
  const cat = get("cat");
  if (TOPIC_IDS.has(cat)) f.topic = cat as CategoryId;
  else if (cat === "japan") f.scope = "japan";
  else if (cat === "international") f.scope = "world";
  else if (cat === "local") f.loc = "near";
  else if (["osaka", "kyoto", "tokyo"].includes(cat)) f.loc = cat;
  const loc = get("loc") || get("pref");
  if (loc === "near" || PREFECTURES.some((p) => p.id === loc)) f.loc = loc;
  f.src = get("src");
  f.lang = get("lang") === "en" || get("lang") === "ja" ? get("lang") : "";
  const range = get("range");
  f.range = ["today", "7d", "custom"].includes(range) ? range : range === "24h" ? "today" : "";
  if (f.range === "custom") {
    f.from = DAY.test(get("from")) ? get("from") : "";
    f.to = DAY.test(get("to")) ? get("to") : "";
    if (!f.from && !f.to) f.range = "";
  }
  f.video = get("video") === "1";
  f.q = get("q").slice(0, 100);
  return f;
}

// The request for one page of the main feed. Videos are left out of it (they
// have their own strip) unless the visitor asked for video news only.
export function gridParams(f: HubFilters, place: string | null, offset = 0): NewsParams {
  return {
    cat: f.topic === "all" ? "" : f.topic,
    scope: f.scope === "japan" ? "japan" : f.scope === "world" ? "international" : "",
    q: f.q,
    src: f.src,
    lang: f.lang,
    range: f.range === "custom" ? "" : f.range,
    from: f.range === "custom" ? f.from : "",
    to: f.range === "custom" ? f.to : "",
    pref: f.loc && f.loc !== "near" ? f.loc : "",
    local: f.loc === "near" ? 1 : "",
    place: f.loc === "near" ? place : null,
    video: f.video ? 1 : 0,
    limit: PAGE_SIZE,
    offset: offset || undefined,
  };
}

// The address-bar form of the filters; the default view keeps a clean address.
export function pageQuery(f: HubFilters): string {
  return toQueryString({
    scope: f.scope === "all" ? "" : f.scope,
    cat: f.topic === "all" ? "" : f.topic,
    loc: f.loc,
    src: f.src,
    lang: f.lang,
    range: f.range,
    from: f.range === "custom" ? f.from : "",
    to: f.range === "custom" ? f.to : "",
    video: f.video,
    q: f.q,
  });
}

// How many Filters-panel choices are applied (not counting the scope switch
// or search, which are visible on the page itself).
export function activeFilterCount(f: HubFilters): number {
  return [f.topic !== "all", f.loc !== "", f.src !== "", f.lang !== "", f.range !== "", f.video].filter(Boolean).length;
}
