import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommunityReview, ReviewStats } from "@/lib/community/types";

// Reading reviews. Every function takes the Supabase client to use: the public
// one (no cookies, cacheable) for pages anyone sees, or the visitor's own
// session where the page also needs to show *their* review. Row Level Security
// in the database decides what each can see; nothing here filters for safety.

export type ReviewSort = "newest" | "highest" | "lowest" | "helpful";
export const REVIEW_SORTS: ReviewSort[] = ["newest", "highest", "lowest", "helpful"];
export const REVIEWS_PER_PAGE = 10;

export interface ReviewFilters {
  sort: ReviewSort;
  photosOnly: boolean;
  page: number;
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// A place page keeps its reviews' options under rsort/rpage (the place page has
// its own other options); the Community reviews page uses plain sort/page.
export function reviewFiltersFromParams(sp: Record<string, string | string[] | undefined>, keys = { sort: "rsort", page: "rpage" }): ReviewFilters {
  const sort = first(sp[keys.sort]);
  const page = Number.parseInt(first(sp[keys.page]) ?? "1", 10);
  return {
    sort: REVIEW_SORTS.includes(sort as ReviewSort) ? (sort as ReviewSort) : "newest",
    photosOnly: first(sp.photos) === "1",
    page: Number.isFinite(page) && page >= 1 && page <= 200 ? page : 1,
  };
}

const PHOTOS = "community_review_images(storage_path,thumb_path,width,height,position)";
const COLUMNS = "id,user_id,place_ref,rating,body,recommend,visit_date,helpful_count,status,published_at,created_at,profiles(username,avatar_url)";

interface Row {
  id: string;
  user_id: string;
  place_ref: string;
  rating: number;
  body: string;
  recommend: boolean;
  visit_date: string | null;
  helpful_count: number;
  status: string;
  published_at: string | null;
  created_at: string;
  profiles: { username: string; avatar_url: string | null } | { username: string; avatar_url: string | null }[] | null;
  community_review_images: { storage_path: string; thumb_path: string | null; width: number | null; height: number | null; position: number }[] | null;
}

function toReview(r: Row, viewerId: string | null): CommunityReview {
  const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
  return {
    id: r.id,
    placeRef: r.place_ref,
    rating: r.rating,
    body: r.body,
    recommend: r.recommend,
    visitDate: r.visit_date,
    helpfulCount: r.helpful_count,
    publishedAt: r.published_at ?? r.created_at,
    status: r.status,
    author: { username: profile?.username ?? "traveler", avatarUrl: profile?.avatar_url ?? null },
    photos: (r.community_review_images ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((i) => ({ path: i.storage_path, thumbPath: i.thumb_path, width: i.width, height: i.height })),
    isMine: viewerId !== null && r.user_id === viewerId,
  };
}

export async function fetchReviewStats(client: SupabaseClient, placeRef: string): Promise<ReviewStats | null> {
  const { data, error } = await client.rpc("community_review_stats", { p_place_ref: placeRef });
  if (error || !Array.isArray(data)) return null;
  const row = data[0] as { review_count: number | string; average: number | string | null; r1: number | string; r2: number | string; r3: number | string; r4: number | string; r5: number | string; recommend_count: number | string } | undefined;
  const count = Number(row?.review_count ?? 0);
  if (!row || count === 0) return { count: 0, average: null, distribution: [0, 0, 0, 0, 0], recommendedPercent: null };
  return {
    count,
    average: Number(row.average),
    distribution: [Number(row.r1), Number(row.r2), Number(row.r3), Number(row.r4), Number(row.r5)],
    recommendedPercent: Math.round((Number(row.recommend_count) / count) * 100),
  };
}

export async function fetchReviews(client: SupabaseClient, placeRef: string, filters: ReviewFilters, viewerId: string | null): Promise<{ reviews: CommunityReview[]; hasMore: boolean } | null> {
  // "With photos" only keeps reviews that have at least one photo.
  const photos = filters.photosOnly ? PHOTOS.replace("community_review_images(", "community_review_images!inner(") : PHOTOS;
  let q = client.from("community_reviews").select(`${COLUMNS},${photos}`).eq("place_ref", placeRef).eq("status", "published");
  if (filters.sort === "highest") q = q.order("rating", { ascending: false }).order("published_at", { ascending: false });
  else if (filters.sort === "lowest") q = q.order("rating", { ascending: true }).order("published_at", { ascending: false });
  else if (filters.sort === "helpful") q = q.order("helpful_count", { ascending: false }).order("published_at", { ascending: false });
  else q = q.order("published_at", { ascending: false });

  const from = (filters.page - 1) * REVIEWS_PER_PAGE;
  const { data, error } = await q.range(from, from + REVIEWS_PER_PAGE);
  if (error || !data) return null;
  const rows = data as unknown as Row[];
  return { reviews: rows.slice(0, REVIEWS_PER_PAGE).map((r) => toReview(r, viewerId)), hasMore: rows.length > REVIEWS_PER_PAGE };
}

// The signed-in person's own review of this place — even while it waits for
// approval — so the page can offer "edit" instead of "write".
export async function fetchMyReview(client: SupabaseClient, placeRef: string, viewerId: string): Promise<CommunityReview | null> {
  const { data } = await client.from("community_reviews").select(`${COLUMNS},${PHOTOS}`).eq("place_ref", placeRef).eq("user_id", viewerId).maybeSingle();
  return data ? toReview(data as unknown as Row, viewerId) : null;
}

// Reviews of every place, for the Community reviews page and the Discover page.
export async function fetchAllReviews(client: SupabaseClient, filters: ReviewFilters, viewerId: string | null, limit = REVIEWS_PER_PAGE): Promise<{ reviews: CommunityReview[]; hasMore: boolean } | null> {
  const photos = filters.photosOnly ? PHOTOS.replace("community_review_images(", "community_review_images!inner(") : PHOTOS;
  let q = client.from("community_reviews").select(`${COLUMNS},${photos}`).eq("status", "published");
  if (filters.sort === "highest") q = q.order("rating", { ascending: false }).order("published_at", { ascending: false });
  else if (filters.sort === "lowest") q = q.order("rating", { ascending: true }).order("published_at", { ascending: false });
  else if (filters.sort === "helpful") q = q.order("helpful_count", { ascending: false }).order("published_at", { ascending: false });
  else q = q.order("published_at", { ascending: false });
  const from = (filters.page - 1) * limit;
  const { data, error } = await q.range(from, from + limit);
  if (error || !data) {
    console.error(`[community] reviews: code=${error?.code ?? "none"} message=${(error?.message ?? "no data").replace(/\s+/g, " ").slice(0, 200)}`);
    return null;
  }
  const rows = data as unknown as Row[];
  return { reviews: rows.slice(0, limit).map((r) => toReview(r, viewerId)), hasMore: rows.length > limit };
}

export interface RecommendedPlace {
  placeRef: string;
  reviews: number;
  recommends: number;
  average: number;
}

// The places people recommend most, worked out from real published reviews:
// ranked by how many reviewers recommend them, then by average stars. A place
// appears only if at least one reviewer recommends it. Looks at the most recent
// reviews only, so the work stays small.
export async function fetchRecommendedPlaces(client: SupabaseClient, limit = 6): Promise<RecommendedPlace[]> {
  const { data, error } = await client.from("community_reviews").select("place_ref,rating,recommend").eq("status", "published").order("published_at", { ascending: false }).limit(500);
  if (error || !data) return [];
  const by = new Map<string, { n: number; rec: number; sum: number }>();
  for (const r of data as { place_ref: string; rating: number; recommend: boolean }[]) {
    const e = by.get(r.place_ref) ?? { n: 0, rec: 0, sum: 0 };
    e.n += 1;
    e.sum += r.rating;
    if (r.recommend) e.rec += 1;
    by.set(r.place_ref, e);
  }
  return [...by.entries()]
    .filter(([, e]) => e.rec > 0)
    .map(([placeRef, e]) => ({ placeRef, reviews: e.n, recommends: e.rec, average: e.sum / e.n }))
    .sort((a, b) => b.recommends - a.recommends || b.average - a.average || b.reviews - a.reviews)
    .slice(0, limit);
}
