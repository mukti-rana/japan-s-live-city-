import { UUID_RE } from "@/lib/community/validation";

// The rules for moderator actions, in one place and with no browser or server
// code in it, so the page, the API route and the tests all use the same list.
// The database still has the final say: only people in `moderators` can change
// anything, whatever this code is asked to do.

export const TARGETS = ["post", "comment", "review", "question", "answer", "user"] as const;
export type Target = (typeof TARGETS)[number];

export const ACTIONS = ["hide", "restore", "approve", "reject", "delete", "dismiss", "reviewed", "suspend", "unsuspend"] as const;
export type Action = (typeof ACTIONS)[number];

// The table each kind of content lives in.
export const TABLE: Record<Exclude<Target, "user">, string> = {
  post: "community_posts",
  comment: "community_comments",
  review: "community_reviews",
  question: "community_questions",
  answer: "community_answers",
};

// What each content action does to the content's status.
export const STATUS_FOR: Partial<Record<Action, "hidden" | "published" | "rejected">> = {
  hide: "hidden",
  restore: "published",
  approve: "published",
  reject: "rejected",
};

// People are only suspended or have reports closed; content is hidden, restored,
// approved, rejected or deleted. (Suspending from a piece of content acts on its author.)
export function actionAllowed(target: Target, action: Action): boolean {
  if (target === "user") return action === "suspend" || action === "unsuspend" || action === "dismiss" || action === "reviewed";
  return true;
}

export const NOTE_MAX = 500;
export const MAX_SUSPEND_DAYS = 365;

export interface ModerationRequest {
  action: Action;
  targetType: Target;
  targetId: string;
  note: string;
  // Only for "suspend": a number of days, or null for "until lifted".
  days: number | null;
  // Close the open reports about this target as part of the action.
  closeReports: boolean;
}

export type ParseResult = { ok: true; value: ModerationRequest } | { ok: false; error: string };

const clean = (v: unknown) =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim() : "";

export function parseModerationRequest(raw: unknown): ParseResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "That request could not be read." };
  const r = raw as Record<string, unknown>;
  const action = r.action as Action;
  const targetType = r.targetType as Target;
  if (!ACTIONS.includes(action)) return { ok: false, error: "That action isn't available." };
  if (!TARGETS.includes(targetType)) return { ok: false, error: "That kind of content isn't available." };
  if (typeof r.targetId !== "string" || !UUID_RE.test(r.targetId)) return { ok: false, error: "That item could not be found." };
  if (!actionAllowed(targetType, action)) return { ok: false, error: "That action doesn't apply here." };
  const note = clean(r.note);
  if (note.length > NOTE_MAX) return { ok: false, error: `The note can be up to ${NOTE_MAX} characters.` };
  let days: number | null = null;
  if (action === "suspend" && r.days !== null && r.days !== undefined) {
    if (typeof r.days !== "number" || !Number.isInteger(r.days) || r.days < 1 || r.days > MAX_SUSPEND_DAYS) return { ok: false, error: `A suspension lasts 1 to ${MAX_SUSPEND_DAYS} days, or until lifted.` };
    days = r.days;
  }
  return { ok: true, value: { action, targetType, targetId: r.targetId, note, days, closeReports: r.closeReports !== false } };
}

// The report status a moderator action leaves behind.
export function reportStatusFor(action: Action): "actioned" | "dismissed" | "reviewed" {
  if (action === "dismiss") return "dismissed";
  if (action === "reviewed") return "reviewed";
  return "actioned";
}

// The same wording people saw when they reported (so it is already translated).
export const REASON_LABEL: Record<string, string> = {
  inappropriate: "Inappropriate photo or content",
  fake: "Fake or made-up",
  spam: "Spam or advertising",
  harassment: "Harassment or hate",
  misleading: "Misleading information",
  copyright: "Copyright concern",
  unsafe: "Unsafe or illegal",
};

export const TARGET_LABEL: Record<Target, string> = {
  post: "Photo post",
  comment: "Comment",
  review: "Review",
  question: "Question",
  answer: "Answer",
  user: "Person",
};
