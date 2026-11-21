import { json } from "@/lib/community/http";
import { fail, isUuid, requireUser } from "@/lib/community/listings/server";

export const runtime = "nodejs";

// "Publish". The database does the real work: it checks everything required, the hourly limit and duplicates, runs the automated safety checks,
// and answers "published" (live at once) or "pending" (held for a moderator, with the reason kept for the author and the moderators).
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return json({ error: "That publication could not be found." }, 404);
  const gate = await requireUser(request);
  if (!gate.ok) return gate.response;
  const { data, error } = await gate.supabase.rpc("community_listing_submit", { p_id: id });
  if (error) return fail("submit listing", error);
  const status = data as string;
  const { data: row } = await gate.supabase.from("community_listings").select("hold_reason").eq("id", id).maybeSingle();
  return json({ id, status, holdReason: status === "pending" ? (row?.hold_reason ?? null) : null });
}
