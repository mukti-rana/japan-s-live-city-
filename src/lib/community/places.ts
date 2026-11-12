import type { SupabaseClient } from "@supabase/supabase-js";
import { getDestination } from "@/lib/explore/catalogue";
import type { Destination } from "@/lib/explore/types";
import { isOsmRef, isPlaceRef, isPlaceCategory, type CommunityPlace } from "@/lib/community/placeTypes";

// Turning a place reference into a place, wherever it lives: Explore places are
// read from the catalogue that ships with the site, everything else from the
// community_places table (which only holds places read from OpenStreetMap).

export const PLACE_COLUMNS = "place_ref,display_name,name_en,name_ja,address,city,area_id,lat,lon,category";

interface PlaceRow {
  place_ref: string;
  display_name: string;
  name_en: string | null;
  name_ja: string | null;
  address: string | null;
  city: string | null;
  area_id: string;
  lat: number;
  lon: number;
  category: string;
}

export function catalogueToPlace(d: Destination): CommunityPlace {
  return {
    ref: d.id,
    name: d.names.en ?? d.names.ja ?? "Place",
    nameEn: d.names.en ?? null,
    nameJa: d.names.ja ?? null,
    address: null,
    city: d.city,
    areaId: d.prefectureId,
    lat: d.lat,
    lon: d.lon,
    // Everything in the Explore catalogue is a sight to visit.
    category: "attraction",
    source: "catalogue",
  };
}

export function rowToPlace(r: PlaceRow): CommunityPlace {
  return {
    ref: r.place_ref,
    // English first when the place has an English name (like the Explore catalogue); the Japanese name is kept alongside.
    name: r.name_en ?? r.display_name,
    nameEn: r.name_en,
    nameJa: r.name_ja,
    address: r.address,
    city: r.city,
    areaId: r.area_id,
    lat: r.lat,
    lon: r.lon,
    category: isPlaceCategory(r.category) ? r.category : "other",
    source: "osm",
  };
}

// One place, or null if the reference is not valid or the place is unknown.
export async function resolvePlace(client: SupabaseClient | null, ref: string | null | undefined): Promise<CommunityPlace | null> {
  if (!isPlaceRef(ref)) return null;
  if (!isOsmRef(ref)) {
    const d = getDestination(ref);
    return d ? catalogueToPlace(d) : null;
  }
  if (!client) return null;
  const { data } = await client.from("community_places").select(PLACE_COLUMNS).eq("place_ref", ref).maybeSingle();
  return data ? rowToPlace(data as PlaceRow) : null;
}

// Many places at once (one query for all the OpenStreetMap ones).
export async function resolvePlaces(client: SupabaseClient | null, refs: string[]): Promise<Map<string, CommunityPlace>> {
  const out = new Map<string, CommunityPlace>();
  const osm: string[] = [];
  for (const ref of new Set(refs)) {
    if (!isPlaceRef(ref)) continue;
    if (isOsmRef(ref)) osm.push(ref);
    else {
      const d = getDestination(ref);
      if (d) out.set(ref, catalogueToPlace(d));
    }
  }
  if (osm.length && client) {
    const { data } = await client.from("community_places").select(PLACE_COLUMNS).in("place_ref", osm);
    for (const r of (data ?? []) as PlaceRow[]) out.set(r.place_ref, rowToPlace(r));
  }
  return out;
}
