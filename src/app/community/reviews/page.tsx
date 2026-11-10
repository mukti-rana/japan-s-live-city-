import type { Metadata } from "next";
import Link from "next/link";
import { Camera, Compass, Star } from "lucide-react";
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
  `inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${
    on ? "border-azure/60 bg-azure/20 text-azure" : "border-glass-border bg-glass-bg text-foreground/85 hover:border-white/30 hover:text-foreground"
  }`;

const SORT_TEXT: Record<ReviewSort, string> = { newest: "Newest", highest: "Highest rated", lowest: "Lowest rated", helpful: "Most helpful" };

const href = (f: ReviewFilters, patch: Partial<ReviewFilters>) => {
  const n = { ...f, page: 1, ...patch };
  const p = new URLSearchParams();
  if (n.sort !== "newest") p.set("sort", n.sort);
  if (n.photosOnly) p.set("photos", "1");
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
  const touched = filters.sort !== "newest" || filters.photosOnly;

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 pb-10">
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
        <Link href="/explore" className="mt-5 inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-lilac to-sakura px-5 text-sm font-semibold text-background transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
          <Compass size={16} aria-hidden="true" />
          <Tx en="Find a place to review" />
        </Link>
      </CommunityHero>

      {result === null ? (
        <Unavailable reason={configured ? "error" : "not_configured"} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-labelledby="rv-sort">
            <span id="rv-sort" className="text-xs font-medium text-foreground/80">
              <Tx en="Sort by" />
            </span>
            {REVIEW_SORTS.map((s) => (
              <Link key={s} href={href(filters, { sort: s })} className={chip(filters.sort === s)} aria-current={filters.sort === s ? "true" : undefined}>
                <Tx en={SORT_TEXT[s]} />
              </Link>
            ))}
            <Link href={href(filters, { photosOnly: !filters.photosOnly })} aria-current={filters.photosOnly ? "true" : undefined} className={`${chip(filters.photosOnly)} gap-1.5`}>
              <Camera size={13} aria-hidden="true" />
              <Tx en="With photos" />
            </Link>
            {touched && (
              <Link href="/community/reviews" className="ml-auto rounded px-2 py-2 text-xs font-semibold text-lilac underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                <Tx en="Reset filters" />
              </Link>
            )}
          </div>

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
              <ul className="flex flex-col gap-3">
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
