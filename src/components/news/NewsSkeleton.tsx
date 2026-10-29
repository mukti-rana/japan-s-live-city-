// Placeholders with the same shape as real cards, so the page doesn't jump
// when stories arrive. The pulse is disabled for people who prefer reduced motion.
export function CardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-3 rounded-2xl border border-glass-border bg-glass-bg p-3 motion-safe:animate-pulse"
    >
      <div className="aspect-[16/9] rounded-xl bg-glass-bg-strong" />
      <div className="h-3 w-2/5 rounded bg-glass-bg-strong" />
      <div className="h-4 w-full rounded bg-glass-bg-strong" />
      <div className="h-4 w-4/5 rounded bg-glass-bg-strong" />
      <div className="h-3 w-3/5 rounded bg-glass-bg-strong" />
    </div>
  );
}

export function FeaturedSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="grid gap-4 rounded-2xl border border-glass-border bg-glass-bg p-4 motion-safe:animate-pulse lg:grid-cols-[1.35fr_1fr]"
    >
      <div className="aspect-[16/9] rounded-xl bg-glass-bg-strong" />
      <div className="flex flex-col justify-center gap-3">
        <div className="h-3 w-1/4 rounded bg-glass-bg-strong" />
        <div className="h-6 w-full rounded bg-glass-bg-strong" />
        <div className="h-6 w-3/4 rounded bg-glass-bg-strong" />
        <div className="h-3 w-full rounded bg-glass-bg-strong" />
        <div className="h-3 w-5/6 rounded bg-glass-bg-strong" />
      </div>
    </div>
  );
}

export function CompactSkeleton() {
  return (
    <div aria-hidden="true" className="flex gap-3 motion-safe:animate-pulse">
      <div className="aspect-[4/3] w-24 shrink-0 rounded-xl bg-glass-bg-strong sm:w-28" />
      <div className="flex flex-1 flex-col gap-2 pt-1">
        <div className="h-3 w-1/2 rounded bg-glass-bg-strong" />
        <div className="h-3.5 w-full rounded bg-glass-bg-strong" />
        <div className="h-3.5 w-3/4 rounded bg-glass-bg-strong" />
      </div>
    </div>
  );
}
