import Tx from "@/components/i18n/Tx";

// Shared route-level loading UI. Reuses the existing `cm-skeleton` shimmer,
// which already has a light-theme variant and is switched off under
// prefers-reduced-motion in globals.css.
//
// The point of each variant is that the page's final shape appears straight
// away, so content does not jump when the real data streams in.
type Variant = "list" | "grid" | "detail" | "canvas";

export default function PageSkeleton({
  variant = "list",
  /** Show the page title + subtitle block above the content. */
  header = true,
  count,
}: {
  variant?: Variant;
  header?: boolean;
  count?: number;
}) {
  const n = count ?? (variant === "grid" ? 8 : 5);

  return (
    <div className="mx-auto flex w-full max-w-[1760px] flex-col gap-5" role="status" aria-busy="true">
      <span className="sr-only">
        <Tx en="Loading" />
      </span>

      {header && (
        <div className="flex flex-col gap-3">
          <div className="cm-skeleton h-8 w-56 max-w-full rounded-lg" />
          <div className="cm-skeleton h-4 w-80 max-w-full rounded" />
        </div>
      )}

      {variant === "canvas" && <div className="cm-skeleton h-[60vh] min-h-80 w-full rounded-2xl" />}

      {variant === "detail" && (
        <div className="flex flex-col gap-4">
          <div className="cm-skeleton aspect-[16/9] w-full rounded-2xl" />
          <div className="cm-skeleton h-6 w-2/3 max-w-md rounded" />
          <div className="cm-skeleton h-4 w-full max-w-2xl rounded" />
          <div className="cm-skeleton h-4 w-4/5 max-w-xl rounded" />
        </div>
      )}

      {variant === "list" && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: n }, (_, i) => (
            <div key={i} className="flex gap-4 rounded-2xl border border-glass-border bg-panel/50 p-4">
              <div className="cm-skeleton h-16 w-16 shrink-0 rounded-xl" />
              <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                <div className="cm-skeleton h-4 w-1/3 rounded" />
                <div className="cm-skeleton h-5 w-4/5 rounded" />
                <div className="cm-skeleton h-3 w-1/4 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {variant === "grid" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: n }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-glass-border bg-panel/50">
              <div className="cm-skeleton aspect-[4/3]" />
              <div className="flex flex-col gap-2.5 p-4">
                <div className="cm-skeleton h-4 w-1/2 rounded" />
                <div className="cm-skeleton h-5 w-4/5 rounded" />
                <div className="cm-skeleton h-3 w-2/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
