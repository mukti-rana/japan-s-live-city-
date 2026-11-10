import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, ExternalLink } from "lucide-react";
import Bi from "@/components/community/Bi";
import PostCard from "@/components/community/PostCard";
import ReviewCard from "@/components/community/ReviewCard";
import ReviewComposer from "@/components/community/ReviewComposer";
import ReviewList from "@/components/community/ReviewList";
import ReviewSummary from "@/components/community/ReviewSummary";
import Tx from "@/components/i18n/Tx";
import { AREA_BY_ID } from "@/lib/community/areas";
import { fetchPlacePosts, publicClient } from "@/lib/community/queries";
import { fetchMyReview, fetchReviewStats, fetchReviews, reviewFiltersFromParams } from "@/lib/community/reviewQuery";
import { MIN_INDEXABLE_POSTS } from "@/lib/community/seo";
import { getDestination } from "@/lib/explore/catalogue";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// Star-rating markup is only added once a place has this many real reviews.
const MIN_REVIEWS_FOR_RATING_MARKUP = 5;

const isPlaceId = (id: string) => /^Q[0-9]{1,12}$/.test(id);
const nameOf = (id: string) => {
  const place = getDestination(id);
  return place ? { place, en: place.names.en ?? place.names.ja ?? "Place", ja: place.names.ja ?? place.names.en ?? "Place" } : null;
};

export async function generateMetadata({ params, searchParams }: PageProps<"/community/place/[id]">): Promise<Metadata> {
  const { id } = await params;
  const found = isPlaceId(id) ? nameOf(id) : null;
  if (!found) return { robots: { index: false, follow: false } };
  const client = publicClient();
  const [stats, posts] = client ? await Promise.all([fetchReviewStats(client, id), fetchPlacePosts(id, 12)]) : [null, []];
  const sp = await searchParams;
  const plain = !sp.rsort && !sp.photos && !sp.rpage;
  const substantial = (stats?.count ?? 0) + posts.length >= MIN_INDEXABLE_POSTS;
  const rating = stats && stats.count > 0 && stats.average ? ` ${stats.average.toFixed(1)}★ (${stats.count})` : "";
  const title = `${found.en} — Reviews & Photos${rating}`;
  const description = `What visitors say about ${found.en}: honest reviews, ratings and photos from people who have been there.`;
  const path = `/community/place/${id}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: substantial && plain ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { title, description, url: path, type: "website" },
  };
}

export default async function PlaceCommunityPage({ params, searchParams }: PageProps<"/community/place/[id]">) {
  const { id } = await params;
  if (!isPlaceId(id)) notFound();
  const found = nameOf(id);
  if (!found) notFound();
  const { place } = found;
  const filters = reviewFiltersFromParams(await searchParams);
  const area = AREA_BY_ID.get(place.prefectureId);

  let stats = null;
  let list = null;
  let mine = null;
  let posts: Awaited<ReturnType<typeof fetchPlacePosts>> = [];
  if (isSupabaseConfigured) {
    // The visitor's own session, so their own (even unapproved) review can be shown to them.
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const viewer = auth.user?.id ?? null;
    [stats, list, mine, posts] = await Promise.all([
      fetchReviewStats(supabase, id),
      fetchReviews(supabase, id, filters, viewer),
      viewer ? fetchMyReview(supabase, id, viewer) : Promise.resolve(null),
      fetchPlacePosts(id, 24),
    ]);
  }
  const markup =
    stats && stats.count >= MIN_REVIEWS_FOR_RATING_MARKUP && stats.average
      ? JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TouristAttraction",
          name: found.en,
          aggregateRating: { "@type": "AggregateRating", ratingValue: stats.average, reviewCount: stats.count, bestRating: 5, worstRating: 1 },
        }).replace(/</g, "\\u003c")
      : null;

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 pb-10">
      {markup && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: markup }} />}

      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-foreground/80">
        <Link href="/community" className="rounded underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
          <Tx en="Community" />
        </Link>
        {area && (
          <>
            <span aria-hidden="true">›</span>
            <Link href={`/community/${area.id}`} className="rounded underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              <Bi en={area.en} ja={area.ja} />
            </Link>
          </>
        )}
      </nav>

      <header className="rounded-3xl border border-glass-border bg-gradient-to-br from-lilac/10 via-glass-bg to-azure/10 p-5 backdrop-blur-xl sm:p-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          <Bi en={found.en} ja={found.ja} />
        </h1>
        {found.en !== found.ja && <p className="mt-1 text-sm text-foreground/80">{found.ja}</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={`/community/new?place=${id}`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-lilac to-sakura px-5 text-sm font-semibold text-background transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
            <Camera size={16} aria-hidden="true" />
            <Tx en="Share your experience" />
          </Link>
          <Link href={`/explore/${id}`} className="inline-flex h-11 items-center gap-2 rounded-xl border border-glass-border bg-glass-bg px-5 text-sm font-medium text-foreground transition hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            <ExternalLink size={16} aria-hidden="true" />
            <Tx en="Place details and map" />
          </Link>
        </div>
      </header>

      <section id="reviews" aria-labelledby="reviews-h" className="scroll-mt-24 flex flex-col gap-4">
        <h2 id="reviews-h" className="text-xl font-semibold text-foreground">
          <Tx en="Reviews" />
        </h2>
        {stats === null || list === null ? (
          <p role="status" className="rounded-2xl border border-glass-border bg-glass-bg px-4 py-6 text-center text-sm text-foreground/85">
            <Tx en="Reviews aren't available right now. Please try again in a little while." />
          </p>
        ) : (
          <>
            <div className="rounded-3xl border border-glass-border bg-glass-bg p-5 backdrop-blur-xl sm:p-6">
              <ReviewSummary stats={stats} />
            </div>
            <ReviewComposer placeRef={id} hasMine={Boolean(mine)} />
            {/* Your own review while it waits for approval or after it was hidden (the list shows published ones). */}
            {mine && mine.status !== "published" && <ReviewCard review={mine} placeRef={id} />}
            <ReviewList basePath={`/community/place/${id}`} placeRef={id} filters={filters} reviews={list.reviews} hasMore={list.hasMore} total={stats.count} />
          </>
        )}
      </section>

      <section id="photos" aria-labelledby="photos-h2" className="scroll-mt-24 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="photos-h2" className="text-xl font-semibold text-foreground">
            <Tx en="Photos from visitors" />
          </h2>
          <Link href={`/community/new?place=${id}`} className="rounded text-sm font-medium text-lilac underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            <Tx en="Upload photos" /> →
          </Link>
        </div>
        {posts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/20 bg-glass-bg px-4 py-8 text-center text-sm text-foreground/85">
            <Tx en="No photos from visitors yet." />
          </p>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
