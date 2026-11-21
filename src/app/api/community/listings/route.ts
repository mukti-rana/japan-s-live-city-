import { json } from "@/lib/community/http";
import { fetchListingsFor } from "@/lib/community/listings/queries";
import { listingFiltersFromParams } from "@/lib/community/listings/filters";
import { fail, requireUser, writeMedia } from "@/lib/community/listings/server";
import { parseListingInput } from "@/lib/community/listings/validation";

export const runtime = "nodejs";

// Public: a page of published listings for the pages' own sideways rows, the map and "load more". The same filters as the address bar.
export async function GET(request: Request) {
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const filters = listingFiltersFromParams(sp);
  const size = Math.min(50, Math.max(1, Number(sp.size) || 12));
  const kinds = sp.kinds ? sp.kinds.split(",").filter((k): k is "event" => ["event", "announcement", "promotion", "activity"].includes(k)) : filters.kinds;
  const res = await fetchListingsFor({ ...filters, kinds, pageSize: size, mapOnly: sp.map === "1" });
  if (res.state === "unavailable") return json({ error: "unavailable", reason: res.reason }, 503);
  return json({ items: res.items, hasMore: res.hasMore }, 200, { "Cache-Control": "public, max-age=30, s-maxage=30" });
}

// Creates a new listing as a private draft. Publishing is a separate step (/[id]/submit), so a draft can be saved at any point.
export async function POST(request: Request) {
  const gate = await requireUser(request);
  if (!gate.ok) return gate.response;
  const { supabase, user } = gate;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Something went wrong. Please try again." }, 400);
  }
  const parsed = parseListingInput(body, "draft");
  if (!parsed.ok) return json({ error: "Please check the highlighted fields.", fields: parsed.errors }, 422);

  // Pressing "Save" twice (or a retry after a bad connection) returns the same draft.
  const clientKey = typeof (body as { clientKey?: unknown }).clientKey === "string" ? (body as { clientKey: string }).clientKey.slice(0, 64) : null;
  if (clientKey) {
    const existing = await supabase.from("community_listings").select("id,status").eq("user_id", user.id).eq("client_key", clientKey).maybeSingle();
    if (existing.data) return json({ id: existing.data.id, status: existing.data.status });
  }

  const { data, error } = await supabase.from("community_listings").insert({ ...parsed.value.row, user_id: user.id, client_key: clientKey }).select("id,status").single();
  if (error || !data) return fail("create listing", error ?? {});
  const mediaProblem = await writeMedia(supabase, data.id as string, user.id, parsed.value);
  if (mediaProblem) return mediaProblem;
  return json({ id: data.id, status: data.status }, 201);
}
