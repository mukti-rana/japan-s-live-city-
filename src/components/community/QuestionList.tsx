import Link from "next/link";
import QuestionCard from "@/components/community/QuestionCard";
import Tx from "@/components/i18n/Tx";
import { QUESTION_SORTS, type QuestionFilters, type QuestionSort } from "@/lib/community/discussionQuery";
import type { CommunityQuestion } from "@/lib/community/types";

const chip = (on: boolean) =>
  `inline-flex shrink-0 items-center rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${
    on ? "border-azure/60 bg-azure/20 text-azure" : "border-glass-border bg-glass-bg text-foreground/85 hover:border-white/30 hover:text-foreground"
  }`;

const SORT_TEXT: Record<QuestionSort, string> = { latest: "Latest", answers: "Most answered", unanswered: "Unanswered", helpful: "Most helpful" };

// Questions with the four sort orders (plain links, so every view is shareable).
export default function QuestionList({ basePath, filters, questions, hasMore, showSort = true, emptyHint }: { basePath: string; filters: QuestionFilters; questions: CommunityQuestion[]; hasMore: boolean; showSort?: boolean; emptyHint?: string }) {
  const link = (patch: Partial<QuestionFilters>) => {
    const f = { ...filters, page: 1, ...patch };
    const p = new URLSearchParams();
    if (f.areaId) p.set("area", f.areaId);
    if (f.placeRef) p.set("place", f.placeRef);
    if (f.sort !== "latest") p.set("sort", f.sort);
    if (f.page > 1) p.set("page", String(f.page));
    const q = p.toString();
    return `${basePath}${q ? `?${q}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-4">
      {showSort && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-labelledby="q-sort-label">
          <span id="q-sort-label" className="text-xs font-medium text-foreground/80">
            <Tx en="Sort by" />
          </span>
          {QUESTION_SORTS.map((s) => (
            <Link key={s} href={link({ sort: s })} className={chip(filters.sort === s)} aria-current={filters.sort === s ? "true" : undefined}>
              <Tx en={SORT_TEXT[s]} />
            </Link>
          ))}
        </div>
      )}

      {questions.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/20 bg-glass-bg px-4 py-8 text-center text-sm text-foreground/85">
          <Tx en={filters.sort === "unanswered" ? "Every question has an answer. Nice." : (emptyHint ?? "No questions yet.")} />
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {questions.map((q) => (
            <li key={q.id}>
              <QuestionCard q={q} />
            </li>
          ))}
        </ul>
      )}

      {(filters.page > 1 || hasMore) && (
        <div className="flex items-center justify-between gap-3">
          {filters.page > 1 ? (
            <Link href={link({ page: filters.page - 1 })} rel="prev" className={chip(false)}>
              <Tx en="Previous" />
            </Link>
          ) : (
            <span />
          )}
          {hasMore && (
            <Link href={link({ page: filters.page + 1 })} rel="next" className={chip(false)}>
              <Tx en="Next" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
