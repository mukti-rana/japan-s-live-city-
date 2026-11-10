import type { Metadata } from "next";
import CommunityHub from "@/components/community/CommunityHub";
import { feedFiltersFromParams } from "@/lib/community/feed";
import { fetchFeed, feedKey } from "@/lib/community/queries";
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
  return <CommunityHub basePath="/community" filters={filters} result={result} />;
}
