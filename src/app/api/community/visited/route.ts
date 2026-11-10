import { getDestination } from "@/lib/explore/catalogue";
import { dbFailure, readJson, requireUser } from "@/lib/community/apiAuth";
import { json } from "@/lib/community/http";

export const runtime = "nodejs";

const placeOf = (raw: unknown): string | null => {
  const ref = typeof (raw as { placeRef?: unknown } | undefined)?.placeRef === "string" ? ((raw as { placeRef: string }).placeRef).trim() : "";
  return /^Q[0-9]{1,12}$/.test(ref) ? ref : null;
};

// "Been here": you mark a place yourself. Nothing is ever marked from your
// position, and your list is private unless you choose to share it.
export async function PUT(request: Request) {
  const ctx = await requireUser(request, { unavailable: "That isn't available right now.", signIn: "Please sign in to mark places you've been to." });
  if ("response" in ctx) return ctx.response;
  const ref = placeOf(await readJson(request));
  const place = ref ? getDestination(ref) : null;
  if (!ref || !place) return json({ error: "That place could not be found." }, 422);
  const { error } = await ctx.supabase.from("community_visited").upsert({ user_id: ctx.user.id, place_ref: ref, area_id: place.prefectureId }, { onConflict: "user_id,place_ref", ignoreDuplicates: true });
  if (error) return dbFailure(error, "That didn't work. Please try again.");
  return json({ placeRef: ref, visited: true });
}

export async function DELETE(request: Request) {
  const ctx = await requireUser(request, { unavailable: "That isn't available right now.", signIn: "Please sign in." });
  if ("response" in ctx) return ctx.response;
  const ref = placeOf(await readJson(request));
  if (!ref) return json({ error: "That place could not be found." }, 422);
  const { error } = await ctx.supabase.from("community_visited").delete().eq("user_id", ctx.user.id).eq("place_ref", ref);
  if (error) return dbFailure(error, "That didn't work. Please try again.");
  return json({ placeRef: ref, visited: false });
}
