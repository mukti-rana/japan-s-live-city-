import { createClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import { classifyError } from "@/lib/community/queries";
import { json } from "@/lib/community/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The community tables the pages read. Each is checked the same way a visitor's
// request would be (public key, no sign-in), so "ok" means a visitor can read it.
const TABLES = [
  "profiles",
  "community_categories",
  "community_posts",
  "community_post_images",
  "community_reviews",
  "community_questions",
  "community_answers",
  "community_comments",
] as const;

type Check = "ok" | "missing" | "error";

// A health check for the Community, to answer "why is it not loading?" in one
// request. It reports only whether each of OUR tables and the photo bucket can be
// reached — never keys, addresses, row contents or error text.
export async function GET() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return json({ configured: false, ok: false, summary: "Supabase is not configured in this environment." });
  }
  const client = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const tables: Record<string, Check> = {};
  await Promise.all(
    TABLES.map(async (t) => {
      try {
        const { error } = await client.from(t).select("*", { count: "exact", head: true }).limit(1);
        tables[t] = !error ? "ok" : classifyError(error) === "not_set_up" ? "missing" : "error";
      } catch {
        tables[t] = "error";
      }
    }),
  );

  // The bucket: asking for a file that does not exist answers differently
  // when the bucket itself is missing.
  let bucket: Check = "error";
  try {
    const res = await fetch(`${supabaseUrl}/storage/v1/object/public/community-photos/_health-check`, { cache: "no-store", signal: AbortSignal.timeout(6000) });
    const body = (await res.text()).toLowerCase();
    bucket = body.includes("bucket not found") ? "missing" : res.status === 404 || res.status === 400 || res.ok ? "ok" : "error";
  } catch {
    bucket = "error";
  }

  const values = [...Object.values(tables), bucket];
  const ok = values.every((v) => v === "ok");
  const anyMissing = values.includes("missing");
  const summary = ok
    ? "Everything the community needs is reachable."
    : anyMissing
      ? "Some community tables or the photo bucket are missing: run the community migrations (0003 to 0007) in the Supabase SQL editor."
      : "The database could not be reached or refused the request.";
  return json({ configured: true, ok, summary, tables, bucket });
}
