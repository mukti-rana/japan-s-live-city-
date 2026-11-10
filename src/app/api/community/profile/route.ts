import { dbFailure, readJson, requireUser } from "@/lib/community/apiAuth";
import { json } from "@/lib/community/http";
import { validateProfileInput } from "@/lib/community/validation";

export const runtime = "nodejs";

// Update your own community profile: username, display name, bio and what you
// share publicly. The database enforces the rest (reserved names, one username
// change per 30 days, profile picture rules); who you are comes from your session.
export async function PUT(request: Request) {
  const ctx = await requireUser(request, { unavailable: "Profiles aren't available right now.", signIn: "Please sign in." });
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const raw = await readJson(request);
  if (raw === undefined) return json({ error: "Something went wrong. Please try again." }, 400);

  const { data: current } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
  if (!current) return json({ error: "We couldn't find your profile. Please try again." }, 404);

  const parsed = validateProfileInput(raw, current.username as string);
  if (!parsed.ok) return json({ error: "Please check the highlighted fields.", fields: parsed.errors }, 422);
  const p = parsed.value;

  const { error } = await supabase.from("profiles").update({ username: p.username, display_name: p.displayName, bio: p.bio, show_stats: p.showStats, show_visited: p.showVisited }).eq("id", user.id);
  if (error) {
    if (error.code === "23505") return json({ error: "Please check the highlighted fields.", fields: { username: "That username is taken." } }, 409);
    if (error.code === "P0001" && /username/i.test(error.message)) return json({ error: error.message, fields: { username: error.message } }, 409);
    return dbFailure(error, "We couldn't save your profile. Please try again.");
  }
  return json({ username: p.username });
}
