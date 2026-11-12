import type { SupabaseClient } from "@supabase/supabase-js";
import { QUESTION_COLUMNS, toQuestion, type QuestionRow } from "@/lib/community/discussionQuery";
import { POST_SELECT, toPost, type Row } from "@/lib/community/queries";
import { fetchRecommendedPlaces, type RecommendedPlace } from "@/lib/community/reviewQuery";
import type { CommunityPost, CommunityQuestion } from "@/lib/community/types";

// "Trending" and "most active", worked out from real published content for a
// time window. Nothing is estimated: a photo trends only if it has likes, a
// place ranks only if reviewers recommend it, and a person is listed only for
// what they have really published. Empty windows return empty lists.

export const PERIODS = ["week", "month", "all"] as const;
export type Period = (typeof PERIODS)[number];

export function parsePeriod(v: string | string[] | undefined): Period {
  const p = Array.isArray(v) ? v[0] : v;
  return PERIODS.includes(p as Period) ? (p as Period) : "week";
}

export function sinceFor(period: Period, now = Date.now()): string | undefined {
  if (period === "all") return undefined;
  return new Date(now - (period === "week" ? 7 : 30) * 86_400_000).toISOString();
}

export interface Contributor {
  username: string;
  avatarUrl: string | null;
  photos: number;
  reviews: number;
  total: number;
}

export interface Trending {
  posts: CommunityPost[];
  places: RecommendedPlace[];
  contributors: Contributor[];
  questions: CommunityQuestion[];
}

type Who = { user_id: string; profiles: { username: string; avatar_url: string | null } | { username: string; avatar_url: string | null }[] | null };

// Returns null when the database could not be read at all (so the page can say
// so, rather than claim nothing is trending).
export async function fetchTrending(client: SupabaseClient, period: Period): Promise<Trending | null> {
  const since = sinceFor(period);

  const postsP = (async () => {
    let q = client.from("community_posts").select(POST_SELECT).eq("status", "published").gt("like_count", 0);
    if (since) q = q.gte("published_at", since);
    const { data, error } = await q.order("like_count", { ascending: false }).order("comment_count", { ascending: false }).order("published_at", { ascending: false }).limit(12);
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as Row[]).map(toPost);
  })();

  const questionsP = (async () => {
    let q = client.from("community_questions").select(QUESTION_COLUMNS).eq("status", "published").gt("answer_count", 0);
    if (since) q = q.gte("published_at", since);
    const { data, error } = await q.order("answer_count", { ascending: false }).order("published_at", { ascending: false }).limit(4);
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as QuestionRow[]).map((r) => toQuestion(r, null));
  })();

  const contributorsP = (async () => {
    const make = (table: string) => {
      let q = client.from(table).select(`user_id,profiles!${table}_user_id_fkey(username,avatar_url)`).eq("status", "published");
      if (since) q = q.gte("published_at", since);
      return q.order("published_at", { ascending: false }).limit(500);
    };
    const [posts, reviews] = await Promise.all([make("community_posts"), make("community_reviews")]);
    if (posts.error && reviews.error) throw new Error(posts.error.message);
    const by = new Map<string, Contributor>();
    const add = (rows: Who[] | null, key: "photos" | "reviews") => {
      for (const r of rows ?? []) {
        const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        if (!profile) continue;
        const c = by.get(r.user_id) ?? { username: profile.username, avatarUrl: profile.avatar_url, photos: 0, reviews: 0, total: 0 };
        c[key] += 1;
        c.total += 1;
        by.set(r.user_id, c);
      }
    };
    add(posts.data as unknown as Who[] | null, "photos");
    add(reviews.data as unknown as Who[] | null, "reviews");
    return [...by.values()].sort((a, b) => b.total - a.total || a.username.localeCompare(b.username)).slice(0, 8);
  })();

  let failures = 0;
  const safe = <T,>(p: Promise<T>, fallback: T) =>
    p.catch((e: unknown) => {
      failures += 1;
      console.error(`[community] trending: ${String(e instanceof Error ? e.message : e).replace(/\s+/g, " ").slice(0, 200)}`);
      return fallback;
    });
  const [posts, places, contributors, questions] = await Promise.all([
    safe(postsP, [] as CommunityPost[]),
    safe(fetchRecommendedPlaces(client, 6, since), [] as RecommendedPlace[]),
    safe(contributorsP, [] as Contributor[]),
    safe(questionsP, [] as CommunityQuestion[]),
  ]);
  // Posts, questions and contributors all failed: the database is the problem.
  if (failures >= 3) return null;
  return { posts, places, contributors, questions };
}
