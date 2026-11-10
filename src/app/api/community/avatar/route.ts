import { requireUser, dbFailure } from "@/lib/community/apiAuth";
import { json } from "@/lib/community/http";
import { processAvatar } from "@/lib/community/imagePipeline";
import { LIMITS } from "@/lib/community/validation";

export const runtime = "nodejs";

const BUCKET = "community-photos";
const MARKER = `/storage/v1/object/public/${BUCKET}/`;

const REASONS = {
  unsupported: "That file type isn't supported. Please use a JPEG, PNG or WebP photo.",
  tooSmall: "That photo is too small. Please use one at least 200 pixels wide.",
  tooLarge: "That photo is too large. Please use a smaller one.",
  unreadable: "We couldn't read that photo. Please try a different one.",
} as const;

// The storage path of an avatar this person uploaded earlier (so it can be
// removed once it is replaced). Anything else is left alone.
function ownAvatarPath(url: string | null | undefined, userId: string): string | null {
  if (!url) return null;
  const i = url.indexOf(MARKER);
  if (i < 0) return null;
  const path = decodeURIComponent(url.slice(i + MARKER.length));
  return path.startsWith(`${userId}/avatar_`) ? path : null;
}

// Set your profile picture: checked, cropped to a square, re-saved as a small
// WebP with no camera details, kept in your own folder.
export async function POST(request: Request) {
  const ctx = await requireUser(request, { unavailable: "Profile pictures aren't available right now.", signIn: "Please sign in." });
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  if (Number(request.headers.get("content-length") ?? 0) > LIMITS.maxUploadBytes + 100_000) return json({ error: REASONS.tooLarge }, 413);
  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return json({ error: REASONS.unreadable }, 400);
  }
  if (!(file instanceof File) || file.size === 0) return json({ error: REASONS.unreadable }, 400);
  if (file.size > LIMITS.maxUploadBytes) return json({ error: REASONS.tooLarge }, 413);

  const result = await processAvatar(Buffer.from(await file.arrayBuffer()));
  if (!result.ok) return json({ error: REASONS[result.reason] }, 400);

  const { data: before } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
  const path = `${user.id}/avatar_${crypto.randomUUID()}.webp`;
  const up = await supabase.storage.from(BUCKET).upload(path, result.image, { contentType: "image/webp", upsert: false, cacheControl: "31536000" });
  if (up.error) return json({ error: "We couldn't save that photo. Please try again." }, 500);

  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    return dbFailure(error, "We couldn't save that photo. Please try again.");
  }
  const old = ownAvatarPath(before?.avatar_url as string | null, user.id);
  if (old) await supabase.storage.from(BUCKET).remove([old]);
  return json({ avatarUrl: url });
}

// Remove your profile picture.
export async function DELETE(request: Request) {
  const ctx = await requireUser(request, { unavailable: "That isn't available right now.", signIn: "Please sign in." });
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;
  const { data: before } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  if (error) return dbFailure(error, "We couldn't remove your picture. Please try again.");
  const old = ownAvatarPath(before?.avatar_url as string | null, user.id);
  if (old) await supabase.storage.from(BUCKET).remove([old]);
  return json({ ok: true });
}
