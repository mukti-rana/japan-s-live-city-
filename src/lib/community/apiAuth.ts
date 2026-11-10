import type { PostgrestError, SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isSameOrigin, json } from "@/lib/community/http";
import { UUID_RE } from "@/lib/community/validation";

// The checks every Community write goes through, in one place:
//   1. the request must come from this website (not another site);
//   2. the feature must be set up;
//   3. the person must be signed in — who they are is read from their session,
//      never from anything the browser sends.
export async function requireUser(request: Request, messages: { unavailable: string; signIn: string }): Promise<{ supabase: SupabaseClient; user: User } | { response: Response }> {
  if (!isSameOrigin(request)) return { response: json({ error: "This request isn't allowed." }, 403) };
  if (!isSupabaseConfigured) return { response: json({ error: messages.unavailable }, 503) };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { response: json({ error: messages.signIn }, 401) };
  return { supabase, user: data.user };
}

export async function readJson(request: Request): Promise<unknown | undefined> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export function validId(id: string): boolean {
  return UUID_RE.test(id);
}

// A rule the database refused (too fast, repeat, thread not available...) carries a
// plain-language message of its own; anything else becomes the fallback.
export function dbFailure(error: PostgrestError | null, fallback: string): Response {
  if (error?.code === "P0001") return json({ error: error.message }, /quickly/i.test(error.message) ? 429 : 409);
  return json({ error: fallback }, 500);
}
