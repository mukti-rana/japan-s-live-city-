import { getNewsSnapshot } from "@/lib/news/aggregate";
import { getCategory } from "@/lib/news/categories";
import { cachedPreview } from "@/lib/news/images";
import { getSource } from "@/lib/news/sources";
import { getPrefecture, matchLevel, resolvePlace, type MatchLevel, type ResolvedPlace } from "@/lib/news/places";
import type { Article, SourceStatus } from "@/lib/news/types";

export interface NewsQuery {
  cat?: string;
  q?: string;
  src?: string;
  lang?: string;
  range?: string;
  // A place *name* ("Osaka", "Kobe"). Never coordinates.
  place?: string;
  // Prefecture id: only stories that name this prefecture, in any category.
  pref?: string;
  videoOnly?: boolean;
  // Leaves video items out (they have their own strip on the News page).
  noVideo?: boolean;
  offset?: number;
  limit?: number;
}

export interface NewsItem extends Article {
  // The prefecture the story names first, for display.
  where: string | null;
  // How close a story is to the visitor's place (local category only).
  level?: MatchLevel;
  // True while the story's preview image hasn't been looked up yet; the page
  // asks /api/news/images for it and fills it in.
  imagePending?: boolean;
}

export interface NewsResult {
  items: NewsItem[];
  total: number;
  nextOffset: number | null;
  fetchedAt: number;
  // How old the data was when this response was made.
  ageMs: number;
  sources: SourceStatus[];
  // The local category needs a place; when none (or an unknown one) was
  // given the result is empty and this is set, so the UI can ask.
  needsPlace: boolean;
  place: ResolvedPlace | null;
}

const RANGE_MS: Record<string, number> = {
  "24h": 24 * 3600_000,
  "7d": 7 * 24 * 3600_000,
  "30d": 30 * 24 * 3600_000,
};

const MAX_LIMIT = 30;

function whereOf(a: Article): string | null {
  const id = a.places[0];
  return id ? (getPrefecture(id)?.en ?? null) : null;
}

export async function queryNews(query: NewsQuery): Promise<NewsResult> {
  const snapshot = await getNewsSnapshot();
  const category = getCategory(query.cat ?? "all") ?? getCategory("all")!;
  const needle = query.q?.trim().toLowerCase();
  const since = query.range && RANGE_MS[query.range] ? Date.now() - RANGE_MS[query.range] : 0;
  const place = category.id === "local" ? resolvePlace(query.place) : null;

  let items: NewsItem[] = [];
  const needsPlace = category.id === "local" && !place;

  if (!needsPlace) {
    for (const article of snapshot.articles) {
      if (query.videoOnly && !article.video) continue;
      if (query.noVideo && article.video) continue;
      if (!category.match(article)) continue;
      if (query.pref && !article.places.includes(query.pref)) continue;
      if (query.src && article.sourceId !== query.src) continue;
      if (query.lang && (query.lang === "en" || query.lang === "ja") && article.language !== query.lang) continue;
      if (since && new Date(article.publishedAt).getTime() < since) continue;
      if (needle && !`${article.title} ${article.summary ?? ""}`.toLowerCase().includes(needle)) continue;

      const item: NewsItem = { ...article, where: whereOf(article) };
      if (place) {
        const level = matchLevel(place, `${article.title} ${article.summary ?? ""}`, article.places);
        if (level === 0) continue;
        item.level = level;
      }
      items.push(item);
    }

    // The snapshot is already newest-first. Local stories are ordered by
    // how close they are, then by recency.
    if (place) items = items.sort((a, b) => (b.level ?? 0) - (a.level ?? 0) || b.publishedAt.localeCompare(a.publishedAt));
  }

  const offset = Math.max(0, query.offset ?? 0);
  const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? 12));
  const nextOffset = offset + limit < items.length ? offset + limit : null;

  // Pages never wait on publishers' image servers: a story whose picture is
  // already known gets it now, one we haven't looked up yet is flagged.
  const page = items.slice(offset, offset + limit).map((item): NewsItem => {
    if (item.imageUrl || item.video || !getSource(item.sourceId)?.previewImage) return item;
    const known = cachedPreview(item);
    return known === undefined ? { ...item, imagePending: true } : { ...item, imageUrl: known };
  });

  return {
    items: page,
    total: items.length,
    nextOffset,
    fetchedAt: snapshot.fetchedAt,
    ageMs: Date.now() - snapshot.fetchedAt,
    sources: snapshot.sources,
    needsPlace,
    place,
  };
}

// Reads the same query shape from URL search params (used by the API route
// and the News page's first render).
export function queryFromParams(params: Record<string, string | string[] | undefined> | URLSearchParams): NewsQuery {
  const get = (key: string): string | undefined => {
    const v = params instanceof URLSearchParams ? params.get(key) : params[key];
    const value = Array.isArray(v) ? v[0] : v;
    return value && value.length <= 120 ? value : undefined;
  };
  const num = (key: string) => {
    const v = Number(get(key));
    return Number.isFinite(v) && v >= 0 ? Math.floor(v) : undefined;
  };
  return {
    cat: get("cat"),
    q: get("q"),
    src: get("src"),
    lang: get("lang"),
    range: get("range"),
    place: get("place"),
    pref: get("pref"),
    videoOnly: get("video") === "1",
    noVideo: get("video") === "0",
    offset: num("offset"),
    limit: num("limit"),
  };
}
