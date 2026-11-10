import { dbFailure, readJson, requireUser, validId } from "@/lib/community/apiAuth";
import { json } from "@/lib/community/http";
import { validateQuestionFields } from "@/lib/community/validation";

export const runtime = "nodejs";

// Edit your own question (title and details), or mark it resolved / open again.
// Send { resolved: true|false } alone to change only that.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireUser(request, { unavailable: "Questions aren't available right now.", signIn: "Please sign in." });
  if ("response" in ctx) return ctx.response;
  const { id } = await params;
  if (!validId(id)) return json({ error: "That question could not be found." }, 404);

  const raw = await readJson(request);
  if (!raw || typeof raw !== "object") return json({ error: "Something went wrong. Please try again." }, 400);
  const r = raw as Record<string, unknown>;

  const patch: Record<string, unknown> = {};
  if (typeof r.resolved === "boolean") patch.resolved = r.resolved;
  if ("title" in r || "body" in r) {
    // Only the words can be edited: the area and place stay as they were filed.
    // (A placeholder area is used so the shared rules can check the rest.)
    const parsed = validateQuestionFields({ title: r.title, body: r.body, areaId: "tokyo", placeRef: "" });
    if (!parsed.ok) return json({ error: "Please check the highlighted fields.", fields: parsed.errors }, 422);
    patch.title = parsed.value.title;
    patch.body = parsed.value.body;
  }
  if (Object.keys(patch).length === 0) return json({ error: "Something went wrong. Please try again." }, 400);

  const { data, error } = await ctx.supabase.from("community_questions").update(patch).eq("id", id).eq("user_id", ctx.user.id).select("id").maybeSingle();
  if (error) return dbFailure(error, "We couldn't save your changes. Please try again.");
  if (!data) return json({ error: "That question could not be found." }, 404);
  return json({ id });
}

// Delete your own question (and its answers and comments).
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireUser(request, { unavailable: "That isn't available right now.", signIn: "Please sign in." });
  if ("response" in ctx) return ctx.response;
  const { id } = await params;
  if (!validId(id)) return json({ error: "That question could not be found." }, 404);
  const { data, error } = await ctx.supabase.from("community_questions").delete().eq("id", id).eq("user_id", ctx.user.id).select("id").maybeSingle();
  if (error) return dbFailure(error, "We couldn't delete that question. Please try again.");
  if (!data) return json({ error: "That question could not be found." }, 404);
  return json({ ok: true });
}
