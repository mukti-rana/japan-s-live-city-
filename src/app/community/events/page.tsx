import type { Metadata } from "next";
import ListingBrowser from "@/components/community/listings/ListingBrowser";
import ListingsHeader from "@/components/community/listings/ListingsHeader";
import { listingFiltersFromParams } from "@/lib/community/listings/filters";

export const metadata: Metadata = {
  title: "Events — Community — Live City Japan",
  description: "Festivals, concerts, markets, workshops and local activities across Japan, published by the people who run them.",
  alternates: { canonical: "/community/events" },
};
export const dynamic = "force-dynamic";

// Events and community activities, newest-first filters, list or map. Public: anyone can browse without an account.
export default async function CommunityEventsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filters = listingFiltersFromParams(sp);
  const view = (Array.isArray(sp.view) ? sp.view[0] : sp.view) === "map" ? "map" : "list";
  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8">
      <ListingsHeader section="events" title="Events" intro="Festivals, concerts, markets, workshops and local activities, published by the people who run them." />
      <ListingBrowser basePath="/community/events" kinds={["event", "activity"]} filters={filters} view={view} emptyTitle="No events match these filters" emptyHelp="Try another city, category or day, or publish one yourself." />
    </div>
  );
}
