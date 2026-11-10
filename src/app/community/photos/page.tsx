import type { Metadata } from "next";
import CommunityHub from "@/components/community/CommunityHub";
import { AREA_BY_ID, FEATURED_AREAS, isAreaId } from "@/lib/community/areas";
import { feedFiltersFromParams } from "@/lib/community/feed";
import { fetchFeed, feedKey } from "@/lib/community/queries";
import { communityMetadata } from "@/lib/community/seo";

const TITLE = "Photos — Community — Japan Through People's Eyes";
const DESCRIPTION = "Photographs of places across Japan, shared by the people who took them.";

// The city for this page is a query value (?area=kyoto), checked here.
const load = async (searchParams: PageProps<"/community/photos">["searchParams"]) => {
  const sp = await searchParams;
  const raw = Array.isArray(sp.area) ? sp.area[0] : sp.area;
  const areaId = isAreaId(raw) ? raw : undefined;
  const filters = feedFiltersFromParams(sp, areaId);
  return { areaId, filters, result: await fetchFeed(feedKey(filters)) };
};

export async function generateMetadata({ searchParams }: PageProps<"/community/photos">): Promise<Metadata> {
  const { areaId, filters, result } = await load(searchParams);
  // A city-filtered view is a variation of the page, not a page of its own.
  const meta = communityMetadata({ title: TITLE, description: DESCRIPTION, path: "/community/photos", filters, result });
  return areaId ? { ...meta, robots: { index: false, follow: true } } : meta;
}

// Public: anyone can browse photos without an account.
export default async function CommunityPhotosPage({ searchParams }: PageProps<"/community/photos">) {
  const { areaId, filters, result } = await load(searchParams);
  const area = areaId ? AREA_BY_ID.get(areaId) : undefined;
  const featured = area ? FEATURED_AREAS.find((f) => f.areaId === area.id && f.slug === area.id) : undefined;
  return <CommunityHub view="photos" basePath="/community/photos" area={area} featured={featured} filters={filters} result={result} />;
}
