import type { Metadata } from "next";
import PageHero from "@/components/page/PageHero";
import NewsHub from "@/components/news/NewsHub";
import { LiveLocationProvider } from "@/lib/geo/LiveLocationContext";
import { filtersFromParams, gridParams } from "@/lib/news/hubFilters";
import { queryFromParams, queryNews, type NewsResult } from "@/lib/news/query";
import { toQueryString } from "@/lib/news/queryString";

export const metadata: Metadata = {
  title: "Japan Live News — Live City Japan",
  description:
    "News from across Japan and the world — NHK, The Japan Times, Japan Today, DW, Al Jazeera and video from official news channels, with local news for your city.",
};

export default async function NewsPage({ searchParams }: PageProps<"/news">) {
  const filters = filtersFromParams(await searchParams);

  // The first page is fetched here so it arrives with the HTML. "Local" needs
  // the visitor's place, which only the browser knows, so it loads there.
  const initialResult: NewsResult | null =
    filters.loc === "near"
      ? null
      : await queryNews(queryFromParams(new URLSearchParams(toQueryString(gridParams(filters, null))))).catch(() => null);

  return (
    <LiveLocationProvider>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
        <PageHero label="Live News" title="Stay informed. Stay connected." intro="The latest stories from your area, Japan and around the world." />

        <NewsHub initialFilters={filters} initialResult={initialResult} />
      </div>
    </LiveLocationProvider>
  );
}
