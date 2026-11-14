import type { Metadata } from "next";
import Link from "next/link";
import { Camera, Compass, Star } from "lucide-react";
import FilterToolbar from "@/components/community/FilterToolbar";
import { locationOptions } from "@/lib/community/locationOptions";
import { PLACE_CATEGORIES } from "@/lib/community/placeTypes";
import CommunityHero from "@/components/community/CommunityHero";
import CommunityTabs from "@/components/community/CommunityTabs";
import ReviewCard from "@/components/community/ReviewCard";
import Unavailable from "@/components/community/Unavailable";
import Tx from "@/components/i18n/Tx";
import { fetchAllReviews, REVIEW_SORTS, reviewFiltersFromParams, type ReviewFilters, type ReviewSort } from "@/lib/community/reviewQuery";
import { publicClient } from "@/lib/community/queries";
import { MIN_INDEXABLE_POSTS } from "@/lib/community/seo";

const TITLE = "Reviews — Community — Japan Through People's Eyes";
const DESCRIPTION = "Honest reviews of places across Japan, with stars, photos and tips from the people who visited.";

const chip = (on: boolean) =>
  `inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${
    on ? "border-white/30 bg-white/10 text-white" : "border-glass-border bg-glass-bg text-foreground/85 hover:border-white/25 hover:text-white"
  }`;

const SORT_TEXT: Record<ReviewSort, string> = { newest: "Newest", highest: "Highest rated", lowest: "Lowest rated", helpful: "Most helpful" };
const SORT_JA: Record<ReviewSort, string> = { newest: "新着順", highest: "評価が高い順", lowest: "評価が低い順", helpful: "役に立った順" };

const href = (f: ReviewFilters, patch: Partial<ReviewFilters>) => {
  const n = { ...f, page: 1, ...patch };
  const p = new URLSearchParams();
  if (n.sort !== "newest") p.set("sort", n.sort);
  if (n.photosOnly) p.set("photos", "1");
  if (n.area) p.set("area", n.area);
  if (n.placeType) p.set("type", n.placeType);
  if (n.page > 1) p.set("page", String(n.page));
  const q = p.toString();
  return `/community/reviews${q ? `?${q}` : ""}`;
};

const KEYS = { sort: "sort", page: "page" };

async function load(sp: Record<string, string | string[] | undefined>) {
  const filters = reviewFiltersFromParams(sp, KEYS);
  const client = publicClient();
  return { filters, configured: Boolean(client), result: client ? await fetchAllReviews(client, filters, null) : null };
}

export async function generateMetadata({ searchParams }: PageProps<"/community/reviews">): Promise<Metadata> {
  const { filters, result } = await load(await searchParams);
  const plain = filters.sort === "newest" && !filters.photosOnly && filters.page === 1;
  const indexable = plain && (result?.reviews.length ?? 0) >= MIN_INDEXABLE_POSTS;
  return { title: TITLE, description: DESCRIPTION, alternates: { canonical: "/community/reviews" }, robots: { index: indexable, follow: true }, openGraph: { title: TITLE, description: DESCRIPTION, url: "/community/reviews" } };
}

// Reviews of every place, newest first by default. Only published reviews are
// listed (the database enforces that); each links to its place.
export default async function CommunityReviewsPage({ searchParams }: PageProps<"/community/reviews">) {
  const { filters, configured, result } = await load(await searchParams);
  const touched = filters.sort !== "newest" || filters.photosOnly || Boolean(filters.area) || Boolean(filters.placeType);
  return (
    <div className="mx-auto flex w-full max-w-[1760px] flex-col gap-6 pb-10">
      <CommunityTabs active="reviews" />
      <CommunityHero>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-lilac">
          <Star size={14} aria-hidden="true" />
          <Tx en="Community" />
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          <Tx en="Reviews from across Japan" />
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/90 sm:text-base">
          <Tx en="Stars, honest words and photos from people who visited. To review a place, open it in Explore." />
        </p>
        <Link href="/explore" className="mt-5 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-background transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
          <Compass size={16} aria-hidden="true" />
          <Tx en="Find a place to review" />
        </Link>
      </CommunityHero>

      {result === null ? (
        <Unavailable reason={configured ? "error" : "not_configured"} />
      ) : (
        <>
          <FilterToolbar
            path="/community/reviews"
            clearHref="/community/reviews"
            extra={filters.photosOnly ? { photos: "1" } : {}}
            facets={[
              { id: "location", label: "Location", icon: "location", param: "area", mode: "single", options: locationOptions("param"), selected: filters.area ? [filters.area] : [], allLabel: "All Japan", searchable: true },
              { id: "type", label: "Place category", icon: "type", param: "type", mode: "single", options: PLACE_CATEGORIES.map((c) => ({ value: c.id, en: c.en, ja: c.ja, icon: c.id })), selected: filters.placeType ? [filters.placeType] : [], allLabel: "All places" },
              { id: "sort", label: "Sort by", icon: "sort", param: "sort", mode: "single", options: REVIEW_SORTS.map((s) => ({ value: s, en: SORT_TEXT[s], ja: SORT_JA[s] })), selected: [filters.sort], defaultValue: "newest", narrows: false },
            ]}
          >
            <Link href={href(filters, { photosOnly: !filters.photosOnly })} aria-pressed={filters.photosOnly} aria-current={filters.photosOnly ? "true" : undefined} className={`${chip(filters.photosOnly)} gap-1.5`}>
              <Camera size={14} aria-hidden="true" />
              <Tx en="With photos" />
            </Link>
          </FilterToolbar>

          {result.reviews.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/20 bg-glass-bg px-5 py-12 text-center">
              <Star size={30} aria-hidden="true" className="mx-auto text-gold" />
              <h2 className="mt-3 text-lg font-semibold text-foreground">
                <Tx en={touched ? "No reviews match these filters" : "No reviews yet"} />
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-foreground/85">
                <Tx en={touched ? "Try a different sort, or show reviews with and without photos." : "Be the first: open a place in Explore and write a review of it."} />
              </p>
              <Link href={touched ? "/community/reviews" : "/explore"} className="mt-5 inline-flex h-11 items-center rounded-xl border border-glass-border bg-glass-bg-strong px-5 text-sm font-semibold text-foreground transition hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                <Tx en={touched ? "Reset filters" : "Explore places"} />
              </Link>
            </div>
          ) : (
            <>
              <ul className="grid gap-3 lg:grid-cols-2">
                {result.reviews.map((r) => (
                  <li key={r.id}>
                    <ReviewCard review={r} placeRef={r.placeRef} showPlace />
                  </li>
                ))}
              </ul>
              {(filters.page > 1 || result.hasMore) && (
                <div className="flex items-center justify-between gap-3">
                  {filters.page > 1 ? (
                    <Link href={href(filters, { page: filters.page - 1 })} rel="prev" className={chip(false)}>
                      <Tx en="Previous" />
                    </Link>
                  ) : (
                    <span />
                  )}
                  {result.hasMore && (
                    <Link href={href(filters, { page: filters.page + 1 })} rel="next" className={chip(false)}>
                      <Tx en="Next" />
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
