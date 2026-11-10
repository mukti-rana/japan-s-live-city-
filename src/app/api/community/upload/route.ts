import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { processPhoto } from "@/lib/community/imagePipeline";
import { isSameOrigin, json } from "@/lib/community/http";
import { LIMITS } from "@/lib/community/validation";

export const runtime = "nodejs";

const BUCKET = "community-photos";

const REASONS = {
  unsupported: "That file type isn't supported. Please use a JPEG, PNG or WebP photo.",
  tooSmall: "That photo is too small. Please use one at least 200 pixels wide.",
  tooLarge: "That photo is too large. Please use a smaller one.",
  unreadable: "We couldn't read that photo. Please try a different one.",
} as const;

// Accepts ONE photo from a signed-in person, re-encodes it (removing camera
// metadata such as GPS), stores a full-size and a thumbnail copy in the
// person's own folder, and logs it. The file never reaches a post until the
// post is created with the paths returned here.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "This request isn't allowed." }, 403);
  if (!isSupabaseConfigured) return json({ error: "Photo sharing isn't available right now." }, 503);

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > LIMITS.maxUploadBytes + 100_000) return json({ error: "That photo is too large. Please use a smaller one." }, 413);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return json({ error: "Please sign in to share photos." }, 401);

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return json({ error: REASONS.unreadable }, 400);
  }
  if (!(file instanceof File) || file.size === 0) return json({ error: REASONS.unreadable }, 400);
  if (file.size > LIMITS.maxUploadBytes) return json({ error: REASONS.tooLarge }, 413);

  const result = await processPhoto(Buffer.from(await file.arrayBuffer()));
  if (!result.ok) return json({ error: REASONS[result.reason] }, 400);

  const id = crypto.randomUUID();
  const path = `${user.id}/${id}.webp`;
  const thumbPath = `${user.id}/${id}_t.webp`;

  // Log first: the database enforces the hourly limit here, before anything is stored.
  const { error: logError } = await supabase.from("community_uploads").insert({ user_id: user.id, path, thumb_path: thumbPath, width: result.width, height: result.height });
  if (logError) {
    const limited = logError.code === "P0001";
    return json({ error: limited ? logError.message : "We couldn't save that photo. Please try again." }, limited ? 429 : 500);
  }

  const options = { contentType: "image/webp", upsert: false, cacheControl: "31536000" };
  const full = await supabase.storage.from(BUCKET).upload(path, result.full, options);
  const thumb = full.error ? null : await supabase.storage.from(BUCKET).upload(thumbPath, result.thumb, options);
  if (full.error || thumb?.error) {
    // Undo whatever was stored so no half-finished photo is left behind.
    await supabase.storage.from(BUCKET).remove([path, thumbPath]);
    await supabase.from("community_uploads").delete().eq("path", path);
    return json({ error: "We couldn't save that photo. Please try again." }, 500);
  }

  return json({ path, thumbPath, width: result.width, height: result.height }, 201);
}
