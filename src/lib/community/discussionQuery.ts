import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommunityAnswer, CommunityComment, CommunityQuestion } from "@/lib/community/types";

// Reading comments, questions and answers. As with reviews, each function takes
// the client to use (public, or the visitor's own session) and the database's
// Row Level Security decides what is visible.

type Profile = { username: string; avatar_url: string | null };
type ProfileJoin = Profile | Profile[] | null;
const who = (p: ProfileJoin) => {
  const profile = Array.isArray(p) ? p[0] : p;
  return { username: profile?.username ?? "traveler", avatarUrl: profile?.avatar_url ?? null };
};
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// ── comments ──

interface CommentRow {
  id: string;
  user_id: string;
  parent_id: string | null;
  depth: number;
  body: string;
  like_count: number;
  created_at: string;
  edited_at: string | null;
  post_id: string | null;
  answer_id: string | null;
  profiles: ProfileJoin;
}
const COMMENT_COLUMNS = "id,user_id,parent_id,depth,body,like_count,created_at,edited_at,post_id,answer_id,profiles(username,avatar_url)";
const toComment = (r: CommentRow, viewerId: string | null): CommunityComment => ({
  id: r.id,
  parentId: r.parent_id,
  depth: r.depth,
  body: r.body,
  likeCount: r.like_count,
  createdAt: r.created_at,
  edited: Boolean(r.edited_at),
  author: who(r.profiles),
  isMine: viewerId !== null && r.user_id === viewerId,
});

export const MAX_COMMENTS_LOADED = 300;

export async function fetchPostComments(client: SupabaseClient, postId: string, viewerId: string | null): Promise<CommunityComment[] | null> {
  const { data, error } = await client.from("community_comments").select(COMMENT_COLUMNS).eq("post_id", postId).eq("status", "published").order("created_at", { ascending: true }).limit(MAX_COMMENTS_LOADED);
  if (error || !data) return null;
  return (data as unknown as CommentRow[]).map((r) => toComment(r, viewerId));
}

// Comments under several answers at once, grouped by answer.
export async function fetchAnswerComments(client: SupabaseClient, answerIds: string[], viewerId: string | null): Promise<Map<string, CommunityComment[]>> {
  const out = new Map<string, CommunityComment[]>();
  if (answerIds.length === 0) return out;
  const { data } = await client.from("community_comments").select(COMMENT_COLUMNS).in("answer_id", answerIds).eq("status", "published").order("created_at", { ascending: true }).limit(MAX_COMMENTS_LOADED);
  for (const r of (data ?? []) as unknown as CommentRow[]) {
    const list = out.get(r.answer_id as string) ?? [];
    list.push(toComment(r, viewerId));
    out.set(r.answer_id as string, list);
  }
  return out;
}

// ── questions ──

export type QuestionSort = "latest" | "answers" | "unanswered" | "helpful";
export const QUESTION_SORTS: QuestionSort[] = ["latest", "answers", "unanswered", "helpful"];
export const QUESTIONS_PER_PAGE = 15;

export interface QuestionFilters {
  sort: QuestionSort;
  areaId?: string;
  placeRef?: string;
  page: number;
}

export function questionFiltersFromParams(sp: Record<string, string | string[] | undefined>, isArea: (v: string) => boolean): QuestionFilters {
  const sort = first(sp.sort);
  const area = first(sp.area);
  const place = first(sp.place);
  const page = Number.parseInt(first(sp.page) ?? "1", 10);
  return {
    sort: QUESTION_SORTS.includes(sort as QuestionSort) ? (sort as QuestionSort) : "latest",
    areaId: area && isArea(area) ? area : undefined,
    placeRef: place && /^Q[0-9]{1,12}$/.test(place) ? place : undefined,
    page: Number.isFinite(page) && page >= 1 && page <= 200 ? page : 1,
  };
}

export interface QuestionRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  area_id: string;
  place_ref: string | null;
  resolved: boolean;
  answer_count: number;
  helpful_count: number;
  status: string;
  published_at: string | null;
  created_at: string;
  profiles: ProfileJoin;
}
export const QUESTION_COLUMNS = "id,user_id,title,body,area_id,place_ref,resolved,answer_count,helpful_count,status,published_at,created_at,profiles(username,avatar_url)";
export const toQuestion = (r: QuestionRow, viewerId: string | null): CommunityQuestion => ({
  id: r.id,
  title: r.title,
  body: r.body,
  areaId: r.area_id,
  placeRef: r.place_ref,
  resolved: r.resolved,
  answerCount: r.answer_count,
  helpfulCount: r.helpful_count,
  publishedAt: r.published_at ?? r.created_at,
  status: r.status,
  author: who(r.profiles),
  isMine: viewerId !== null && r.user_id === viewerId,
});

export async function fetchQuestions(client: SupabaseClient, f: QuestionFilters, viewerId: string | null, limit = QUESTIONS_PER_PAGE): Promise<{ questions: CommunityQuestion[]; hasMore: boolean } | null> {
  let q = client.from("community_questions").select(QUESTION_COLUMNS).eq("status", "published");
  if (f.areaId) q = q.eq("area_id", f.areaId);
  if (f.placeRef) q = q.eq("place_ref", f.placeRef);
  if (f.sort === "unanswered") q = q.eq("answer_count", 0).order("published_at", { ascending: false });
  else if (f.sort === "answers") q = q.order("answer_count", { ascending: false }).order("published_at", { ascending: false });
  else if (f.sort === "helpful") q = q.order("helpful_count", { ascending: false }).order("published_at", { ascending: false });
  else q = q.order("published_at", { ascending: false });
  const from = (f.page - 1) * limit;
  const { data, error } = await q.range(from, from + limit);
  if (error || !data) {
    console.error(`[community] questions: code=${error?.code ?? "none"} message=${(error?.message ?? "no data").replace(/\s+/g, " ").slice(0, 200)}`);
    return null;
  }
  const rows = (data as unknown as QuestionRow[]).slice(0, limit);
  const questions = rows.map((r) => toQuestion(r, viewerId));
  await addLastActivity(client, questions);
  return { questions, hasMore: (data as unknown[]).length > limit };
}

// When each question last had something happen: its newest published answer,
// or when it was asked. One extra query covers the whole list.
export async function addLastActivity(client: SupabaseClient, questions: CommunityQuestion[]): Promise<void> {
  const answered = questions.filter((q) => q.answerCount > 0).map((q) => q.id);
  const latest = new Map<string, string>();
  if (answered.length > 0) {
    const { data } = await client.from("community_answers").select("question_id,created_at").in("question_id", answered).eq("status", "published").order("created_at", { ascending: false }).limit(answered.length * 20);
    for (const r of (data ?? []) as { question_id: string; created_at: string }[]) if (!latest.has(r.question_id)) latest.set(r.question_id, r.created_at);
  }
  for (const q of questions) q.lastActivityAt = latest.get(q.id) ?? q.publishedAt;
}

// "Ask a Local" questions: about an area, not tied to one place.
export async function fetchAreaQuestions(client: SupabaseClient, areaId: string, limit = 3): Promise<CommunityQuestion[]> {
  const { data } = await client.from("community_questions").select(QUESTION_COLUMNS).eq("status", "published").eq("area_id", areaId).is("place_ref", null).order("published_at", { ascending: false }).limit(limit);
  return ((data ?? []) as unknown as QuestionRow[]).map((r) => toQuestion(r, null));
}

export async function fetchQuestion(client: SupabaseClient, id: string, viewerId: string | null): Promise<CommunityQuestion | null> {
  const { data } = await client.from("community_questions").select(QUESTION_COLUMNS).eq("id", id).maybeSingle();
  return data ? toQuestion(data as unknown as QuestionRow, viewerId) : null;
}

// ── answers ──

export type AnswerSort = "helpful" | "newest";

interface AnswerRow {
  id: string;
  user_id: string;
  question_id: string;
  body: string;
  helpful_count: number;
  status: string;
  created_at: string;
  updated_at: string;
  profiles: ProfileJoin;
}

export async function fetchAnswers(client: SupabaseClient, questionId: string, sort: AnswerSort, viewerId: string | null): Promise<CommunityAnswer[]> {
  let q = client.from("community_answers").select("id,user_id,question_id,body,helpful_count,status,created_at,updated_at,profiles(username,avatar_url)").eq("question_id", questionId);
  q = sort === "newest" ? q.order("created_at", { ascending: false }) : q.order("helpful_count", { ascending: false }).order("created_at", { ascending: true });
  const { data } = await q.limit(100);
  return ((data ?? []) as unknown as AnswerRow[])
    .filter((r) => r.status === "published" || r.user_id === viewerId)
    .map((r) => ({
      id: r.id,
      questionId: r.question_id,
      body: r.body,
      helpfulCount: r.helpful_count,
      createdAt: r.created_at,
      edited: new Date(r.updated_at).getTime() - new Date(r.created_at).getTime() > 2000,
      status: r.status,
      author: who(r.profiles),
      isMine: viewerId !== null && r.user_id === viewerId,
    }));
}
