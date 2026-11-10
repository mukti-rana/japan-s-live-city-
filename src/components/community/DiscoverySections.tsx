import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, EyeOff, MapPin, MessageSquareText, Star, ThumbsUp, TrendingUp } from "lucide-react";
import Bi from "@/components/community/Bi";
import QuestionCard from "@/components/community/QuestionCard";
import ReviewCard from "@/components/community/ReviewCard";
import Stars from "@/components/community/Stars";
import { PostRail } from "@/components/community/PostGrid";
import Tx from "@/components/i18n/Tx";
import { AREA_BY_ID } from "@/lib/community/areas";
import type { Discovery } from "@/lib/community/discoveryQuery";
import { getDestination } from "@/lib/explore/catalogue";

function Section({ id, icon, heading, href, more, children }: { id: string; icon: ReactNode; heading: string; href?: string; more?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="cm-rise flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <h2 id={id} className="flex items-center gap-2 text-lg font-semibold text-foreground sm:text-xl">
          <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-xl bg-lilac/15 text-lilac">
            {icon}
          </span>
          <Tx en={heading} />
        </h2>
        {href && (
          <Link href={href} className="inline-flex h-9 shrink-0 items-center gap-0.5 rounded-lg px-1 text-sm font-medium text-lilac underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
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
export default function DiscoverySections({ data }: { data: Discovery }) {
  const { trending, hidden, reviews, places, questions } = data;
  return (
    <>
      {trending.length > 0 && (
        <Section id="trending-h" icon={<TrendingUp size={16} />} heading="Trending in Japan">
          <PostRail posts={trending} />
        </Section>
      )}

      {places.length > 0 && (
        <Section id="places-h" icon={<ThumbsUp size={16} />} heading="Most recommended places" href="/community/reviews?sort=helpful" more="See reviews">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {places.map((p) => {
              const place = getDestination(p.placeRef);
              if (!place) return null;
              const area = AREA_BY_ID.get(place.prefectureId);
              return (
                <li key={p.placeRef}>
                  <Link href={`/explore/${p.placeRef}`} className="group flex h-full flex-col gap-2 rounded-2xl border border-glass-border bg-panel/70 p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure motion-reduce:transition-none">
                    <span className="flex items-center gap-1 text-xs text-foreground/80">
                      <MapPin size={12} aria-hidden="true" className="shrink-0" />
                      {area ? <Bi en={area.en} ja={area.ja} /> : <Tx en="Japan" />}
                    </span>
                    <span className="text-base font-semibold leading-snug text-foreground">{place.names.en ?? place.names.ja}</span>
                    <span className="flex items-center gap-2 text-xs text-foreground/85">
                      <Stars value={p.average} size={14} label={`${p.average.toFixed(1)} / 5`} />
                      <span className="tabular-nums">{p.average.toFixed(1)}</span>
                    </span>
                    <span className="text-xs font-medium text-mint">
                      {p.recommends} <Tx en={p.recommends === 1 ? "reviewer recommends it" : "reviewers recommend it"} />
                      <span className="text-foreground/70"> · {p.reviews} <Tx en={p.reviews === 1 ? "review" : "reviews"} /></span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {hidden.length > 0 && (
        <Section id="hidden-h" icon={<EyeOff size={16} />} heading="Hidden places shared by locals" href="/community?category=hidden-places" more="See all">
          <PostRail posts={hidden} />
        </Section>
      )}

      {reviews.length > 0 && (
        <Section id="reviews-h" icon={<Star size={16} />} heading="Latest reviews" href="/community/reviews" more="All reviews">
          <ul className="grid gap-3 lg:grid-cols-3">
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
          <ul className="grid gap-3 lg:grid-cols-3">
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
