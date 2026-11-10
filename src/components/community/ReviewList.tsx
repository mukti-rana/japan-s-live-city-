import Link from "next/link";
import ReviewCard from "@/components/community/ReviewCard";
import { HelpfulProvider } from "@/components/community/HelpfulVotes";
import Tx from "@/components/i18n/Tx";
import { REVIEW_SORTS, type ReviewFilters, type ReviewSort } from "@/lib/community/reviewQuery";
import type { CommunityReview } from "@/lib/community/types";

const chip = (on: boolean) =>
  `inline-flex shrink-0 items-center rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${
    on ? "border-azure/60 bg-azure/20 text-azure" : "border-glass-border bg-glass-bg text-foreground/85 hover:border-white/30 hover:text-foreground"
  }`;

const SORT_TEXT: Record<ReviewSort, string> = { newest: "Newest", highest: "Highest rated", lowest: "Lowest rated", helpful: "Most helpful" };

// Reviews with the four sort orders and a "With photos" filter. Choices are
// plain links (shareable, no script needed); changing one starts at page 1.
export default function ReviewList({ basePath, placeRef, filters, reviews, hasMore, total }: { basePath: string; placeRef: string; filters: ReviewFilters; reviews: CommunityReview[]; hasMore: boolean; total: number }) {
  const link = (patch: Partial<ReviewFilters>) => {
    const f = { ...filters, page: 1, ...patch };
    const p = new URLSearchParams();
    if (f.sort !== "newest") p.set("rsort", f.sort);
    if (f.photosOnly) p.set("photos", "1");
    if (f.page > 1) p.set("rpage", String(f.page));
    const q = p.toString();
    return `${basePath}${q ? `?${q}` : ""}#reviews`;
  };

  return (
    <div className="flex flex-col gap-4">
      {total > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-labelledby="review-sort-label">
          <span id="review-sort-label" className="text-xs font-medium text-foreground/80">
            <Tx en="Sort by" />
          </span>
          {REVIEW_SORTS.map((s) => (
            <Link key={s} href={link({ sort: s })} scroll={false} className={chip(filters.sort === s)} aria-current={filters.sort === s ? "true" : undefined}>
              <Tx en={SORT_TEXT[s]} />
            </Link>
          ))}
          <Link href={link({ photosOnly: !filters.photosOnly })} scroll={false} className={chip(filters.photosOnly)} aria-pressed={filters.photosOnly}>
            <Tx en="With photos" />
          </Link>
        </div>
      )}

      {reviews.length === 0 ? (
        total > 0 && filters.photosOnly ? (
          <p className="rounded-2xl border border-glass-border bg-glass-bg px-4 py-6 text-center text-sm text-foreground/85">
            <Tx en="No reviews with photos yet." />
          </p>
        ) : null
      ) : (
        <HelpfulProvider reviewIds={reviews.map((r) => r.id)}>
          <ul className="flex flex-col gap-3">
            {reviews.map((r) => (
              <li key={r.id}>
                <ReviewCard review={r} placeRef={placeRef} />
              </li>
            ))}
          </ul>
        </HelpfulProvider>
      )}

      {(filters.page > 1 || hasMore) && (
        <div className="flex items-center justify-between gap-3">
          {filters.page > 1 ? (
            <Link href={link({ page: filters.page - 1 })} scroll={false} rel="prev" className={chip(false)}>
              <Tx en="Previous" />
            </Link>
          ) : (
            <span />
          )}
          {hasMore && (
            <Link href={link({ page: filters.page + 1 })} scroll={false} rel="next" className={chip(false)}>
              <Tx en="Next" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
