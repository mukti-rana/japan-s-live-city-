import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getDestination } from "@/lib/explore/catalogue";
import { isSameOrigin, json } from "@/lib/community/http";
import { validatePostInput } from "@/lib/community/validation";

export const runtime = "nodejs";

const BUCKET = "community-photos";

// Creates a post from photos already uploaded through /api/community/upload.
// Everything is checked again here; the browser is never trusted for who the
// author is, what the status is, how big a photo is, or which files are theirs.
// The database then applies its own rules (status, counters, hourly limit).
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "This request isn't allowed." }, 403);
  if (!isSupabaseConfigured) return json({ error: "Sharing isn't available right now." }, 503);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return json({ error: "Please sign in to share your experience." }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Something went wrong. Please try again." }, 400);
  }
  const parsed = validatePostInput(body);
  if (!parsed.ok) return json({ error: "Please check the highlighted fields.", fields: parsed.errors }, 422);
  const input = parsed.value;

  // Photos must be this person's own, accepted by the upload step, and not yet used.
  if (input.uploadPaths.some((p) => !p.startsWith(`${user.id}/`))) return json({ error: "Some photos could not be found. Please add them again." }, 400);

  // Pressing "Share" twice (or a retry after a bad connection) returns the same post.
  const existing = await supabase.from("community_posts").select("id,status").eq("user_id", user.id).eq("client_key", input.clientKey).maybeSingle();
  if (existing.data) return json({ id: existing.data.id, status: existing.data.status }, 200);

  const { data: uploads, error: uploadsError } = await supabase
    .from("community_uploads")
    .select("path,thumb_path,width,height")
    .in("path", input.uploadPaths)
    .is("post_id", null);
  if (uploadsError || !uploads || uploads.length !== input.uploadPaths.length) return json({ error: "Some photos could not be found. Please add them again." }, 400);
  const byPath = new Map(uploads.map((u) => [u.path as string, u]));

  // The same words posted again within a day are a repeat, not a new experience.
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const repeat = await supabase.from("community_posts").select("id").eq("user_id", user.id).eq("title", input.title).eq("caption", input.caption).gte("created_at", since).limit(1);
  if (repeat.data?.length) return json({ error: "You've already shared this. Please write something new." }, 409);

  // A place from Explore decides the area, so a post can never be filed under the wrong prefecture.
  let areaId = input.areaId;
  let placeLabel = input.placeLabel;
  if (input.placeRef) {
    const place = getDestination(input.placeRef);
    if (!place) return json({ error: "Please check the highlighted fields.", fields: { placeRef: "That place could not be found. Pick one from the list or type its name." } }, 422);
    areaId = place.prefectureId;
    placeLabel = placeLabel ?? place.names.en ?? place.names.ja ?? null;
  }

  const { data: post, error: postError } = await supabase
    .from("community_posts")
    .insert({
      user_id: user.id,
      title: input.title,
      caption: input.caption,
      area_id: areaId,
      city_label: input.cityLabel,
      place_ref: input.placeRef,
      place_label: placeLabel,
      category_slug: input.categorySlug,
      visit_date: input.visitDate,
      client_key: input.clientKey,
    })
    .select("id,status")
    .single();
  if (postError || !post) {
    if (postError?.code === "23505") {
      const again = await supabase.from("community_posts").select("id,status").eq("user_id", user.id).eq("client_key", input.clientKey).maybeSingle();
      if (again.data) return json({ id: again.data.id, status: again.data.status }, 200);
    }
    const limited = postError?.code === "P0001";
    return json({ error: limited ? postError!.message : "We couldn't share your post. Please try again." }, limited ? 429 : 500);
  }

  const rows = input.uploadPaths.map((path, position) => {
    const u = byPath.get(path)!;
    return { post_id: post.id, storage_path: u.path, thumb_path: u.thumb_path, width: u.width, height: u.height, position, alt: null };
  });
  const { error: imagesError } = await supabase.from("community_post_images").insert(rows);
  if (imagesError) {
    // Don't leave a post without its photos: undo it, and the photos with it.
    await supabase.from("community_posts").delete().eq("id", post.id);
    await supabase.storage.from(BUCKET).remove(input.uploadPaths.flatMap((p) => [p, byPath.get(p)!.thumb_path as string]));
    return json({ error: imagesError.code === "P0001" ? imagesError.message : "We couldn't share your post. Please try again." }, 500);
  }

  await supabase.from("community_uploads").update({ post_id: post.id }).in("path", input.uploadPaths);
  return json({ id: post.id, status: post.status }, 201);
}
