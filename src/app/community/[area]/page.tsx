import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CommunityHub from "@/components/community/CommunityHub";
import { resolveArea } from "@/lib/community/areas";
import { feedFiltersFromParams } from "@/lib/community/feed";
import { fetchFeed, feedKey, publicClient } from "@/lib/community/queries";
import { fetchAreaQuestions } from "@/lib/community/discussionQuery";
import { communityMetadata } from "@/lib/community/seo";

// /community/nara, /community/osaka ... and city names that belong to a
// prefecture (/community/nagoya opens the Aichi page, labelled Nagoya).
export async function generateMetadata({ params, searchParams }: PageProps<"/community/[area]">): Promise<Metadata> {
  const resolved = resolveArea((await params).area);
  if (!resolved) return {};
  const filters = feedFiltersFromParams(await searchParams, resolved.area.id);
  const result = await fetchFeed(feedKey(filters));
  const name = resolved.featured?.en ?? resolved.area.en;
  return communityMetadata({
    title: `${name} Community — Japan Through People's Eyes`,
    description: `Real experiences, photographs and recommendations from people who have been to ${name}, Japan.`,
    // Cities share their prefecture's page, so every address points to one real page.
    path: `/community/${resolved.canonical}`,
    filters,
    result,
  });
}

export default async function CommunityAreaPage({ params, searchParams }: PageProps<"/community/[area]">) {
  const slug = (await params).area;
  const resolved = resolveArea(slug);
  if (!resolved) notFound();
  const filters = feedFiltersFromParams(await searchParams, resolved.area.id);
  const result = await fetchFeed(feedKey(filters));
  const client = publicClient();
  const areaQuestions = client ? await fetchAreaQuestions(client, resolved.area.id, 3) : [];
  return <CommunityHub basePath={`/community/${slug.toLowerCase()}`} area={resolved.area} featured={resolved.featured} filters={filters} result={result} areaQuestions={areaQuestions} />;
}
