import type { SupabaseClient } from "@supabase/supabase-js";
import { POST_SELECT, toPost, type Row as PostRow } from "@/lib/community/queries";
import { QUESTION_COLUMNS, toQuestion, type QuestionRow } from "@/lib/community/discussionQuery";
import type { CommunityPost, CommunityProfile, CommunityQuestion, ProfileAnswer, ProfileReview, ProfileStats, VisitedPlace } from "@/lib/community/types";

// Reading a person's community profile. Every function takes the client to use
// and, where it matters, whether the viewer IS that person: the owner also
// sees their own unpublished items, everyone else only published ones. Private
// lists (saved, and visited unless shared) are fetched only when allowed — and
// the database's Row Level Security enforces the same rules independently.

interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  show_stats: boolean;
  show_visited: boolean;
}

export async function fetchProfile(client: SupabaseClient, username: string): Promise<CommunityProfile | null> {
  const { data } = await client.from("profiles").select("id,username,display_name,avatar_url,bio,created_at,show_stats,show_visited").eq("username", username.toLowerCase()).maybeSingle();
  const r = data as ProfileRow | null;
  return r ? { id: r.id, username: r.username, displayName: r.display_name, avatarUrl: r.avatar_url, bio: r.bio, createdAt: r.created_at, showStats: r.show_stats, showVisited: r.show_visited } : null;
}

export async function fetchProfileById(client: SupabaseClient, id: string): Promise<CommunityProfile | null> {
  const { data } = await client.from("profiles").select("id,username,display_name,avatar_url,bio,created_at,show_stats,show_visited").eq("id", id).maybeSingle();
  const r = data as ProfileRow | null;
  return r ? { id: r.id, username: r.username, displayName: r.display_name, avatarUrl: r.avatar_url, bio: r.bio, createdAt: r.created_at, showStats: r.show_stats, showVisited: r.show_visited } : null;
}

export async function fetchProfileStats(client: SupabaseClient, userId: string): Promise<ProfileStats | null> {
  const { data, error } = await client.rpc("community_profile_stats", { p_user: userId });
  if (error || !Array.isArray(data) || !data[0]) return null;
  const r = data[0] as Record<string, number | string>;
  return { posts: Number(r.posts), reviews: Number(r.reviews), questions: Number(r.questions), answers: Number(r.answers), helpfulReceived: Number(r.helpful_received), visited: Number(r.visited) };
}

const LIMIT = 48;

export async function fetchUserPosts(client: SupabaseClient, userId: string, owner: boolean): Promise<CommunityPost[]> {
  let q = client.from("community_posts").select(POST_SELECT).eq("user_id", userId);
  if (!owner) q = q.eq("status", "published");
  const { data } = await q.order("created_at", { ascending: false }).limit(LIMIT);
  return ((data ?? []) as unknown as PostRow[]).map(toPost);
}

export async function fetchUserReviews(client: SupabaseClient, userId: string, owner: boolean): Promise<ProfileReview[]> {
  let q = client.from("community_reviews").select("id,place_ref,rating,body,recommend,status,published_at,created_at").eq("user_id", userId);
  if (!owner) q = q.eq("status", "published");
  const { data } = await q.order("created_at", { ascending: false }).limit(LIMIT);
  return ((data ?? []) as { id: string; place_ref: string; rating: number; body: string; recommend: boolean; status: string; published_at: string | null; created_at: string }[]).map((r) => ({ id: r.id, placeRef: r.place_ref, rating: r.rating, body: r.body, recommend: r.recommend, status: r.status, publishedAt: r.published_at ?? r.created_at }));
}

export async function fetchUserQuestions(client: SupabaseClient, userId: string, owner: boolean): Promise<CommunityQuestion[]> {
  let q = client.from("community_questions").select(QUESTION_COLUMNS).eq("user_id", userId);
  if (!owner) q = q.eq("status", "published");
  const { data } = await q.order("created_at", { ascending: false }).limit(LIMIT);
  return ((data ?? []) as unknown as QuestionRow[]).map((r) => toQuestion(r, owner ? userId : null));
}

export async function fetchUserAnswers(client: SupabaseClient, userId: string, owner: boolean): Promise<ProfileAnswer[]> {
  let q = client.from("community_answers").select("id,body,helpful_count,status,created_at,community_questions(id,title)").eq("user_id", userId);
  if (!owner) q = q.eq("status", "published");
  const { data } = await q.order("created_at", { ascending: false }).limit(LIMIT);
  type Row = { id: string; body: string; helpful_count: number; status: string; created_at: string; community_questions: { id: string; title: string } | { id: string; title: string }[] | null };
  return ((data ?? []) as unknown as Row[]).map((r) => {
    const qn = Array.isArray(r.community_questions) ? r.community_questions[0] : r.community_questions;
    return { id: r.id, body: r.body, helpfulCount: r.helpful_count, status: r.status, createdAt: r.created_at, question: qn ?? null };
  });
}

// Places marked "been here". The database only returns another person's list
// if they chose to share it.
export async function fetchVisited(client: SupabaseClient, userId: string): Promise<VisitedPlace[]> {
  const { data } = await client.from("community_visited").select("place_ref,area_id,visited_at").eq("user_id", userId).order("visited_at", { ascending: false }).limit(500);
  return ((data ?? []) as { place_ref: string; area_id: string; visited_at: string }[]).map((r) => ({ placeRef: r.place_ref, areaId: r.area_id, visitedAt: r.visited_at }));
}

// The owner's saved posts (private: only their own saves are ever readable).
export async function fetchSavedPosts(client: SupabaseClient, userId: string): Promise<CommunityPost[]> {
  const { data: saves } = await client.from("community_post_saves").select("post_id").eq("user_id", userId).order("created_at", { ascending: false }).limit(LIMIT);
  const ids = (saves ?? []).map((s: { post_id: string }) => s.post_id);
  if (ids.length === 0) return [];
  const { data } = await client.from("community_posts").select(POST_SELECT).in("id", ids).eq("status", "published");
  const byId = new Map(((data ?? []) as unknown as PostRow[]).map((r) => [r.id, toPost(r)]));
  return ids.map((id) => byId.get(id)).filter((p): p is CommunityPost => Boolean(p));
}

// The owner's saved Explore places (the site's existing favourites: keys like "wd:Q123").
export async function fetchSavedPlaces(client: SupabaseClient, userId: string): Promise<string[]> {
  const { data } = await client.from("favorites").select("key").eq("user_id", userId).eq("kind", "place").order("created_at", { ascending: false }).limit(200);
  return ((data ?? []) as { key: string }[]).map((r) => r.key.replace(/^wd:/, "")).filter((k) => /^Q[0-9]{1,12}$/.test(k));
}
