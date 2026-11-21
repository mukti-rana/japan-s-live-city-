import { json } from "@/lib/community/http";
import { fail, isUuid, requireUser, writeMedia } from "@/lib/community/listings/server";
import { parseListingInput } from "@/lib/community/listings/validation";

export const runtime = "nodejs";

// Saves changes to your own listing. A listing that is already public (or waiting for review) must stay complete, so it is checked as strictly
// as when it was published; a draft only has to be well-formed. The kind, status and marks can't be changed from here (the database also refuses).
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return json({ error: "That publication could not be found." }, 404);
  const gate = await requireUser(request);
  if (!gate.ok) return gate.response;
  const { supabase, user } = gate;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Something went wrong. Please try again." }, 400);
  }
  const current = await supabase.from("community_listings").select("id,kind,status,user_id").eq("id", id).maybeSingle();
  if (current.error) return fail("edit listing", current.error);
  if (!current.data || current.data.user_id !== user.id) return json({ error: "That publication could not be found." }, 404);

  const strict = current.data.status === "published" || current.data.status === "pending";
  const parsed = parseListingInput({ ...(body as object), kind: current.data.kind }, strict ? "submit" : "draft");
  if (!parsed.ok) return json({ error: "Please check the highlighted fields.", fields: parsed.errors }, 422);

  const { kind: _kind, ...changes } = parsed.value.row;
  void _kind;
  const { error } = await supabase.from("community_listings").update(changes).eq("id", id);
  if (error) return fail("edit listing", error);
  const mediaProblem = await writeMedia(supabase, id, user.id, parsed.value);
  if (mediaProblem) return mediaProblem;
  const { data } = await supabase.from("community_listings").select("status,hold_reason").eq("id", id).single();
  return json({ id, status: data?.status ?? current.data.status, holdReason: data?.hold_reason ?? null });
}

// Removes your own listing (the database keeps those a moderator is looking at: held or hidden).
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return json({ error: "That publication could not be found." }, 404);
  const gate = await requireUser(request);
  if (!gate.ok) return gate.response;
  const { data, error } = await gate.supabase.from("community_listings").delete().eq("id", id).eq("user_id", gate.user.id).select("id");
  if (error) return fail("delete listing", error);
  if (!data?.length) return json({ error: "That can't be deleted now." }, 409);
  return json({ ok: true });
}
