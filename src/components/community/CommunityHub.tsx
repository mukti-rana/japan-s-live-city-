import Link from "next/link";
import { Camera, Compass, HelpCircle, Map as MapIcon, RotateCcw, Users, X } from "lucide-react";
import Tx from "@/components/i18n/Tx";
import Bi from "@/components/community/Bi";
import AreaPicker from "@/components/community/AreaPicker";
import CommunityHero from "@/components/community/CommunityHero";
import CommunitySearch from "@/components/community/CommunitySearch";
import CommunityTabs from "@/components/community/CommunityTabs";
import Unavailable from "@/components/community/Unavailable";
import QuestionCard from "@/components/community/QuestionCard";
import { FEATURED_AREAS, type Area, type FeaturedArea } from "@/lib/community/areas";
import { CATEGORIES, CATEGORY_BY_SLUG } from "@/lib/community/categories";
import { feedQuery, isFiltered, type FeedFilters, type FeedSort } from "@/lib/community/feed";
import type { FeedResult } from "@/lib/community/queries";
import { REGIONS } from "@/lib/explore/regions";
import type { CommunityQuestion } from "@/lib/community/types";
import type { Discovery } from "@/lib/community/discoveryQuery";
import DiscoverySections from "@/components/community/DiscoverySections";
import PostGrid from "@/components/community/PostGrid";

const chip = (on: boolean) =>
  `inline-flex shrink-0 items-center rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${
    on ? "border-azure/60 bg-azure/20 text-azure" : "border-glass-border bg-glass-bg text-foreground/85 hover:border-white/30 hover:text-foreground"
  }`;

const pill = "inline-flex h-9 items-center gap-1.5 rounded-full border border-azure/50 bg-azure/15 px-3 text-xs font-medium text-azure transition-colors hover:bg-azure/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure";

const SORTS: { id: FeedSort; en: string }[] = [
  { id: "latest", en: "Latest" },
  { id: "liked", en: "Most liked" },
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
  // What follows the city when you switch city: topic, search and sort stay.
  const carry = feedQuery({ category: filters.category, q: filters.q, sort: filters.sort });
  const areaHref = (slug: string, areaId: string) => {
    if (!photos) return `/community/${slug}${carry}`;
    const p = new URLSearchParams(carry.replace(/^\?/, ""));
    p.set("area", areaId);
    return `${basePath}?${p.toString()}`;
  };
  const noArea = photos ? `${basePath}${carry}` : `/community${carry}`;
  const heading = photos ? "Photos from across Japan" : "Japan through your eyes";
  const nameEn = featured?.en ?? area?.en;
  const nameJa = featured?.ja ?? area?.ja;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 pb-10">
      <CommunityTabs active={photos ? "photos" : "discover"} />
      <CommunityHero>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-lilac">
          <Users size={14} aria-hidden="true" />
          <Tx en="Community" />
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
          {area && nameEn && nameJa ? <Bi en={nameEn} ja={nameJa} /> : <Tx en={heading} />}
        </h1>
        {area && featured && featured.areaId === area.id && featured.slug !== area.id && (
          <p className="mt-1 text-sm text-foreground/80">
            <Bi en={area.en} ja={area.ja} />
          </p>
        )}
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/90 sm:text-base">
          {area ? <Tx en="Real experiences, photos and recommendations shared by people who have been here." /> : <Tx en="Discover real experiences, beautiful places and recommendations shared by people across Japan." />}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <CommunitySearch action={basePath} defaultValue={filters.q} category={filters.category} region={filters.region} area={photos ? area?.id : undefined} />
          <Link href="/community/new" className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-lilac to-sakura px-5 text-sm font-semibold text-background transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
            <Camera size={16} aria-hidden="true" />
            <Tx en="Share your experience" />
          </Link>
          <Link href={`/community/questions/new${area ? `?area=${area.id}` : ""}`} className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 text-sm font-medium text-foreground backdrop-blur transition hover:border-white/40 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            <HelpCircle size={16} aria-hidden="true" />
            <Tx en="Ask a Local" />
          </Link>
        </div>
      </CommunityHero>

      <nav aria-labelledby="community-filters" className="flex flex-col gap-3">
        <h2 id="community-filters" className="sr-only">
          <Tx en="Filters" />
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <AreaPicker currentSlug={area ? (featured?.slug ?? area.id) : undefined} currentLabel={nameEn && nameJa ? { en: nameEn, ja: nameJa } : undefined} query={carry} paramBase={photos ? basePath : undefined} />
          <div className="-mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-labelledby="community-city">
            <span id="community-city" className="sr-only">
              <Tx en="Popular cities" />
            </span>
            {FEATURED_AREAS.map((f) => {
              const on = Boolean(area) && (featured ? featured.slug === f.slug : area?.id === f.areaId && f.slug === f.areaId);
              return (
                <Link key={f.slug} href={areaHref(f.slug, f.areaId)} className={chip(on)} aria-current={on ? "page" : undefined}>
                  <Bi en={f.en} ja={f.ja} />
                </Link>
              );
            })}
          </div>
        </div>

        {(!area || photos) && (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-labelledby="community-region">
            <span id="community-region" className="sr-only">
              <Tx en="Region" />
            </span>
            <Link href={link({ region: undefined })} className={chip(!filters.region)} aria-current={!filters.region ? "page" : undefined}>
              <Tx en="All regions" />
            </Link>
            {REGIONS.map((r) => (
              <Link key={r.id} href={link({ region: r.id })} className={chip(filters.region === r.id)} aria-current={filters.region === r.id ? "page" : undefined}>
                <Bi en={r.en} ja={r.ja} />
              </Link>
            ))}
          </div>
        )}

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-labelledby="community-topic">
          <span id="community-topic" className="sr-only">
            <Tx en="Topic" />
          </span>
          <Link href={link({ category: undefined })} className={chip(!filters.category)} aria-current={!filters.category ? "page" : undefined}>
            <Tx en="All topics" />
          </Link>
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={link({ category: c.slug })} className={chip(filters.category === c.slug)} aria-current={filters.category === c.slug ? "page" : undefined}>
              <Bi en={c.en} ja={c.ja} />
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-labelledby="community-sort">
          <span id="community-sort" className="text-xs font-medium text-foreground/80">
            <Tx en="Sort by" />
          </span>
          {SORTS.map((s) => (
            <Link key={s.id} href={link({ sort: s.id })} className={chip(filters.sort === s.id)} aria-current={filters.sort === s.id ? "true" : undefined}>
              <Tx en={s.en} />
            </Link>
          ))}
        </div>

        {(area || filters.region || filters.category || filters.q) && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-labelledby="community-selected">
            <span id="community-selected" className="text-xs font-medium text-foreground/80">
              <Tx en="Showing" />
              <span className="sr-only">
                {" "}
                <Tx en="Selected filters" />
              </span>
            </span>
            {area && nameEn && nameJa && (
              <Link href={noArea} className={pill} aria-label={`Remove ${nameEn}`}>
                <Bi en={nameEn} ja={nameJa} />
                <X size={12} aria-hidden="true" />
              </Link>
            )}
            {filters.region && (
              <Link href={link({ region: undefined })} className={pill}>
                <Bi en={REGIONS.find((r) => r.id === filters.region)?.en ?? ""} ja={REGIONS.find((r) => r.id === filters.region)?.ja ?? ""} />
                <X size={12} aria-hidden="true" />
              </Link>
            )}
            {filters.category && CATEGORY_BY_SLUG.get(filters.category) && (
              <Link href={link({ category: undefined })} className={pill}>
                <Bi en={CATEGORY_BY_SLUG.get(filters.category)!.en} ja={CATEGORY_BY_SLUG.get(filters.category)!.ja} />
                <X size={12} aria-hidden="true" />
              </Link>
            )}
            {filters.q && (
              <Link href={link({ q: undefined })} className={pill}>
                “{filters.q}”
                <X size={12} aria-hidden="true" />
              </Link>
            )}
            <Link href={photos ? basePath : "/community"} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-lilac underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              <RotateCcw size={12} aria-hidden="true" />
              <Tx en="Reset filters" />
            </Link>
          </div>
        )}
      </nav>

      {area && !photos && (
        <section aria-labelledby="ask-local-h" className="flex flex-col gap-3 rounded-3xl border border-glass-border bg-glass-bg p-5 backdrop-blur-xl sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="ask-local-h" className="text-lg font-semibold text-foreground">
              <Tx en="Ask a Local" /> · <Bi en={nameEn ?? area.en} ja={nameJa ?? area.ja} />
            </h2>
            <Link href={`/community/questions?area=${area.id}`} className="rounded text-sm font-medium text-lilac underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              <Tx en="See all questions" /> →
            </Link>
          </div>
          {areaQuestions.length === 0 ? (
            <p className="text-sm text-foreground/85">
              <Tx en="No questions about this area yet. Ask the first one." />
            </p>
          ) : (
            <ul className="grid gap-3 lg:grid-cols-3">
              {areaQuestions.map((q) => (
                <li key={q.id}>
                  <QuestionCard q={q} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {discovery && !filtered && !area && <DiscoverySections data={discovery} />}

      <section aria-labelledby="community-posts">
        <h2 id="community-posts" className={result.state === "ready" && result.posts.length > 0 ? "mb-3 text-lg font-semibold text-foreground sm:text-xl" : "sr-only"}>
          <Tx en={filtered || area ? "Community posts" : "Latest community photos"} />
        </h2>
        {result.state === "unavailable" ? (
          <Unavailable reason={result.reason} />
        ) : result.posts.length === 0 ? (
          filtered ? (
            <Notice heading="Nothing matches these filters" body="Try a different city, topic or search." action={{ href: basePath, label: "Clear filters" }} />
          ) : (
            <div className="rounded-3xl border border-dashed border-white/20 bg-glass-bg px-5 py-12 text-center sm:py-16">
              <Users size={32} aria-hidden="true" className="mx-auto text-lilac" />
              <h2 className="mt-4 text-xl font-semibold text-foreground">
                <Tx en="Be the first to share an experience from Japan." />
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-foreground/85">
                <Tx en="Share a photo and what it was like. Or explore Japan's places and the live map." />
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/community/new" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-lilac to-sakura px-5 py-2.5 text-sm font-semibold text-background transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                  <Camera size={16} aria-hidden="true" />
                  <Tx en="Share your experience" />
                </Link>
                <Link href="/explore" className="inline-flex items-center gap-2 rounded-xl border border-glass-border bg-glass-bg px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                  <Compass size={16} aria-hidden="true" />
                  <Tx en="Explore Japan" />
                </Link>
                <Link href="/map" className="inline-flex items-center gap-2 rounded-xl border border-glass-border bg-glass-bg px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                  <MapIcon size={16} aria-hidden="true" />
                  <Tx en="Japan Map" />
                </Link>
              </div>
            </div>
          )
        ) : (
          <>
            <PostGrid posts={result.posts} />
            {(filters.page > 1 || result.hasMore) && (
              <div className="mt-4 flex items-center justify-between gap-3">
                {filters.page > 1 ? (
                  <Link href={link({ page: filters.page - 1 })} rel="prev" className={chip(false)}>
                    <Tx en="Previous" />
                  </Link>
                ) : (
                  <span />
                )}
                {result.hasMore && (
                  <Link href={link({ page: filters.page + 1 })} rel="next" className={chip(false)}>
                    <Tx en="Next" />
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Notice({ heading, body, action }: { heading: string; body: string; action?: { href: string; label: string } }) {
  return (
    <div role="status" className="rounded-3xl border border-glass-border bg-glass-bg px-5 py-10 text-center">
      <h2 className="text-lg font-semibold text-foreground">
        <Tx en={heading} />
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-foreground/85">
        <Tx en={body} />
      </p>
      {action && (
        <Link href={action.href} className="mt-4 inline-block rounded text-sm font-medium text-lilac underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
          <Tx en={action.label} />
        </Link>
      )}
    </div>
  );
}
