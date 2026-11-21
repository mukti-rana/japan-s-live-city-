import type { Metadata } from "next";
import ListingBrowser from "@/components/community/listings/ListingBrowser";
import ListingsHeader from "@/components/community/listings/ListingsHeader";
import { listingFiltersFromParams } from "@/lib/community/listings/filters";

export const metadata: Metadata = {
  title: "Announcements — Community — Live City Japan",
  description: "Local announcements and business promotions across Japan, published by the people and shops behind them.",
  alternates: { canonical: "/community/announcements" },
};
export const dynamic = "force-dynamic";

// Announcements and business promotions. Sponsored ones are always labelled.
export default async function CommunityAnnouncementsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filters = listingFiltersFromParams(sp);
  const view = (Array.isArray(sp.view) ? sp.view[0] : sp.view) === "map" ? "map" : "list";
  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8">
      <ListingsHeader section="announcements" title="Announcements" intro="Local announcements and offers from people and shops across Japan. Sponsored posts are always labelled." />
      <ListingBrowser basePath="/community/announcements" kinds={["announcement", "promotion"]} filters={filters} view={view} emptyTitle="Nothing announced here yet" emptyHelp="Try another city or category, or publish an announcement yourself." />
    </div>
  );
}
