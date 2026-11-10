import { fetchAllReviews, fetchRecommendedPlaces, type RecommendedPlace } from "@/lib/community/reviewQuery";
import { fetchQuestions } from "@/lib/community/discussionQuery";
import { POST_SELECT, publicClient, toPost, type Row } from "@/lib/community/queries";
import type { CommunityPost, CommunityQuestion, CommunityReview } from "@/lib/community/types";

// The Discover page's extra sections. Each one is built only from real,
// published content and each can come back empty — the page then simply leaves
// that section out. Nothing here invents a trend, a ranking or a number.
export interface Discovery {
  trending: CommunityPost[];
  hidden: CommunityPost[];
  reviews: CommunityReview[];
  places: RecommendedPlace[];
  questions: CommunityQuestion[];
}

export const EMPTY_DISCOVERY: Discovery = { trending: [], hidden: [], reviews: [], places: [], questions: [] };

const RAIL = 6;

export async function fetchDiscovery(): Promise<Discovery> {
  const client = publicClient();
  if (!client) return EMPTY_DISCOVERY;

  const posts = async (build: (q: ReturnType<typeof base>) => unknown): Promise<CommunityPost[]> => {
    try {
      const { data, error } = (await build(base())) as { data: unknown; error: unknown };
      return error || !Array.isArray(data) ? [] : (data as Row[]).map(toPost);
    } catch {
      return [];
    }
  };
  const base = () => client.from("community_posts").select(POST_SELECT).eq("status", "published");

  const safe = async <T,>(work: Promise<T>, fallback: T): Promise<T> => {
    try {
      return await work;
    } catch {
      return fallback;
    }
  };

  const [trending, hidden, reviews, places, questions] = await Promise.all([
    // "Trending" = the most-liked posts that have at least one like. No likes, no section.
    posts((q) => q.gt("like_count", 0).order("like_count", { ascending: false }).order("published_at", { ascending: false }).limit(RAIL)),
    posts((q) => q.eq("category_slug", "hidden-places").order("published_at", { ascending: false }).limit(RAIL)),
    safe(fetchAllReviews(client, { sort: "newest", photosOnly: false, page: 1 }, null, 3), null),
    safe(fetchRecommendedPlaces(client, RAIL), [] as RecommendedPlace[]),
    safe(fetchQuestions(client, { sort: "unanswered", page: 1 }, null, 3), null),
  ]);

  return { trending, hidden, reviews: reviews?.reviews ?? [], places, questions: questions?.questions ?? [] };
}
