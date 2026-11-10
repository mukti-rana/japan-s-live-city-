import type { SupabaseClient } from "@supabase/supabase-js";
import { TABLE, type Target } from "@/lib/community/moderation";

// What the moderation page reads. Every function takes the moderator's own
// signed-in client: Row Level Security is what lets a moderator see hidden and
// pending content and reports — for anyone else these queries return nothing.

export interface ModItem {
  type: Exclude<Target, "user">;
  id: string;
  status: string;
  authorId: string;
  author: string;
  title: string;
  excerpt: string;
  href: string;
  createdAt: string;
  thumbPath: string | null;
  rating: number | null;
}

type Content = Exclude<Target, "user">;
type Profile = { username: string } | { username: string }[] | null;
const nameOf = (p: Profile) => (Array.isArray(p) ? p[0]?.username : p?.username) ?? "traveler";
const cut = (s: string | null | undefined, n = 280) => ((s ?? "").length > n ? `${(s ?? "").slice(0, n)}…` : (s ?? ""));

const SELECT: Record<Content, string> = {
  post: "id,user_id,title,caption,status,created_at,profiles(username),community_post_images(thumb_path,storage_path,position)",
  comment: "id,user_id,body,status,created_at,post_id,answer_id,profiles(username),community_answers(question_id)",
  review: "id,user_id,body,rating,status,place_ref,created_at,profiles(username)",
  question: "id,user_id,title,body,status,created_at,profiles(username)",
  answer: "id,user_id,body,status,question_id,created_at,profiles(username)",
};

interface Raw {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  profiles: Profile;
  title?: string;
  caption?: string;
  body?: string;
  rating?: number;
  place_ref?: string;
  post_id?: string | null;
  answer_id?: string | null;
  question_id?: string;
  community_answers?: { question_id: string } | { question_id: string }[] | null;
  community_post_images?: { thumb_path: string | null; storage_path: string; position: number }[] | null;
}

function toItem(type: Content, r: Raw): ModItem {
  const answerQ = Array.isArray(r.community_answers) ? r.community_answers[0]?.question_id : r.community_answers?.question_id;
  const href =
    type === "post" ? `/community/post/${r.id}`
    : type === "question" ? `/community/question/${r.id}`
    : type === "answer" ? `/community/question/${r.question_id}`
    : type === "review" ? `/explore/${r.place_ref}`
    : r.post_id ? `/community/post/${r.post_id}` : `/community/question/${answerQ ?? ""}`;
  const cover = type === "post" ? (r.community_post_images ?? []).slice().sort((a, b) => a.position - b.position)[0] : undefined;
  return {
    type,
    id: r.id,
    status: r.status,
    authorId: r.user_id,
    author: nameOf(r.profiles),
    title: type === "post" || type === "question" ? (r.title ?? "") : "",
    excerpt: cut(type === "post" ? r.caption : r.body),
    href,
    createdAt: r.created_at,
    thumbPath: cover ? (cover.thumb_path ?? cover.storage_path) : null,
    rating: type === "review" ? (r.rating ?? null) : null,
  };
}

export async function fetchByIds(client: SupabaseClient, type: Content, ids: string[]): Promise<ModItem[]> {
  if (ids.length === 0) return [];
  const { data } = await client.from(TABLE[type]).select(SELECT[type]).in("id", ids);
  return ((data ?? []) as unknown as Raw[]).map((r) => toItem(type, r));
}

export async function fetchByStatus(client: SupabaseClient, type: Content, statuses: string[], limit = 30): Promise<ModItem[]> {
  const { data } = await client.from(TABLE[type]).select(SELECT[type]).in("status", statuses).order("created_at", { ascending: false }).limit(limit);
  return ((data ?? []) as unknown as Raw[]).map((r) => toItem(type, r));
}

const CONTENT: Content[] = ["post", "review", "question", "answer", "comment"];

export async function fetchAllByStatus(client: SupabaseClient, statuses: string[]): Promise<ModItem[]> {
  const lists = await Promise.all(CONTENT.map((t) => fetchByStatus(client, t, statuses)));
  return lists.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface ReportGroup {
  targetType: Target;
  targetId: string;
  count: number;
  reasons: Record<string, number>;
  notes: string[];
  firstAt: string;
  latestAt: string;
  item: ModItem | null;
  // For "user" reports.
  username?: string;
}

export async function fetchReportGroups(client: SupabaseClient): Promise<ReportGroup[]> {
  const { data } = await client.from("community_reports").select("target_type,target_id,reason,details,created_at").eq("status", "open").order("created_at", { ascending: false }).limit(300);
  const groups = new Map<string, ReportGroup>();
  for (const r of (data ?? []) as { target_type: Target; target_id: string; reason: string; details: string | null; created_at: string }[]) {
    const key = `${r.target_type}:${r.target_id}`;
    const g = groups.get(key) ?? { targetType: r.target_type, targetId: r.target_id, count: 0, reasons: {}, notes: [], firstAt: r.created_at, latestAt: r.created_at, item: null };
    g.count += 1;
    g.reasons[r.reason] = (g.reasons[r.reason] ?? 0) + 1;
    if (r.details && g.notes.length < 3) g.notes.push(cut(r.details, 240));
    if (r.created_at < g.firstAt) g.firstAt = r.created_at;
    groups.set(key, g);
  }
  const list = [...groups.values()];
  await Promise.all(
    (["post", "comment", "review", "question", "answer"] as Content[]).map(async (t) => {
      const mine = list.filter((g) => g.targetType === t);
      const items = await fetchByIds(client, t, mine.map((g) => g.targetId));
      for (const g of mine) g.item = items.find((i) => i.id === g.targetId) ?? null;
    }),
  );
  const users = list.filter((g) => g.targetType === "user");
  if (users.length) {
    const { data: profiles } = await client.from("profiles").select("id,username").in("id", users.map((g) => g.targetId));
    for (const g of users) g.username = (profiles ?? []).find((p: { id: string }) => p.id === g.targetId)?.username;
  }
  // The most-reported, then the oldest, first.
  return list.sort((a, b) => b.count - a.count || a.firstAt.localeCompare(b.firstAt));
}

export interface SuspensionRow {
  userId: string;
  username: string;
  reason: string;
  suspendedAt: string;
  until: string | null;
  // The end date has passed (the suspension no longer applies).
  ended: boolean;
}

export async function fetchSuspensions(client: SupabaseClient): Promise<SuspensionRow[]> {
  const { data } = await client.from("community_suspensions").select("user_id,reason,suspended_at,until,profiles(username)").order("suspended_at", { ascending: false }).limit(100);
  return ((data ?? []) as unknown as { user_id: string; reason: string; suspended_at: string; until: string | null; profiles: Profile }[]).map((r) => ({ userId: r.user_id, username: nameOf(r.profiles), reason: r.reason, suspendedAt: r.suspended_at, until: r.until, ended: r.until !== null && new Date(r.until).getTime() <= Date.now() }));
}

export interface LogRow {
  id: string;
  moderator: string;
  action: string;
  targetType: string;
  targetId: string;
  note: string;
  createdAt: string;
}

export async function fetchLog(client: SupabaseClient): Promise<LogRow[]> {
  const { data } = await client.from("community_moderation_log").select("id,moderator_id,action,target_type,target_id,note,created_at").order("created_at", { ascending: false }).limit(50);
  const rows = (data ?? []) as { id: string; moderator_id: string; action: string; target_type: string; target_id: string; note: string; created_at: string }[];
  const ids = [...new Set(rows.map((r) => r.moderator_id))];
  const { data: profiles } = ids.length ? await client.from("profiles").select("id,username").in("id", ids) : { data: [] };
  const name = new Map(((profiles ?? []) as { id: string; username: string }[]).map((p) => [p.id, p.username]));
  return rows.map((r) => ({ id: r.id, moderator: name.get(r.moderator_id) ?? "moderator", action: r.action, targetType: r.target_type, targetId: r.target_id, note: r.note, createdAt: r.created_at }));
}

export async function countOpenReports(client: SupabaseClient): Promise<number> {
  const { count } = await client.from("community_reports").select("id", { count: "exact", head: true }).eq("status", "open");
  return count ?? 0;
}
