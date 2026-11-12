import type { SupabaseClient } from "@supabase/supabase-js";
import { isAreaId } from "@/lib/community/areas";
import { resolvePlaces } from "@/lib/community/places";
import { isPlaceCategory, type CommunityPlace, type PlaceCategory } from "@/lib/community/placeTypes";

// Which places have real community content, and how much. Counts come from
// published reviews, photo posts and questions only; a place nobody has written
// about is not listed, and nothing is padded or invented.

export interface PlaceSummary {
  place: CommunityPlace;
  reviews: number;
  posts: number;
  questions: number;
  // Average of the published star ratings, or null when there are no reviews.
  average: number | null;
}

export interface PlacesFilters {
  area?: string;
  type?: PlaceCategory;
  view: "list" | "map";
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function placesFiltersFromParams(sp: Record<string, string | string[] | undefined>): PlacesFilters {
  const area = first(sp.area);
  const type = first(sp.type);
  return { area: isAreaId(area) ? area : undefined, type: isPlaceCategory(type) ? type : undefined, view: first(sp.view) === "map" ? "map" : "list" };
}

export const PLACES_SHOWN = 120;
const PER_TABLE = 1000;

export async function fetchPlaceSummaries(client: SupabaseClient, f: PlacesFilters): Promise<PlaceSummary[] | null> {
  let rq = client.from("community_reviews").select("place_ref,rating").eq("status", "published");
  let pq = client.from("community_posts").select("place_ref").eq("status", "published").not("place_ref", "is", null);
  let qq = client.from("community_questions").select("place_ref").eq("status", "published").not("place_ref", "is", null);
  if (f.area) {
    rq = rq.eq("area_id", f.area);
    pq = pq.eq("area_id", f.area);
    qq = qq.eq("area_id", f.area);
  }
  if (f.type) {
    rq = rq.eq("place_category", f.type);
    pq = pq.eq("place_category", f.type);
    qq = qq.eq("place_category", f.type);
  }
  const [reviews, posts, questions] = await Promise.all([
    rq.order("published_at", { ascending: false }).limit(PER_TABLE),
    pq.order("published_at", { ascending: false }).limit(PER_TABLE),
    qq.order("published_at", { ascending: false }).limit(PER_TABLE),
  ]);
  if (reviews.error && posts.error && questions.error) {
    console.error(`[community] places: code=${reviews.error.code ?? "none"} message=${(reviews.error.message ?? "").replace(/\s+/g, " ").slice(0, 200)}`);
    return null;
  }

  const by = new Map<string, { reviews: number; posts: number; questions: number; sum: number }>();
  const get = (ref: string) => by.get(ref) ?? by.set(ref, { reviews: 0, posts: 0, questions: 0, sum: 0 }).get(ref)!;
  for (const r of (reviews.data ?? []) as { place_ref: string; rating: number }[]) {
    const e = get(r.place_ref);
    e.reviews += 1;
    e.sum += r.rating;
  }
  for (const r of (posts.data ?? []) as { place_ref: string }[]) get(r.place_ref).posts += 1;
  for (const r of (questions.data ?? []) as { place_ref: string }[]) get(r.place_ref).questions += 1;

  const places = await resolvePlaces(client, [...by.keys()]);
  const out: PlaceSummary[] = [];
  for (const [ref, e] of by) {
    const place = places.get(ref);
    if (!place) continue;
    out.push({ place, reviews: e.reviews, posts: e.posts, questions: e.questions, average: e.reviews ? e.sum / e.reviews : null });
  }
  return out
    .sort((a, b) => b.reviews + b.posts + b.questions - (a.reviews + a.posts + a.questions) || (b.average ?? 0) - (a.average ?? 0) || a.place.name.localeCompare(b.place.name))
    .slice(0, PLACES_SHOWN);
}
