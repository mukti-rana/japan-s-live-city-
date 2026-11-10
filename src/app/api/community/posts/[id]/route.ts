import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isSameOrigin, json } from "@/lib/community/http";
import { UUID_RE } from "@/lib/community/validation";

export const runtime = "nodejs";

const BUCKET = "community-photos";

// Deletes one of your own posts together with its photos. (The database also
// refuses anyone else's post, so this is a second lock, not the only one.)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return json({ error: "This request isn't allowed." }, 403);
  if (!isSupabaseConfigured) return json({ error: "That isn't available right now." }, 503);

  const { id } = await params;
  if (!UUID_RE.test(id)) return json({ error: "That post could not be found." }, 404);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return json({ error: "Please sign in." }, 401);

  const { data: post } = await supabase.from("community_posts").select("id,user_id,community_post_images(storage_path,thumb_path)").eq("id", id).maybeSingle();
  if (!post || post.user_id !== auth.user.id) return json({ error: "That post could not be found." }, 404);

  const files = (post.community_post_images ?? []).flatMap((i: { storage_path: string; thumb_path: string | null }) => [i.storage_path, i.thumb_path].filter(Boolean) as string[]);
  const { error } = await supabase.from("community_posts").delete().eq("id", id);
  if (error) return json({ error: "We couldn't delete that post. Please try again." }, 500);
  if (files.length) await supabase.storage.from(BUCKET).remove(files);
  return json({ ok: true });
}
