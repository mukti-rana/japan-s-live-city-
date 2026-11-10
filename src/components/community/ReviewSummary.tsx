import { ThumbsUp } from "lucide-react";
import Stars from "@/components/community/Stars";
import Tx from "@/components/i18n/Tx";
import type { ReviewStats } from "@/lib/community/types";

// The rating at a glance: average, how many reviews, how they spread across the
// stars, and what share would recommend the place. Every figure is computed
// from real, published reviews; with none, it says so and shows no numbers.
export default function ReviewSummary({ stats }: { stats: ReviewStats }) {
  if (stats.count === 0 || stats.average === null) {
    return (
      <p className="text-sm text-foreground/85">
        <Tx en="No reviews yet. Be the first to review this place." />
      </p>
    );
  }
  const max = Math.max(...stats.distribution, 1);
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
      <div className="flex flex-col items-start gap-1">
        <p className="text-5xl font-bold leading-none tracking-tight text-foreground">{stats.average.toFixed(1)}</p>
        <Stars value={stats.average} size={18} label={`${stats.average.toFixed(1)} / 5`} />
        <p className="text-xs text-foreground/80">
          {stats.count} <Tx en={stats.count === 1 ? "review" : "reviews"} />
        </p>
        {stats.recommendedPercent !== null && (
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-mint">
            <ThumbsUp size={13} aria-hidden="true" />
            {stats.recommendedPercent}% <Tx en="would recommend" />
          </p>
        )}
      </div>
      <ul className="flex w-full max-w-sm flex-col gap-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const n = stats.distribution[star - 1];
          return (
            <li key={star} className="flex items-center gap-2 text-xs text-foreground/90">
              <span className="w-8 shrink-0 tabular-nums">{star} ★</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-gold" style={{ width: `${(n / max) * 100}%` }} />
              </span>
              <span className="w-7 shrink-0 text-right tabular-nums text-foreground/80">{n}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
