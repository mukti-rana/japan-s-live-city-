import { dbFailure, readJson, requireUser } from "@/lib/community/apiAuth";
import { json } from "@/lib/community/http";
import { lookupOsm } from "@/lib/community/osm";
import { resolvePlace, rowToPlace } from "@/lib/community/places";
import { isOsmRef, isPlaceRef } from "@/lib/community/placeTypes";

export const runtime = "nodejs";

// "Use this place": confirms a place a person picked and, for one that came from
// OpenStreetMap, saves it so reviews, photos and questions can be attached.
//
// The website never trusts the browser's description of a place: it takes only the
// reference (e.g. N4536691593), reads the place again from OpenStreetMap, and saves
// what OpenStreetMap says. A place that is already saved is reused, never duplicated.
export async function POST(request: Request) {
  const ctx = await requireUser(request, { unavailable: "Places aren't available right now.", signIn: "Please sign in to add a place." });
  if ("response" in ctx) return ctx.response;
  const raw = (await readJson(request)) as { ref?: unknown } | undefined;
  const ref = raw?.ref;
  if (!isPlaceRef(ref)) return json({ error: "That place could not be found." }, 422);

  // Explore places and places already saved need no new record.
  const existing = await resolvePlace(ctx.supabase, ref);
  if (existing) return json({ place: existing });
  if (!isOsmRef(ref)) return json({ error: "That place could not be found." }, 404);

  let found;
  try {
    found = await lookupOsm(ref);
  } catch {
    return json({ error: "Map search isn't available right now. Please try again in a moment." }, 503);
  }
  if (!found) return json({ error: "That place could not be found in Japan." }, 404);

  const { data, error } = await ctx.supabase.rpc("community_save_place", {
    p_ref: found.ref,
    p_display_name: found.name,
    p_name_en: found.nameEn,
    p_name_ja: found.nameJa,
    p_address: found.address,
    p_city: found.city,
    p_area_id: found.areaId,
    p_lat: found.lat,
    p_lon: found.lon,
    p_category: found.category,
    p_osm_class: found.osmClass,
  });
  if (error || !data) return dbFailure(error, "We couldn't save that place. Please try again.");
  return json({ place: rowToPlace(data as Parameters<typeof rowToPlace>[0]) });
}
