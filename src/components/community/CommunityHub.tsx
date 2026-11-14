import Link from "next/link";
import { Camera, ChevronLeft, ChevronRight, Compass, HelpCircle, Map as MapIcon, Users } from "lucide-react";
import Tx from "@/components/i18n/Tx";
import Bi from "@/components/community/Bi";
import CommunitySearch from "@/components/community/CommunitySearch";
import CommunityTabs from "@/components/community/CommunityTabs";
import FilterToolbar, { type FilterFacet } from "@/components/community/FilterToolbar";
import Unavailable from "@/components/community/Unavailable";
import QuestionCard from "@/components/community/QuestionCard";
import { PLACE_CATEGORIES } from "@/lib/community/placeTypes";
import { locationOptions } from "@/lib/community/locationOptions";
import { type Area, type FeaturedArea } from "@/lib/community/areas";
import { CATEGORIES } from "@/lib/community/categories";
import { feedQuery, isFiltered, type FeedFilters } from "@/lib/community/feed";
import type { FeedResult } from "@/lib/community/queries";
import { REGIONS } from "@/lib/explore/regions";
import type { CommunityQuestion } from "@/lib/community/types";
import type { Discovery } from "@/lib/community/discoveryQuery";
import DiscoverySections from "@/components/community/DiscoverySections";
import LatestPhotos from "@/components/community/LatestPhotos";
import PostGrid from "@/components/community/PostGrid";

const pager = "inline-flex h-11 items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-4 text-sm font-medium text-foreground transition-colors hover:border-white/30 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure";
const primary = "inline-flex shrink-0 items-center gap-2 rounded-xl bg-white font-semibold text-black transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-black";
const secondary = "inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-transparent font-medium text-foreground transition-colors hover:border-white/30 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure";

const SORT_OPTIONS = [
  { value: "latest", en: "Latest", ja: "最新" },
  { value: "liked", en: "Most liked", ja: "いいね順" },
];

// The Community landing page and each area's page share this layout. Only real,
// published posts are listed — an empty community says so honestly.
//
// Everything here is plain links and one GET form, so filtering is just
// navigation: every view has its own shareable address and works without
// any extra script.
export default function CommunityHub({
  basePath,
  area,
  featured,
  filters,
  result,
  areaQuestions = [],
  discovery,
  view = "discover",
}: {
  // "photos" is the same feed with the city kept in ?area= and its own heading.
  view?: "discover" | "photos";
  basePath: string;
  area?: Area;
  featured?: FeaturedArea;
  filters: FeedFilters;
  result: FeedResult;
  // "Ask a Local" questions about this area (area pages only).
  areaQuestions?: CommunityQuestion[];
  // Extra sections (trending, reviews...) — only passed for the plain Discover page.
  discovery?: Discovery;
}) {
  const photos = view === "photos";
  const link = (patch: Partial<FeedFilters>) => `${basePath}${feedQuery({ ...filters, page: 1, ...patch }, photos)}`;
  // On the Photos page the city is a filter like any other.
  const filtered = isFiltered(filters) || (photos && Boolean(area));
  const nameEn = featured?.en ?? area?.en;
  const nameJa = featured?.ja ?? area?.ja;

  // The one toolbar: Location, Region, Topic, Place category and Sort. Photos keeps
  // the city in ?area=; Discover opens each city's own page.
  const facets: FilterFacet[] = [
    {
      id: "location",
      label: "Location",
      icon: "location",
      param: "area",
      mode: "single",
      options: locationOptions(photos ? "param" : "path"),
      selected: area ? [photos ? area.id : (featured?.slug ?? area.id)] : [],
      allLabel: "All Japan",
      pathBase: photos ? undefined : "/community",
      searchable: true,
    },
    {
      id: "region",
      label: "Region",
      icon: "region",
      param: "region",
      mode: "multi",
      options: REGIONS.map((r) => ({ value: r.id, en: r.en, ja: r.ja })),
      selected: area && !photos ? [] : filters.regions,
      ignoredWithPlace: true,
    },
    { id: "topic", label: "Topic", icon: "topic", param: "category", mode: "multi", options: CATEGORIES.map((c) => ({ value: c.slug, en: c.en, ja: c.ja })), selected: filters.categories },
    { id: "type", label: "Place category", icon: "type", param: "type", mode: "multi", options: PLACE_CATEGORIES.map((c) => ({ value: c.id, en: c.en, ja: c.ja, icon: c.id })), selected: filters.placeTypes },
    { id: "sort", label: "Sort by", icon: "sort", param: "sort", mode: "single", options: SORT_OPTIONS, selected: [filters.sort], defaultValue: "latest", narrows: false },
  ];
  // The region filter makes no sense on one city's own page.
  const toolbarFacets = area && !photos ? facets.filter((f) => f.id !== "region") : facets;

  // The small heading at the left of the header row: the place's name on a city
  // page, otherwise just "Community" (or "Photos").
  const title = area && nameEn && nameJa ? <Bi en={nameEn} ja={nameJa} /> : <Tx en={photos ? "Photos" : "Community"} />;

  return (
    <div className="mx-auto flex w-full max-w-[1760px] flex-col gap-5">
      <CommunityTabs active={photos ? "photos" : "discover"} />

      {/* Compact header: title, search, the one filter button, and Share. */}
      <FilterToolbar
        path={basePath}
        facets={toolbarFacets}
        q={filters.q}
        clearHref={photos ? basePath : "/community"}
        lead={
          <>
            <h1 className="order-1 text-lg font-semibold tracking-tight text-foreground sm:mr-1 sm:text-xl">{title}</h1>
            <div className="order-3 w-[calc(100%-3rem)] min-w-0 sm:order-2 sm:w-auto sm:max-w-xl sm:flex-1">
              <CommunitySearch action="/community/search" defaultValue={filters.q} />
            </div>
          </>
        }
        trail={
          <Link href="/community/new" className={`${primary} order-2 ml-auto h-10 px-4 text-sm sm:order-5`}>
            <Camera size={16} aria-hidden="true" />
            <Tx en="Share your experience" />
          </Link>
        }
      />

      {area && !photos && (
        <section aria-labelledby="ask-local-h" className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-cm-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="ask-local-h" className="text-lg font-semibold tracking-tight text-foreground">
              <Tx en="Ask a Local" /> · <Bi en={nameEn ?? area.en} ja={nameJa ?? area.ja} />
            </h2>
            <Link href={`/community/questions?area=${area.id}`} className="rounded text-sm font-medium text-foreground/75 underline-offset-2 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              <Tx en="See all questions" /> →
            </Link>
          </div>
          {areaQuestions.length === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-foreground/75">
                <Tx en="No questions about this area yet. Ask the first one." />
              </p>
              <Link href={`/community/questions/new?area=${area.id}`} className={`${primary} h-11 px-5 text-sm`}>
                <HelpCircle size={16} aria-hidden="true" />
                <Tx en="Ask a Question" />
              </Link>
            </div>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {areaQuestions.map((q) => (
                <li key={q.id}>
                  <QuestionCard q={q} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section aria-labelledby="community-posts">
        <h2 id="community-posts" className={result.state === "ready" && result.posts.length > 0 ? "mb-4 text-lg font-semibold tracking-tight text-foreground sm:text-xl" : "sr-only"}>
          <Tx en={filtered || area ? "Community posts" : "Latest community posts"} />
        </h2>
        {result.state === "unavailable" ? (
          <Unavailable reason={result.reason} />
        ) : result.posts.length === 0 ? (
          filtered ? (
            <Notice heading="Nothing matches these filters" body="Try a different city, topic or search." action={{ href: photos ? basePath : "/community", label: "Clear filters" }} />
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-cm-surface px-5 py-14 text-center sm:py-20">
              <span aria-hidden="true" className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                <Users size={26} className="text-azure" />
              </span>
              <h2 className="mt-5 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                <Tx en="Be the first to share an experience from Japan." />
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-foreground/70">
                <Tx en="Share a photo and what it was like. Or explore Japan's places and the live map." />
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link href="/community/new" className={`${primary} h-12 px-6 text-sm`}>
                  <Camera size={16} aria-hidden="true" />
                  <Tx en="Share your experience" />
                </Link>
                <Link href="/explore" className={`${secondary} h-12 px-5 text-sm`}>
                  <Compass size={16} aria-hidden="true" />
                  <Tx en="Explore Japan" />
                </Link>
                <Link href="/map" className={`${secondary} h-12 px-5 text-sm`}>
                  <MapIcon size={16} aria-hidden="true" />
                  <Tx en="Japan Map" />
                </Link>
              </div>
            </div>
          )
        ) : (
          <>
            <PostGrid posts={result.posts} reveal={photos} />
            {(filters.page > 1 || result.hasMore) && (
              <div className="mt-6 flex items-center justify-between gap-3">
                {filters.page > 1 ? (
                  <Link href={link({ page: filters.page - 1 })} rel="prev" className={pager}>
                    <ChevronLeft size={16} aria-hidden="true" />
                    <Tx en="Previous" />
                  </Link>
                ) : (
                  <span />
                )}
                {result.hasMore && (
                  <Link href={link({ page: filters.page + 1 })} rel="next" className={pager}>
                    <Tx en="Next" />
                    <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {result.state === "ready" && !filtered && !area && filters.page === 1 && <LatestPhotos posts={result.posts} />}

      {discovery && !filtered && !area && <DiscoverySections data={discovery} part="top" />}
      {discovery && !filtered && !area && <DiscoverySections data={discovery} part="rest" />}
    </div>
  );
}

function Notice({ heading, body, action }: { heading: string; body: string; action?: { href: string; label: string } }) {
  return (
    <div role="status" className="rounded-2xl border border-white/10 bg-cm-surface px-5 py-12 text-center">
      <h2 className="text-lg font-semibold text-foreground">
        <Tx en={heading} />
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-foreground/70">
        <Tx en={body} />
      </p>
      {action && (
        <Link href={action.href} className={`${secondary} mt-5 h-10 px-4 text-sm`}>
          <Tx en={action.label} />
        </Link>
      )}
    </div>
  );
}
