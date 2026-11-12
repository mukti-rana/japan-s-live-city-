import type { SupabaseClient } from "@supabase/supabase-js";
import { isAreaId } from "@/lib/community/areas";
import { isCategorySlug } from "@/lib/community/categories";
import { QUESTION_COLUMNS, toQuestion, type QuestionRow } from "@/lib/community/discussionQuery";
import { likeTerm, POST_SELECT, toPost, type Row } from "@/lib/community/queries";
import type { CommunityPost, CommunityQuestion } from "@/lib/community/types";
import { MAX_QUERY_LENGTH } from "@/lib/community/feed";
import { suggest } from "@/lib/explore/catalogue";

// Searching the whole community: photos, reviews, questions, people and places.
// Everything typed is cleaned before it is used, only published content is ever
// searched (Row Level Security in the database enforces that), and places come
// from the Explore catalogue, not from anyone's post.

export const SEARCH_TYPES = ["all", "photos", "reviews", "questions", "people", "places"] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];
export const MIN_SEARCH_LENGTH = 2;
export const SEARCH_PAGE = 12;

export interface SearchParams {
  q: string;
  type: SearchType;
  area?: string;
  category?: string;
  page: number;
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseSearch(sp: Record<string, string | string[] | undefined>): SearchParams {
  const q = (first(sp.q) ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
  const type = first(sp.type);
  const area = first(sp.area);
  const category = first(sp.category);
  const page = Number.parseInt(first(sp.page) ?? "1", 10);
  return {
    q,
    type: SEARCH_TYPES.includes(type as SearchType) ? (type as SearchType) : "all",
    area: isAreaId(area) ? area : undefined,
    category: isCategorySlug(category) ? category : undefined,
    page: Number.isFinite(page) && page >= 1 && page <= 50 ? page : 1,
  };
}

// True when the text is long enough to search for.
export const searchable = (q: string) => likeTerm(q).length >= MIN_SEARCH_LENGTH;

export interface ReviewHit {
  id: string;
  placeRef: string;
  rating: number;
  body: string;
  recommend: boolean;
  helpfulCount: number;
  publishedAt: string;
  author: string;
}
export interface PersonHit {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}
export interface PlaceHit {
  id: string;
  label: string;
  sub: string;
}

export interface SearchResults {
  posts: CommunityPost[];
  reviews: ReviewHit[];
  questions: CommunityQuestion[];
  people: PersonHit[];
  places: PlaceHit[];
  // Whether the type being viewed has a further page.
  hasMore: boolean;
}

const EMPTY: SearchResults = { posts: [], reviews: [], questions: [], people: [], places: [], hasMore: false };

type Profile = { username: string } | { username: string }[] | null;

// `all` shows a few of each; a single type shows a full, pageable list of it.
export async function runSearch(client: SupabaseClient, s: SearchParams): Promise<SearchResults | null> {
  const term = likeTerm(s.q);
  if (term.length < MIN_SEARCH_LENGTH) return EMPTY;
  const one = s.type !== "all";
  const want = (t: SearchType) => s.type === "all" || s.type === t;
  const limit = one ? SEARCH_PAGE * 2 : 4;
  const from = one ? (s.page - 1) * limit : 0;
  const pattern = `%${term}%`;
  // Inside an "or" filter a quote would end the value early, so none are allowed.
  const orPattern = `%${term.replace(/["']/g, " ")}%`;
  // Usernames often contain underscores, which are a wildcard in LIKE: for the
  // people search they are escaped so "aiko_t" finds "aiko_travels", not "aikoXt…".
  const rawTerm = s.q.toLowerCase().replace(/[\\%*,()"']/g, " ").replace(/\s+/g, " ").trim();
  const peoplePattern = `%${rawTerm.replace(/_/g, "\\_")}%`;
  let failed = false;
  const fail = (where: string, error: { code?: string; message?: string }) => {
    failed = true;
    console.error(`[community] search ${where}: code=${error.code ?? "none"} message=${(error.message ?? "").replace(/\s+/g, " ").slice(0, 200)}`);
  };

  const [posts, reviews, questions, people] = await Promise.all([
    want("photos")
      ? (async () => {
          let q = client.from("community_posts").select(POST_SELECT).eq("status", "published").ilike("search_text", pattern);
          if (s.area) q = q.eq("area_id", s.area);
          if (s.category) q = q.eq("category_slug", s.category);
          const { data, error } = await q.order("like_count", { ascending: false }).order("published_at", { ascending: false }).range(from, from + limit);
          if (error) fail("posts", error);
          return (data ?? []) as unknown as Row[];
        })()
      : [],
    want("reviews")
      ? (async () => {
          const { data, error } = await client.from("community_reviews").select("id,place_ref,rating,body,recommend,helpful_count,published_at,created_at,profiles!community_reviews_user_id_fkey(username)").eq("status", "published").ilike("body", pattern).order("helpful_count", { ascending: false }).order("published_at", { ascending: false }).range(from, from + limit);
          if (error) fail("reviews", error);
          return (data ?? []) as unknown as { id: string; place_ref: string; rating: number; body: string; recommend: boolean; helpful_count: number; published_at: string | null; created_at: string; profiles: Profile }[];
        })()
      : [],
    want("questions")
      ? (async () => {
          let q = client.from("community_questions").select(QUESTION_COLUMNS).eq("status", "published").or(`title.ilike.${orPattern},body.ilike.${orPattern}`);
          if (s.area) q = q.eq("area_id", s.area);
          const { data, error } = await q.order("published_at", { ascending: false }).range(from, from + limit);
          if (error) fail("questions", error);
          return (data ?? []) as unknown as QuestionRow[];
        })()
      : [],
    want("people")
      ? (async () => {
          const { data, error } = await client.from("profiles").select("username,display_name,avatar_url").or(`username.ilike.${peoplePattern},display_name.ilike.${peoplePattern}`).order("username").range(0, limit - 1);
          if (error) fail("people", error);
          return (data ?? []) as { username: string; display_name: string | null; avatar_url: string | null }[];
        })()
      : [],
  ]);
  // Every searched table failed: report that rather than a false "no results".
  if (failed && posts.length + reviews.length + questions.length + people.length === 0) return null;

  const places = want("places") ? suggest(s.q, "en").filter((x) => x.type === "place" && x.id).slice(0, one ? 12 : 4).map((x) => ({ id: x.id as string, label: x.label, sub: x.sub })) : [];
  const take = <T,>(rows: T[]) => rows.slice(0, limit);
  const more = (rows: unknown[]) => one && rows.length > limit;
  const hasMore = s.type === "photos" ? more(posts) : s.type === "reviews" ? more(reviews) : s.type === "questions" ? more(questions) : false;
  return {
    posts: take(posts).map(toPost),
    reviews: take(reviews).map((r) => ({ id: r.id, placeRef: r.place_ref, rating: r.rating, body: r.body, recommend: r.recommend, helpfulCount: r.helpful_count, publishedAt: r.published_at ?? r.created_at, author: (Array.isArray(r.profiles) ? r.profiles[0]?.username : r.profiles?.username) ?? "traveler" })),
    questions: take(questions).map((r) => toQuestion(r, null)),
    people: take(people).map((p) => ({ username: p.username, displayName: p.display_name, avatarUrl: p.avatar_url })),
    places,
    hasMore,
  };
}
