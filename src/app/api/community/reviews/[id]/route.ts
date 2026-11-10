import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isSameOrigin, json } from "@/lib/community/http";
import { UUID_RE, validateReviewInput } from "@/lib/community/validation";

export const runtime = "nodejs";

const BUCKET = "community-photos";

interface Img {
  storage_path: string;
  thumb_path: string | null;
  width: number | null;
  height: number | null;
}

async function load(id: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { supabase, error: json({ error: "Please sign in." }, 401) } as const;
  const { data: review } = await supabase
    .from("community_reviews")
    .select("id,user_id,place_ref,community_review_images(storage_path,thumb_path,width,height,position)")
    .eq("id", id)
    .maybeSingle();
  // Someone else's review looks exactly like a review that does not exist.
  if (!review || review.user_id !== auth.user.id) return { supabase, error: json({ error: "That review could not be found." }, 404) } as const;
  const images = ((review.community_review_images ?? []) as (Img & { position: number })[]).slice().sort((a, b) => a.position - b.position);
  return { supabase, user: auth.user, review, images } as const;
}

// Edit your own review: stars, words, recommendation, visit date and photos.
// The place never changes (write a new review for another place).
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return json({ error: "This request isn't allowed." }, 403);
  if (!isSupabaseConfigured) return json({ error: "Reviews aren't available right now." }, 503);
  const { id } = await params;
  if (!UUID_RE.test(id)) return json({ error: "That review could not be found." }, 404);

  const ctx = await load(id);
  if ("error" in ctx) return ctx.error;
  const { supabase, user, review, images } = ctx;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Something went wrong. Please try again." }, 400);
  }
  const parsed = validateReviewInput({ ...(body as object), placeRef: review.place_ref });
  if (!parsed.ok) return json({ error: "Please check the highlighted fields.", fields: parsed.errors }, 422);
  const input = parsed.value;

  const existing = new Map(images.map((i) => [i.storage_path, i]));
  if (input.keepPaths.some((p) => !existing.has(p))) return json({ error: "Some photos could not be found. Please add them again." }, 400);
  if (input.uploadPaths.some((p) => !p.startsWith(`${user.id}/`))) return json({ error: "Some photos could not be found. Please add them again." }, 400);

  const fresh = new Map<string, { path: string; thumb_path: string; width: number; height: number }>();
  if (input.uploadPaths.length) {
    const { data: uploads, error } = await supabase.from("community_uploads").select("path,thumb_path,width,height").in("path", input.uploadPaths).is("post_id", null).is("review_id", null);
    if (error || !uploads || uploads.length !== input.uploadPaths.length) return json({ error: "Some photos could not be found. Please add them again." }, 400);
    for (const u of uploads) fresh.set(u.path as string, u as { path: string; thumb_path: string; width: number; height: number });
  }

  const { error: updateError } = await supabase.from("community_reviews").update({ rating: input.rating, body: input.body, recommend: input.recommend, visit_date: input.visitDate }).eq("id", id);
  if (updateError) {
    const limited = updateError.code === "P0001";
    return json({ error: limited ? updateError.message : "We couldn't save your changes. Please try again." }, limited ? 429 : 500);
  }

  // Photos: kept ones first (in their old order), then the new ones.
  const order: Img[] = [
    ...input.keepPaths.map((p) => existing.get(p)!),
    ...input.uploadPaths.map((p) => ({ storage_path: p, thumb_path: fresh.get(p)!.thumb_path, width: fresh.get(p)!.width, height: fresh.get(p)!.height })),
  ];
  const removed = images.filter((i) => !input.keepPaths.includes(i.storage_path));
  if (removed.length || input.uploadPaths.length || order.length !== images.length) {
    await supabase.from("community_review_images").delete().eq("review_id", id);
    if (order.length) {
      const { error: imagesError } = await supabase.from("community_review_images").insert(order.map((i, position) => ({ review_id: id, storage_path: i.storage_path, thumb_path: i.thumb_path, width: i.width, height: i.height, position, alt: null })));
      if (imagesError) return json({ error: "We couldn't save your photos. Please try again." }, 500);
    }
    if (removed.length) await supabase.storage.from(BUCKET).remove(removed.flatMap((i) => [i.storage_path, i.thumb_path].filter(Boolean) as string[]));
    if (input.uploadPaths.length) await supabase.from("community_uploads").update({ review_id: id }).in("path", input.uploadPaths);
  }
  return json({ id });
}

// Delete your own review (and its photos).
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return json({ error: "This request isn't allowed." }, 403);
  if (!isSupabaseConfigured) return json({ error: "That isn't available right now." }, 503);
  const { id } = await params;
  if (!UUID_RE.test(id)) return json({ error: "That review could not be found." }, 404);

  const ctx = await load(id);
  if ("error" in ctx) return ctx.error;
  const { supabase, images } = ctx;

  const { error } = await supabase.from("community_reviews").delete().eq("id", id);
  if (error) return json({ error: "We couldn't delete that review. Please try again." }, 500);
  const files = images.flatMap((i) => [i.storage_path, i.thumb_path].filter(Boolean) as string[]);
  if (files.length) await supabase.storage.from(BUCKET).remove(files);
  return json({ ok: true });
}
