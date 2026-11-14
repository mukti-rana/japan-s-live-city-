import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, EyeOff, MessageSquareText, Star, ThumbsUp, TrendingUp } from "lucide-react";
import QuestionCard from "@/components/community/QuestionCard";
import ReviewCard from "@/components/community/ReviewCard";
import PlaceCards from "@/components/community/PlaceCards";
import { PostRail } from "@/components/community/PostGrid";
import Tx from "@/components/i18n/Tx";
import type { Discovery } from "@/lib/community/discoveryQuery";

function Section({ id, icon, heading, href, more, children }: { id: string; icon: ReactNode; heading: string; href?: string; more?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="cm-rise flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <h2 id={id} className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-azure">
            {icon}
          </span>
          <Tx en={heading} />
        </h2>
        {href && (
          <Link href={href} className="inline-flex h-9 shrink-0 items-center gap-0.5 rounded-lg px-1 text-sm font-medium text-foreground/75 underline-offset-2 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            <Tx en={more ?? "See all"} />
            <ChevronRight size={15} aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

// The extra sections on the Discover page. A section appears only when it has
// real content to show — an empty community shows none of them, and nothing
// here is filler. Counts and rankings are exactly what the database holds.
// `part="top"` is the trending strip (shown above the latest posts); `part="rest"`
// is everything else (shown below them).
export default function DiscoverySections({ data, part }: { data: Discovery; part: "top" | "rest" }) {
  const { trending, hidden, reviews, places, questions } = data;
  if (part === "top") {
    return trending.length > 0 ? (
      <Section id="trending-h" icon={<TrendingUp size={16} />} heading="Trending in Japan" href="/community/trending" more="See all">
        <PostRail posts={trending} />
      </Section>
    ) : null;
  }
  return (
    <>
      {places.length > 0 && (
        <Section id="places-h" icon={<ThumbsUp size={16} />} heading="Most recommended places" href="/community/reviews?sort=helpful" more="See reviews">
          <PlaceCards places={places} />
        </Section>
      )}

      {hidden.length > 0 && (
        <Section id="hidden-h" icon={<EyeOff size={16} />} heading="Hidden places shared by locals" href="/community?category=hidden-places" more="See all">
          <PostRail posts={hidden} />
        </Section>
      )}

      {reviews.length > 0 && (
        <Section id="reviews-h" icon={<Star size={16} />} heading="Latest reviews" href="/community/reviews" more="All reviews">
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {reviews.map((r) => (
              <li key={r.id}>
                <ReviewCard review={r} placeRef={r.placeRef} showPlace />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {questions.length > 0 && (
        <Section id="waiting-h" icon={<MessageSquareText size={16} />} heading="Questions waiting for answers" href="/community/questions?sort=unanswered" more="Help answer">
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {questions.map((q) => (
              <li key={q.id}>
                <QuestionCard q={q} />
              </li>
            ))}
          </ul>
        </Section>
      )}

    </>
  );
}
