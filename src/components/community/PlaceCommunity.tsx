import Link from "next/link";
import { Camera, HelpCircle, MessageSquareText } from "lucide-react";
import BeenHereButton from "@/components/community/BeenHereButton";
import PostCard from "@/components/community/PostCard";
import ReviewCard from "@/components/community/ReviewCard";
import ReviewSummary from "@/components/community/ReviewSummary";
import Tx from "@/components/i18n/Tx";
import { fetchPlacePosts, publicClient } from "@/lib/community/queries";
import { fetchReviewStats, fetchReviews } from "@/lib/community/reviewQuery";

// The community's side of an Explore place page: the rating at a glance, the
// latest few reviews, photos shared from this place, and the ways to join in.
// It reads only public, published content with the cookie-free client, so the
// Explore page stays cacheable. If the community can't be reached the section
// simply isn't shown — the place page never breaks because of it.
export default async function PlaceCommunity({ id }: { id: string }) {
  const client = publicClient();
  if (!client) return null;
  const [stats, latest, posts] = await Promise.all([fetchReviewStats(client, id), fetchReviews(client, id, { sort: "newest", photosOnly: false, page: 1 }, null), fetchPlacePosts(id, 4)]);
  if (!stats || !latest) return null;
  const href = `/community/place/${id}`;
  const btn = "inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2";

  return (
    <section aria-labelledby="place-community-h" className="mx-auto mt-8 flex w-full max-w-[1200px] flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="place-community-h" className="text-xl font-semibold text-foreground">
          <Tx en="Reviews & photos from visitors" />
        </h2>
        <div className="flex flex-wrap items-start gap-2">
          <BeenHereButton placeRef={id} />
          <Link href={`${href}#reviews`} className={`${btn} bg-gradient-to-r from-lilac to-sakura text-background hover:brightness-110 focus-visible:ring-white/70`}>
            <MessageSquareText size={16} aria-hidden="true" />
            <Tx en="Write a review" />
          </Link>
          <Link href={`/community/new?place=${id}`} className={`${btn} border border-glass-border bg-glass-bg text-foreground hover:border-white/30 focus-visible:ring-azure`}>
            <Camera size={16} aria-hidden="true" />
            <Tx en="Share your experience" />
          </Link>
          <Link href={`/community/questions/new?place=${id}`} className={`${btn} border border-glass-border bg-glass-bg text-foreground hover:border-white/30 focus-visible:ring-azure`}>
            <HelpCircle size={16} aria-hidden="true" />
            <Tx en="Ask a question" />
          </Link>
        </div>
      </div>

      <div className="rounded-3xl border border-glass-border bg-glass-bg p-5 backdrop-blur-xl sm:p-6">
        <ReviewSummary stats={stats} />
      </div>

      {latest.reviews.length > 0 && (
        <>
          <ul className="grid gap-3 lg:grid-cols-2">
            {latest.reviews.slice(0, 3).map((r) => (
              <li key={r.id}>
                <ReviewCard review={r} placeRef={id} />
              </li>
            ))}
          </ul>
          <Link href={`${href}#reviews`} className="w-fit rounded text-sm font-medium text-lilac underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            <Tx en="See all reviews and photos" /> →
          </Link>
        </>
      )}

      {posts.length > 0 && (
        <div>
          <h3 className="mb-3 text-base font-semibold text-foreground">
            <Tx en="Photos from visitors" />
          </h3>
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-4">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
