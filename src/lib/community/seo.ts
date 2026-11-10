import type { Metadata } from "next";
import { isFiltered, type FeedFilters } from "@/lib/community/feed";
import type { FeedResult } from "@/lib/community/queries";

// A community page is only worth a search engine's attention once it holds
// real content. Until a page has at least this many published posts — and for
// any filtered, searched or paged view — it is kept out of the index, so the
// site never offers search engines a pile of empty or near-duplicate pages.
export const MIN_INDEXABLE_POSTS = 3;

export function communityMetadata(args: { title: string; description: string; path: string; filters: FeedFilters; result: FeedResult }): Metadata {
  const { title, description, path, filters, result } = args;
  const substantial = result.state === "ready" && result.posts.length >= MIN_INDEXABLE_POSTS;
  const indexable = substantial && !isFiltered(filters);
  return {
    title,
    description,
    // Filtered and paged views point back to the plain page as the real one.
    alternates: { canonical: path },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { title, description, url: path, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}
