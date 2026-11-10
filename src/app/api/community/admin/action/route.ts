import { dbFailure, readJson, requireUser } from "@/lib/community/apiAuth";
import { json } from "@/lib/community/http";
import { parseModerationRequest, reportStatusFor, STATUS_FOR, TABLE } from "@/lib/community/moderation";

export const runtime = "nodejs";

const BUCKET = "community-photos";

// One moderator action: hide, restore, approve, reject, delete, dismiss a
// report, or suspend / un-suspend someone. Everything runs as the moderator's
// own signed-in session, so the database's rules are what really allow it: a
// person who is not in the `moderators` table is refused there even if they
// could reach this code. Every action is also written to the moderation log.
export async function POST(request: Request) {
  const ctx = await requireUser(request, { unavailable: "Moderation isn't available right now.", signIn: "Please sign in." });
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  // Not a moderator: behave as if this page does not exist.
  const { data: isMod } = await supabase.rpc("is_moderator");
  if (isMod !== true) return json({ error: "That could not be found." }, 404);

  const parsed = parseModerationRequest(await readJson(request));
  if (!parsed.ok) return json({ error: parsed.error }, 422);
  const { action, targetType, targetId, note, days, closeReports } = parsed.value;

  // Who wrote the content (and, for posts, which files it has).
  let authorId: string | null = targetType === "user" ? targetId : null;
  let files: string[] = [];
  if (targetType !== "user") {
    const select = targetType === "post" ? "id,user_id,community_post_images(storage_path,thumb_path)" : targetType === "review" ? "id,user_id,community_review_images(storage_path,thumb_path)" : "id,user_id";
    const { data: row, error } = await supabase.from(TABLE[targetType]).select(select).eq("id", targetId).maybeSingle();
    if (error) return dbFailure(error, "That didn't work. Please try again.");
    const content = row as unknown as { user_id: string; community_post_images?: { storage_path: string; thumb_path: string | null }[]; community_review_images?: { storage_path: string; thumb_path: string | null }[] } | null;
    // Content that is already gone can still have its reports closed.
    if (!content && !["dismiss", "reviewed"].includes(action)) return json({ error: "That item could not be found." }, 404);
    authorId = content?.user_id ?? null;
    files = [...(content?.community_post_images ?? []), ...(content?.community_review_images ?? [])].flatMap((i) => [i.storage_path, i.thumb_path].filter(Boolean) as string[]);
  }

  const status = STATUS_FOR[action];
  if (status && targetType !== "user") {
    const { error } = await supabase.from(TABLE[targetType]).update({ status }).eq("id", targetId);
    if (error) return dbFailure(error, "That didn't work. Please try again.");
  } else if (action === "delete" && targetType !== "user") {
    const { error } = await supabase.from(TABLE[targetType]).delete().eq("id", targetId);
    if (error) return dbFailure(error, "That didn't work. Please try again.");
    // The photos go too (they are public, so removal is what really takes them down).
    if (files.length) await supabase.storage.from(BUCKET).remove(files);
  } else if (action === "suspend") {
    if (!authorId) return json({ error: "That person could not be found." }, 404);
    if (authorId === user.id) return json({ error: "You can't suspend yourself." }, 409);
    const until = days ? new Date(Date.now() + days * 86_400_000).toISOString() : null;
    const { error } = await supabase.from("community_suspensions").upsert({ user_id: authorId, reason: note, suspended_by: user.id, suspended_at: new Date().toISOString(), until }, { onConflict: "user_id" });
    if (error) return dbFailure(error, "That didn't work. Please try again.");
  } else if (action === "unsuspend") {
    if (!authorId) return json({ error: "That person could not be found." }, 404);
    const { error } = await supabase.from("community_suspensions").delete().eq("user_id", authorId);
    if (error) return dbFailure(error, "That didn't work. Please try again.");
  }

  // Close the open reports about this item, recording who did it and when.
  if (closeReports && action !== "unsuspend") {
    await supabase
      .from("community_reports")
      .update({ status: reportStatusFor(action), reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .eq("status", "open");
  }

  await supabase.from("community_moderation_log").insert({ moderator_id: user.id, action, target_type: targetType, target_id: targetId, note });
  return json({ ok: true });
}
