import { dbFailure, readJson, requireUser } from "@/lib/community/apiAuth";
import { json } from "@/lib/community/http";
import { validateCommentInput } from "@/lib/community/validation";

export const runtime = "nodejs";

// Comment on a photo post, or reply to an answer, or reply to another comment.
// The database checks that what is being commented on is published, that a reply
// belongs to the same thread and nesting stops at three levels, and applies the
// anti-spam limits.
export async function POST(request: Request) {
  const ctx = await requireUser(request, { unavailable: "Comments aren't available right now.", signIn: "Please sign in to comment." });
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const body = await readJson(request);
  if (body === undefined) return json({ error: "Something went wrong. Please try again." }, 400);
  const parsed = validateCommentInput(body);
  if (!parsed.ok) return json({ error: Object.values(parsed.errors)[0] ?? "Something went wrong. Please try again.", fields: parsed.errors }, 422);
  const c = parsed.value;

  const { data, error } = await supabase
    .from("community_comments")
    .insert({ user_id: user.id, post_id: c.targetType === "post" ? c.targetId : null, answer_id: c.targetType === "answer" ? c.targetId : null, parent_id: c.parentId, body: c.body })
    .select("id")
    .single();
  if (error || !data) return dbFailure(error, "We couldn't post your comment. Please try again.");
  return json({ id: data.id }, 201);
}
