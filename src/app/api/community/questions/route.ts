import { getDestination } from "@/lib/explore/catalogue";
import { dbFailure, readJson, requireUser } from "@/lib/community/apiAuth";
import { json } from "@/lib/community/http";
import { validateQuestionFields } from "@/lib/community/validation";

export const runtime = "nodejs";

// Ask a question about a place — or, with no place, ask a local about an area.
export async function POST(request: Request) {
  const ctx = await requireUser(request, { unavailable: "Questions aren't available right now.", signIn: "Please sign in to ask a question." });
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const body = await readJson(request);
  if (body === undefined) return json({ error: "Something went wrong. Please try again." }, 400);
  const parsed = validateQuestionFields(body as Record<string, unknown>);
  if (!parsed.ok) return json({ error: "Please check the highlighted fields.", fields: parsed.errors }, 422);
  const q = parsed.value;

  // A question about a place is filed under that place's own prefecture.
  let areaId = q.areaId;
  if (q.placeRef) {
    const place = getDestination(q.placeRef);
    if (!place) return json({ error: "Please check the highlighted fields.", fields: { placeRef: "That place could not be found. Pick one from the list or type its name." } }, 422);
    areaId = place.prefectureId;
  }

  const { data, error } = await supabase.from("community_questions").insert({ user_id: user.id, area_id: areaId, place_ref: q.placeRef, title: q.title, body: q.body }).select("id").single();
  if (error || !data) return dbFailure(error, "We couldn't post your question. Please try again.");
  return json({ id: data.id }, 201);
}
