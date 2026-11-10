import { dbFailure, readJson, requireUser, validId } from "@/lib/community/apiAuth";
import { json } from "@/lib/community/http";
import { validateAnswerBody } from "@/lib/community/validation";

export const runtime = "nodejs";

// Edit your own answer (the words only).
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireUser(request, { unavailable: "Answers aren't available right now.", signIn: "Please sign in." });
  if ("response" in ctx) return ctx.response;
  const { id } = await params;
  if (!validId(id)) return json({ error: "That answer could not be found." }, 404);
  const raw = await readJson(request);
  const body = validateAnswerBody((raw as { body?: unknown } | undefined)?.body);
  if (!body.ok) return json({ error: body.error }, 422);
  const { data, error } = await ctx.supabase.from("community_answers").update({ body: body.body }).eq("id", id).eq("user_id", ctx.user.id).select("id").maybeSingle();
  if (error) return dbFailure(error, "We couldn't save your changes. Please try again.");
  if (!data) return json({ error: "That answer could not be found." }, 404);
  return json({ id });
}

// Delete your own answer (and the replies under it).
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireUser(request, { unavailable: "That isn't available right now.", signIn: "Please sign in." });
  if ("response" in ctx) return ctx.response;
  const { id } = await params;
  if (!validId(id)) return json({ error: "That answer could not be found." }, 404);
  const { data, error } = await ctx.supabase.from("community_answers").delete().eq("id", id).eq("user_id", ctx.user.id).select("id").maybeSingle();
  if (error) return dbFailure(error, "We couldn't delete that answer. Please try again.");
  if (!data) return json({ error: "That answer could not be found." }, 404);
  return json({ ok: true });
}
