import { MIN_INDEXABLE_POSTS } from "@/lib/community/seo";
import { publicClient } from "@/lib/community/queries";

// Community addresses for the sitemap. A page is listed only when the same rule
// that lets search engines index it is met (see each page's metadata): enough
// real posts, a caption worth reading, a question that has been answered. No
// community content (or no database) means no community entries — never filler.
export const MIN_CAPTION_FOR_INDEX = 30;
const LIMIT = 1000;

export interface CommunityUrl {
  path: string;
  lastModified?: Date;
}

export async function communitySitemapPaths(): Promise<CommunityUrl[]> {
  const client = publicClient();
  if (!client) return [];
  try {
    const [posts, questions, reviews] = await Promise.all([
      client.from("community_posts").select("id,area_id,caption,published_at,community_post_images(id)").eq("status", "published").order("published_at", { ascending: false }).limit(LIMIT),
      client.from("community_questions").select("id,published_at,created_at").eq("status", "published").gte("answer_count", 1).order("published_at", { ascending: false }).limit(LIMIT),
      client.from("community_reviews").select("id", { count: "exact", head: true }).eq("status", "published"),
    ]);
    if (posts.error || questions.error) return [];

    const rows = (posts.data ?? []) as unknown as { id: string; area_id: string; caption: string; published_at: string; community_post_images: unknown[] | null }[];
    const out: CommunityUrl[] = [];
    const when = (iso: string | null | undefined) => (iso ? new Date(iso) : undefined);

    if (rows.length >= MIN_INDEXABLE_POSTS) {
      out.push({ path: "/community", lastModified: when(rows[0].published_at) });
      out.push({ path: "/community/photos", lastModified: when(rows[0].published_at) });
    }
    // An area page is listed once it has enough posts of its own.
    const perArea = new Map<string, { n: number; latest: string }>();
    for (const r of rows) {
      const e = perArea.get(r.area_id) ?? { n: 0, latest: r.published_at };
      e.n += 1;
      perArea.set(r.area_id, e);
    }
    for (const [area, e] of perArea) if (e.n >= MIN_INDEXABLE_POSTS) out.push({ path: `/community/${area}`, lastModified: when(e.latest) });
    for (const r of rows) {
      if ((r.community_post_images?.length ?? 0) > 0 && r.caption.length >= MIN_CAPTION_FOR_INDEX) out.push({ path: `/community/post/${r.id}`, lastModified: when(r.published_at) });
    }

    const qs = (questions.data ?? []) as unknown as { id: string; published_at: string | null; created_at: string }[];
    if (qs.length >= MIN_INDEXABLE_POSTS) out.push({ path: "/community/questions", lastModified: when(qs[0].published_at ?? qs[0].created_at) });
    for (const q of qs) out.push({ path: `/community/question/${q.id}`, lastModified: when(q.published_at ?? q.created_at) });

    if ((reviews.count ?? 0) >= MIN_INDEXABLE_POSTS) out.push({ path: "/community/reviews" });
    return out;
  } catch {
    return [];
  }
}
