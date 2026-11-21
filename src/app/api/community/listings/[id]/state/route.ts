import { json } from "@/lib/community/http";
import { cleanText } from "@/lib/community/validation";
import { fail, isUuid, requireUser } from "@/lib/community/listings/server";

export const runtime = "nodejs";

const ACTIONS = ["cancel", "resume", "withdraw"];

// The organizer's own controls: cancel a published listing (it stays visible, marked as cancelled, with an optional note), resume a cancelled one,
// or withdraw one back to a private draft.
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return json({ error: "That publication could not be found." }, 404);
  const gate = await requireUser(request);
  if (!gate.ok) return gate.response;
  let body: { action?: unknown; note?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Something went wrong. Please try again." }, 400);
  }
  if (typeof body.action !== "string" || !ACTIONS.includes(body.action)) return json({ error: "That can't be done to this publication now." }, 400);
  const note = cleanText(body.note).slice(0, 300) || null;
  const { data, error } = await gate.supabase.rpc("community_listing_set_state", { p_id: id, p_action: body.action, p_note: note });
  if (error) return fail("listing state", error);
  return json({ id, status: data as string });
}
