import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getDestination } from "@/lib/explore/catalogue";
import { isSameOrigin, json } from "@/lib/community/http";
import { validateReviewInput } from "@/lib/community/validation";

export const runtime = "nodejs";

const BUCKET = "community-photos";

// Writes a review of one place. One person, one review per place: a second
// attempt is refused with a pointer to the existing review, which can be
// edited instead. As with posts, the browser is never trusted for who wrote it,
// what the status is, how big a photo is, or which place's prefecture applies.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "This request isn't allowed." }, 403);
  if (!isSupabaseConfigured) return json({ error: "Reviews aren't available right now." }, 503);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return json({ error: "Please sign in to write a review." }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Something went wrong. Please try again." }, 400);
  }
  const parsed = validateReviewInput(body);
  if (!parsed.ok) return json({ error: "Please check the highlighted fields.", fields: parsed.errors }, 422);
  const input = parsed.value;
  if (input.keepPaths.length) return json({ error: "Something went wrong. Please try again." }, 400);

  const place = getDestination(input.placeRef);
  if (!place) return json({ error: "Please check the highlighted fields.", fields: { placeRef: "That place could not be found." } }, 422);

  if (input.uploadPaths.some((p) => !p.startsWith(`${user.id}/`))) return json({ error: "Some photos could not be found. Please add them again." }, 400);
  let byPath = new Map<string, { path: string; thumb_path: string; width: number; height: number }>();
  if (input.uploadPaths.length) {
    const { data: uploads, error } = await supabase.from("community_uploads").select("path,thumb_path,width,height").in("path", input.uploadPaths).is("post_id", null).is("review_id", null);
    if (error || !uploads || uploads.length !== input.uploadPaths.length) return json({ error: "Some photos could not be found. Please add them again." }, 400);
    byPath = new Map(uploads.map((u) => [u.path as string, u as { path: string; thumb_path: string; width: number; height: number }]));
  }

  const { data: review, error: reviewError } = await supabase
    .from("community_reviews")
    .insert({ user_id: user.id, place_ref: input.placeRef, area_id: place.prefectureId, rating: input.rating, body: input.body, recommend: input.recommend, visit_date: input.visitDate })
    .select("id,status")
    .single();
  if (reviewError || !review) {
    if (reviewError?.code === "23505") {
      const mine = await supabase.from("community_reviews").select("id").eq("user_id", user.id).eq("place_ref", input.placeRef).maybeSingle();
      return json({ error: "You've already reviewed this place. You can edit your review.", id: mine.data?.id ?? null }, 409);
    }
    const limited = reviewError?.code === "P0001";
    return json({ error: limited ? reviewError!.message : "We couldn't save your review. Please try again." }, limited ? 429 : 500);
  }

  if (input.uploadPaths.length) {
    const rows = input.uploadPaths.map((path, position) => {
      const u = byPath.get(path)!;
      return { review_id: review.id, storage_path: u.path, thumb_path: u.thumb_path, width: u.width, height: u.height, position, alt: null };
    });
    const { error: imagesError } = await supabase.from("community_review_images").insert(rows);
    if (imagesError) {
      // A review whose photos failed is undone completely, photos included.
      await supabase.from("community_reviews").delete().eq("id", review.id);
      await supabase.storage.from(BUCKET).remove(input.uploadPaths.flatMap((p) => [p, byPath.get(p)!.thumb_path]));
      return json({ error: "We couldn't save your review. Please try again." }, 500);
    }
    await supabase.from("community_uploads").update({ review_id: review.id }).in("path", input.uploadPaths);
  }

  return json({ id: review.id, status: review.status }, 201);
}
