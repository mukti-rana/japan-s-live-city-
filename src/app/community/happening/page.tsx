import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import ListingCard from "@/components/community/listings/ListingCard";
import ListingRail from "@/components/community/listings/ListingRail";
import ListingsHeader from "@/components/community/listings/ListingsHeader";
import NearYouListings from "@/components/community/listings/NearYouListings";
import { CATEGORY_ICON } from "@/components/community/listings/ListingPieces";
import Bi from "@/components/community/Bi";
import Unavailable from "@/components/community/Unavailable";
import Tx from "@/components/i18n/Tx";
import { LISTING_CATEGORIES } from "@/lib/community/listings/categories";
import { DEFAULT_LISTING_FILTERS, type ListingFilters } from "@/lib/community/listings/filters";
import { fetchListingsFor, type ListingsResult } from "@/lib/community/listings/queries";
import { nowMs, phaseOf } from "@/lib/community/listings/time";
import type { Listing } from "@/lib/community/listings/types";

export const metadata: Metadata = {
  title: "What's Happening — Community — Live City Japan",
  description: "Festivals, concerts, markets, announcements and local activities happening now and coming soon across Japan, published by the people who run them.",
  alternates: { canonical: "/community/happening" },
};
export const dynamic = "force-dynamic";

const f = (patch: Partial<ListingFilters>, pageSize: number) => ({ ...DEFAULT_LISTING_FILTERS, ...patch, pageSize });
const items = (r: ListingsResult): Listing[] => (r.state === "ready" ? r.items : []);

// The event magazine: what is featured, what is on right now, what is coming, what is near you, what is popular, what is new, and the categories.
// Every card is a real publication; a section with nothing real in it is simply not shown, so there are never placeholder events.
export default async function WhatsHappeningPage() {
  const now = nowMs();
  const timed = ["event", "activity"] as const;
  const [featured, live, soon, popular, fresh] = await Promise.all([
    fetchListingsFor(f({ featured: true }, 4)),
    fetchListingsFor(f({ when: "now", kinds: [...timed] }, 24)),
    fetchListingsFor(f({ when: "upcoming", kinds: [...timed] }, 16)),
    fetchListingsFor(f({ when: "popular" }, 12)),
    fetchListingsFor(f({ when: "new" }, 8)),
  ]);

  const unavailable = [featured, live, soon, popular, fresh].find((r) => r.state === "unavailable");
  const liveItems = items(live);
  const liveIds = new Set(liveItems.map((l) => l.id));
  const comingItems = items(soon).filter((l) => !liveIds.has(l.id) && phaseOf(l, now) === "upcoming").slice(0, 8);
  const popularItems = items(popular).filter((l) => l.goingCount + l.interestedCount + l.saveCount > 0).slice(0, 8);
  const freshItems = items(fresh);
  const featuredItems = items(featured).slice(0, 3);
  const nothing = !unavailable && featuredItems.length + liveItems.length + comingItems.length + popularItems.length + freshItems.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-12">
      <ListingsHeader section="happening" title="What's happening in Japan" intro="Festivals, concerts, markets and local news, published by the people behind them." />

      {unavailable && unavailable.state === "unavailable" ? (
        <Unavailable reason={unavailable.reason} />
      ) : (
        <>
          {featuredItems.length > 0 && (
            <section aria-label="Featured" className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <ListingCard l={featuredItems[0]} now={now} variant="feature" priority />
              {featuredItems.length > 1 && (
                <ul className="grid gap-4">
                  {featuredItems.slice(1).map((l) => (
                    <li key={l.id}>
                      <ListingCard l={l} now={now} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <ListingRail id="live-h" title="Happening now" intro="On right now, judged from the real dates and times." items={liveItems} now={now} href="/community/events?when=now" />
          <ListingRail id="soon-h" title="Coming soon" intro="The next festivals, concerts, workshops and activities." items={comingItems} now={now} href="/community/events" moreLabel="All events" />
          <NearYouListings now={nowMs()} />
          <ListingRail id="popular-h" title="Popular across Japan" intro="Most interest, most going, most saved." items={popularItems} now={now} href="/community/events?when=popular" />
          <ListingRail id="new-h" title="Newly published" items={freshItems} now={now} href="/community/events?when=new" />

          {nothing && (
            <div className="flex flex-col items-center gap-3 rounded-[26px] border border-dashed border-white/20 px-5 py-14 text-center">
              <CalendarPlus size={30} aria-hidden="true" className="text-white/55" />
              <h2 className="text-xl font-semibold text-foreground">
                <Tx en="Nothing has been published yet." />
              </h2>
              <p className="max-w-md text-sm text-white/65">
                <Tx en="Be the first to share what is happening near you: an event, an announcement, an offer or a community activity." />
              </p>
              <Link href="/community/create" className="mt-2 inline-flex h-11 items-center rounded-full border border-white/40 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                <Tx en="Create" />
              </Link>
            </div>
          )}

          <section aria-labelledby="cats-h" className="flex flex-col gap-4">
            <h2 id="cats-h" className="text-xs font-medium uppercase tracking-[0.22em] text-foreground/60">
              <Tx en="Browse by category" />
            </h2>
            <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {LISTING_CATEGORIES.map((c) => {
                const Icon = CATEGORY_ICON[c.slug];
                return (
                  <li key={c.slug}>
                    <Link href={`/community/events?category=${c.slug}`} className="group flex h-full items-center gap-3 rounded-2xl border border-white/10 px-3.5 py-3 text-sm font-medium text-foreground/90 transition-colors hover:border-white/30 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                      <Icon size={18} aria-hidden="true" className="shrink-0 text-white/60 transition-colors group-hover:text-white" />
                      <span className="leading-tight">
                        <Bi en={c.en} ja={c.ja} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
