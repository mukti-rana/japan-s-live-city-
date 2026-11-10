import { dbFailure, readJson, requireUser, validId } from "@/lib/community/apiAuth";
import { json } from "@/lib/community/http";
import { validateCommentBody } from "@/lib/community/validation";

export const runtime = "nodejs";

// Edit your own comment (the words only).
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireUser(request, { unavailable: "Comments aren't available right now.", signIn: "Please sign in." });
  if ("response" in ctx) return ctx.response;
  const { id } = await params;
  if (!validId(id)) return json({ error: "That comment could not be found." }, 404);

  const raw = await readJson(request);
  const body = validateCommentBody((raw as { body?: unknown } | undefined)?.body);
  if (!body.ok) return json({ error: body.error }, 422);

  // Row Level Security lets you update only your own; no row back means "not yours / not there".
  const { data, error } = await ctx.supabase.from("community_comments").update({ body: body.body }).eq("id", id).eq("user_id", ctx.user.id).select("id").maybeSingle();
  if (error) return dbFailure(error, "We couldn't save your changes. Please try again.");
  if (!data) return json({ error: "That comment could not be found." }, 404);
  return json({ id });
}

// Delete your own comment (and the replies under it).
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireUser(request, { unavailable: "That isn't available right now.", signIn: "Please sign in." });
  if ("response" in ctx) return ctx.response;
  const { id } = await params;
  if (!validId(id)) return json({ error: "That comment could not be found." }, 404);
  const { data, error } = await ctx.supabase.from("community_comments").delete().eq("id", id).eq("user_id", ctx.user.id).select("id").maybeSingle();
  if (error) return dbFailure(error, "We couldn't delete that comment. Please try again.");
  if (!data) return json({ error: "That comment could not be found." }, 404);
  return json({ ok: true });
}
