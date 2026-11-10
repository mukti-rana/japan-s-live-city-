import type { Metadata } from "next";
import CommunityHub from "@/components/community/CommunityHub";
import { feedFiltersFromParams } from "@/lib/community/feed";
import { fetchFeed, feedKey } from "@/lib/community/queries";
import { EMPTY_DISCOVERY, fetchDiscovery } from "@/lib/community/discoveryQuery";
import { isFiltered } from "@/lib/community/feed";
import { communityMetadata } from "@/lib/community/seo";

const TITLE = "Community — Japan Through People's Eyes";
const DESCRIPTION = "Real experiences, photographs and recommendations shared by people across Japan.";

export async function generateMetadata({ searchParams }: PageProps<"/community">): Promise<Metadata> {
  const filters = feedFiltersFromParams(await searchParams);
  const result = await fetchFeed(feedKey(filters));
  return communityMetadata({ title: TITLE, description: DESCRIPTION, path: "/community", filters, result });
}

// Public: anyone can browse the community without an account. Only published
// posts are ever listed (the database enforces that, not just this page).
export default async function CommunityPage({ searchParams }: PageProps<"/community">) {
  const filters = feedFiltersFromParams(await searchParams);
  const result = await fetchFeed(feedKey(filters));
  // The extra sections (trending, reviews, questions…) are for the plain page
  // only, and only when the feed itself could be read.
  const discovery = !isFiltered(filters) && result.state === "ready" ? await fetchDiscovery() : EMPTY_DISCOVERY;
  return <CommunityHub basePath="/community" filters={filters} result={result} discovery={discovery} />;
}
