import { resolvePlace } from "@/lib/community/places";
import { dbFailure, readJson, requireUser } from "@/lib/community/apiAuth";
import { json } from "@/lib/community/http";
import { validateQuestionInput } from "@/lib/community/validation";

export const runtime = "nodejs";

const BUCKET = "community-photos";

// Ask the community. A question has a title and, optionally, details, up to four
// photos (already uploaded through /api/community/upload), a topic, a place and
// an area. With neither a place nor an area it is a question about Japan in
// general. Everything is checked again here; the browser is never trusted for who
// the author is, which files are theirs, or how big they are.
export async function POST(request: Request) {
  const ctx = await requireUser(request, { unavailable: "Questions aren't available right now.", signIn: "Please sign in to ask a question." });
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const body = await readJson(request);
  if (body === undefined) return json({ error: "Something went wrong. Please try again." }, 400);
  const parsed = validateQuestionInput(body);
  if (!parsed.ok) return json({ error: "Please check the highlighted fields.", fields: parsed.errors }, 422);
  const q = parsed.value;

  // Photos must be this person's own, accepted by the upload step, and not yet used.
  if (q.uploadPaths.some((p) => !p.startsWith(`${user.id}/`))) return json({ error: "Some photos could not be found. Please add them again." }, 400);
  let uploads: { path: string; thumb_path: string; width: number; height: number }[] = [];
  if (q.uploadPaths.length > 0) {
    const { data, error } = await supabase.from("community_uploads").select("path,thumb_path,width,height").in("path", q.uploadPaths).is("post_id", null).is("question_id", null);
    if (error || !data || data.length !== q.uploadPaths.length) return json({ error: "Some photos could not be found. Please add them again." }, 400);
    uploads = data as typeof uploads;
  }
  const byPath = new Map(uploads.map((u) => [u.path, u]));

  // A question about a place is filed under that place's own prefecture.
  let areaId = q.areaId;
  let placeName: string | null = null;
  let placeCategory: string | null = null;
  if (q.placeRef) {
    const place = await resolvePlace(supabase, q.placeRef);
    if (!place) return json({ error: "Please check the highlighted fields.", fields: { placeRef: "That place could not be found. Pick one from the list or type its name." } }, 422);
    areaId = place.areaId;
    placeName = place.name;
    placeCategory = place.category;
  }

  const { data, error } = await supabase
    .from("community_questions")
    .insert({ user_id: user.id, area_id: areaId, place_ref: q.placeRef, place_name: placeName, place_category: placeCategory, category_slug: q.categorySlug, title: q.title, body: q.body })
    .select("id")
    .single();
  if (error || !data) return dbFailure(error, "We couldn't post your question. Please try again.");

  if (q.uploadPaths.length > 0) {
    const rows = q.uploadPaths.map((path, position) => {
      const u = byPath.get(path)!;
      return { question_id: data.id, storage_path: u.path, thumb_path: u.thumb_path, width: u.width, height: u.height, position, alt: null };
    });
    const { error: imagesError } = await supabase.from("community_question_images").insert(rows);
    if (imagesError) {
      // Don't leave a question without the photos it was meant to have: undo it, and the photos with it.
      await supabase.from("community_questions").delete().eq("id", data.id);
      await supabase.storage.from(BUCKET).remove(q.uploadPaths.flatMap((p) => [p, byPath.get(p)!.thumb_path]));
      return json({ error: imagesError.code === "P0001" ? imagesError.message : "We couldn't post your question. Please try again." }, 500);
    }
    await supabase.from("community_uploads").update({ question_id: data.id }).in("path", q.uploadPaths);
  }
  return json({ id: data.id }, 201);
}
