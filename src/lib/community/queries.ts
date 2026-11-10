import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import { PAGE_SIZE, type FeedFilters } from "@/lib/community/feed";
import { REGIONS } from "@/lib/explore/regions";
import type { CommunityPost } from "@/lib/community/types";

// Reads of PUBLIC community content. They use the public (anon) key without
// anyone's cookies: signed-out visitors can read published posts, and Row
// Level Security in the database — not this code — is what limits the answer
// to published posts. Nothing private is read here.

const REGION_PREFECTURES = new Map(REGIONS.map((r) => [r.id, r.prefectureIds]));

export type FeedResult =
  | { state: "ready"; posts: CommunityPost[]; hasMore: boolean }
  // The feed could not be read. `reason` says why, so the page (and the server
  // log) can tell the three real situations apart instead of one vague message:
  //   not_configured — this environment has no Supabase address / key;
  //   not_set_up     — the community tables are missing (migrations not run);
  //   error          — the database was unreachable or refused the request.
  | { state: "unavailable"; reason: FeedProblem };

export type FeedProblem = "not_configured" | "not_set_up" | "error";

// PostgREST / Postgres codes that mean "that table, column or relationship is
// not there" — i.e. the community migrations have not been run on this project.
const MISSING_SCHEMA_CODES = new Set(["PGRST200", "PGRST204", "PGRST205", "42P01", "42703"]);

export function classifyError(error: { code?: string | null; message?: string | null }): FeedProblem {
  return error.code && MISSING_SCHEMA_CODES.has(error.code) ? "not_set_up" : "error";
}

// The real reason goes to the server log (never to the visitor's screen).
// Messages are cut short: a wrong address can answer with a whole web page.
export const brief = (text: string | null | undefined, max = 200) => (text ?? "").replace(/\s+/g, " ").slice(0, max);

export function logProblem(where: string, problem: FeedProblem, error?: { code?: string | null; message?: string | null; details?: string | null; hint?: string | null }) {
  const detail = error ? ` code=${error.code ?? "none"} message=${brief(error.message)}${error.hint ? ` hint=${brief(error.hint)}` : ""}` : "";
  console.error(`[community] ${where}: ${problem}${detail}`);
}

export const POST_SELECT =
  "id,title,caption,area_id,city_label,place_ref,place_label,category_slug,visit_date,like_count,comment_count,save_count,published_at," +
  "profiles(username,avatar_url)," +
  "community_post_images(storage_path,thumb_path,width,height,alt,position)";

export interface Row {
  id: string;
  title: string;
  caption: string;
  area_id: string;
  city_label: string | null;
  place_ref: string | null;
  place_label: string | null;
  category_slug: string;
  visit_date: string | null;
  like_count: number;
  comment_count: number;
  save_count: number;
  published_at: string;
  profiles: { username: string; avatar_url: string | null } | { username: string; avatar_url: string | null }[] | null;
  community_post_images: { storage_path: string; thumb_path: string | null; width: number | null; height: number | null; alt: string | null; position: number }[] | null;
}

export function toPost(r: Row): CommunityPost {
  const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
  return {
    id: r.id,
    title: r.title,
    caption: r.caption,
    areaId: r.area_id,
    cityLabel: r.city_label,
    placeRef: r.place_ref,
    placeLabel: r.place_label,
    categorySlug: r.category_slug,
    visitDate: r.visit_date,
    likeCount: r.like_count,
    commentCount: r.comment_count,
    saveCount: r.save_count,
    publishedAt: r.published_at,
    author: { username: profile?.username ?? "traveler", avatarUrl: profile?.avatar_url ?? null },
    images: (r.community_post_images ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((i) => ({ path: i.storage_path, thumbPath: i.thumb_path, width: i.width, height: i.height, alt: i.alt })),
  };
}

// The text a visitor typed, made safe to put inside a LIKE pattern: the
// wildcard characters and the separators the query builder uses are removed.
export function likeTerm(q: string): string {
  return q.toLowerCase().replace(/[\\%_,()*]/g, " ").replace(/\s+/g, " ").trim();
}

async function load(filters: FeedFilters): Promise<FeedResult> {
  if (!supabaseUrl || !supabaseAnonKey) {
    logProblem("feed", "not_configured");
    return { state: "unavailable", reason: "not_configured" };
  }
  const client = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let query = client.from("community_posts").select(POST_SELECT).eq("status", "published");
  if (filters.area) query = query.eq("area_id", filters.area);
  else if (filters.region) query = query.in("area_id", REGION_PREFECTURES.get(filters.region) ?? []);
  if (filters.category) query = query.eq("category_slug", filters.category);
  const term = filters.q ? likeTerm(filters.q) : "";
  if (term) query = query.ilike("search_text", `%${term}%`);

  query = filters.sort === "liked"
    ? query.order("like_count", { ascending: false }).order("published_at", { ascending: false })
    : query.order("published_at", { ascending: false });

  const from = (filters.page - 1) * PAGE_SIZE;
  // One extra row tells us whether there is a next page.
  const { data, error } = await query.range(from, from + PAGE_SIZE);
  if (error || !data) {
    const problem = error ? classifyError(error) : "error";
    logProblem("feed", problem, error ?? undefined);
    return { state: "unavailable", reason: problem };
  }

  const rows = data as unknown as Row[];
  return { state: "ready", posts: rows.slice(0, PAGE_SIZE).map(toPost), hasMore: rows.length > PAGE_SIZE };
}

// React's cache() lets the page and its metadata share one query per request.
export const fetchFeed = cache(async (key: string): Promise<FeedResult> => load(JSON.parse(key) as FeedFilters));
export const feedKey = (f: FeedFilters) => JSON.stringify(f);

// The public (cookie-free) client, for reads of public content.
export function publicClient() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Published posts about one place (photos shared from it).
export async function fetchPlacePosts(placeRef: string, limit = 12): Promise<CommunityPost[]> {
  const client = publicClient();
  if (!client) return [];
  const { data, error } = await client.from("community_posts").select(POST_SELECT).eq("status", "published").eq("place_ref", placeRef).order("published_at", { ascending: false }).limit(limit);
  if (error || !data) return [];
  return (data as unknown as Row[]).map(toPost);
}
