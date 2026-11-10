import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import { PAGE_SIZE, type FeedFilters } from "@/lib/community/feed";
import type { CommunityPost } from "@/lib/community/types";

// Reads of PUBLIC community content. They use the public (anon) key without
// anyone's cookies: signed-out visitors can read published posts, and Row
// Level Security in the database — not this code — is what limits the answer
// to published posts. Nothing private is read here.

export type FeedResult =
  | { state: "ready"; posts: CommunityPost[]; hasMore: boolean }
  // Supabase is not configured here, or the community tables are not set up
  // yet (migration not run) or the request failed. The page says so plainly.
  | { state: "unavailable" };

const SELECT =
  "id,title,caption,area_id,city_label,place_ref,place_label,category_slug,visit_date,like_count,comment_count,published_at," +
  "profiles(username,avatar_url)," +
  "community_post_images(storage_path,thumb_path,width,height,alt,position)";

interface Row {
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
  published_at: string;
  profiles: { username: string; avatar_url: string | null } | { username: string; avatar_url: string | null }[] | null;
  community_post_images: { storage_path: string; thumb_path: string | null; width: number | null; height: number | null; alt: string | null; position: number }[] | null;
}

function toPost(r: Row): CommunityPost {
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
function likeTerm(q: string): string {
  return q.toLowerCase().replace(/[\\%_,()*]/g, " ").replace(/\s+/g, " ").trim();
}

async function load(filters: FeedFilters): Promise<FeedResult> {
  if (!supabaseUrl || !supabaseAnonKey) return { state: "unavailable" };
  const client = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let query = client.from("community_posts").select(SELECT).eq("status", "published");
  if (filters.area) query = query.eq("area_id", filters.area);
  if (filters.category) query = query.eq("category_slug", filters.category);
  const term = filters.q ? likeTerm(filters.q) : "";
  if (term) query = query.ilike("search_text", `%${term}%`);

  query = filters.sort === "liked"
    ? query.order("like_count", { ascending: false }).order("published_at", { ascending: false })
    : query.order("published_at", { ascending: false });

  const from = (filters.page - 1) * PAGE_SIZE;
  // One extra row tells us whether there is a next page.
  const { data, error } = await query.range(from, from + PAGE_SIZE);
  if (error || !data) return { state: "unavailable" };

  const rows = data as unknown as Row[];
  return { state: "ready", posts: rows.slice(0, PAGE_SIZE).map(toPost), hasMore: rows.length > PAGE_SIZE };
}

// React's cache() lets the page and its metadata share one query per request.
export const fetchFeed = cache(async (key: string): Promise<FeedResult> => load(JSON.parse(key) as FeedFilters));
export const feedKey = (f: FeedFilters) => JSON.stringify(f);
